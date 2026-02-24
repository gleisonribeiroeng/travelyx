import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ShowcaseHotel {
  id: string;
  name: string;
  city: string;
  address: string;
  type: string;
  rating: number;
  reviewCount: number;
  pricePerNight: { total: number; currency: string };
  photoUrl: string;
  link: { url: string; provider: string };
  cityImage: string | null;
}

export interface HotelShowcaseResponse {
  bestPrices: ShowcaseHotel[];
  topRated: ShowcaseHotel[];
  unique: ShowcaseHotel[];
}

@Injectable({ providedIn: 'root' })
export class HotelShowcaseApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/hotels-showcase`;

  getShowcase(): Observable<HotelShowcaseResponse> {
    return this.http.get<HotelShowcaseResponse>(`${this.baseUrl}/showcase`);
  }
}
