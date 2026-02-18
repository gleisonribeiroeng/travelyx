import { Injectable } from '@angular/core';
import { Mapper } from './mapper.interface';
import { Flight } from '../models/trip.models';

/**
 * External API shape for Amadeus Flight Offers Search API response.
 * Represents the nested structure of a single flight offer from Amadeus.
 */
export interface AmadeusFlightOffer {
  id: string;
  itineraries: Array<{
    duration: string; // ISO 8601 duration: "PT3H35M"
    segments: Array<{
      departure: { iataCode: string; at: string }; // ISO 8601 datetime
      arrival: { iataCode: string; at: string };
      carrierCode: string;
      number: string;
      numberOfStops: number;
    }>;
  }>;
  price: {
    total: string; // String number from API
    currency: string;
  };
  validatingAirlineCodes: string[];
}

/**
 * Transforms Amadeus Flight Offers API response into the canonical Flight model.
 * Handles nested itineraries/segments structure and ISO 8601 duration parsing.
 *
 * Phase 4 logic:
 * - Uses FIRST itinerary only (outbound flight)
 * - Preserves all datetime fields as ISO 8601 strings (no Date objects)
 * - Calculates stops count from segments.length - 1
 */
@Injectable({ providedIn: 'root' })
export class FlightMapper implements Mapper<AmadeusFlightOffer, Flight> {
  /**
   * Transform a single Amadeus flight offer into a canonical Flight model.
   *
   * @param raw The external Amadeus flight offer response
   * @returns Normalized Flight with flat structure and parsed duration
   */
  mapResponse(raw: AmadeusFlightOffer): Flight {
    const itinerary = raw.itineraries[0]; // First itinerary (outbound)
    const segments = itinerary.segments;
    const firstSegment = segments[0];
    const lastSegment = segments[segments.length - 1];

    return {
      id: raw.id,
      source: 'amadeus',
      addedToItinerary: false,
      origin: firstSegment.departure.iataCode,
      destination: lastSegment.arrival.iataCode,
      departureAt: firstSegment.departure.at,
      arrivalAt: lastSegment.arrival.at,
      airline: raw.validatingAirlineCodes[0],
      flightNumber: `${firstSegment.carrierCode}${firstSegment.number}`,
      durationMinutes: this.parseDuration(itinerary.duration),
      stops: segments.length - 1,
      price: {
        total: parseFloat(raw.price.total),
        currency: 'BRL', // TODO: dynamic currency based on user locale
      },
      link: {
        url: `https://www.amadeus.com/booking/${raw.id}`,
        provider: 'Amadeus',
      },
    };
  }

  /**
   * Parse ISO 8601 duration string to total minutes.
   *
   * Examples:
   * - "PT3H35M" -> 215
   * - "PT2H" -> 120
   * - "PT45M" -> 45
   *
   * @param isoDuration ISO 8601 duration string (e.g., "PT3H35M")
   * @returns Total duration in minutes
   */
  private parseDuration(isoDuration: string): number {
    const hoursMatch = isoDuration.match(/(\d+)H/);
    const minutesMatch = isoDuration.match(/(\d+)M/);

    const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
    const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;

    return hours * 60 + minutes;
  }
}
