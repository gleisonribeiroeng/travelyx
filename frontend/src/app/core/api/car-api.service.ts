import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { BaseApiService } from './base-api.service';
import { CarRental } from '../models/trip.models';
import { ApiResult } from './api-error.utils';
import { AppError } from './models/app-error.model';
import { withBackoff } from './retry.utils';

// Re-export CarSearchParams for convenience
export type { CarSearchParams } from './car.mapper';

/**
 * Car location autocomplete option from Priceline autoComplete endpoint.
 */
export interface CarLocationOption {
  id: string;
  name: string;
  label: string;
  cityId: string;
  latitude: number;
  longitude: number;
}

/**
 * CarApiService — calls NestJS backend which proxies Priceline API via RapidAPI.
 * Backend maps Priceline responses server-side and returns { _mock: true, data: [...] }.
 */
@Injectable({ providedIn: 'root' })
export class CarApiService extends BaseApiService {
  constructor() {
    super('carRental');
  }

  searchLocations(query: string): Observable<CarLocationOption[]> {
    if (query.length < 2) {
      return of([]);
    }

    return this.get<any>('/v2/cars/autoComplete', { string: query }).pipe(
      withBackoff(),
      map((response) => {
        return (response.data || []) as CarLocationOption[];
      }),
      catchError(() => of([])),
    );
  }

  searchCars(params: import('./car.mapper').CarSearchParams): Observable<ApiResult<CarRental[]>> {
    return this.get<any>('/v2/cars/resultsRequest', {
      pickup_city_id: params.pickupCityId,
      dropoff_city_id: params.dropoffCityId,
      pickup_date: params.pickupDate,
      dropoff_date: params.dropoffDate,
      pickup_time: params.pickupTime,
      dropoff_time: params.dropoffTime,
      driver_age: params.driverAge,
      currency: params.currency || 'BRL',
    }).pipe(
      withBackoff(),
      map(
        (response): ApiResult<CarRental[]> => {
          return { data: response.data || [], error: null };
        },
      ),
      catchError(
        (error: AppError): Observable<ApiResult<CarRental[]>> =>
          of({ data: [], error }),
      ),
    );
  }
}
