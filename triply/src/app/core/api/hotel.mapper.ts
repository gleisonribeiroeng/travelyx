import { Injectable } from '@angular/core';
import { Mapper } from './mapper.interface';
import { Stay } from '../models/trip.models';

/**
 * Booking.com hotel response shape from booking-com15.p.rapidapi.com API.
 * Most fields are optional because API responses vary by hotel and availability.
 */
export interface BookingComHotel {
  hotel_id: number;
  hotel_name?: string;
  hotel_name_trans?: string;
  latitude?: number | string;
  longitude?: number | string;
  address?: string;
  address_trans?: string;
  review_score?: number; // 0-10 scale from Booking.com
  min_total_price?: number;
  composite_price_breakdown?: {
    gross_amount?: {
      value?: number;
      currency?: string;
    };
  };
  currency_code?: string;
  url?: string;
  checkin?: { until?: string; from?: string };
  checkout?: { until?: string; from?: string };
}

/**
 * HotelMapper transforms Booking.com API responses into canonical Stay models.
 *
 * Features:
 * - Converts 0-10 review score to 0-5 rating scale
 * - Calculates price per night from total price and date range
 * - Preserves datetime fields as ISO 8601 strings (no Date objects)
 * - Handles optional fields with sensible fallbacks
 */
@Injectable({ providedIn: 'root' })
export class HotelMapper implements Mapper<BookingComHotel, Stay> {
  /**
   * Transform a Booking.com hotel response into a canonical Stay model.
   *
   * @param raw The external Booking.com hotel object
   * @param checkIn Optional check-in date (YYYY-MM-DD) from search params
   * @param checkOut Optional check-out date (YYYY-MM-DD) from search params
   * @returns Canonical Stay model
   */
  mapResponse(raw: BookingComHotel, checkIn?: string, checkOut?: string): Stay {
    const ci = checkIn || '';
    const co = checkOut || '';

    // Extract total price from either field
    const totalPrice =
      raw.min_total_price ||
      raw.composite_price_breakdown?.gross_amount?.value ||
      0;

    // Calculate number of nights to derive price per night
    const nights = this.calculateNights(ci, co);
    const pricePerNight = nights > 0 ? totalPrice / nights : totalPrice;

    // Extract currency
    const currency =
      raw.currency_code ||
      raw.composite_price_breakdown?.gross_amount?.currency ||
      'USD';

    // Convert 0-10 review score to 0-5 rating, round to 1 decimal
    const rating =
      raw.review_score != null
        ? Math.round((raw.review_score / 2) * 10) / 10
        : null;

    return {
      id: String(raw.hotel_id),
      source: 'hotel',
      name: raw.hotel_name_trans || raw.hotel_name || 'Unknown Hotel',
      location: {
        latitude: parseFloat(String(raw.latitude || 0)),
        longitude: parseFloat(String(raw.longitude || 0)),
      },
      address: raw.address_trans || raw.address || '',
      checkIn: ci,
      checkOut: co,
      pricePerNight: {
        total: pricePerNight,
        currency,
      },
      rating,
      link: {
        url: raw.url || 'https://www.booking.com',
        provider: 'Booking.com',
      },
      addedToItinerary: false,
    };
  }

  /**
   * Calculate number of nights between check-in and check-out dates.
   * Returns at least 1 to avoid division by zero when computing price per night.
   *
   * @param checkIn Check-in date string (YYYY-MM-DD)
   * @param checkOut Check-out date string (YYYY-MM-DD)
   * @returns Number of nights (minimum 1)
   */
  private calculateNights(checkIn: string, checkOut: string): number {
    if (!checkIn || !checkOut) {
      return 1;
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return 1;
    }

    const nights = Math.round(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    return Math.max(1, nights);
  }
}
