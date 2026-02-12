import { Injectable } from '@angular/core';
import { Activity } from '../models/trip.models';

/**
 * External Viator product response shape from Viator Partner API.
 * All fields are optional because API response format is based on public documentation.
 */
export interface ViatorProduct {
  productCode?: string;
  title?: string;
  description?: string;
  images?: Array<{ variants: Array<{ url: string }> }>;
  pricing?: {
    summary?: {
      fromPrice?: number;
      fromPriceBeforeDiscount?: number;
    };
    currency?: string;
  };
  bookingInfo?: {
    bookingUrl?: string;
  };
  location?: {
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  duration?: {
    fixedDurationInMinutes?: number;
  };
}

/**
 * Tour search parameters.
 * Used by TourApiService and TourMapper to structure search requests.
 */
export interface TourSearchParams {
  destination: string; // Free text city name
}

/**
 * TourMapper transforms external Viator API responses into canonical Activity models.
 *
 * Features:
 * - Maps Viator product response to Activity model
 * - Uses safe fallback chains for all optional fields
 * - Handles null duration correctly (durationMinutes uses ?? null, NOT || null)
 * - Does NOT implement Mapper interface (signature differs - takes two params)
 *
 * NOTE: Viator Partner API may require a partnership application.
 * The endpoint and parameters are based on public API documentation.
 */
@Injectable({ providedIn: 'root' })
export class TourMapper {
  /**
   * Transform an external Viator product response into a canonical Activity model.
   *
   * @param raw The external Viator product object
   * @param params Search parameters containing destination
   * @returns Canonical Activity model
   */
  mapResponse(raw: ViatorProduct, params: TourSearchParams): Activity {
    return {
      id: String(raw.productCode || crypto.randomUUID()),
      source: 'tours',
      addedToItinerary: false,
      name: raw.title || 'Untitled Tour',
      description: raw.description || '',
      location: {
        latitude: raw.location?.latitude || 0,
        longitude: raw.location?.longitude || 0,
      },
      city: params.destination,
      durationMinutes: raw.duration?.fixedDurationInMinutes ?? null,
      price: {
        total: raw.pricing?.summary?.fromPrice || 0,
        currency: raw.pricing?.currency || 'USD',
      },
      link: {
        url: raw.bookingInfo?.bookingUrl || '#',
        provider: 'Viator',
      },
    };
  }
}
