import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { BaseApiService } from './base-api.service';
import {
  AttractionMapper,
  ViatorAttractionProduct,
  AttractionSearchParams,
} from './attraction.mapper';
import { Attraction } from '../models/trip.models';
import { ApiResult } from './api-error.utils';
import { AppError } from './models/app-error.model';
import { withBackoff } from './retry.utils';

// Re-export AttractionSearchParams for convenience
export type { AttractionSearchParams } from './attraction.mapper';

/**
 * AttractionApiService — calls NestJS backend which proxies Viator Partner API.
 * Backend returns { _mock: true, data: [...] } in mock mode (already mapped),
 * or raw Viator response in real mode (needs mapping).
 */
@Injectable({ providedIn: 'root' })
export class AttractionApiService extends BaseApiService {
  private readonly mapper = inject(AttractionMapper);

  constructor() {
    super('attractions');
  }

  searchAttractions(
    params: AttractionSearchParams,
  ): Observable<ApiResult<Attraction[]>> {
    return this.post<any>('/search', {
      filtering: { destination: params.city },
      currency: 'BRL',
      pagination: { offset: 0, limit: 20 },
    }).pipe(
      withBackoff(),
      map((response): ApiResult<Attraction[]> => {
        if (response._mock) {
          return { data: response.data, error: null };
        }
        const results =
          response.products || response.data?.products || response.data || [];
        const products = Array.isArray(results) ? results : [];
        return {
          data: products.map((product: ViatorAttractionProduct) =>
            this.mapper.mapResponse(product, params),
          ),
          error: null,
        };
      }),
      catchError(
        (error: AppError): Observable<ApiResult<Attraction[]>> =>
          of({ data: [], error }),
      ),
    );
  }
}
