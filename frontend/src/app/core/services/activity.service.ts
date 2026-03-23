import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { TripActivity } from '../models/collaboration.models';

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api`;

  // ── Core state ──
  private readonly _activities = signal<TripActivity[]>([]);

  // ── Public readonly ──
  readonly activities = this._activities.asReadonly();

  // ---------------------------------------------------------------------------
  // Load activities for a trip
  // ---------------------------------------------------------------------------

  loadActivities(
    tripId: string,
    filters?: { userId?: string; action?: string; limit?: number; offset?: number },
  ): void {
    const params: Record<string, string> = {};
    if (filters?.userId) params['userId'] = filters.userId;
    if (filters?.action) params['action'] = filters.action;
    if (filters?.limit) params['limit'] = String(filters.limit);
    if (filters?.offset) params['offset'] = String(filters.offset);

    this.http
      .get<TripActivity[]>(`${this.baseUrl}/trips/${tripId}/activity`, { params })
      .subscribe({
        next: (data) => this._activities.set(data),
      });
  }

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  reset(): void {
    this._activities.set([]);
  }
}
