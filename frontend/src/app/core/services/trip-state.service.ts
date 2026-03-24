import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';
import { PlanService } from './plan.service';
import { environment } from '../../../environments/environment';
import {
  Trip,
  TripStatus,
  Flight,
  Stay,
  CarRental,
  Transport,
  Activity,
  Attraction,
  ChecklistItem,
  ItineraryItem,
  AttachmentMeta,
  ManualExpense,
} from '../models/trip.models';

const DEFAULT_TRIP: Trip = {
  id: '',
  name: '',
  destination: '',
  status: 'planejamento',
  currency: 'BRL',
  travelers: 1,
  dates: { start: '', end: '' },
  flights: [],
  stays: [],
  carRentals: [],
  transports: [],
  activities: [],
  attractions: [],
  checklist: [],
  dayNotes: {},
  itineraryItems: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const ACTIVE_TRIP_KEY = 'travelyx_active_trip_id';

@Injectable({ providedIn: 'root' })
export class TripStateService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);
  private readonly planService = inject(PlanService);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/trips`;

  // ── Core state ──
  private readonly _trips = signal<Trip[]>([]);
  private readonly _activeTripId = signal<string | null>(null);
  private readonly _manualExpenses = signal<ManualExpense[]>([]);

  readonly isLoading = signal(false);

  // ── Derived state ──
  readonly trips = this._trips.asReadonly();

  readonly activeTrip = computed<Trip | null>(() => {
    const id = this._activeTripId();
    if (!id) return null;
    return this._trips().find(t => t.id === id) ?? null;
  });

  /** Backward-compatible: returns DEFAULT_TRIP when no trip selected */
  readonly trip = computed<Trip>(() => this.activeTrip() ?? DEFAULT_TRIP);

  readonly hasActiveTrip = computed(() => this._activeTripId() !== null && this.activeTrip() !== null);
  readonly activeTripId = this._activeTripId.asReadonly();

  readonly manualExpenses = this._manualExpenses.asReadonly();

  readonly flights = computed(() => this.trip().flights);
  readonly stays = computed(() => this.trip().stays);
  readonly carRentals = computed(() => this.trip().carRentals);
  readonly transports = computed(() => this.trip().transports);
  readonly activities = computed(() => this.trip().activities);
  readonly attractions = computed(() => this.trip().attractions);
  readonly itineraryItems = computed(() => this.trip().itineraryItems);
  readonly hasItems = computed(() => this.trip().itineraryItems.length > 0);
  readonly paidItemCount = computed(() =>
    this.trip().itineraryItems.filter(i => i.isPaid).length
  );

  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private _synced = false;

  // ---------------------------------------------------------------------------
  // Load trips from API
  // ---------------------------------------------------------------------------

  loadFromApi(): Observable<Trip[]> {
    this.isLoading.set(true);
    return this.http.get<Trip[]>(this.baseUrl).pipe(
      tap((trips) => {
        this._trips.set(trips);
        this._synced = true;
        this.isLoading.set(false);

        // Auto-select logic
        if (trips.length === 1) {
          this.selectTrip(trips[0].id);
        } else if (trips.length > 1) {
          const saved = localStorage.getItem(ACTIVE_TRIP_KEY);
          if (saved && trips.some(t => t.id === saved)) {
            this.selectTrip(saved);
          }
          // else: no auto-select, user must choose from trip list
        }
      }),
      catchError(() => {
        this._synced = true;
        this.isLoading.set(false);
        return of([]);
      })
    );
  }

  // ---------------------------------------------------------------------------
  // Trip selection
  // ---------------------------------------------------------------------------

  selectTrip(id: string): void {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
    // Flush pending sync for previous trip
    const prevId = this._activeTripId();
    if (prevId && prevId !== id) {
      this.syncToApi();
    }

    this._activeTripId.set(id);
    localStorage.setItem(ACTIVE_TRIP_KEY, id);
  }

  // ---------------------------------------------------------------------------
  // Create trip
  // ---------------------------------------------------------------------------

  createTrip(data: { name: string; destination?: string; dates?: { start: string; end: string }; currency?: string; travelers?: number }): Observable<Trip> {
    const newTrip: Trip = {
      ...DEFAULT_TRIP,
      id: crypto.randomUUID(),
      name: data.name,
      destination: data.destination ?? '',
      dates: data.dates ?? { start: '', end: '' },
      currency: data.currency || 'BRL',
      travelers: data.travelers || 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return this.http.post<Trip>(this.baseUrl, newTrip).pipe(
      tap((saved) => {
        this._trips.update(list => [...list, saved]);
        this.selectTrip(saved.id);
        // Auto-fetch cover image from Unsplash
        if (saved.destination && !saved.coverImage) {
          this.fetchDestinationImage(saved.id, saved.destination);
        }
      })
    );
  }

  // ---------------------------------------------------------------------------
  // Delete trip
  // ---------------------------------------------------------------------------

  deleteTrip(id: string): Observable<void> {
    return this.http.delete(`${this.baseUrl}/${id}`).pipe(
      tap(() => {
        this._trips.update(list => list.filter(t => t.id !== id));
        if (this._activeTripId() === id) {
          this._activeTripId.set(null);
          localStorage.removeItem(ACTIVE_TRIP_KEY);
        }
      }),
      map(() => void 0)
    );
  }

  // ---------------------------------------------------------------------------
  // Update trip status
  // ---------------------------------------------------------------------------

  setTripStatus(status: TripStatus): void {
    this.updateActiveTrip(t => ({ ...t, status, updatedAt: new Date().toISOString() }));
    this.scheduleSyncToApi();
  }

  // ---------------------------------------------------------------------------
  // Sync
  // ---------------------------------------------------------------------------

  private scheduleSyncToApi(): void {
    if (!this.auth.isLoggedIn()) return;
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => this.syncToApi(), 800);
  }

  private syncToApi(): void {
    if (!this.auth.isLoggedIn() || !this._synced) return;
    const t = this.activeTrip();
    if (!t) return;
    this.http.put<Trip>(`${this.baseUrl}/${t.id}`, t).subscribe({
      next: (saved) => {
        // Update the trip in the list with server response
        this._trips.update(list =>
          list.map(trip => trip.id === saved.id ? saved : trip)
        );
      },
      error: () => {
        this.http.post<Trip>(this.baseUrl, t).subscribe({
          next: (saved) => {
            this._trips.update(list => {
              const exists = list.some(trip => trip.id === saved.id);
              return exists
                ? list.map(trip => trip.id === saved.id ? saved : trip)
                : [...list, saved];
            });
          },
        });
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Helper: update the active trip inside _trips array
  // ---------------------------------------------------------------------------

  private updateActiveTrip(fn: (trip: Trip) => Trip): void {
    const id = this._activeTripId();
    if (!id) {
      this.notify.warning('Selecione uma viagem primeiro');
      return;
    }
    this._trips.update(list =>
      list.map(t => t.id === id ? fn(t) : t)
    );
  }

  // ---------------------------------------------------------------------------
  // Trip meta
  // ---------------------------------------------------------------------------

  setTripMeta(
    name: string,
    destination: string,
    dates: { start: string; end: string }
  ): void {
    const prev = this.activeTrip();
    this.updateActiveTrip(t => ({
      ...t,
      name,
      destination,
      dates,
      updatedAt: new Date().toISOString(),
    }));
    this.scheduleSyncToApi();
    // Auto-fetch cover image when destination changes
    const tripId = this._activeTripId();
    if (tripId && destination && destination !== prev?.destination) {
      this.fetchDestinationImage(tripId, destination);
    }
  }

  setTripCoverImage(tripId: string, imageUrl: string): void {
    this._trips.update(list =>
      list.map(t => t.id === tripId
        ? { ...t, coverImage: imageUrl, updatedAt: new Date().toISOString() }
        : t
      )
    );
    this.scheduleSyncToApi();
  }

  /** Fetch a destination image from Unsplash and set as cover (if no cover exists) */
  fetchDestinationImage(tripId: string, destination: string): void {
    if (!destination?.trim()) return;
    this.http.get<{ image: { url: string; photographer: string; photographerUrl: string } | null }>(
      `${environment.apiBaseUrl}/api/unsplash/destination-image`,
      { params: { query: destination } }
    ).subscribe({
      next: (res) => {
        if (res.image?.url) {
          this.setTripCoverImage(tripId, res.image.url);
        }
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Flights
  // ---------------------------------------------------------------------------

  addFlight(flight: Flight): void {
    this.updateActiveTrip(t => ({
      ...t,
      flights: [...t.flights, flight],
      updatedAt: new Date().toISOString(),
    }));
    this.scheduleSyncToApi();
  }

  removeFlight(id: string): void {
    this.updateActiveTrip(t => ({
      ...t,
      flights: t.flights.filter(f => f.id !== id),
      updatedAt: new Date().toISOString(),
    }));
    this.scheduleSyncToApi();
  }

  updateFlight(updated: Flight): void {
    this.updateActiveTrip(t => ({
      ...t,
      flights: t.flights.map(f => f.id === updated.id ? updated : f),
      updatedAt: new Date().toISOString(),
    }));
    this.scheduleSyncToApi();
  }

  // ---------------------------------------------------------------------------
  // Stays
  // ---------------------------------------------------------------------------

  addStay(stay: Stay): void {
    this.updateActiveTrip(t => ({
      ...t,
      stays: [...t.stays, stay],
      updatedAt: new Date().toISOString(),
    }));
    this.scheduleSyncToApi();
  }

  removeStay(id: string): void {
    this.updateActiveTrip(t => ({
      ...t,
      stays: t.stays.filter(s => s.id !== id),
      updatedAt: new Date().toISOString(),
    }));
    this.scheduleSyncToApi();
  }

  updateStay(updated: Stay): void {
    this.updateActiveTrip(t => ({
      ...t,
      stays: t.stays.map(s => s.id === updated.id ? updated : s),
      updatedAt: new Date().toISOString(),
    }));
    this.scheduleSyncToApi();
  }

  // ---------------------------------------------------------------------------
  // Car Rentals
  // ---------------------------------------------------------------------------

  addCarRental(car: CarRental): void {
    this.updateActiveTrip(t => ({
      ...t,
      carRentals: [...t.carRentals, car],
      updatedAt: new Date().toISOString(),
    }));
    this.scheduleSyncToApi();
  }

  removeCarRental(id: string): void {
    this.updateActiveTrip(t => ({
      ...t,
      carRentals: t.carRentals.filter(c => c.id !== id),
      updatedAt: new Date().toISOString(),
    }));
    this.scheduleSyncToApi();
  }

  updateCarRental(updated: CarRental): void {
    this.updateActiveTrip(t => ({
      ...t,
      carRentals: t.carRentals.map(c => c.id === updated.id ? updated : c),
      updatedAt: new Date().toISOString(),
    }));
    this.scheduleSyncToApi();
  }

  // ---------------------------------------------------------------------------
  // Transports
  // ---------------------------------------------------------------------------

  addTransport(transport: Transport): void {
    this.updateActiveTrip(t => ({
      ...t,
      transports: [...t.transports, transport],
      updatedAt: new Date().toISOString(),
    }));
    this.scheduleSyncToApi();
  }

  removeTransport(id: string): void {
    this.updateActiveTrip(t => ({
      ...t,
      transports: t.transports.filter(tr => tr.id !== id),
      updatedAt: new Date().toISOString(),
    }));
    this.scheduleSyncToApi();
  }

  // ---------------------------------------------------------------------------
  // Activities
  // ---------------------------------------------------------------------------

  addActivity(activity: Activity): void {
    this.updateActiveTrip(t => ({
      ...t,
      activities: [...t.activities, activity],
      updatedAt: new Date().toISOString(),
    }));
    this.scheduleSyncToApi();
  }

  removeActivity(id: string): void {
    this.updateActiveTrip(t => ({
      ...t,
      activities: t.activities.filter(a => a.id !== id),
      updatedAt: new Date().toISOString(),
    }));
    this.scheduleSyncToApi();
  }

  // ---------------------------------------------------------------------------
  // Attractions
  // ---------------------------------------------------------------------------

  addAttraction(attraction: Attraction): void {
    this.updateActiveTrip(t => ({
      ...t,
      attractions: [...t.attractions, attraction],
      updatedAt: new Date().toISOString(),
    }));
    this.scheduleSyncToApi();
  }

  removeAttraction(id: string): void {
    this.updateActiveTrip(t => ({
      ...t,
      attractions: t.attractions.filter(a => a.id !== id),
      updatedAt: new Date().toISOString(),
    }));
    this.scheduleSyncToApi();
  }

  // ---------------------------------------------------------------------------
  // Checklist
  // ---------------------------------------------------------------------------

  setChecklist(items: ChecklistItem[]): void {
    this.updateActiveTrip(t => ({
      ...t,
      checklist: items,
      updatedAt: new Date().toISOString(),
    }));
    this.scheduleSyncToApi();
  }

  // ---------------------------------------------------------------------------
  // Day Notes
  // ---------------------------------------------------------------------------

  readonly dayNotes = computed(() => this.trip().dayNotes ?? {});

  setDayNote(date: string, note: string): void {
    this.updateActiveTrip(t => {
      const notes = { ...(t.dayNotes ?? {}) };
      if (note.trim()) {
        notes[date] = note;
      } else {
        delete notes[date];
      }
      return { ...t, dayNotes: notes, updatedAt: new Date().toISOString() };
    });
    this.scheduleSyncToApi();
  }

  // ---------------------------------------------------------------------------
  // Itinerary Items
  // ---------------------------------------------------------------------------

  addItineraryItem(item: ItineraryItem): boolean {
    const currentCount = this.trip().itineraryItems.length;
    if (!this.planService.canAddItem(currentCount)) {
      this.planService.showLimitPaywall('item');
      return false;
    }
    this.updateActiveTrip(t => ({
      ...t,
      itineraryItems: [...t.itineraryItems, item],
      updatedAt: new Date().toISOString(),
    }));
    this.scheduleSyncToApi();
    return true;
  }

  removeItineraryItem(id: string): void {
    this.updateActiveTrip(t => ({
      ...t,
      itineraryItems: t.itineraryItems.filter(i => i.id !== id),
      updatedAt: new Date().toISOString(),
    }));
    this.scheduleSyncToApi();
  }

  updateItineraryItem(updated: ItineraryItem): void {
    this.updateActiveTrip(t => ({
      ...t,
      itineraryItems: t.itineraryItems.map(i =>
        i.id === updated.id ? updated : i
      ),
      updatedAt: new Date().toISOString(),
    }));
    this.scheduleSyncToApi();
  }

  toggleItemPaid(itemId: string): void {
    this.updateActiveTrip(t => ({
      ...t,
      itineraryItems: t.itineraryItems.map(i =>
        i.id === itemId ? { ...i, isPaid: !i.isPaid } : i
      ),
      updatedAt: new Date().toISOString(),
    }));
    this.scheduleSyncToApi();
  }

  setItemAttachment(itemId: string, attachment: AttachmentMeta | null): void {
    this.updateActiveTrip(t => ({
      ...t,
      itineraryItems: t.itineraryItems.map(i =>
        i.id === itemId ? { ...i, attachment } : i
      ),
      updatedAt: new Date().toISOString(),
    }));
  }

  // ---------------------------------------------------------------------------
  // Manual Expenses
  // ---------------------------------------------------------------------------

  addManualExpense(expense: ManualExpense): void {
    this._manualExpenses.update(list => [...list, expense]);
  }

  removeManualExpense(id: string): void {
    this._manualExpenses.update(list => list.filter(e => e.id !== id));
  }

  updateManualExpense(updated: ManualExpense): void {
    this._manualExpenses.update(list =>
      list.map(e => (e.id === updated.id ? updated : e))
    );
  }

  setManualExpenses(expenses: ManualExpense[]): void {
    this._manualExpenses.set(expenses);
  }

  // ---------------------------------------------------------------------------
  // Clone trip
  // ---------------------------------------------------------------------------

  cloneTrip(id: string, newName?: string): Observable<Trip> {
    return this.http.post<Trip>(`${this.baseUrl}/${id}/clone`, { name: newName }).pipe(
      tap((cloned) => {
        this._trips.update(list => [...list, cloned]);
        this.selectTrip(cloned.id);
      })
    );
  }

  // ---------------------------------------------------------------------------
  // Route optimization
  // ---------------------------------------------------------------------------

  optimizeRoute(items: { id: string; lat: number; lng: number }[]): Observable<{ optimized: { id: string; lat: number; lng: number }[] }> {
    const tripId = this._activeTripId();
    if (!tripId) return of({ optimized: items });
    return this.http.post<{ optimized: { id: string; lat: number; lng: number }[] }>(`${this.baseUrl}/${tripId}/optimize-route`, { items });
  }

  // ---------------------------------------------------------------------------
  // Readiness
  // ---------------------------------------------------------------------------

  getReadiness(): Observable<any> {
    const tripId = this._activeTripId();
    if (!tripId) return of(null);
    return this.http.get<any>(`${this.baseUrl}/${tripId}/readiness`);
  }

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  resetTrip(): void {
    const active = this.activeTrip();
    if (!active) return;

    if (this.auth.isLoggedIn() && this._synced) {
      this.http.delete(`${this.baseUrl}/${active.id}`).subscribe();
    }

    this._trips.update(list => list.filter(t => t.id !== active.id));
    this._activeTripId.set(null);
    localStorage.removeItem(ACTIVE_TRIP_KEY);
  }
}
