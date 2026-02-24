import { Injectable } from '@angular/core';
import { Mapper } from './mapper.interface';
import { Stay } from '../models/trip.models';

/**
 * Booking.com hotel response shape from booking-com15.p.rapidapi.com API.
 * Data is nested under data.hotels[].property in the API response.
 */
export interface BookingComHotel {
  hotel_id: number;
  property: {
    id?: number;
    name?: string;
    latitude?: number;
    longitude?: number;
    wishlistName?: string; // City name (e.g. "Paris")
    countryCode?: string;
    reviewScore?: number; // 0-10 scale
    reviewCount?: number;
    reviewScoreWord?: string;
    propertyClass?: number; // Star rating
    currency?: string;
    priceBreakdown?: {
      grossPrice?: {
        value?: number;
        currency?: string;
      };
    };
    photoUrls?: string[];
    checkinDate?: string;
    checkoutDate?: string;
  };
}

/**
 * HotelMapper transforms Booking.com API responses into canonical Stay models.
 */
@Injectable({ providedIn: 'root' })
export class HotelMapper implements Mapper<BookingComHotel, Stay> {
  mapResponse(raw: BookingComHotel, checkIn?: string, checkOut?: string): Stay {
    const prop = raw.property || {} as BookingComHotel['property'];
    const ci = checkIn || prop.checkinDate || '';
    const co = checkOut || prop.checkoutDate || '';

    const totalPrice = prop.priceBreakdown?.grossPrice?.value || 0;
    const currency = 'BRL'; // TODO: dynamic currency based on user locale

    const nights = this.calculateNights(ci, co);
    const pricePerNight = nights > 0 ? totalPrice / nights : totalPrice;

    // Convert 0-10 review score to 0-5 rating
    const rating =
      prop.reviewScore != null
        ? Math.round((prop.reviewScore / 2) * 10) / 10
        : null;

    const hotelId = prop.id || raw.hotel_id;

    return {
      id: String(hotelId),
      source: 'hotel',
      name: prop.name || 'Unknown Hotel',
      location: {
        latitude: prop.latitude || 0,
        longitude: prop.longitude || 0,
      },
      address: [prop.wishlistName, prop.countryCode?.toUpperCase()].filter(Boolean).join(', '),
      checkIn: ci,
      checkOut: co,
      pricePerNight: {
        total: pricePerNight,
        currency,
      },
      rating,
      reviewCount: prop.reviewCount ?? 0,
      photoUrl: prop.photoUrls?.[0] || null,
      images: prop.photoUrls || [],
      link: {
        url: `https://www.booking.com/hotel/searchresults.html?aid=304142&dest_id=${hotelId}`,
        provider: 'Booking.com',
      },
      addedToItinerary: false,
    };
  }

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
