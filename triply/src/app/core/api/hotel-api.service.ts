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
  label: string;
  searchType: string;
}

/**
 * Hotel search parameters for Booking.com API.
 */
export interface HotelSearchParams {
  destId: string;
  searchType: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  rooms: number;
}

/**
 * HotelApiService — calls NestJS backend which proxies Booking.com API via RapidAPI.
 * Backend returns { _mock: true, data: [...] } in mock mode (already mapped),
 * or raw Booking.com response in real mode (needs mapping).
 */
@Injectable({ providedIn: 'root' })
export class HotelApiService extends BaseApiService {
  private readonly mapper = inject(HotelMapper);

  constructor() {
    super('hotel');
  }

  searchDestinations(query: string): Observable<DestinationOption[]> {
    if (query.length < 2) {
      return of([]);
    }

    return this.get<any>('/api/v1/hotels/searchDestination', { query }).pipe(
      withBackoff(),
      map((response) => {
        if (response._mock) {
          return response.data as DestinationOption[];
        }
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

  searchHotels(params: HotelSearchParams): Observable<ApiResult<Stay[]>> {
    return this.get<any>('/api/v1/hotels/searchHotels', {
      dest_id: params.destId,
      search_type: params.searchType,
      arrival_date: params.checkIn,
      departure_date: params.checkOut,
      adults: params.adults,
      room_qty: params.rooms,
      currency_code: 'BRL',
      locale: 'pt-br',
    }).pipe(
      withBackoff(),
      map(
        (response): ApiResult<Stay[]> => {
          if (response._mock) {
            return { data: response.data, error: null };
          }
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
