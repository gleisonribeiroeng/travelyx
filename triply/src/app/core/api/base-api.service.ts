import { inject } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiConfigService } from './api-config.service';
import { API_SOURCE } from './interceptors/api-key.interceptor';

/**
 * Abstract base class for all feature API services.
 *
 * Subclasses call super(apiSource) with the registered source identifier
 * (e.g. 'amadeus', 'hotel', 'tours'). Every request produced by the
 * protected get/post helpers will automatically:
 *   1. Resolve the full proxy URL via ApiConfigService.getEndpoint()
 *   2. Set the API_SOURCE HttpContextToken so apiKeyInterceptor can
 *      inject the correct X-API-Key header
 *
 * Subclasses MUST declare @Injectable({ providedIn: 'root' }) — this base
 * class intentionally omits @Injectable() to avoid double-registration.
 *
 * Usage:
 *   @Injectable({ providedIn: 'root' })
 *   export class FlightsApiService extends BaseApiService {
 *     constructor() { super('amadeus'); }
 *
 *     searchOffers(params: FlightSearchParams): Observable<AmadeusFlightOffersResponse> {
 *       return this.get('/v2/shopping/flight-offers', { ... });
 *     }
 *   }
 */
export abstract class BaseApiService {
  protected readonly http = inject(HttpClient);
  protected readonly config = inject(ApiConfigService);

  /**
   * @param apiSource The source identifier registered in ApiConfigService,
   *                  e.g. 'amadeus', 'hotel', 'carRental'.
   */
  protected constructor(protected readonly apiSource: string) {}

  /**
   * HTTP GET request against the registered endpoint for this service's
   * apiSource. Automatically injects API_SOURCE onto the request context.
   *
   * @param path   Path relative to the source's base URL, e.g. '/v2/shopping/flight-offers'
   * @param params Optional query parameters (values serialised to strings)
   */
  protected get<T>(
    path: string,
    params?: Record<string, string | number | boolean>,
  ): Observable<T> {
    const url = this.config.getEndpoint(this.apiSource) + path;
    const context = new HttpContext().set(API_SOURCE, this.apiSource);

    let httpParams = new HttpParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        httpParams = httpParams.set(key, String(value));
      }
    }

    return this.http.get<T>(url, { params: httpParams, context });
  }

  /**
   * HTTP POST request against the registered endpoint for this service's
   * apiSource. Automatically injects API_SOURCE onto the request context.
   *
   * @param path Path relative to the source's base URL
   * @param body Request body (will be serialised as JSON)
   */
  protected post<T>(path: string, body: unknown): Observable<T> {
    const url = this.config.getEndpoint(this.apiSource) + path;
    const context = new HttpContext().set(API_SOURCE, this.apiSource);
    return this.http.post<T>(url, body, { context });
  }
}
