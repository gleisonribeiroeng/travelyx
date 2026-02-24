import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface FeaturedDestination {
  city: string;
  image: string | null;
  tag: string;
  flightFrom: number;
}

export interface DealFlight {
  id: string;
  origin: string;
  destination: string;
  originCity: string;
  destinationCity: string;
  departureAt: string;
  airline: string;
  durationMinutes: number;
  stops: number;
  price: { total: number; currency: string };
  destinationImage: string | null;
}

export interface DealHotel {
  id: string;
  name: string;
  city: string;
  type: string;
  rating: number;
  reviewCount: number;
  pricePerNight: { total: number; currency: string };
  photoUrl: string;
  cityImage: string | null;
}

export interface PopularTour {
  id: string;
  name: string;
  description: string;
  city: string;
  durationMinutes: number;
  rating: number;
  reviewCount: number;
  price: { total: number; currency: string };
  images: string[];
  cityImage: string | null;
}

export interface HomeShowcaseResponse {
  destinations: FeaturedDestination[];
  dealFlights: DealFlight[];
  dealHotels: DealHotel[];
  topHotels: DealHotel[];
  popularTours: PopularTour[];
  stats: { destinations: number; tripsPlanned: number; reviews: number };
}

@Injectable({ providedIn: 'root' })
export class HomeShowcaseApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/home`;

  getShowcase(): Observable<HomeShowcaseResponse> {
    return this.http.get<HomeShowcaseResponse>(`${this.baseUrl}/showcase`);
  }
}
