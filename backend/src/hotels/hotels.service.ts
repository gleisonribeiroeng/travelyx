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

      this.logger.log(`Hotel details response status: ${data?.status}, has data: ${!!data?.data}, type: ${typeof data?.data}`);

      // Handle various response formats
      let raw = data?.data;
      if (!raw) {
        // Try the response itself if data.data is null
        raw = data;
      }
      if (Array.isArray(raw)) {
        raw = raw[0] || {};
      }
      if (!raw || typeof raw !== 'object') {
        this.logger.warn(`Hotel details: unexpected response format for hotel ${hotelId}`);
        return { data: null };
      }

      this.logger.log(`Hotel details keys: ${Object.keys(raw).join(', ')}`);

      // Extract facilities — try multiple response formats
      const facilities: { name: string; icon: string }[] = [];
      const facilityGroups = raw.facility_groups || raw.facilityGroups || raw.facilities_block?.facilities || [];
      if (Array.isArray(facilityGroups)) {
        for (const group of facilityGroups) {
          const items = group.facilities || group.instances || [];
          for (const item of items) {
            const name = item.name || item.facility_name || item.translated_name || '';
            if (name) {
              facilities.push({ name, icon: item.icon || '' });
            }
          }
        }
      }

      // Extract highlights — try multiple paths
      const highlights: string[] = [];
      const topBenefits = raw.top_ufi_benefits || raw.property_highlight_strip || [];
      if (Array.isArray(topBenefits)) {
        for (const item of topBenefits) {
          const text = item.translated_name || item.name || item.icon_title_text || '';
          if (text) highlights.push(text);
        }
      }

      // Try to get description from multiple paths
      const description = raw.description || raw.description_translations?.en || raw.hotel_text || '';

      return {
        data: {
          description,
          checkinFrom: raw.checkin?.from || raw.checkin_from || '',
          checkinTo: raw.checkin?.to || raw.checkin_to || '',
          checkoutFrom: raw.checkout?.from || raw.checkout_from || '',
          checkoutTo: raw.checkout?.to || raw.checkout_to || '',
          facilities,
          highlights,
          propertyType: raw.accommodation_type_name || raw.property_type || '',
          starRating: raw.class || raw.star_rating || raw.property_class || 0,
          address: raw.address || raw.address_trans || '',
          city: raw.city || raw.city_trans || '',
          country: raw.country || raw.country_trans || '',
        },
      };
    } catch (error: any) {
      this.logger.error(`Hotel details error for ${hotelId}: ${error?.message}`);
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
