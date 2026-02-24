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
 * AttractionApiService — calls NestJS backend for OpenTripMap API.
 * Backend returns { _mock: true, data: [...] } in mock mode (already mapped),
 * or raw OpenTripMap response in real mode (needs 3-step mapping).
 *
 * Real mode flow:
 * 1. GET /0.1/en/places/geoname?name={city} -> { lat, lon }
 * 2. GET /0.1/en/places/radius?lat={lat}&lon={lon}&radius=5000 -> RadiusFeature[]
 * 3. GET /0.1/en/places/xid/{xid} (for each feature) -> PlaceDetails
 */
@Injectable({ providedIn: 'root' })
export class AttractionApiService extends BaseApiService {
  private readonly mapper = inject(AttractionMapper);

  constructor() {
    super('attractions');
  }

  searchAttractions(
    params: AttractionSearchParams,
  ): Observable<ApiResult<Attraction[]>> {
    return this.get<any>('/0.1/en/places/geoname', {
      name: params.city,
    }).pipe(
      switchMap((geonameResponse) => {
        // Mock mode: backend returns full attraction data at geoname endpoint
        if (geonameResponse._mock) {
          return of<ApiResult<Attraction[]>>({
            data: geonameResponse.data,
            error: null,
          });
        }

        // Real mode: continue with 3-step flow
        return this.handleRealGeoname(geonameResponse, params);
      }),
      catchError(
        (error: AppError): Observable<ApiResult<Attraction[]>> =>
          of({ data: [], error }),
      ),
    );
  }

  private handleRealGeoname(
    response: GeonameResponse,
    params: AttractionSearchParams,
  ): Observable<ApiResult<Attraction[]>> {
    if (response.lat === undefined || response.lon === undefined) {
      return of({ data: [], error: null });
    }

    const { lat, lon } = response;
    return this.getRadius(lat, lon).pipe(
      switchMap((radiusResult) => {
        if (radiusResult.error !== null) {
          return of<ApiResult<Attraction[]>>({
            data: [],
            error: radiusResult.error,
          });
        }
        return this.enrichWithDetails(radiusResult.data, params);
      }),
    );
  }

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
      rate: '2',
    }).pipe(
      withBackoff(),
      map(
        (response): ApiResult<RadiusFeature[]> => {
          if (response._mock) {
            return { data: response.data, error: null };
          }
          const rawFeatures =
            response.features || (Array.isArray(response) ? response : []);
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

  private enrichWithDetails(
    features: RadiusFeature[],
    params: AttractionSearchParams,
  ): Observable<ApiResult<Attraction[]>> {
    if (features.length === 0) {
      return of({ data: [], error: null });
    }

    const basicAttractions = features.map((feature) =>
      this.mapper.mapResponse(feature, params),
    );

    const detailRequests = features.map((feature) => {
      if (!feature.xid) {
        return of(null);
      }
      return this.get<any>(`/0.1/en/places/xid/${feature.xid}`).pipe(
        withBackoff(),
        map((response) => {
          if (response._mock) {
            return response.data as PlaceDetails;
          }
          return response as PlaceDetails;
        }),
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
                return attraction;
              }
              return this.mapper.enrichWithDetails(attraction, details);
            },
          );
          return { data: enrichedAttractions, error: null };
        },
      ),
      catchError(
        (error: AppError): Observable<ApiResult<Attraction[]>> => {
          return of({ data: basicAttractions, error });
        },
      ),
    );
  }
}
