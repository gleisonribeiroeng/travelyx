import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import {
  Trip,
  Flight,
  Stay,
  CarRental,
  Transport,
  Activity,
  Attraction,
  ItineraryItem,
} from '../models/trip.models';

const DEFAULT_TRIP: Trip = {
  id: crypto.randomUUID(),
  name: '',
  destination: '',
  dates: { start: '', end: '' },
  flights: [],
  stays: [],
  carRentals: [],
  transports: [],
  activities: [],
  attractions: [],
  itineraryItems: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

@Injectable({ providedIn: 'root' })
export class TripStateService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/trips`;

  private readonly _trip = signal<Trip>({ ...DEFAULT_TRIP });

  readonly trip = this._trip.asReadonly();
  readonly isLoading = signal(false);

  readonly flights = computed(() => this._trip().flights);
  readonly stays = computed(() => this._trip().stays);
  readonly carRentals = computed(() => this._trip().carRentals);
  readonly transports = computed(() => this._trip().transports);
  readonly activities = computed(() => this._trip().activities);
  readonly attractions = computed(() => this._trip().attractions);
  readonly itineraryItems = computed(() => this._trip().itineraryItems);
  readonly hasItems = computed(() => this._trip().itineraryItems.length > 0);

  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private _synced = false;

  /**
   * Load the user's trip from the API (DB).
   * Returns an Observable so callers can wait for completion.
   */
  loadFromApi(): Observable<void> {
    this.isLoading.set(true);
    return this.http.get<Trip[]>(this.baseUrl).pipe(
      tap((trips) => {
        if (trips.length > 0) {
          this._trip.set(trips[0]);
        }
        this._synced = true;
        this.isLoading.set(false);
      }),
      map(() => void 0),
      catchError(() => {
        this._synced = true;
        this.isLoading.set(false);
        return of(void 0);
      })
    );
  }

  private scheduleSyncToApi(): void {
    if (!this.auth.isLoggedIn()) return;
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => this.syncToApi(), 800);
  }

  private syncToApi(): void {
    if (!this.auth.isLoggedIn() || !this._synced) return;
    const t = this._trip();
    this.http.put<Trip>(`${this.baseUrl}/${t.id}`, t).subscribe({
      next: () => {},
      error: () => {
        // If trip doesn't exist yet on server, create it
        this.http.post<Trip>(this.baseUrl, t).subscribe({
          next: (saved) => this._trip.set(saved),
        });
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Trip meta
  // ---------------------------------------------------------------------------

  setTripMeta(
    name: string,
    destination: string,
    dates: { start: string; end: string }
  ): void {
    this._trip.update((t) => ({
      ...t,
      name,
      destination,
      dates,
      updatedAt: new Date().toISOString(),
    }));
    this.scheduleSyncToApi();
  }

  // ---------------------------------------------------------------------------
  // Flights
  // ---------------------------------------------------------------------------

  addFlight(flight: Flight): void {
    this._trip.update((t) => ({
      ...t,
      flights: [...t.flights, flight],
      updatedAt: new Date().toISOString(),
    }));
    this.scheduleSyncToApi();
  }

  removeFlight(id: string): void {
    this._trip.update((t) => ({
      ...t,
      flights: t.flights.filter((f) => f.id !== id),
      updatedAt: new Date().toISOString(),
    }));
    this.scheduleSyncToApi();
  }

  // ---------------------------------------------------------------------------
  // Stays
  // ---------------------------------------------------------------------------

  addStay(stay: Stay): void {
    this._trip.update((t) => ({
      ...t,
      stays: [...t.stays, stay],
      updatedAt: new Date().toISOString(),
    }));
    this.scheduleSyncToApi();
  }

  removeStay(id: string): void {
    this._trip.update((t) => ({
      ...t,
      stays: t.stays.filter((s) => s.id !== id),
      updatedAt: new Date().toISOString(),
    }));
    this.scheduleSyncToApi();
  }

  // ---------------------------------------------------------------------------
  // Car Rentals
  // ---------------------------------------------------------------------------

  addCarRental(car: CarRental): void {
    this._trip.update((t) => ({
      ...t,
      carRentals: [...t.carRentals, car],
      updatedAt: new Date().toISOString(),
    }));
    this.scheduleSyncToApi();
  }

  removeCarRental(id: string): void {
    this._trip.update((t) => ({
      ...t,
      carRentals: t.carRentals.filter((c) => c.id !== id),
      updatedAt: new Date().toISOString(),
    }));
    this.scheduleSyncToApi();
  }

  // ---------------------------------------------------------------------------
  // Transports
  // ---------------------------------------------------------------------------

  addTransport(transport: Transport): void {
    this._trip.update((t) => ({
      ...t,
      transports: [...t.transports, transport],
      updatedAt: new Date().toISOString(),
    }));
    this.scheduleSyncToApi();
  }

  removeTransport(id: string): void {
    this._trip.update((t) => ({
      ...t,
      transports: t.transports.filter((tr) => tr.id !== id),
      updatedAt: new Date().toISOString(),
    }));
    this.scheduleSyncToApi();
  }

  // ---------------------------------------------------------------------------
  // Activities
  // ---------------------------------------------------------------------------

  addActivity(activity: Activity): void {
    this._trip.update((t) => ({
      ...t,
      activities: [...t.activities, activity],
      updatedAt: new Date().toISOString(),
    }));
    this.scheduleSyncToApi();
  }

  removeActivity(id: string): void {
    this._trip.update((t) => ({
      ...t,
      activities: t.activities.filter((a) => a.id !== id),
      updatedAt: new Date().toISOString(),
    }));
    this.scheduleSyncToApi();
  }

  // ---------------------------------------------------------------------------
  // Attractions
  // ---------------------------------------------------------------------------

  addAttraction(attraction: Attraction): void {
    this._trip.update((t) => ({
      ...t,
      attractions: [...t.attractions, attraction],
      updatedAt: new Date().toISOString(),
    }));
    this.scheduleSyncToApi();
  }

  removeAttraction(id: string): void {
    this._trip.update((t) => ({
      ...t,
      attractions: t.attractions.filter((a) => a.id !== id),
      updatedAt: new Date().toISOString(),
    }));
    this.scheduleSyncToApi();
  }

  // ---------------------------------------------------------------------------
  // Itinerary Items
  // ---------------------------------------------------------------------------

  addItineraryItem(item: ItineraryItem): void {
    this._trip.update((t) => ({
      ...t,
      itineraryItems: [...t.itineraryItems, item],
      updatedAt: new Date().toISOString(),
    }));
    this.scheduleSyncToApi();
  }

  removeItineraryItem(id: string): void {
    this._trip.update((t) => ({
      ...t,
      itineraryItems: t.itineraryItems.filter((i) => i.id !== id),
      updatedAt: new Date().toISOString(),
    }));
    this.scheduleSyncToApi();
  }

  updateItineraryItem(updated: ItineraryItem): void {
    this._trip.update((t) => ({
      ...t,
      itineraryItems: t.itineraryItems.map((i) =>
        i.id === updated.id ? updated : i
      ),
      updatedAt: new Date().toISOString(),
    }));
    this.scheduleSyncToApi();
  }

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  resetTrip(): void {
    const oldId = this._trip().id;

    if (this.auth.isLoggedIn() && this._synced) {
      this.http.delete(`${this.baseUrl}/${oldId}`).subscribe();
    }

    this._trip.set({
      ...DEFAULT_TRIP,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}
