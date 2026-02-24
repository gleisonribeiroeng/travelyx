import { Injectable } from '@angular/core';
import { Transport } from '../models/trip.models';

/**
 * External transport route response shape from intercity transport API.
 * All fields are optional because API response format is hypothetical and provider TBD.
 */
export interface ExternalRoute {
  id?: number | string;
  type?: string; // e.g. "bus", "train", "ferry"
  mode?: string; // Alternative field for transport type
  origin?: string; // Origin city name
  from?: string; // Alternative field for origin
  destination?: string; // Destination city name
  to?: string; // Alternative field for destination
  departure?: string; // ISO 8601 datetime
  departureTime?: string; // Alternative field for departure
  arrival?: string; // ISO 8601 datetime
  arrivalTime?: string; // Alternative field for arrival
  duration?: string | number; // ISO 8601 "PT2H30M" or "2h 30m" or minutes
  price?: number;
  total_price?: number;
  currency?: string;
  url?: string;
  booking_url?: string;
  operator?: string; // Provider name
  carrier?: string; // Alternative field for provider
}

/**
 * Transport search parameters.
 * Used by TransportApiService and TransportMapper to structure search requests.
 */
export interface TransportSearchParams {
  origin: string; // City name (plain text)
  destination: string; // City name (plain text)
  departureDate: string; // YYYY-MM-DD format
  currency?: string; // Default 'USD'
}

/**
 * TransportMapper transforms external intercity transport API responses into canonical Transport models.
 *
 * Features:
 * - Maps hypothetical ExternalRoute response to Transport model
 * - Uses safe fallback chains for all optional fields
 * - Normalizes mode strings to union type 'bus' | 'train' | 'ferry' | 'other'
 * - Parses ISO 8601 and human-readable duration strings to durationMinutes number
 * - Does NOT implement Mapper interface (signature differs - takes two params)
 *
 * NOTE: API provider is TBD. This mapper is designed to be provider-agnostic
 * with flexible field mapping to accommodate different response formats.
 */
@Injectable({ providedIn: 'root' })
export class TransportMapper {
  /**
   * Transform an external transport route response into a canonical Transport model.
   *
   * @param raw The external route object
   * @param params Search parameters containing origin, destination, and departure date
   * @returns Canonical Transport model
   */
  mapResponse(raw: ExternalRoute, params: TransportSearchParams): Transport {
    return {
      id: String(raw.id || crypto.randomUUID()),
      source: 'transport',
      addedToItinerary: false,
      mode: this.mapMode(raw.type || raw.mode || ''),
      origin: raw.origin || raw.from || params.origin,
      destination: raw.destination || raw.to || params.destination,
      departureAt: raw.departure || raw.departureTime || '',
      arrivalAt: raw.arrival || raw.arrivalTime || '',
      durationMinutes: this.parseDuration(raw.duration || 0),
      price: {
        total: raw.price || raw.total_price || 0,
        currency: 'BRL', // TODO: dynamic currency based on user locale
      },
      link: {
        url: raw.url || raw.booking_url || '#',
        provider: raw.operator || raw.carrier || 'Transport',
      },
    };
  }

  /**
   * Map external type/mode strings to the Transport.mode union type.
   * Uses case-insensitive substring matching.
   *
   * @param type External type/mode string
   * @returns Transport mode: 'bus' | 'train' | 'ferry' | 'other'
   */
  private mapMode(type: string): 'bus' | 'train' | 'ferry' | 'other' {
    const normalized = type.toLowerCase();

    if (normalized.includes('bus') || normalized.includes('coach')) {
      return 'bus';
    }
    if (normalized.includes('train') || normalized.includes('rail')) {
      return 'train';
    }
    if (normalized.includes('ferry') || normalized.includes('boat')) {
      return 'ferry';
    }

    return 'other';
  }

  /**
   * Parse duration from various formats to total minutes.
   *
   * Supported formats:
   * - Number: returned as-is (already in minutes)
   * - ISO 8601: "PT2H30M" -> 150 minutes
   * - Human-readable: "2h 30m" or "2 hours 30 minutes" -> 150 minutes
   *
   * @param duration Duration value in various formats
   * @returns Total duration in minutes
   */
  private parseDuration(duration: string | number): number {
    // Already a number (minutes)
    if (typeof duration === 'number') {
      return duration;
    }

    const durationStr = String(duration);

    // ISO 8601 format: PT2H30M
    if (durationStr.startsWith('PT')) {
      const hoursMatch = durationStr.match(/(\d+)H/);
      const minutesMatch = durationStr.match(/(\d+)M/);

      const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
      const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;

      return hours * 60 + minutes;
    }

    // Human-readable format: "2h 30m" or "2 hours 30 minutes"
    const hoursMatch = durationStr.match(/(\d+)\s*h/i);
    const minutesMatch = durationStr.match(/(\d+)\s*m/i);

    const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
    const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;

    return hours * 60 + minutes;
  }
}
