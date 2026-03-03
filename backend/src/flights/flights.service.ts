import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  MOCK_AIRPORTS,
  MOCK_FLIGHTS,
  MOCK_SHOWCASE_DEALS,
  MOCK_SHOWCASE_POPULAR,
  MOCK_SHOWCASE_RECOMMENDED,
  DESTINATION_IMAGES,
} from '../common/mock-data';

@Injectable()
export class FlightsService {
  private readonly logger = new Logger(FlightsService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private isMockMode(): boolean {
    return this.configService.get<string>('MOCK_MODE') === 'true';
  }

  /**
   * Search flights via Aviasales cached prices API.
   * Maps response to the same Flight domain model format as mock data,
   * so the Angular frontend can consume it without mapper changes.
   */
  async searchFlights(query: Record<string, string>): Promise<any> {
    if (this.isMockMode()) {
      const origin = query['originLocationCode'];
      const dest = query['destinationLocationCode'];
      const filtered = MOCK_FLIGHTS.filter(
        (f) => f.origin === origin && f.destination === dest,
      );
      return { _mock: true, data: filtered.length > 0 ? filtered : MOCK_FLIGHTS };
    }

    const token = this.configService.get<string>('TRAVELPAYOUTS_TOKEN');
    const marker = this.configService.get<string>('TRAVELPAYOUTS_MARKER');

    const params: Record<string, string> = {
      origin: query['originLocationCode'],
      destination: query['destinationLocationCode'],
      departure_at: query['departureDate'],
      currency: 'brl',
      limit: query['max'] || '50',
      sorting: 'price',
      token: token!,
    };

    if (query['returnDate']) {
      params['return_at'] = query['returnDate'];
      params['one_way'] = 'false';
    } else {
      params['one_way'] = 'true';
    }

    this.logger.log(
      `Aviasales search: ${params.origin} → ${params.destination} (${params.departure_at})`,
    );

    try {
      const { data } = await firstValueFrom(
        this.httpService.get(
          'https://api.travelpayouts.com/aviasales/v3/prices_for_dates',
          { params },
        ),
      );

      if (!data.success || !Array.isArray(data.data)) {
        this.logger.warn('Aviasales returned no results');
        return { _mock: true, data: [] };
      }

      const currency = (data.currency || 'brl').toUpperCase();

      const flights = data.data.map((item: any, index: number) => {
        const searchLink = `https://www.aviasales.com${item.link}`;
        const affiliateUrl = `https://tp.media/r?marker=${marker}&p=4114&u=${encodeURIComponent(searchLink)}`;

        return {
          id: `avs-${Date.now()}-${index}`,
          source: 'aviasales',
          addedToItinerary: false,
          origin: item.origin,
          destination: item.destination,
          departureAt: item.departure_at || '',
          arrivalAt: item.return_at || '',
          airline: item.airline || '',
          airlineCode: item.airline || '',
          airlineLogo: item.airline
            ? `https://pics.avs.io/60/60/${item.airline}.png`
            : null,
          flightNumber: item.flight_number
            ? `${item.airline || ''}${item.flight_number}`
            : '',
          durationMinutes: item.duration || 0,
          stops: item.transfers ?? 0,
          price: {
            total: item.price,
            currency,
          },
          link: {
            url: affiliateUrl,
            provider: 'Aviasales',
          },
        };
      });

      this.logger.log(`Aviasales returned ${flights.length} results`);
      return { _mock: true, data: flights };
    } catch (error) {
      this.logger.error('Aviasales API error', error?.message || error);
      return { _mock: true, data: [] };
    }
  }

  getShowcase() {
    const enrich = (flights: any[]) =>
      flights.map((f) => ({
        ...f,
        destinationImage: DESTINATION_IMAGES[f.destination]?.url ?? null,
      }));

    return {
      deals: enrich(MOCK_SHOWCASE_DEALS),
      popular: enrich(MOCK_SHOWCASE_POPULAR),
      recommended: enrich(MOCK_SHOWCASE_RECOMMENDED),
    };
  }

  /**
   * Search airports/cities via Travelpayouts autocomplete API (no auth required).
   * Maps response to the same AirportOption format the Angular frontend expects.
   */
  async searchAirports(query: Record<string, string>): Promise<any> {
    if (this.isMockMode()) {
      const kw = (query['keyword'] || '').toLowerCase();
      const filtered = MOCK_AIRPORTS.filter(
        (a) =>
          a.name.toLowerCase().includes(kw) ||
          a.cityName.toLowerCase().includes(kw) ||
          a.iataCode.toLowerCase().includes(kw),
      );
      return { _mock: true, data: filtered };
    }

    const keyword = query['keyword'] || '';
    if (keyword.length < 2) {
      return { _mock: true, data: [] };
    }

    try {
      const url = `https://autocomplete.travelpayouts.com/places2?term=${encodeURIComponent(keyword)}&locale=pt&types[]=airport&types[]=city`;

      const { data } = await firstValueFrom(this.httpService.get(url));

      const mapped = (data || [])
        .filter((item: any) => item.code)
        .map((item: any) => ({
          iataCode: item.code,
          name:
            item.type === 'airport'
              ? item.name || ''
              : item.main_airport_name || item.name || '',
          cityName:
            item.type === 'airport'
              ? item.city_name || item.name || ''
              : item.name || '',
        }));

      return { _mock: true, data: mapped };
    } catch (error) {
      this.logger.error(
        'Travelpayouts autocomplete error',
        error?.message || error,
      );
      return { _mock: true, data: [] };
    }
  }
}
