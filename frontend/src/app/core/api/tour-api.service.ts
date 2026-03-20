import { inject, Injectable } from '@angular/core';
import { CurrencyService } from '../i18n/currency.service';
import { TranslationService } from '../i18n/translation.service';
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
 * TourApiService — calls NestJS backend which proxies Viator Partner API.
 * Backend returns { _mock: true, data: [...] } in mock mode (already mapped),
 * or raw Viator response in real mode (needs mapping).
 */
@Injectable({ providedIn: 'root' })
export class TourApiService extends BaseApiService {
  private readonly mapper = inject(TourMapper);
  private readonly currencyService = inject(CurrencyService);
  private readonly i18n = inject(TranslationService);

  constructor() {
    super('tours');
  }

  searchTours(params: TourSearchParams): Observable<ApiResult<Activity[]>> {
    return this.post<any>('/partner/products/search', {
      filtering: { destination: params.destination },
      currency: this.currencyService.currency(),
      locale: this.i18n.lang() === 'en' ? 'en-us' : 'pt-br',
      pagination: { offset: 0, limit: 20 },
    }).pipe(
      withBackoff(),
      map(
        (response): ApiResult<Activity[]> => {
          if (response._mock) {
            return { data: response.data, error: null };
          }
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
