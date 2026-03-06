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

    const origin = query['originLocationCode'];
    const destination = query['destinationLocationCode'];
    const departureDate = query['departureDate'];
    const returnDate = query['returnDate'];

    // Aviasales cached prices API has sparse data for exact date combos.
    // Strategy: try exact dates first, then fallback to month-level search.
    const departureMonth = departureDate?.substring(0, 7); // YYYY-MM
    const returnMonth = returnDate?.substring(0, 7);

    const attempts: { departure_at: string; return_at?: string; label: string }[] = [];

    // 1st attempt: exact dates
    if (returnDate) {
      attempts.push({ departure_at: departureDate, return_at: returnDate, label: 'exact dates' });
      attempts.push({ departure_at: departureMonth, return_at: returnMonth, label: 'month-level' });
    } else {
      attempts.push({ departure_at: departureDate, label: 'exact date' });
      attempts.push({ departure_at: departureMonth, label: 'month-level' });
    }

    for (const attempt of attempts) {
      const params: Record<string, string> = {
        origin,
        destination,
        departure_at: attempt.departure_at,
        currency: 'brl',
        limit: query['max'] || '50',
        sorting: 'price',
        token: token!,
      };

      if (attempt.return_at) {
        params['return_at'] = attempt.return_at;
      } else if (!returnDate) {
        params['one_way'] = 'true';
      }

      this.logger.log(
        `Aviasales search (${attempt.label}): ${origin} → ${destination} (${params.departure_at}${params.return_at ? ' / ' + params.return_at : ''}) | token=${token ? 'present' : 'MISSING'}`,
      );

      try {
        const response = await firstValueFrom(
          this.httpService.get(
            'https://api.travelpayouts.com/aviasales/v3/prices_for_dates',
            { params },
          ),
        );
        const data = response.data;

        if (!data.success || !Array.isArray(data.data) || data.data.length === 0) {
          this.logger.log(`Aviasales (${attempt.label}): 0 results, trying next...`);
          continue;
        }

        const currency = (data.currency || 'brl').toUpperCase();

        const flights = data.data.map((item: any, index: number) => {
          // Build Kiwi.com deep link (BRL payment) with Travelpayouts affiliate tracking
          const depDate = (item.departure_at || '').split('T')[0]; // YYYY-MM-DD
          const retDate = (item.return_at || '').split('T')[0];
          const kiwiFrom = item.origin_airport || item.origin || origin;
          const kiwiTo = item.destination_airport || item.destination || destination;
          let kiwiDeep = `https://www.kiwi.com/deep?from=${kiwiFrom}&to=${kiwiTo}&departure=${depDate}`;
          if (retDate) kiwiDeep += `&return=${retDate}`;
          const affiliateUrl = `https://c111.travelpayouts.com/click?shmarker=${marker}&promo_id=3791&source_type=customlink&type=click&custom_url=${encodeURIComponent(kiwiDeep)}`;

          return {
            id: `avs-${Date.now()}-${index}`,
            source: 'kiwi',
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
              provider: 'Kiwi.com',
            },
          };
        });

        this.logger.log(`Aviasales (${attempt.label}): ${flights.length} results`);
        return { _mock: true, data: flights };
      } catch (error: any) {
        const status = error?.response?.status;
        const body = error?.response?.data;
        this.logger.error(
          `Aviasales API error (${attempt.label}): ${error?.message} | HTTP ${status ?? 'N/A'} | body: ${JSON.stringify(body)?.substring(0, 500)}`,
        );
      }
    }

    return { _mock: true, data: [] };
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
    } catch (error: any) {
      const status = error?.response?.status;
      const body = error?.response?.data;
      this.logger.error(
        `Travelpayouts autocomplete error: ${error?.message} | HTTP ${status ?? 'N/A'} | body: ${JSON.stringify(body)?.substring(0, 300)}`,
      );
      return { _mock: true, data: [] };
    }
  }
}
