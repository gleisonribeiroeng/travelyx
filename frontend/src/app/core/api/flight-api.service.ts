import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { BaseApiService } from './base-api.service';
import { Flight } from '../models/trip.models';
import { ApiResult } from './api-error.utils';
import { AppError } from './models/app-error.model';
import { withBackoff } from './retry.utils';

export interface AirportOption {
  id: string;
  iataCode: string;
  name: string;
  cityName: string;
}

export interface FlightSearchParams {
  origin: string;
  destination: string;
  fromId?: string;
  toId?: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
}

/**
 * FlightApiService — calls NestJS backend which proxies Booking.com Flights API.
 * Backend maps all responses server-side and returns { data: [...] }.
 */
@Injectable({ providedIn: 'root' })
export class FlightApiService extends BaseApiService {
  constructor() {
    super('amadeus');
  }

  searchFlights(params: FlightSearchParams): Observable<ApiResult<Flight[]>> {
    const queryParams: Record<string, string | number | boolean> = {
      fromId: params.fromId || `${params.origin}.AIRPORT`,
      toId: params.toId || `${params.destination}.AIRPORT`,
      departureDate: params.departureDate,
      adults: params.adults,
    };

    if (params.returnDate) {
      queryParams['returnDate'] = params.returnDate;
    }

    return this.get<any>(
      '/v2/shopping/flight-offers',
      queryParams,
    ).pipe(
      withBackoff(),
      map(
        (response): ApiResult<Flight[]> => ({
          data: response.data || [],
          error: null,
        }),
      ),
      catchError(
        (error: AppError): Observable<ApiResult<Flight[]>> =>
          of({ data: [], error }),
      ),
    );
  }

  searchAirports(keyword: string): Observable<AirportOption[]> {
    if (keyword.length < 2) {
      return of([]);
    }

    return this.get<any>('/v1/reference-data/locations', {
      keyword,
      subType: 'AIRPORT,CITY',
      'page[limit]': 15,
      view: 'FULL',
    }).pipe(
      withBackoff(),
      map((response) => (response.data || []) as AirportOption[]),
      catchError(() => of([])),
    );
  }
}
