import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CalendarSyncRequest {
  tripName: string;
  events: {
    id: string;
    type: string;
    label: string;
    date: string;
    timeSlot: string | null;
    durationMinutes: number | null;
    notes: string;
    location?: string;
  }[];
}

export interface CalendarSyncResult {
  created: number;
  errors: string[];
}

export interface CalendarStatus {
  connected: boolean;
}

@Injectable({ providedIn: 'root' })
export class CalendarApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/calendar`;

  syncToCalendar(data: CalendarSyncRequest): Observable<CalendarSyncResult> {
    return this.http.post<CalendarSyncResult>(`${this.baseUrl}/sync`, data);
  }

  checkStatus(): Observable<CalendarStatus> {
    return this.http.get<CalendarStatus>(`${this.baseUrl}/status`);
  }

  getAuthorizeUrl(): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(`${this.baseUrl}/authorize`);
  }
}
