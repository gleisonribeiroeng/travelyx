import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AppError } from '../models/app-error.model';
import { API_SOURCE } from './api-key.interceptor';
import { AuthService } from '../../services/auth.service';

/**
 * Functional interceptor that normalizes all HttpErrorResponse instances
 * to the AppError shape before they reach feature code.
 * Feature services should only ever see AppError — never raw HttpErrorResponse.
 *
 * Also handles 401 responses by force-logging out and redirecting to landing.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Token expired or invalid — force logout and redirect
      if (error.status === 401) {
        authService.forceLogout();
      }

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
