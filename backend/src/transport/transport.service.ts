import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { MOCK_TRANSPORTS } from '../common/mock-data';

/**
 * TransportService — real transport search using FlixBus public API.
 *
 * Flow:
 * 1. Autocomplete origin & destination city names → get FlixBus city UUIDs
 * 2. Search trips between the two cities on the given date
 * 3. Map results to our canonical transport format
 * 4. Attach Kiwi.com affiliate links for booking
 * 5. Fallback to mock data if API fails or returns no results
 */
@Injectable()
export class TransportService {
  private readonly logger = new Logger(TransportService.name);
  private readonly flixBaseUrl =
    'https://global.api.flixbus.com';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private isMockMode(): boolean {
    return this.configService.get<string>('MOCK_MODE') === 'true';
  }

  /**
   * Build a Kiwi.com affiliate deep link via Travelpayouts for booking.
   */
  private buildKiwiTransportLink(
    origin: string,
    destination: string,
    departureDate?: string,
  ): string {
    const marker =
      this.configService.get<string>('TRAVELPAYOUTS_MARKER') || '';

    const kiwiParams = new URLSearchParams();
    kiwiParams.set('from', origin);
    kiwiParams.set('to', destination);
    if (departureDate) kiwiParams.set('departure', departureDate);
    kiwiParams.set('transport', 'bus,train,ferry');
    kiwiParams.set('currency', 'BRL');
    kiwiParams.set('lang', 'pt');

    const kiwiUrl = `https://www.kiwi.com/deep?${kiwiParams.toString()}`;

    return `https://c111.travelpayouts.com/click?shmarker=${marker}&promo_id=3791&source_type=customlink&type=click&custom_url=${encodeURIComponent(kiwiUrl)}`;
  }

