import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { BaseApiService } from './base-api.service';
import { HotelMapper, BookingComHotel } from './hotel.mapper';
import { Stay } from '../models/trip.models';
import { ApiResult } from './api-error.utils';
import { AppError } from './models/app-error.model';
import { withBackoff } from './retry.utils';

/**
 * Destination autocomplete option for hotel search form.
 */
export interface DestinationOption {
  destId: string;
  name: string;
  label: string; // Display label (e.g. "Paris, France")
  searchType: string; // e.g. "CITY"
}

/**
 * Hotel search parameters for Booking.com API.
 */
export interface HotelSearchParams {
  destId: string; // From destination search
  searchType: string; // "CITY"
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  adults: number;
  rooms: number;
}

/**
 * HotelApiService handles Booking.com API integration via RapidAPI.
 *
 * Features:
 * - Hotel search with automatic mapping to Stay model
 * - Destination autocomplete for search form
 * - Rate-limit retry with exponential backoff
 * - RapidAPI authentication via apiKeyInterceptor (X-RapidAPI-Key, X-RapidAPI-Host)
 *
 * Extends BaseApiService('hotel') for common HTTP patterns.
 */
@Injectable({ providedIn: 'root' })
export class HotelApiService extends BaseApiService {
  private readonly mapper = inject(HotelMapper);

  constructor() {
    super('hotel');
  }

  /**
   * Search for destinations by query string for autocomplete.
   *
   * @param query Search term (minimum 2 characters)
   * @returns Observable<DestinationOption[]> with matching destinations
   */
  searchDestinations(query: string): Observable<DestinationOption[]> {
    if (query.length < 2) {
      return of([]);
    }

    return this.get<any>('/api/v1/hotels/searchDestination', { query }).pipe(
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

  /**
   * Search for hotels based on destination, dates, and occupancy.
   *
   * @param params Hotel search criteria
   * @returns Observable<ApiResult<Stay[]>> with mapped hotels or error
   */
  searchHotels(params: HotelSearchParams): Observable<ApiResult<Stay[]>> {
    return this.get<any>('/api/v1/hotels/searchHotels', {
      dest_id: params.destId,
      search_type: params.searchType,
      checkin_date: params.checkIn,
      checkout_date: params.checkOut,
      adults: params.adults,
      room_qty: params.rooms,
    }).pipe(
      withBackoff(),
      map(
        (response): ApiResult<Stay[]> => {
          const results =
            response.data?.result || response.data?.hotels || response.data || [];
          const hotels = Array.isArray(results) ? results : [];
          return {
            data: hotels.map((hotel: BookingComHotel) =>
              this.mapper.mapResponse(hotel, params.checkIn, params.checkOut),
            ),
            error: null,
          };
        },
      ),
      catchError(
        (error: AppError): Observable<ApiResult<Stay[]>> =>
          of({ data: [], error }),
      ),
    );
  }
}
