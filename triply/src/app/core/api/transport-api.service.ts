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
 * TransportApiService handles intercity transport API integration for bus, train, and ferry routes.
 *
 * Features:
 * - Intercity transport search with automatic mapping to Transport model
 * - Rate-limit retry with exponential backoff
 * - Standard X-API-Key authentication via apiKeyInterceptor (NOT RapidAPI)
 * - Per-source error isolation with fallback to empty results
 *
 * Extends BaseApiService('transport') for common HTTP patterns.
 *
 * NOTE: API provider is TBD. The endpoint path `/api/v1/transport/search` and parameter
 * names are HYPOTHETICAL placeholders. They MUST be updated when the actual transport
 * API provider is selected. The mapper is designed to handle response format uncertainty
 * with safe fallback chains.
 */
@Injectable({ providedIn: 'root' })
export class TransportApiService extends BaseApiService {
  private readonly mapper = inject(TransportMapper);

  constructor() {
    super('transport');
  }

  /**
   * Search for intercity transport routes (bus, train, ferry) based on origin, destination, and date.
   *
   * NOTE: The endpoint path, parameter names, and response format are HYPOTHETICAL.
   * They MUST be verified and updated when the actual transport API provider is selected.
   * The mapper uses flexible fallback chains to accommodate different response structures.
   *
   * @param params Transport search criteria
   * @returns Observable<ApiResult<Transport[]>> with mapped routes or error
   */
  searchTransport(params: TransportSearchParams): Observable<ApiResult<Transport[]>> {
    return this.get<any>('/api/v1/transport/search', {
      origin: params.origin,
      destination: params.destination,
      date: params.departureDate,
      currency: params.currency || 'USD',
    }).pipe(
      withBackoff(),
      map(
        (response): ApiResult<Transport[]> => {
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
