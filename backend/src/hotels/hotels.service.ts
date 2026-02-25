import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  MOCK_HOTEL_DESTINATIONS,
  MOCK_STAYS,
  MOCK_HOTEL_SHOWCASE_BEST_PRICES,
  MOCK_HOTEL_SHOWCASE_TOP_RATED,
  MOCK_HOTEL_SHOWCASE_UNIQUE,
  CITY_IMAGES,
} from '../common/mock-data';

@Injectable()
export class HotelsService {
  private readonly logger = new Logger(HotelsService.name);
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

  async searchDestination(query: Record<string, string>): Promise<any> {
    if (this.isMockMode()) {
      const kw = (query['query'] || '').toLowerCase();
      const filtered = MOCK_HOTEL_DESTINATIONS.filter(
        (d) => d.name.toLowerCase().includes(kw) || d.label.toLowerCase().includes(kw),
      );
      return { _mock: true, data: filtered };
    }

    const { data } = await firstValueFrom(
      this.httpService.get(`${this.baseUrl}/api/v1/hotels/searchDestination`, {
        params: query,
        headers: this.getHeaders(),
      }),
    );
    return data;
  }

  getShowcase() {
    const enrich = (hotels: any[]) =>
      hotels.map((h) => ({
        ...h,
        cityImage: CITY_IMAGES[h.city]?.url ?? null,
      }));

    return {
      bestPrices: enrich(MOCK_HOTEL_SHOWCASE_BEST_PRICES),
      topRated: enrich(MOCK_HOTEL_SHOWCASE_TOP_RATED),
      unique: enrich(MOCK_HOTEL_SHOWCASE_UNIQUE),
    };
  }

  async searchHotels(query: Record<string, string>): Promise<any> {
    if (this.isMockMode()) {
      const stays = MOCK_STAYS.map((s) => ({
        ...s,
        checkIn: query['arrival_date'] || s.checkIn,
        checkOut: query['departure_date'] || s.checkOut,
      }));
      return { _mock: true, data: stays };
    }

    const { data } = await firstValueFrom(
      this.httpService.get(`${this.baseUrl}/api/v1/hotels/searchHotels`, {
        params: query,
        headers: this.getHeaders(),
      }),
    );
    return data;
  }
}
