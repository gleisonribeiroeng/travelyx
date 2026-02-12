import { Injectable } from '@angular/core';
import { CarRental } from '../models/trip.models';

/**
 * Booking.com car rental response shape from booking-com15.p.rapidapi.com API.
 * All fields are optional because API response format is hypothetical and may vary.
 */
export interface BookingComCar {
  vehicle_id?: number | string;
  vehicle_name?: string;
  vehicle_category?: string; // e.g. "Economy", "Compact", "SUV"
  group?: string; // Alternative field for vehicle category
  price?: number;
  total_price?: number;
  currency?: string;
  url?: string;
  deep_link?: string;
  supplier?: string; // e.g. "Hertz", "Avis"
  supplier_name?: string;
}

/**
 * Car rental search parameters.
 * Used by CarApiService and CarMapper to structure search requests.
 */
export interface CarSearchParams {
  pickupLocation: string; // City name or airport code (plain text)
  dropoffLocation: string; // City name or airport code (plain text)
  pickupAt: string; // ISO 8601 datetime: 2026-03-15T10:00:00
  dropoffAt: string; // ISO 8601 datetime: 2026-03-20T10:00:00
  driverAge: number; // Default 30, range 18-99
  currency?: string; // Default 'USD'
}

/**
 * CarMapper transforms Booking.com car rental API responses into canonical CarRental models.
 *
 * Features:
 * - Maps hypothetical BookingComCar response to CarRental model
 * - Uses safe fallback chains for all optional fields
 * - Echoes location and datetime fields from search params (not API response)
 * - Preserves datetime fields as ISO 8601 strings (no Date objects)
 * - Does NOT implement Mapper interface (signature differs - takes two params)
 */
@Injectable({ providedIn: 'root' })
export class CarMapper {
  /**
   * Transform a Booking.com car rental response into a canonical CarRental model.
   *
   * @param raw The external Booking.com car object
   * @param params Search parameters containing pickup/dropoff locations and datetimes
   * @returns Canonical CarRental model
   */
  mapResponse(raw: BookingComCar, params: CarSearchParams): CarRental {
    return {
      id: String(raw.vehicle_id || crypto.randomUUID()),
      source: 'carRental',
      addedToItinerary: false,
      vehicleType: raw.vehicle_category || raw.group || 'Unknown',
      pickUpLocation: params.pickupLocation,
      dropOffLocation: params.dropoffLocation,
      pickUpAt: params.pickupAt,
      dropOffAt: params.dropoffAt,
      price: {
        total: raw.price || raw.total_price || 0,
        currency: raw.currency || 'USD',
      },
      link: {
        url: raw.url || raw.deep_link || 'https://www.booking.com',
        provider: raw.supplier || raw.supplier_name || 'Booking.com',
      },
    };
  }
}
