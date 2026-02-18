import { Observable, OperatorFunction } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs/operators';

/** Default debounce interval (ms) applied to search form value streams. */
export const DEFAULT_DEBOUNCE_MS = 400;

/**
 * RxJS pipeable operator for search form value streams.
 *
 * Applies, in order:
 * 1. `debounceTime` — waits until typing pauses before emitting (prevents per-keystroke requests)
 * 2. `distinctUntilChanged` — skips duplicate values (deep JSON comparison)
 * 3. `filter` — removes null/undefined values (e.g. when form is cleared)
 * 4. `switchMap` — maps to the search observable, cancelling any in-flight request when a new value arrives
 *
 * `debounceTime` sits BEFORE `switchMap` to prevent request creation on every keystroke.
 * `switchMap` ensures only the latest search is active — stale in-flight requests are unsubscribed.
 *
 * @param searchFn - Function that takes a form value and returns the search Observable
 * @param debounceMs - Debounce interval in milliseconds (default: 400)
 *
 * @example
 * ```typescript
 * // In search component:
 * this.searchForm.valueChanges.pipe(
 *   debouncedSearch(params => this.flightsApi.search(params)),
 * ).subscribe(results => this.results.set(results));
 * ```
 */
export function debouncedSearch<TInput, TOutput>(
  searchFn: (input: TInput) => Observable<TOutput>,
  debounceMs: number = DEFAULT_DEBOUNCE_MS,
): OperatorFunction<TInput, TOutput> {
  return (source$: Observable<TInput>) =>
    source$.pipe(
      debounceTime(debounceMs),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      filter((value): value is TInput => value != null),
      switchMap(value => searchFn(value)),
    );
}
