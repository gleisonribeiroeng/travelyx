import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AppError } from '../models/app-error.model';
import { API_SOURCE } from './api-key.interceptor';

/**
 * Functional interceptor that normalizes all HttpErrorResponse instances
 * to the AppError shape before they reach feature code.
 * Feature services should only ever see AppError — never raw HttpErrorResponse.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const normalized: AppError = {
        status: error.status,
        code: error.error?.code ?? 'UNKNOWN',
        message:
          error.error?.detail ??
          error.error?.message ??
          error.message ??
          'An unexpected error occurred',
        source: req.context.get(API_SOURCE) ?? 'unknown',
        timestamp: new Date().toISOString(),
      };

      return throwError(() => normalized);
    }),
  );
};
