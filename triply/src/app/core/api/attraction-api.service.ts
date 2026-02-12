import { inject, Injectable } from '@angular/core';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { BaseApiService } from './base-api.service';
import {
  AttractionMapper,
  GeonameResponse,
  RadiusFeature,
  PlaceDetails,
  AttractionSearchParams,
} from './attraction.mapper';
import { Attraction } from '../models/trip.models';
import { ApiResult } from './api-error.utils';
import { AppError } from './models/app-error.model';
import { withBackoff } from './retry.utils';

// Re-export AttractionSearchParams for convenience
export type { AttractionSearchParams } from './attraction.mapper';

/**
 * AttractionApiService handles OpenTripMap API integration for attractions search.
 *
 * Features:
 * - Three-step search flow: geoname lookup -> radius search -> details enrichment
 * - Automatic mapping to Attraction model with nullable link field
 * - Rate-limit retry with exponential backoff
 * - Standard X-API-Key authentication via apiKeyInterceptor
 * - Per-source error isolation with fallback to empty results
 *
 * Extends BaseApiService('attractions') for common HTTP patterns.
 *
 * OpenTripMap API Flow:
 * 1. GET /0.1/en/places/geoname?name={city} -> { lat, lon }
 * 2. GET /0.1/en/places/radius?lat={lat}&lon={lon}&radius=5000 -> RadiusFeature[]
 * 3. GET /0.1/en/places/xid/{xid} (for each feature) -> PlaceDetails
 *
 * NOTE: OpenTripMap uses `apikey` query parameter. The interceptor sends X-API-Key header.
 * If this doesn't work at runtime, the `apikey` param can be manually added here.
 */
@Injectable({ providedIn: 'root' })
export class AttractionApiService extends BaseApiService {
  private readonly mapper = inject(AttractionMapper);

  constructor() {
    super('attractions');
  }

  /**
   * Search for attractions based on city name.
   * Orchestrates three-step OpenTripMap flow.
   *
   * @param params Attraction search criteria
   * @returns Observable<ApiResult<Attraction[]>> with mapped attractions or error
   */
  searchAttractions(
    params: AttractionSearchParams,
  ): Observable<ApiResult<Attraction[]>> {
    return this.getGeoname(params.city).pipe(
      switchMap((geonameResult) => {
        // If geoname lookup failed or returned no data, return early
        if (geonameResult.error !== null || geonameResult.data === null) {
          return of({
            data: [],
            error: geonameResult.error,
          } as ApiResult<Attraction[]>);
        }

        const { lat, lon } = geonameResult.data;
        return this.getRadius(lat, lon);
      }),
      switchMap((radiusResult) => {
        // If radius search failed, return early
        if (radiusResult.error !== null) {
          return of({
            data: [],
            error: radiusResult.error,
          } as ApiResult<Attraction[]>);
        }

        return this.enrichWithDetails(radiusResult.data, params);
      }),
    );
  }

  /**
   * Step 1: Resolve city name to geographic coordinates using OpenTripMap geoname endpoint.
   *
   * @param cityName Free text city name
   * @returns Observable<ApiResult<{lat, lon} | null>> with coordinates or null if not found
   */
  private getGeoname(
    cityName: string,
  ): Observable<ApiResult<{ lat: number; lon: number } | null>> {
    return this.get<GeonameResponse>('/0.1/en/places/geoname', {
      name: cityName,
    }).pipe(
      withBackoff(),
      map(
        (response): ApiResult<{ lat: number; lon: number } | null> => {
          if (response.lat !== undefined && response.lon !== undefined) {
            return {
              data: { lat: response.lat, lon: response.lon },
              error: null,
            };
          }
          return { data: null, error: null };
        },
      ),
      catchError(
        (error: AppError): Observable<
          ApiResult<{ lat: number; lon: number } | null>
        > => of({ data: null, error }),
      ),
    );
  }

  /**
   * Step 2: Search for attractions within a radius of the given coordinates.
   *
   * @param lat Latitude
   * @param lon Longitude
   * @param radius Search radius in meters (default: 5000)
   * @returns Observable<ApiResult<RadiusFeature[]>> with features or empty array
   */
  private getRadius(
    lat: number,
    lon: number,
    radius: number = 5000,
  ): Observable<ApiResult<RadiusFeature[]>> {
    return this.get<any>('/0.1/en/places/radius', {
      lat: lat.toString(),
      lon: lon.toString(),
      radius: radius.toString(),
      limit: '20',
      rate: '2', // Filter for named attractions only (1=unnamed, 2=named, 3=famous)
    }).pipe(
      withBackoff(),
      map(
        (response): ApiResult<RadiusFeature[]> => {
          // Defensive extraction - API may return features array or direct array
          const rawFeatures =
            response.features || (Array.isArray(response) ? response : []);
          // Filter out features with empty names
          const features = rawFeatures.filter(
            (f: RadiusFeature) => f.name && f.name.trim() !== '',
          );
          return { data: features, error: null };
        },
      ),
      catchError(
        (error: AppError): Observable<ApiResult<RadiusFeature[]>> =>
          of({ data: [], error }),
      ),
    );
  }

  /**
   * Step 3: Enrich basic attractions with detailed information from OpenTripMap details endpoint.
   * Fetches details for each feature in parallel using forkJoin.
   *
   * @param features Array of radius features from step 2
   * @param params Search parameters containing city name
   * @returns Observable<ApiResult<Attraction[]>> with enriched attractions or basic fallback
   */
  private enrichWithDetails(
    features: RadiusFeature[],
    params: AttractionSearchParams,
  ): Observable<ApiResult<Attraction[]>> {
    // If no features, return empty array immediately
    if (features.length === 0) {
      return of({ data: [], error: null });
    }

    // Map each feature to basic Attraction
    const basicAttractions = features.map((feature) =>
      this.mapper.mapResponse(feature, params),
    );

    // Fetch details for each feature in parallel
    const detailRequests = features.map((feature) => {
      if (!feature.xid) {
        return of(null);
      }
      return this.get<PlaceDetails>(`/0.1/en/places/xid/${feature.xid}`).pipe(
        withBackoff(),
        catchError(() => of(null)),
      );
    });

    return forkJoin(detailRequests).pipe(
      map(
        (detailsArray): ApiResult<Attraction[]> => {
          const enrichedAttractions = basicAttractions.map(
            (attraction, index) => {
              const details = detailsArray[index];
              if (details === null) {
                return attraction; // Keep basic attraction if details fetch failed
              }
              return this.mapper.enrichWithDetails(attraction, details);
            },
          );
          return { data: enrichedAttractions, error: null };
        },
      ),
      catchError(
        (error: AppError): Observable<ApiResult<Attraction[]>> => {
          // If enrichment fails entirely, return basic attractions as fallback
          return of({ data: basicAttractions, error });
        },
      ),
    );
  }
}
