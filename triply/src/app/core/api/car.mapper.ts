import { Injectable } from '@angular/core';
import { CarRental } from '../models/trip.models';

/**
 * Priceline car rental result shape from priceline-com-provider.p.rapidapi.com.
 */
export interface PricelineCar {
  partner?: { name?: string; logo?: string };
  car?: {
    example?: string;
    description?: string;
    type_name?: string;
    vehicle_code?: string;
    passengers?: string;
    doors?: string;
    bags?: { small?: string; large?: string };
    transmission?: string;
    imageURL?: string;
    images?: { SIZE335X180?: string };
  };
  pickup?: { location?: string; latitude?: string; longitude?: string };
  dropoff?: { location?: string; latitude?: string; longitude?: string };
  price_details?: {
    display?: {
      price?: string;
      total_price?: string;
      currency?: string;
      symbol?: string;
    };
  };
  num_rental_days?: string;
}

/**
 * Car rental search parameters for Priceline API.
 * Uses city IDs resolved from the autoComplete endpoint.
 */
export interface CarSearchParams {
  pickupLocationName: string;
  dropoffLocationName: string;
  pickupCityId: string;
  dropoffCityId: string;
  pickupDate: string; // MM/DD/YYYY
  pickupTime: string; // HH:MM
  dropoffDate: string; // MM/DD/YYYY
  dropoffTime: string; // HH:MM
  driverAge: number;
}

/**
 * CarMapper transforms Priceline car rental API responses into canonical CarRental models.
 */
@Injectable({ providedIn: 'root' })
export class CarMapper {
  mapResponse(raw: PricelineCar, params: CarSearchParams): CarRental {
    const car = raw.car || {};
    const price = raw.price_details?.display;
    const partner = raw.partner?.name || 'Priceline';

    return {
      id: crypto.randomUUID(),
      source: 'carRental',
      addedToItinerary: false,
      vehicleType: car.description || car.type_name || car.example || 'Unknown',
      pickUpLocation: raw.pickup?.location || params.pickupLocationName,
      dropOffLocation: raw.dropoff?.location || params.dropoffLocationName,
      pickUpAt: this.toIsoDateTime(params.pickupDate, params.pickupTime),
      dropOffAt: this.toIsoDateTime(params.dropoffDate, params.dropoffTime),
      price: {
        total: parseFloat(price?.total_price || price?.price || '0'),
        currency: 'BRL', // TODO: dynamic currency based on user locale
      },
      images: [car.imageURL, car.images?.SIZE335X180].filter((u): u is string => !!u),
      link: {
        url: 'https://www.priceline.com',
        provider: partner,
      },
    };
  }

  /** Convert MM/DD/YYYY + HH:MM to ISO 8601 datetime string. */
  private toIsoDateTime(date: string, time: string): string {
    const [month, day, year] = date.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${time}:00`;
  }
}
