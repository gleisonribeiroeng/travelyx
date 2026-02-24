import { Injectable } from '@angular/core';
import { Attraction } from '../models/trip.models';

/**
 * External geoname response from OpenTripMap API.
 * Used to resolve a city name to geographic coordinates.
 */
export interface GeonameResponse {
  name?: string;
  country?: string;
  lat?: number;
  lon?: number;
  population?: number;
  timezone?: string;
}

/**
 * External radius feature response from OpenTripMap API.
 * Represents a single point of interest within a search radius.
 */
export interface RadiusFeature {
  name?: string;
  xid?: string;
  osm?: string;
  wikidata?: string;
  kinds?: string;
  point?: {
    lon?: number;
    lat?: number;
  };
}

/**
 * External place details response from OpenTripMap API.
 * Contains enriched information for a specific attraction.
 */
export interface PlaceDetails {
  xid?: string;
  name?: string;
  address?: {
    city?: string;
    road?: string;
    house_number?: string;
  };
  kinds?: string;
  wikipedia?: string;
  url?: string;
  image?: string;
  preview?: {
    source?: string;
    width?: number;
    height?: number;
  };
  point?: {
    lon?: number;
    lat?: number;
  };
}

/**
 * Attraction search parameters.
 * Used by AttractionApiService and AttractionMapper to structure search requests.
 */
export interface AttractionSearchParams {
  city: string; // Free text city name
}

/**
 * AttractionMapper transforms external OpenTripMap API responses into canonical Attraction models.
 *
 * Features:
 * - Maps OpenTripMap radius features to Attraction model
 * - Enriches attractions with detail data (wikipedia link, official URL)
 * - Handles nullable link field (link is null when no official URL available)
 * - Does NOT implement Mapper interface (signature differs - takes two params)
 *
 * OpenTripMap uses a three-step search flow:
 * 1. Geoname lookup (city name -> coordinates)
 * 2. Radius search (coordinates -> list of attractions)
 * 3. Details enrichment (xid -> full attraction data with links)
 */
@Injectable({ providedIn: 'root' })
export class AttractionMapper {
  /**
   * Transform an external OpenTripMap radius feature into a canonical Attraction model.
   * Initial mapping contains only data from radius search response.
   * Use enrichWithDetails() to merge additional detail data.
   *
   * @param raw The external OpenTripMap radius feature object
   * @param params Search parameters containing city name
   * @returns Canonical Attraction model
   */
  mapResponse(raw: RadiusFeature, params: AttractionSearchParams): Attraction {
    return {
      id: raw.xid || crypto.randomUUID(),
      source: 'attractions',
      addedToItinerary: false,
      name: raw.name || 'Unnamed Attraction',
      description: '', // Not available in radius response; enriched later
      location: {
        latitude: raw.point?.lat || 0,
        longitude: raw.point?.lon || 0,
      },
      city: params.city,
      category: this.extractPrimaryCategory(raw.kinds),
      images: [],
      link: null, // Not available in radius response; enriched later
    };
  }

  /**
   * Enrich an attraction with detailed information from OpenTripMap details endpoint.
   * Merges description and link fields from the details response.
   *
   * @param attraction The base attraction from mapResponse
   * @param details The external OpenTripMap place details object
   * @returns Enriched Attraction model with description and nullable link
   */
  enrichWithDetails(attraction: Attraction, details: PlaceDetails): Attraction {
    return {
      ...attraction,
      description: details.wikipedia
        ? `Learn more: ${details.wikipedia}`
        : details.url
          ? 'Official site available.'
          : '',
      images: [details.image, details.preview?.source].filter((u): u is string => !!u),
      link: details.url ? { url: details.url, provider: 'Official' } : null,
    };
  }

  /**
   * Extract primary category from OpenTripMap kinds string.
   * Kinds are comma-separated (e.g. "architecture,historic,museums").
   * Takes the first kind, replaces underscores with spaces, and capitalizes.
   *
   * @param kindString Comma-separated kinds string from OpenTripMap
   * @returns Human-readable category name
   */
  private extractPrimaryCategory(kindString: string | undefined): string {
    if (!kindString || kindString.trim() === '') {
      return 'Attraction';
    }

    const firstKind = kindString.split(',')[0].trim();
    if (!firstKind) {
      return 'Attraction';
    }

    // Replace underscores with spaces and capitalize first letter
    const normalized = firstKind.replace(/_/g, ' ');
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }
}
