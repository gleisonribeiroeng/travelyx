import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiConfigService {
  private readonly keys: Record<string, string> = {
    amadeus: environment.amadeusApiKey,
    hotel: environment.hotelApiKey,
    carRental: environment.carRentalApiKey,
    transport: environment.transportApiKey,
    tours: environment.toursApiKey,
    attractions: environment.attractionsApiKey,
    googlePlaces: environment.googlePlacesApiKey,
  };

  readonly endpoints: Record<string, string> = {
    amadeus: `${environment.apiBaseUrl}/api/amadeus`,
    hotel: `${environment.apiBaseUrl}/api/hotels`,
    carRental: `${environment.apiBaseUrl}/api/cars`,
    transport: `${environment.apiBaseUrl}/api/transport`,
    tours: `${environment.apiBaseUrl}/api/tours`,
    attractions: `${environment.apiBaseUrl}/api/attractions`,
    googlePlaces: `${environment.apiBaseUrl}/api/places`,
  };

  /** Returns the API key for a given source name, or null if not configured. */
  getKey(source: string): string | null {
    const key = this.keys[source];
    return key !== undefined ? key : null;
  }

  /**
   * Returns the proxy-relative endpoint URL for a given API name.
   * Throws if the API name is not registered.
   */
  getEndpoint(api: string): string {
    const endpoint = this.endpoints[api];
    if (endpoint === undefined) {
      throw new Error(`ApiConfigService: unknown API "${api}". Registered APIs: ${Object.keys(this.endpoints).join(', ')}`);
    }
    return endpoint;
  }
}
