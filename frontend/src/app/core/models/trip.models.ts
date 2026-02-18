import {
  DateRange,
  ExternalLink,
  GeoLocation,
  Price,
  SearchResultBase,
} from './base.model';

/**
 * Top-level container for a trip plan.
 * Holds all search results and itinerary items for a single trip.
 */
export interface Trip {
  id: string;
  name: string;
  destination: string;
  dates: DateRange;
  flights: Flight[];
  stays: Stay[];
  carRentals: CarRental[];
  transports: Transport[];
  activities: Activity[];
  attractions: Attraction[];
  itineraryItems: ItineraryItem[];
  /** ISO 8601 datetime string */
  createdAt: string;
  /** ISO 8601 datetime string */
  updatedAt: string;
}

/**
 * A flight search result from the flights feature.
 */
export interface Flight extends SearchResultBase {
  /** IATA airport code for origin */
  origin: string;
  /** IATA airport code for destination */
  destination: string;
  /** ISO 8601 datetime string */
  departureAt: string;
  /** ISO 8601 datetime string */
  arrivalAt: string;
  airline: string;
  flightNumber: string;
  durationMinutes: number;
  stops: number;
  price: Price;
  link: ExternalLink;
}

/**
 * An accommodation search result from the stays feature.
 */
export interface Stay extends SearchResultBase {
  name: string;
  location: GeoLocation;
  address: string;
  /** ISO 8601 date string (YYYY-MM-DD) */
  checkIn: string;
  /** ISO 8601 date string (YYYY-MM-DD) */
  checkOut: string;
  pricePerNight: Price;
  /** Rating on 0-5 scale; null if unavailable */
  rating: number | null;
  /** Number of reviews; 0 if unavailable */
  reviewCount: number;
  /** Hotel photo URL; null if unavailable */
  photoUrl: string | null;
  /** Gallery image URLs */
  images: string[];
  link: ExternalLink;
}

/**
 * A car rental search result from the car rentals feature.
 */
export interface CarRental extends SearchResultBase {
  vehicleType: string;
  pickUpLocation: string;
  dropOffLocation: string;
  /** ISO 8601 datetime string */
  pickUpAt: string;
  /** ISO 8601 datetime string */
  dropOffAt: string;
  price: Price;
  /** Gallery image URLs */
  images: string[];
  link: ExternalLink;
}

/**
 * A ground/sea transport search result (bus, train, ferry, etc.).
 */
export interface Transport extends SearchResultBase {
  mode: 'bus' | 'train' | 'ferry' | 'other';
  origin: string;
  destination: string;
  /** ISO 8601 datetime string */
  departureAt: string;
  /** ISO 8601 datetime string */
  arrivalAt: string;
  durationMinutes: number;
  price: Price;
  link: ExternalLink;
}

/**
 * A guided activity or tour search result.
 */
export interface Activity extends SearchResultBase {
  name: string;
  description: string;
  location: GeoLocation;
  city: string;
  /** Duration in minutes; null if variable/unknown */
  durationMinutes: number | null;
  /** Rating on 0-5 scale; null if unavailable */
  rating: number | null;
  /** Number of reviews; 0 if unavailable */
  reviewCount: number;
  price: Price;
  /** Gallery image URLs */
  images: string[];
  link: ExternalLink;
}

/**
 * A point-of-interest or attraction search result.
 */
export interface Attraction extends SearchResultBase {
  name: string;
  description: string;
  location: GeoLocation;
  city: string;
  category: string;
  /** Gallery image URLs */
  images: string[];
  /** null when the attraction has no official external page */
  link: ExternalLink | null;
}

/**
 * Discriminated type for an itinerary item's category.
 */
export type ItineraryItemType =
  | 'flight'
  | 'stay'
  | 'car-rental'
  | 'transport'
  | 'activity'
  | 'attraction'
  | 'custom';

/**
 * A single entry on the trip itinerary timeline.
 * References a domain model via refId, or stands alone for custom items.
 */
export interface ItineraryItem {
  id: string;
  type: ItineraryItemType;
  /** References the domain model id; null for custom items */
  refId: string | null;
  /** ISO 8601 date string (YYYY-MM-DD) */
  date: string;
  /** 24-hour time string (HH:MM); null for all-day items */
  timeSlot: string | null;
  label: string;
  /** Duration in minutes; null for all-day items */
  durationMinutes: number | null;
  /** Additional free-text notes; defaults to empty string */
  notes: string;
  /** Integer sort key within day + timeSlot group */
  order: number;
}
