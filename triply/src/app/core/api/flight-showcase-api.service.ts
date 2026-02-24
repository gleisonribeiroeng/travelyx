import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ShowcaseFlight {
  id: string;
  origin: string;
  destination: string;
  originCity: string;
  destinationCity: string;
  departureAt: string;
  arrivalAt: string;
  airline: string;
  flightNumber: string;
  durationMinutes: number;
  stops: number;
  price: { total: number; currency: string };
  link: { url: string; provider: string };
  destinationImage: string | null;
}

export interface FlightShowcaseResponse {
  deals: ShowcaseFlight[];
  popular: ShowcaseFlight[];
  recommended: ShowcaseFlight[];
}

@Injectable({ providedIn: 'root' })
export class FlightShowcaseApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/flights`;

  getShowcase(): Observable<FlightShowcaseResponse> {
    return this.http.get<FlightShowcaseResponse>(`${this.baseUrl}/showcase`);
  }
}
