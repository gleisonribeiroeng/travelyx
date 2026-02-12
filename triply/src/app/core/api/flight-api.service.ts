import { inject, Injectable } from '@angular/core';
import { HttpContext, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { switchMap, map, catchError, tap } from 'rxjs/operators';
import { BaseApiService } from './base-api.service';
import { FlightMapper, AmadeusFlightOffer } from './flight.mapper';
import { Flight } from '../models/trip.models';
import { ApiResult } from './api-error.utils';
import { AppError } from './models/app-error.model';
import { withBackoff } from './retry.utils';
import { API_SOURCE } from './interceptors/api-key.interceptor';
import { environment } from '../../../environments/environment';

/**
 * Airport autocomplete option for search form.
 */
export interface AirportOption {
  iataCode: string;
  name: string;
  cityName: string;
}

/**
 * Flight search parameters for Amadeus Flight Offers API.
 */
export interface FlightSearchParams {
  origin: string; // IATA code
  destination: string; // IATA code
  departureDate: string; // YYYY-MM-DD
  returnDate?: string; // YYYY-MM-DD (optional for one-way)
  adults: number;
}

/**
 * FlightApiService handles Amadeus Flight Offers Search API integration.
 *
 * Features:
 * - OAuth2 bearer token management with 30-minute caching
 * - Flight offers search with automatic mapping to Flight model
 * - Airport/city autocomplete for search form
 * - Rate-limit retry with exponential backoff
 *
 * Extends BaseApiService('amadeus') for common HTTP patterns.
 */
@Injectable({ providedIn: 'root' })
export class FlightApiService extends BaseApiService {
  private readonly mapper = inject(FlightMapper);
  private cachedToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor() {
    super('amadeus');
  }

  /**
   * Search for flight offers based on origin, destination, dates, and passengers.
   *
   * @param params Flight search criteria
   * @returns Observable<ApiResult<Flight[]>> with mapped flights or error
   */
  searchFlights(params: FlightSearchParams): Observable<ApiResult<Flight[]>> {
    const queryParams: Record<string, string | number | boolean> = {
      originLocationCode: params.origin,
      destinationLocationCode: params.destination,
      departureDate: params.departureDate,
      adults: params.adults,
      max: 50,
    };

    if (params.returnDate) {
      queryParams['returnDate'] = params.returnDate;
    }

    return this.authenticatedGet<{ data: AmadeusFlightOffer[] }>(
      '/v2/shopping/flight-offers',
      queryParams,
    ).pipe(
      map(
        (response): ApiResult<Flight[]> => ({
          data: response.data.map((offer) => this.mapper.mapResponse(offer)),
          error: null,
        }),
      ),
      catchError(
        (error: AppError): Observable<ApiResult<Flight[]>> =>
          of({ data: [], error }),
      ),
    );
  }

  /**
   * Search for airports and cities by keyword for autocomplete.
   *
   * @param keyword Search term (minimum 2 characters)
   * @returns Observable<AirportOption[]> with matching locations
   */
  searchAirports(keyword: string): Observable<AirportOption[]> {
    if (keyword.length < 2) {
      return of([]);
    }

    return this.authenticatedGet<{
      data: Array<{
        iataCode: string;
        name: string;
        address?: { cityName?: string };
      }>;
    }>('/v1/reference-data/locations', {
      keyword,
      subType: 'AIRPORT,CITY',
    }).pipe(
      map((response) =>
        response.data.map((airport) => ({
          iataCode: airport.iataCode,
          name: airport.name,
          cityName: airport.address?.cityName || airport.name,
        })),
      ),
      catchError(() => of([])),
    );
  }

  /**
   * Get OAuth2 access token from Amadeus, with 30-minute caching.
   * Proactively refreshes 2 minutes before expiry.
   *
   * @returns Observable<string> Bearer token
   */
  private getAccessToken(): Observable<string> {
    // Return cached token if still valid
    if (this.cachedToken && this.tokenExpiresAt > Date.now()) {
      return of(this.cachedToken);
    }

    // Request new token
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: environment.amadeusApiKey,
      client_secret: environment.amadeusApiSecret,
    }).toString();

    const url =
      this.config.getEndpoint(this.apiSource) + '/v1/security/oauth2/token';
    const context = new HttpContext().set(API_SOURCE, this.apiSource);

    return this.http
      .post<{ access_token: string; expires_in: number }>(url, body, {
        context,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })
      .pipe(
        tap((response) => {
          this.cachedToken = response.access_token;
          // Subtract 2 minutes (120 seconds) buffer before expiry
          this.tokenExpiresAt = Date.now() + (response.expires_in - 120) * 1000;
        }),
        map((response) => response.access_token),
      );
  }

  /**
   * Authenticated GET request with automatic bearer token injection.
   * Applies rate-limit retry with exponential backoff.
   *
   * @param path API endpoint path
   * @param params Query parameters
   * @returns Observable<T> Response data
   */
  private authenticatedGet<T>(
    path: string,
    params?: Record<string, string | number | boolean>,
  ): Observable<T> {
    return this.getAccessToken().pipe(
      switchMap((token) => {
        const url = this.config.getEndpoint(this.apiSource) + path;
        const context = new HttpContext().set(API_SOURCE, this.apiSource);

        let httpParams = new HttpParams();
        if (params) {
          for (const [key, value] of Object.entries(params)) {
            httpParams = httpParams.set(key, String(value));
          }
        }

        return this.http
          .get<T>(url, {
            params: httpParams,
            headers: {
              Authorization: `Bearer ${token}`,
            },
            context,
          })
          .pipe(withBackoff());
      }),
    );
  }
}
