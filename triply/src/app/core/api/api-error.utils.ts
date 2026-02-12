import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AppError } from './models/app-error.model';

/**
 * Discriminated union representing the result of a single API source call.
 *
 * Success:  { data: T;       error: null }
 * Failure:  { data: T;       error: AppError }  ← fallback data included
 *
 * Both variants carry data so forkJoin always receives a resolved value
 * even when one source fails. Components check error !== null to surface
 * partial-failure UI (e.g. "Results from Amadeus unavailable").
 */
export type ApiResult<T> =
  | { data: T; error: null }
  | { data: T; error: AppError };

/**
 * RxJS pipeable operator that wraps a source observable for safe composition
 * inside forkJoin. A failure in one source will NOT cancel sibling requests.
 *
 * Usage:
 *   forkJoin({
 *     flights: flightsService.search(params).pipe(withFallback([])),
 *     hotels:  hotelsService.search(params).pipe(withFallback([])),
 *   }).subscribe(({ flights, hotels }) => {
 *     if (flights.error) { // show partial-failure banner }
 *   });
 *
 * @param fallback Value returned as `data` when the source errors.
 *                 Must be the same type as the successful emission.
 */
export function withFallback<T>(
  fallback: T,
): (source$: Observable<T>) => Observable<ApiResult<T>> {
  return (source$: Observable<T>): Observable<ApiResult<T>> =>
    source$.pipe(
      map((data): ApiResult<T> => ({ data, error: null })),
      catchError((err: AppError): Observable<ApiResult<T>> =>
        of({ data: fallback, error: err }),
      ),
    );
}
