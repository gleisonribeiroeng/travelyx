import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { BaseApiService } from './base-api.service';
import { TourMapper, ViatorProduct, TourSearchParams } from './tour.mapper';
import { Activity } from '../models/trip.models';
import { ApiResult } from './api-error.utils';
import { AppError } from './models/app-error.model';
import { withBackoff } from './retry.utils';

// Re-export TourSearchParams for convenience
export type { TourSearchParams } from './tour.mapper';

/**
 * TourApiService handles Viator Partner API integration for tours and experiences search.
 *
 * Features:
 * - Tours/experiences search with automatic mapping to Activity model
 * - Rate-limit retry with exponential backoff
 * - Standard X-API-Key authentication via apiKeyInterceptor (NOT RapidAPI)
 * - Per-source error isolation with fallback to empty results
 *
 * Extends BaseApiService('tours') for common HTTP patterns.
 *
 * NOTE: Viator Partner API may require a partnership application with lead time.
 * The endpoint path `/partner/products/search` and parameters are based on public
 * API documentation. They MUST be verified when the Viator partnership is approved.
 * The mapper is designed to handle response format uncertainty with safe fallback chains.
 */
@Injectable({ providedIn: 'root' })
export class TourApiService extends BaseApiService {
  private readonly mapper = inject(TourMapper);

  constructor() {
    super('tours');
  }

  /**
   * Search for tours and experiences based on destination.
   *
   * NOTE: This endpoint uses POST (not GET) because Viator /products/search accepts
   * complex filtering criteria in the request body.
   *
   * @param params Tour search criteria
   * @returns Observable<ApiResult<Activity[]>> with mapped tours or error
   */
  searchTours(params: TourSearchParams): Observable<ApiResult<Activity[]>> {
    return this.post<any>('/partner/products/search', {
      filtering: { destination: params.destination },
      pagination: { offset: 0, limit: 20 },
      sorting: { sort: 'REVIEW_AVG_RATING_D' },
    }).pipe(
      withBackoff(),
      map(
        (response): ApiResult<Activity[]> => {
          // Defensive extraction - API may return products at different nesting levels
          const results =
            response.products || response.data?.products || response.data || [];
          const products = Array.isArray(results) ? results : [];
          return {
            data: products.map((product: ViatorProduct) =>
              this.mapper.mapResponse(product, params),
            ),
            error: null,
          };
        },
      ),
      catchError(
        (error: AppError): Observable<ApiResult<Activity[]>> =>
          of({ data: [], error }),
      ),
    );
  }
}
