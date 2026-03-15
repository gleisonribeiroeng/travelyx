import { Injectable } from '@angular/core';
import { Attraction } from '../models/trip.models';

/**
 * Viator product response shape (same as tours).
 */
export interface ViatorAttractionProduct {
  productCode?: string;
  title?: string;
  description?: string;
  images?: Array<{ variants: Array<{ url: string }> }>;
  pricing?: {
    summary?: {
      fromPrice?: number;
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
  tags?: Array<{ tagId: number; allNamesByLocale?: Record<string, string> }>;
}

/**
 * Attraction search parameters.
 */
export interface AttractionSearchParams {
  city: string;
}

/**
 * AttractionMapper transforms Viator API responses into canonical Attraction models.
 */
@Injectable({ providedIn: 'root' })
export class AttractionMapper {
  mapResponse(raw: ViatorAttractionProduct, params: AttractionSearchParams): Attraction {
    const category = this.extractCategory(raw.tags);

    return {
      id: String(raw.productCode || crypto.randomUUID()),
      source: 'attractions',
      addedToItinerary: false,
      name: raw.title || 'Atração sem nome',
      description: raw.description || '',
      location: {
        latitude: raw.location?.latitude || 0,
        longitude: raw.location?.longitude || 0,
      },
      city: params.city,
      category,
      images: (raw.images || [])
        .map(img => {
          const variants = img.variants ?? [];
          return (variants[variants.length - 1] ?? variants[0])?.url;
        })
        .filter((u): u is string => !!u),
      link: raw.bookingInfo?.bookingUrl
        ? { url: raw.bookingInfo.bookingUrl, provider: 'Viator' }
        : null,
    };
  }

  private extractCategory(tags?: ViatorAttractionProduct['tags']): string {
    if (!tags || tags.length === 0) return 'Atração';
    const name = tags[0]?.allNamesByLocale?.['pt'] || tags[0]?.allNamesByLocale?.['en'];
    return name || 'Atração';
  }
}
