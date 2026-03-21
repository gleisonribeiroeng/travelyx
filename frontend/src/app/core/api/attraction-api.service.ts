import { inject, Injectable } from '@angular/core';
import { CurrencyService } from '../i18n/currency.service';
import { TranslationService } from '../i18n/translation.service';
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

export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  hasMore: boolean;
  error: AppError | null;
}

@Injectable({ providedIn: 'root' })
export class AttractionApiService extends BaseApiService {
  private readonly mapper = inject(AttractionMapper);
  private readonly currencyService = inject(CurrencyService);
  private readonly i18n = inject(TranslationService);

  constructor() {
    super('attractions');
  }

  searchAttractions(params: AttractionSearchParams, offset = 0, limit = 20): Observable<ApiResult<Attraction[]>> {
    return this.searchAttractionsPaginated(params, offset, limit).pipe(
      map(result => ({ data: result.data, error: result.error })),
    );
  }

  searchAttractionsPaginated(params: AttractionSearchParams, offset = 0, limit = 20): Observable<PaginatedResult<Attraction>> {
    return this.post<any>('/search', {
      filtering: { destination: params.city },
      currency: this.currencyService.currency(),
      locale: this.i18n.lang() === 'en' ? 'en-us' : 'pt-br',
      pagination: { offset, limit },
    }).pipe(
      withBackoff(),
      map((response): PaginatedResult<Attraction> => {
        const results = response.products || response.data?.products || response.data || [];
        const products = Array.isArray(results) ? results : [];
        const totalCount = response.totalCount ?? response.data?.totalCount ?? products.length;
        return {
          data: products.map((product: ViatorAttractionProduct) => this.mapper.mapResponse(product, params)),
          totalCount,
          hasMore: offset + products.length < totalCount,
          error: null,
        };
      }),
      catchError((error: AppError): Observable<PaginatedResult<Attraction>> =>
        of({ data: [], totalCount: 0, hasMore: false, error }),
      ),
    );
  }
}
