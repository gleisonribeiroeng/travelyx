import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../../services/loading.service';

/**
 * Functional interceptor that tracks in-flight HTTP requests via LoadingService.
 * Increments the counter on every request and decrements via finalize(),
 * guaranteeing the counter always decrements regardless of success or error.
 */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);

  loadingService.increment();

  return next(req).pipe(
    finalize(() => loadingService.decrement()),
  );
};
