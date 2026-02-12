import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { BaseApiService } from './base-api.service';
import { CarMapper, BookingComCar, CarSearchParams } from './car.mapper';
import { CarRental } from '../models/trip.models';
import { ApiResult } from './api-error.utils';
import { AppError } from './models/app-error.model';
import { withBackoff } from './retry.utils';

// Re-export CarSearchParams for convenience
export type { CarSearchParams } from './car.mapper';

/**
 * CarApiService handles Booking.com car rental API integration via RapidAPI.
 *
 * Features:
 * - Car rental search with automatic mapping to CarRental model
 * - Rate-limit retry with exponential backoff
 * - RapidAPI authentication via apiKeyInterceptor (X-RapidAPI-Key, X-RapidAPI-Host)
 * - Per-source error isolation with fallback to empty results
 *
 * Extends BaseApiService('carRental') for common HTTP patterns.
 *
 * NOTE: carRentalApiKey in environment.development.ts can share the same RapidAPI key
 * as hotelApiKey since both use the booking-com15 provider.
 */
@Injectable({ providedIn: 'root' })
export class CarApiService extends BaseApiService {
  private readonly mapper = inject(CarMapper);

  constructor() {
    super('carRental');
  }

  /**
   * Search for car rentals based on location, dates, and driver age.
   *
   * NOTE: The endpoint path `/api/v1/cars/searchCarRentals` and parameter names
   * are HYPOTHETICAL (based on booking-com15 hotel pattern). They MUST be verified
   * at implementation time via the RapidAPI dashboard. The mapper is designed to
   * handle response format uncertainty with safe fallback chains.
   *
   * @param params Car rental search criteria
   * @returns Observable<ApiResult<CarRental[]>> with mapped cars or error
   */
  searchCars(params: CarSearchParams): Observable<ApiResult<CarRental[]>> {
    return this.get<any>('/api/v1/cars/searchCarRentals', {
      pick_up_location: params.pickupLocation,
      drop_off_location: params.dropoffLocation,
      pick_up_datetime: params.pickupAt,
      drop_off_datetime: params.dropoffAt,
      driver_age: params.driverAge,
      currency: params.currency || 'USD',
    }).pipe(
      withBackoff(),
      map(
        (response): ApiResult<CarRental[]> => {
          const results =
            response.data?.result || response.data?.cars || response.data || [];
          const cars = Array.isArray(results) ? results : [];
          return {
            data: cars.map((car: BookingComCar) =>
              this.mapper.mapResponse(car, params),
            ),
            error: null,
          };
        },
      ),
      catchError(
        (error: AppError): Observable<ApiResult<CarRental[]>> =>
          of({ data: [], error }),
      ),
    );
  }
}
