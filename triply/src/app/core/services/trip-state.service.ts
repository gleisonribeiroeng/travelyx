import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { LocalStorageService } from './local-storage.service';
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

const STORAGE_KEY = 'triply_trip';

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

/**
 * Signal-based single source of truth for all trip data.
 *
 * - Hydrates from localStorage synchronously on construction (startup recovery).
 * - Auto-persists every state change via a root effect().
 * - Exposes all data as readonly signals and computed slices.
 * - Accepts mutations only through explicit public methods.
 */
@Injectable({ providedIn: 'root' })
export class TripStateService {
  private readonly storage = inject(LocalStorageService);

  /** Private writable signal — hydrated from localStorage on construction. */
  private readonly _trip = signal<Trip>(
    this.storage.get<Trip>(STORAGE_KEY) ?? { ...DEFAULT_TRIP }
  );

  /** Public readonly view — components read this, never _trip directly. */
  readonly trip = this._trip.asReadonly();

  // Computed slices — each exposes one array from the trip.
  readonly flights = computed(() => this._trip().flights);
  readonly stays = computed(() => this._trip().stays);
  readonly carRentals = computed(() => this._trip().carRentals);
  readonly transports = computed(() => this._trip().transports);
  readonly activities = computed(() => this._trip().activities);
  readonly attractions = computed(() => this._trip().attractions);
  readonly itineraryItems = computed(() => this._trip().itineraryItems);
  readonly hasItems = computed(() => this._trip().itineraryItems.length > 0);

  constructor() {
    // Auto-persist: re-runs whenever _trip() changes.
    effect(() => {
      this.storage.set(STORAGE_KEY, this._trip());
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
  }

  removeFlight(id: string): void {
    this._trip.update((t) => ({
      ...t,
      flights: t.flights.filter((f) => f.id !== id),
      updatedAt: new Date().toISOString(),
    }));
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
  }

  removeStay(id: string): void {
    this._trip.update((t) => ({
      ...t,
      stays: t.stays.filter((s) => s.id !== id),
      updatedAt: new Date().toISOString(),
    }));
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
  }

  removeCarRental(id: string): void {
    this._trip.update((t) => ({
      ...t,
      carRentals: t.carRentals.filter((c) => c.id !== id),
      updatedAt: new Date().toISOString(),
    }));
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
  }

  removeTransport(id: string): void {
    this._trip.update((t) => ({
      ...t,
      transports: t.transports.filter((tr) => tr.id !== id),
      updatedAt: new Date().toISOString(),
    }));
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
  }

  removeActivity(id: string): void {
    this._trip.update((t) => ({
      ...t,
      activities: t.activities.filter((a) => a.id !== id),
      updatedAt: new Date().toISOString(),
    }));
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
  }

  removeAttraction(id: string): void {
    this._trip.update((t) => ({
      ...t,
      attractions: t.attractions.filter((a) => a.id !== id),
      updatedAt: new Date().toISOString(),
    }));
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
  }

  removeItineraryItem(id: string): void {
    this._trip.update((t) => ({
      ...t,
      itineraryItems: t.itineraryItems.filter((i) => i.id !== id),
      updatedAt: new Date().toISOString(),
    }));
  }

  updateItineraryItem(updated: ItineraryItem): void {
    this._trip.update((t) => ({
      ...t,
      itineraryItems: t.itineraryItems.map((i) =>
        i.id === updated.id ? updated : i
      ),
      updatedAt: new Date().toISOString(),
    }));
  }

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  resetTrip(): void {
    this.storage.remove(STORAGE_KEY);
    this._trip.set({
      ...DEFAULT_TRIP,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}
