/**
 * Monetary amount with currency code.
 * Used by Flight, Hotel, CarRental, Tours, and Attractions domain models.
 */
export interface Price {
  /** Numeric total in the given currency */
  total: number;
  /** ISO 4217 currency code, e.g. 'USD', 'BRL', 'EUR' */
  currency: string;
}

/**
 * An inclusive date range using ISO 8601 date strings (YYYY-MM-DD).
 */
export interface DateRange {
  /** Start date, inclusive (ISO 8601 format) */
  start: string;
  /** End date, inclusive (ISO 8601 format) */
  end: string;
}

/**
 * WGS-84 geographic coordinates.
 */
export interface GeoLocation {
  latitude: number;
  longitude: number;
}

/**
 * A deep-link to an external provider page.
 * Rendered as a CTA button in result cards.
 */
export interface ExternalLink {
  /** Full URL to the external booking or detail page */
  url: string;
  /** Display name of the provider shown on the CTA button, e.g. 'Amadeus', 'Booking.com' */
  provider: string;
}

/**
 * Base interface for every item returned by a feature search.
 * All domain models (FlightOffer, HotelResult, etc.) extend this.
 */
export interface SearchResultBase {
  /** Unique identifier for deduplication and itinerary references */
  id: string;
  /** The API source that produced this result, e.g. 'amadeus', 'hotel' */
  source: string;
  /** Whether the user has added this item to their itinerary; default false */
  addedToItinerary: boolean;
}
