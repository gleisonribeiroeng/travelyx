import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { BaseApiService } from './base-api.service';
import { FlightMapper, AmadeusFlightOffer } from './flight.mapper';
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
 * FlightApiService — calls NestJS backend which handles Amadeus OAuth2.
 * Backend returns { _mock: true, data: [...] } in mock mode (already mapped),
 * or raw Amadeus response in real mode (needs mapping).
 */
@Injectable({ providedIn: 'root' })
export class FlightApiService extends BaseApiService {
  private readonly mapper = inject(FlightMapper);

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
        (response): ApiResult<Flight[]> => {
          if (response._mock) {
            return { data: response.data, error: null };
          }
          return {
            data: response.data.map((offer: AmadeusFlightOffer) => this.mapper.mapResponse(offer)),
            error: null,
          };
        },
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
      map((response) => {
        if (response._mock) {
          return response.data as AirportOption[];
        }
        return response.data.map((airport: any) => ({
          id: airport.id || '',
          iataCode: airport.iataCode || airport.code || '',
          name: airport.name,
          cityName: airport.address?.cityName || airport.cityName || airport.name,
        }));
      }),
      catchError(() => of([])),
    );
  }
}
