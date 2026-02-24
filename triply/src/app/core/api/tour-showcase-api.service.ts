import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ShowcaseTour {
  id: string;
  name: string;
  description: string;
  city: string;
  durationMinutes: number;
  rating: number;
  reviewCount: number;
  price: { total: number; currency: string };
  images: string[];
  link: { url: string; provider: string };
  cityImage: string | null;
}

export interface TourShowcaseResponse {
  mostBooked: ShowcaseTour[];
  mustDo: ShowcaseTour[];
  unique: ShowcaseTour[];
}

@Injectable({ providedIn: 'root' })
export class TourShowcaseApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/tours-showcase`;

  getShowcase(): Observable<TourShowcaseResponse> {
    return this.http.get<TourShowcaseResponse>(`${this.baseUrl}/showcase`);
  }
}
