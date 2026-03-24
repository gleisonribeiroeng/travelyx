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

      // Try to get description — prefer locale language
      const usedLocale = locale || 'pt-br';
      const langKey = usedLocale.split('-')[0]; // 'pt' from 'pt-br'
      const translations = raw.description_translations || {};
      const description =
        translations[usedLocale] ||
        translations[langKey] ||
        raw.description ||
        translations['en'] ||
        raw.hotel_text ||
        '';

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

  async getRoomList(
    hotelId: string,
    arrivalDate: string,
    departureDate: string,
    adults: number,
    currency: string,
    locale?: string,
  ): Promise<any> {
    if (!hotelId || !arrivalDate || !departureDate) return { data: [] };

    try {
      const params: Record<string, string> = {
        hotel_id: hotelId,
        arrival_date: arrivalDate,
        departure_date: departureDate,
        adults: String(adults || 2),
        currency_code: currency || 'BRL',
        locale: locale || 'pt-br',
      };

      const { data } = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/api/v1/hotels/getRoomList`,
          { params, headers: this.getHeaders() },
        ),
      );

      this.logger.log(`Room list response status: ${data?.status}, type: ${typeof data?.data}`);

      if (!data?.data) return { data: [] };

      // Parse rooms from response
      const rawRooms = Array.isArray(data.data) ? data.data : data.data.rooms || data.data.block || [];
      if (!Array.isArray(rawRooms)) {
        this.logger.warn(`Room list: unexpected format, keys: ${Object.keys(data.data).join(', ')}`);
        // Try to extract from grouped structure
        const rooms: any[] = [];
        for (const key of Object.keys(data.data)) {
          const val = data.data[key];
          if (Array.isArray(val)) {
            for (const item of val) {
              if (item.room_name || item.name || item.room_id) {
                rooms.push(item);
              }
            }
          }
        }
        if (rooms.length > 0) {
          return { data: this.mapRooms(rooms) };
        }
        return { data: [] };
      }

      return { data: this.mapRooms(rawRooms) };
    } catch (error: any) {
      this.logger.error(`Room list error for ${hotelId}: ${error?.message}`);
      return { data: [] };
    }
  }

  private mapRooms(rawRooms: any[]): any[] {
    const seen = new Set<string>();
    const rooms: any[] = [];

    for (const room of rawRooms) {
      const name = room.room_name || room.name || room.room_type || 'Quarto';
      // Deduplicate by name
      if (seen.has(name)) continue;
      seen.add(name);

      const photo = room.photos?.[0]?.url_original
        || room.photos?.[0]?.url_640x200
        || room.photo
        || room.room_photos?.[0]?.url_original
        || null;

      const price = room.product_price_breakdown?.gross_amount?.value
        || room.min_price?.value
        || room.price
        || room.composite_price_breakdown?.gross_amount?.value
        || null;

      const currency = room.product_price_breakdown?.gross_amount?.currency
        || room.min_price?.currency
        || room.currency
        || 'BRL';

      const highlights: string[] = [];
      if (room.highlights) {
        for (const h of room.highlights) {
          if (h.translated_name || h.name) highlights.push(h.translated_name || h.name);
        }
      }

      // Meal plan
      const mealPlan = room.meal_plan || room.breakfast_included
        ? 'Café da manhã incluso'
        : null;

      // Free cancellation
      const freeCancellation = room.is_free_cancellable
        || room.free_cancellation
        || room.policies?.cancellation?.free_cancellation
        || false;

      const maxOccupancy = room.nr_adults || room.max_occupancy || room.occupancy || null;
      const bedConfig = room.bed_configurations?.[0]?.bed_types?.map((b: any) => b.name_with_count || b.name).join(', ')
        || room.bed_type
        || null;

      rooms.push({
        id: room.room_id || room.block_id || room.id || `room-${rooms.length}`,
        name,
        photo,
        price,
        currency,
        highlights,
        mealPlan,
        freeCancellation,
        maxOccupancy,
        bedConfig,
        totalPrice: room.product_price_breakdown?.all_inclusive_amount?.value
          || room.composite_price_breakdown?.all_inclusive_amount?.value
          || price,
      });
    }

    return rooms;
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
