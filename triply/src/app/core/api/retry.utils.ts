import { MonoTypeOperatorFunction } from 'rxjs';
import { retry, timer, throwError } from 'rxjs';

/** HTTP status codes that warrant an automatic retry with exponential backoff. */
export const RETRIABLE_STATUS_CODES = [429, 502, 503, 504];

export const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 8000,
};

/**
 * RxJS pipeable operator that retries an HTTP observable with exponential backoff
 * for retriable server/rate-limit errors, and fails immediately for non-retriable errors.
 *
 * Uses the modern RxJS 7.3+ `retry({ count, delay })` API — NOT the deprecated `retryWhen`.
 *
 * @example
 * ```typescript
 * this.http.get('/api/amadeus/flights').pipe(
 *   withBackoff(),                    // default: 3 retries, 1s / 2s / 4s delays
 *   withBackoff({ maxRetries: 5 }),   // custom config
 * )
 * ```
 *
 * Retriable status codes: 429 (rate-limit), 502 (bad gateway), 503 (unavailable), 504 (gateway timeout).
 * Non-retriable errors (400, 401, 403, 404, etc.) propagate immediately without consuming retry budget.
 */
export function withBackoff<T>(
  config?: Partial<typeof DEFAULT_RETRY_CONFIG>,
): MonoTypeOperatorFunction<T> {
  const merged = { ...DEFAULT_RETRY_CONFIG, ...config };

  return retry({
    count: merged.maxRetries,
    delay: (error, retryIndex) => {
      if (RETRIABLE_STATUS_CODES.includes(error.status)) {
        const delay = Math.min(
          merged.initialDelay * Math.pow(2, retryIndex - 1),
          merged.maxDelay,
        );
        return timer(delay);
      }
      // Non-retriable errors (400, 401, 403, 404, etc.) fail immediately
      return throwError(() => error);
    },
  });
}
