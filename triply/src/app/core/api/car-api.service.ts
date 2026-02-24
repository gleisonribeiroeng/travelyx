import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { BaseApiService } from './base-api.service';
import { CarMapper, PricelineCar, CarSearchParams } from './car.mapper';
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
 * Backend returns { _mock: true, data: [...] } in mock mode (already mapped),
 * or raw Priceline response in real mode (needs mapping).
 */
@Injectable({ providedIn: 'root' })
export class CarApiService extends BaseApiService {
  private readonly mapper = inject(CarMapper);

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
        if (response._mock) {
          return response.data as CarLocationOption[];
        }
        const cityData =
          response?.getCarAutoComplete?.results?.city_data || {};
        return Object.values(cityData).map(
          (city: any): CarLocationOption => ({
            id: city.ppn_car_cityid || '',
            name: city.city || '',
            label: city.city
              ? `${city.city}, ${city.country || city.country_code || ''}`
              : '',
            cityId: city.ppn_car_cityid || '',
            latitude: parseFloat(city.latitude) || 0,
            longitude: parseFloat(city.longitude) || 0,
          }),
        );
      }),
      catchError(() => of([])),
    );
  }

  searchCars(params: CarSearchParams): Observable<ApiResult<CarRental[]>> {
    return this.get<any>('/v2/cars/resultsRequest', {
      pickup_city_id: params.pickupCityId,
      dropoff_city_id: params.dropoffCityId,
      pickup_date: params.pickupDate,
      dropoff_date: params.dropoffDate,
      pickup_time: params.pickupTime,
      dropoff_time: params.dropoffTime,
      driver_age: params.driverAge,
    }).pipe(
      withBackoff(),
      map(
        (response): ApiResult<CarRental[]> => {
          if (response._mock) {
            return { data: response.data, error: null };
          }
          const resultsList =
            response?.getCarResultsRequest?.results?.results_list || {};
          const cars = Object.values(resultsList) as PricelineCar[];
          return {
            data: cars.map((car) => this.mapper.mapResponse(car, params)),
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
