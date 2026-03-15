import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
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

  private getHeaders(): Record<string, string> {
    return {
      'X-RapidAPI-Key': this.configService.get<string>('HOTEL_API_KEY')!,
      'X-RapidAPI-Host': this.host,
    };
  }

  async searchDestination(query: Record<string, string>): Promise<any> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/v1/hotels/searchDestination`, {
          params: query,
          headers: this.getHeaders(),
        }),
      );
      return data;
    } catch (error: any) {
      this.logger.error(`Hotel destination search error: ${error?.message}`);
      throw error;
    }
  }

  async searchHotels(query: Record<string, string>): Promise<any> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/v1/hotels/searchHotels`, {
          params: query,
          headers: this.getHeaders(),
        }),
      );
      return data;
    } catch (error: any) {
      this.logger.error(`Hotel search error: ${error?.message}`);
      throw error;
    }
  }

  async getHotelPhotos(hotelId: string): Promise<any> {
    if (!hotelId) return { data: [] };

    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/v1/hotels/getHotelPhotos`, {
          params: { hotel_id: hotelId },
          headers: this.getHeaders(),
        }),
      );

      if (!data?.status || !Array.isArray(data?.data)) {
        return { data: [] };
      }

      // Return unique photo URLs (max 15 for performance)
      const photos = data.data
        .slice(0, 15)
        .map((p: any) => p.url?.replace('square1024', 'square600') || p.url)
        .filter(Boolean);

      return { data: photos };
    } catch (error: any) {
      this.logger.error(`Hotel photos error: ${error?.message}`);
      return { data: [] };
    }
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
}
