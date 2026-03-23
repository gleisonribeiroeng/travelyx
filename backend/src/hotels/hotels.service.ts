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

  async getHotelDetails(
    hotelId: string,
    arrivalDate?: string,
    departureDate?: string,
    locale?: string,
  ): Promise<any> {
    if (!hotelId) return { data: null };

    try {
      const params: Record<string, string> = {
        hotel_id: hotelId,
        locale: locale || 'pt-br',
      };
      if (arrivalDate) params['arrival_date'] = arrivalDate;
      if (departureDate) params['departure_date'] = departureDate;

      const { data } = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/api/v1/hotels/getDescriptionAndInfo`,
          { params, headers: this.getHeaders() },
        ),
      );

      if (!data?.status || !data?.data) {
        return { data: null };
      }

      const raw = data.data;
      this.logger.debug(`RAW HOTEL DETAILS KEYS: ${JSON.stringify(Object.keys(raw))}`);
      this.logger.debug(`RAW HOTEL DETAILS (first 2000 chars): ${JSON.stringify(raw).substring(0, 2000)}`);

      // Extract facilities grouped by category
      const facilities: { name: string; icon: string }[] = [];
      const facilityGroups = raw.facility_groups || raw.facilityGroups || [];
      for (const group of facilityGroups) {
        for (const item of group.facilities || []) {
          if (item.name) {
            facilities.push({ name: item.name, icon: item.facility_name || '' });
          }
        }
      }

      // Extract top highlights
      const highlights: string[] = [];
      const topFacilities = raw.top_ufi_benefits || [];
      for (const item of topFacilities) {
        if (item.translated_name) highlights.push(item.translated_name);
      }

      return {
        data: {
          description: raw.description || '',
          checkinFrom: raw.checkin?.from || '',
          checkinTo: raw.checkin?.to || '',
          checkoutFrom: raw.checkout?.from || '',
          checkoutTo: raw.checkout?.to || '',
          facilities,
          highlights,
          propertyType: raw.accommodation_type_name || '',
          starRating: raw.class || 0,
          address: raw.address || '',
          city: raw.city || '',
          country: raw.country || '',
        },
      };
    } catch (error: any) {
      this.logger.error(`Hotel details error: ${error?.message}`);
      return { data: null };
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
