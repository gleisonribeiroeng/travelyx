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

export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  hasMore: boolean;
  error: AppError | null;
}

@Injectable({ providedIn: 'root' })
export class TourApiService extends BaseApiService {
  private readonly mapper = inject(TourMapper);
  private readonly currencyService = inject(CurrencyService);
  private readonly i18n = inject(TranslationService);

  constructor() {
    super('tours');
  }

  searchTours(params: TourSearchParams, offset = 0, limit = 20): Observable<ApiResult<Activity[]>> {
    return this.searchToursPaginated(params, offset, limit).pipe(
      map(result => ({ data: result.data, error: result.error })),
    );
  }

  searchToursPaginated(params: TourSearchParams, offset = 0, limit = 20): Observable<PaginatedResult<Activity>> {
    const body: any = {
      filtering: { destination: params.destination },
      currency: this.currencyService.currency(),
      locale: this.i18n.lang() === 'en' ? 'en-us' : 'pt-br',
      pagination: { offset, limit },
    };
    if (params.keyword?.trim()) {
      body.searchTerm = params.keyword.trim();
    }
    if (params.sorting) {
      body.sorting = params.sorting;
    }
    return this.post<any>('/partner/products/search', body).pipe(
      withBackoff(),
      map((response): PaginatedResult<Activity> => {
        if (response._mock) {
          return { data: response.data, totalCount: response.data?.length || 0, hasMore: false, error: null };
        }
        const results = response.products || response.data?.products || response.data || [];
        const products = Array.isArray(results) ? results : [];
        const totalCount = response.totalCount ?? response.data?.totalCount ?? products.length;
        return {
          data: products.map((product: ViatorProduct) => this.mapper.mapResponse(product, params)),
          totalCount,
          hasMore: offset + products.length < totalCount,
          error: null,
        };
      }),
      catchError((error: AppError): Observable<PaginatedResult<Activity>> =>
        of({ data: [], totalCount: 0, hasMore: false, error }),
      ),
    );
  }
}