  /**
   * FlixBus city autocomplete — find the UUID for a city name.
   */
  private async findCityUuid(
    cityName: string,
  ): Promise<{ uuid: string; name: string } | null> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(
          `${this.flixBaseUrl}/cms/cities`,
          {
            params: {
              language: 'en',
              country: 'BR',
              limit: 10,
              q: cityName,
            },
          },
        ),
      );

      const results = data?.result || [];
      if (results.length === 0) return null;

      // Try exact match first, then partial
      const nameLower = cityName.toLowerCase();
      const exact = results.find(
        (c: any) => c.name?.toLowerCase().startsWith(nameLower),
      );
      return exact
        ? { uuid: exact.uuid, name: exact.name }
        : { uuid: results[0].uuid, name: results[0].name };
    } catch (error: any) {
      this.logger.error(
        `FlixBus city lookup error for "${cityName}": ${error?.message}`,
      );
      return null;
    }
  }

  /**
   * Map a FlixBus trip result to our canonical transport format.
   */
  private mapFlixBusTrip(
    tripResult: any,
    stations: Record<string, any>,
    origin: string,
    destination: string,
  ): any {
    const departure = tripResult.departure?.date || '';
    const arrival = tripResult.arrival?.date || '';
    const duration = tripResult.duration || {};
    const durationMinutes = (duration.hours || 0) * 60 + (duration.minutes || 0);
    const price = tripResult.price?.total || 0;
    const transferType = tripResult.transfer_type || 'Direto';
    const meansOfTransport =
      tripResult.legs?.[0]?.means_of_transport || 'bus';

    // Get station names
    const depStationId = tripResult.departure?.station_id || '';
    const arrStationId = tripResult.arrival?.station_id || '';
    const depStation = stations[depStationId];
    const arrStation = stations[arrStationId];

    return {
      id: tripResult.uid || crypto.randomUUID(),
      mode: meansOfTransport === 'train' ? 'train' : 'bus',
      origin,
      destination,
      departureAt: departure,
      arrivalAt: arrival,
      durationMinutes,
      transferType,
      depStation: depStation?.name || depStationId,
      arrStation: arrStation?.name || arrStationId,
      price: {
        total: price,
        currency: 'BRL',
      },
      link: {
        url: this.buildKiwiTransportLink(
          origin,
          destination,
          departure ? departure.split('T')[0] : '',
        ),
        provider: 'Kiwi.com',
      },
    };
  }

  private enrichMockData(
    origin: string,
    destination: string,
    departureDate: string,
  ): any {
    const enriched = MOCK_TRANSPORTS.map((t) => ({
      ...t,
      origin: origin || t.origin,
      destination: destination || t.destination,
      link: {
        url: this.buildKiwiTransportLink(
          origin || t.origin,
          destination || t.destination,
          departureDate,
        ),
        provider: 'Kiwi.com',
      },
    }));
    return { _mock: true, data: enriched };
  }

  async searchTransport(query: Record<string, string>): Promise<any> {
    const origin = query['origin'] || '';
    const destination = query['destination'] || '';
    const departureDate = query['date'] || '';

    if (this.isMockMode()) {
      return this.enrichMockData(origin, destination, departureDate);
    }

    if (!origin || !destination) {
      return this.enrichMockData(origin, destination, departureDate);
    }

    // Step 1: Resolve city UUIDs
    const [originCity, destCity] = await Promise.all([
      this.findCityUuid(origin),
      this.findCityUuid(destination),
    ]);

    if (!originCity || !destCity) {
      this.logger.log(
        `FlixBus: Could not resolve cities — origin="${origin}" (${originCity ? 'found' : 'NOT found'}), dest="${destination}" (${destCity ? 'found' : 'NOT found'})`,
      );
      return this.enrichMockData(origin, destination, departureDate);
    }

    this.logger.log(
      `FlixBus: Resolved ${origin} → ${originCity.name} (${originCity.uuid}), ${destination} → ${destCity.name} (${destCity.uuid})`,
    );

    // Step 2: Search trips
    // FlixBus expects date as DD.MM.YYYY
    let flixDate = '';
    if (departureDate) {
      const parts = departureDate.split('-');
      if (parts.length === 3) {
        flixDate = `${parts[2]}.${parts[1]}.${parts[0]}`;
      }
    }
    if (!flixDate) {
      // Default to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      flixDate = `${String(tomorrow.getDate()).padStart(2, '0')}.${String(tomorrow.getMonth() + 1).padStart(2, '0')}.${tomorrow.getFullYear()}`;
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.get(
          `${this.flixBaseUrl}/search/service/v4/search`,
          {
            params: {
              from_city_id: originCity.uuid,
              to_city_id: destCity.uuid,
              departure_date: flixDate,
              products: JSON.stringify({ adult: 1 }),
              currency: 'BRL',
              locale: 'pt_BR',
              search_by: 'cities',
              include_after_midnight_departures: '1',
            },
          },
        ),
      );

      const tripsObj = data?.trips || {};
      const stations = data?.stations || {};
      const allTrips: any[] = [];

      // trips is an object of trip groups, each with results
      for (const tripGroup of Object.values(tripsObj) as any[]) {
        const results = tripGroup?.results || {};
        for (const result of Object.values(results) as any[]) {
          if (result.status === 'available' || result.status !== 'cancelled') {
            allTrips.push(
              this.mapFlixBusTrip(
                result,
                stations,
                originCity.name,
                destCity.name,
              ),
            );
          }
        }
      }

      if (allTrips.length === 0) {
        this.logger.log(
          `FlixBus: 0 trips for ${originCity.name} → ${destCity.name} on ${flixDate}`,
        );
        return this.enrichMockData(origin, destination, departureDate);
      }

      this.logger.log(
        `FlixBus: ${allTrips.length} trips for ${originCity.name} → ${destCity.name} on ${flixDate}`,
      );

      return { data: allTrips };
    } catch (error: any) {
      const status = error?.response?.status;
      const errorBody = error?.response?.data;
      this.logger.error(
        `FlixBus search error: ${error?.message} | HTTP ${status ?? 'N/A'} | body: ${JSON.stringify(errorBody)?.substring(0, 500)}`,
      );
      return this.enrichMockData(origin, destination, departureDate);
    }
  }
}
