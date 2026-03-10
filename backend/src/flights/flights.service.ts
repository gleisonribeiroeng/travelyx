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
  private readonly baseUrl = 'https://booking-com15.p.rapidapi.com';
  private readonly host = 'booking-com15.p.rapidapi.com';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private isMockMode(): boolean {
    return this.configService.get<string>('MOCK_MODE') === 'true';
  }

  private getHeaders(): Record<string, string> {
    return {
      'X-RapidAPI-Key': this.configService.get<string>('HOTEL_API_KEY')!,
      'X-RapidAPI-Host': this.host,
    };
  }

  /**
   * Search flights via Booking.com API (RapidAPI).
   * Maps response to the canonical Flight model so the frontend can consume it directly.
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

    const fromId = query['fromId'] || '';
    const toId = query['toId'] || '';
    const departDate = query['departureDate'] || query['departDate'] || '';
    const returnDate = query['returnDate'] || '';
    const adults = query['adults'] || '1';

    if (!fromId || !toId || !departDate) {
      return { _mock: true, data: [] };
    }

    const params: Record<string, string> = {
      fromId,
      toId,
      departDate,
      adults,
      cabinClass: query['cabinClass'] || 'ECONOMY',
      currency_code: 'BRL',
    };

    if (returnDate) {
      params['returnDate'] = returnDate;
    }

    this.logger.log(
      `Booking.com flight search: ${fromId} → ${toId} (${departDate}${returnDate ? ' / ' + returnDate : ''})`,
    );

    try {
      const { data } = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/api/v1/flights/searchFlights`,
          { params, headers: this.getHeaders() },
        ),
      );

      if (!data?.status || !data?.data?.flightOffers) {
        this.logger.warn('Booking.com flights: no results');
        return { _mock: true, data: [] };
      }

      const flights = data.data.flightOffers
        .map((offer: any, index: number) => this.mapFlightOffer(offer, index))
        .filter(Boolean);

      this.logger.log(`Booking.com flights: ${flights.length} results`);
      return { _mock: true, data: flights };
    } catch (error: any) {
      const status = error?.response?.status;
      this.logger.error(
        `Booking.com flights error: ${error?.message} | HTTP ${status ?? 'N/A'}`,
      );
      return { _mock: true, data: [] };
    }
  }

  /**
   * Map a single Booking.com flight offer to the canonical Flight model.
   */
  private mapFlightOffer(offer: any, index: number): any {
    const outbound = offer.segments?.[0];
    if (!outbound) return null;

    const legs = outbound.legs || [];
    const firstLeg = legs[0] || {};
    const carrierData = firstLeg.carriersData?.[0] || {};
    const flightInfo = firstLeg.flightInfo || {};
    const carrierInfo = flightInfo.carrierInfo || {};

    const price = offer.priceBreakdown?.total || {};
    const totalPrice =
      (price.units || 0) + (price.nanos || 0) / 1_000_000_000;

    const airlineCode =
      carrierInfo.marketingCarrier ||
      carrierData.code ||
      firstLeg.carriers?.[0] ||
      '';

    const flightNumber = flightInfo.flightNumber
      ? `${airlineCode}${flightInfo.flightNumber}`
      : '';

    const depCode = outbound.departureAirport?.code || '';
    const arrCode = outbound.arrivalAirport?.code || '';
    const depDate = (outbound.departureTime || '').split('T')[0];

    const bookingUrl = `https://flights.booking.com/flights/${depCode}.AIRPORT-${arrCode}.AIRPORT/?type=ONEWAY&depart=${depDate}&adults=1&cabinClass=ECONOMY`;

    return {
      id: `bkf-${Date.now()}-${index}`,
      source: 'booking',
      addedToItinerary: false,
      origin: depCode,
      destination: arrCode,
      departureAt: outbound.departureTime || '',
      arrivalAt: outbound.arrivalTime || '',
      airline: carrierData.name || airlineCode,
      airlineCode,
      airlineLogo:
        carrierData.logo ||
        (airlineCode
          ? `https://r-xx.bstatic.com/data/airlines_logo/${airlineCode}.png`
          : null),
      flightNumber,
      durationMinutes: Math.round((outbound.totalTime || 0) / 60),
      stops: Math.max(0, legs.length - 1),
      price: {
        total: Math.round(totalPrice * 100) / 100,
        currency: price.currencyCode || 'BRL',
      },
      link: {
        url: bookingUrl,
        provider: 'Booking.com',
      },
    };
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
   * Search flight destinations via Booking.com API.
   * Returns results with `id` (Booking.com search ID) and `iataCode` (IATA code).
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
      const { data } = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/api/v1/flights/searchDestination`,
          {
            params: { query: keyword },
            headers: this.getHeaders(),
          },
        ),
      );

      if (!data?.status || !Array.isArray(data?.data)) {
        return { _mock: true, data: [] };
      }

      const mapped = data.data
        .filter((item: any) => item.code)
        .map((item: any) => ({
          id: item.id || '',
          iataCode: item.code || '',
          name: item.name || '',
          cityName: item.cityName || item.name || '',
        }));

      return { _mock: true, data: mapped };
    } catch (error: any) {
      this.logger.error(
        `Booking.com flight destination error: ${error?.message}`,
      );
      return { _mock: true, data: [] };
    }
  }
}
