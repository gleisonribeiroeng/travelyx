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
 * RapidAPI sources mapped to their respective host headers.
 * Each source gets X-RapidAPI-Key and the correct X-RapidAPI-Host.
 */
const RAPID_API_HOSTS: Record<string, string> = {
  hotel: 'booking-com15.p.rapidapi.com',
  carRental: 'priceline-com-provider.p.rapidapi.com',
};

/**
 * Functional interceptor that injects API key headers when API_SOURCE
 * is set on the request context and a key is configured for that source.
 * - RapidAPI sources (hotel, carRental) get X-RapidAPI-Key and X-RapidAPI-Host
 * - Other sources get X-API-Key
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

  const rapidApiHost = RAPID_API_HOSTS[source];
  if (rapidApiHost) {
    const authReq = req.clone({
      headers: req.headers
        .set('X-RapidAPI-Key', key)
        .set('X-RapidAPI-Host', rapidApiHost),
    });
    return next(authReq);
  }

  const authReq = req.clone({
    headers: req.headers.set('X-API-Key', key),
  });

  return next(authReq);
};
