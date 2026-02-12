import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { ApiConfigService } from '../api-config.service';

/**
 * Set this token on an HttpRequest context to tell apiKeyInterceptor
 * which API key to inject. Value must match a key slot in ApiConfigService.
 * Example: context: new HttpContext().set(API_SOURCE, 'amadeus')
 */
export const API_SOURCE = new HttpContextToken<string | null>(() => null);

/**
 * Functional interceptor that injects an X-API-Key header when API_SOURCE
 * is set on the request context and a key is configured for that source.
 * Passes through silently if source is null or key is not configured.
 */
export const apiKeyInterceptor: HttpInterceptorFn = (req, next) => {
  const apiConfig = inject(ApiConfigService);
  const source = req.context.get(API_SOURCE);

  if (!source) {
    return next(req);
  }

  const key = apiConfig.getKey(source);
  if (!key) {
    return next(req);
  }

  const authReq = req.clone({
    headers: req.headers.set('X-API-Key', key),
  });

  return next(authReq);
};
