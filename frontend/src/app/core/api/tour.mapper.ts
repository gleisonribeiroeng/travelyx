import { Injectable } from '@angular/core';
import { Activity } from '../models/trip.models';

/**
 * External Viator product response shape from Viator Partner API.
 * All fields are optional because API response format is based on public documentation.
 */
export interface ViatorImageVariant {
  url: string;
  width?: number;
  height?: number;
}

/**
 * Pick the best quality image variant from Viator's variants array.
 * Prefers variants with width >= 720px. Falls back to the largest available.
 */
export function pickBestVariant(variants?: ViatorImageVariant[]): string | undefined {
  if (!variants?.length) return undefined;

  // If variants have width info, pick the best one
  const withSize = variants.filter(v => v.width);
  if (withSize.length) {
    // Sort by width descending, pick the first one >= 720 or the largest
    const sorted = [...withSize].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
    const ideal = sorted.find(v => (v.width ?? 0) >= 720 && (v.width ?? 0) <= 1200);
    return (ideal ?? sorted[0])?.url;
  }

  // No size info — pick the last variant (Viator sorts smallest to largest)
  return variants[variants.length - 1]?.url;
}

export interface ViatorProduct {
  productCode?: string;
  title?: string;
  description?: string;
  images?: Array<{ variants: ViatorImageVariant[] }>;
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
  reviews?: {
    combinedAverageRating?: number;
    totalReviews?: number;
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
      rating: raw.reviews?.combinedAverageRating ?? null,
      reviewCount: raw.reviews?.totalReviews ?? 0,
      price: {
        total: raw.pricing?.summary?.fromPrice || 0,
        currency: 'BRL', // TODO: dynamic currency based on user locale
      },
      images: (raw.images || [])
        .map(img => pickBestVariant(img.variants))
        .filter((u): u is string => !!u),
      link: {
        url: raw.bookingInfo?.bookingUrl || '#',
        provider: 'Viator',
      },
    };
  }
}
