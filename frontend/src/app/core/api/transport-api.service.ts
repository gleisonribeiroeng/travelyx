import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { BaseApiService } from './base-api.service';
import { TransportMapper, ExternalRoute, TransportSearchParams } from './transport.mapper';
import { Transport } from '../models/trip.models';
import { ApiResult } from './api-error.utils';
import { AppError } from './models/app-error.model';
import { withBackoff } from './retry.utils';

// Re-export TransportSearchParams for convenience
export type { TransportSearchParams } from './transport.mapper';

/**
 * TransportApiService — calls NestJS backend for intercity transport (bus, train, ferry).
 * Backend returns { _mock: true, data: [...] } in mock mode (already mapped),
 * or raw API response in real mode (needs mapping).
 */
@Injectable({ providedIn: 'root' })
export class TransportApiService extends BaseApiService {
  private readonly mapper = inject(TransportMapper);

  constructor() {
    super('transport');
  }

  searchTransport(params: TransportSearchParams): Observable<ApiResult<Transport[]>> {
    return this.get<any>('/api/v1/transport/search', {
      origin: params.origin,
      destination: params.destination,
      date: params.departureDate,
      currency: 'BRL',
    }).pipe(
      withBackoff(),
      map(
        (response): ApiResult<Transport[]> => {
          if (response._mock) {
            return { data: response.data, error: null };
          }
          const results =
            response.data?.routes || response.data?.results || response.data || [];
          const routes = Array.isArray(results) ? results : [];
          return {
            data: routes.map((route: ExternalRoute) =>
              this.mapper.mapResponse(route, params),
            ),
            error: null,
          };
        },
      ),
      catchError(
        (error: AppError): Observable<ApiResult<Transport[]>> =>
          of({ data: [], error }),
      ),
    );
  }
}
