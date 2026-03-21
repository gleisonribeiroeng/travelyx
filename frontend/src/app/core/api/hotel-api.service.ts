import { inject, Injectable } from '@angular/core';
import { CurrencyService } from '../i18n/currency.service';
import { TranslationService } from '../i18n/translation.service';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { BaseApiService } from './base-api.service';
import { HotelMapper, BookingComHotel } from './hotel.mapper';
import { Stay } from '../models/trip.models';
import { ApiResult } from './api-error.utils';
import { AppError } from './models/app-error.model';
import { withBackoff } from './retry.utils';

export interface DestinationOption {
  destId: string;
  name: string;
  label: string;
  searchType: string;
}

export interface HotelSearchParams {
  destId: string;
  searchType: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  rooms: number;
}

export interface PaginatedHotelResult {
  data: Stay[];
  totalCount: number;
  hasMore: boolean;
  error: AppError | null;
}

@Injectable({ providedIn: 'root' })
export class HotelApiService extends BaseApiService {
  private readonly mapper = inject(HotelMapper);
  private readonly currencyService = inject(CurrencyService);
  private readonly i18n = inject(TranslationService);

  private get locale(): string {
    return this.i18n.lang() === 'en' ? 'en-us' : 'pt-br';
  }

  constructor() {
    super('hotel');
  }

  searchDestinations(query: string): Observable<DestinationOption[]> {
    if (query.length < 2) return of([]);

    return this.get<any>('/api/v1/hotels/searchDestination', { query, locale: this.locale }).pipe(
      withBackoff(),
      map((response) => {
        const results = response.data || [];
        return results.map(
          (item: any): DestinationOption => ({
            destId: item.dest_id,
            name: item.name || item.city_name || '',
            label: item.label || item.name || '',
            searchType: item.search_type || 'CITY',
          }),
        );
      }),
      catchError(() => of([])),
    );
  }

  searchHotels(params: HotelSearchParams, pageNumber = 1): Observable<ApiResult<Stay[]>> {
    return this.searchHotelsPaginated(params, pageNumber).pipe(
      map(result => ({ data: result.data, error: result.error })),
    );
  }

  searchHotelsPaginated(params: HotelSearchParams, pageNumber = 1): Observable<PaginatedHotelResult> {
    return this.get<any>('/api/v1/hotels/searchHotels', {
      dest_id: params.destId,
      search_type: params.searchType,
      arrival_date: params.checkIn,
      departure_date: params.checkOut,
      adults: params.adults,
      room_qty: params.rooms,
      page_number: pageNumber,
      currency_code: this.currencyService.currency(),
      locale: this.locale,
    }).pipe(
      withBackoff(),
      map((response): PaginatedHotelResult => {
        const results = response.data?.result || response.data?.hotels || response.data || [];
        const hotels = Array.isArray(results) ? results : [];
        const meta = response.data?.meta || response.meta || {};
        const totalCount = meta.nbHotels || meta.totalCount || hotels.length;
        // Booking.com typically returns 20 per page
        const hasMore = hotels.length >= 20;
        return {
          data: hotels.map((hotel: BookingComHotel) =>
            this.mapper.mapResponse(hotel, params.checkIn, params.checkOut),
          ),
          totalCount,
          hasMore,
          error: null,
        };
      }),
      catchError((error: AppError): Observable<PaginatedHotelResult> =>
        of({ data: [], totalCount: 0, hasMore: false, error }),
      ),
    );
  }

  getHotelPhotos(hotelId: string): Observable<string[]> {
    return this.get<any>('/api/v1/hotels/getHotelPhotos', { hotel_id: hotelId }).pipe(
      map((response) => response.data || []),
      catchError(() => of([])),
    );
  }
}
