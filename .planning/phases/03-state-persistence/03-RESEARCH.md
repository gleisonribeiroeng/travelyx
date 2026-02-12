# Phase 3: State & Persistence - Research

**Researched:** 2026-02-12
**Domain:** Angular 21 Signals (signal, computed, effect), localStorage safe wrapper, canonical domain model design
**Confidence:** HIGH — Angular Signals API verified against angular.dev official docs; effect() stable in Angular 20; localStorage QuotaExceededError cross-browser patterns verified via multiple sources

---

## Summary

Phase 3 builds two foundational pieces that all feature phases (4–9) and the itinerary phase (10) depend on: canonical domain models and a signal-based state service that auto-persists to localStorage.

The Angular Signals API is fully stable as of Angular 20 (`effect()`, `linkedSignal()`, and `toSignal()` all reached stable status in v20). In Angular 21, the project target version, signals are the idiomatic state primitive — no NgRx is needed. The canonical pattern for a state service is: private `WritableSignal` fields exposed publicly via `.asReadonly()`, with mutation only through explicit service methods. Auto-persistence is implemented via `effect()` in the service constructor, which in a `providedIn: 'root'` context runs as a root effect (microtask-scheduled, independent of the component tree).

The `LocalStorageService` safe wrapper is the most important safety primitive in this phase. `localStorage.setItem()` throws a `DOMException` when the 5MB quota is exceeded. Different browsers report this differently (code 22 in most browsers, code 1014 in Firefox; name `QuotaExceededError` or `NS_ERROR_DOM_QUOTA_REACHED`). The wrapper must catch all variants and surface a visible warning — the success criterion states no crash on a full 5MB quota. On startup, `TripStateService` hydrates its signal from the `LocalStorageService` synchronously in the signal initializer, not in `ngOnInit` or a lifecycle hook.

**Primary recommendation:** Three files in strict dependency order — `core/models/trip.models.ts` (models barrel) → `core/services/local-storage.service.ts` (safe wrapper) → `core/services/trip-state.service.ts` (signal-based state with effect() persistence). No third-party libraries needed.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@angular/core` | 21.1.x (bundled) | `signal()`, `computed()`, `effect()`, `inject()`, `Injectable` | All stable in Angular 20+; no additional install |
| `localStorage` (Web API) | Browser native | Synchronous key-value persistence, 5MB quota | No install needed; synchronous API simplifies signal integration |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@angular/material` | 21.1.x | `MatSnackBar` for QuotaExceededError visible warning | Already installed; use for user-visible storage failure notification |

### NOT Required (avoid)
| Library | Reason to Avoid |
|---------|-----------------|
| `@ngrx/store` | Project decision: Angular Signals only, no NgRx |
| `@ngrx/signals` | Same reason; also signals-based NgRx would conflict with plain-signal architecture |
| `ngrx-signals-storage` | Third-party plugin that adds NgRx dependency; hand-rolling the effect is simpler and has zero deps |
| `idb` / IndexedDB | Overkill for trip data; localStorage is sufficient for 5MB limit; phase requirement is localStorage specifically |

**Installation:**
```bash
# No new packages needed — all dependencies are already installed.
# Angular core (signals), Angular Material (MatSnackBar), and browser localStorage are available.
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/app/
├── core/
│   ├── models/
│   │   ├── base.model.ts               # EXISTS: Price, DateRange, GeoLocation, ExternalLink, SearchResultBase
│   │   └── trip.models.ts              # NEW (Plan 03-01): all 8 domain model types + barrel exports
│   └── services/
│       ├── loading.service.ts          # EXISTS: signal-based loading counter
│       ├── local-storage.service.ts    # NEW (Plan 03-02): safe wrapper with QuotaExceededError handling
│       └── trip-state.service.ts       # NEW (Plan 03-03): TripStateService with signals + effect() persistence
```

### Pattern 1: Canonical Model Design — Composition Over Duplication
**What:** Each domain model interface composes base types from `base.model.ts` (`Price`, `DateRange`, `GeoLocation`, `ExternalLink`, `SearchResultBase`) rather than re-declaring common fields.
**When to use:** Every model in `trip.models.ts`. `SearchResultBase` already provides `id`, `source`, `addedToItinerary`.

```typescript
// Source: angular.dev/guide/signals — composable interfaces are idiomatic TypeScript
// src/app/core/models/trip.models.ts

import { Price, DateRange, GeoLocation, ExternalLink, SearchResultBase } from './base.model';

// ----- Trip container -----
export interface Trip {
  id: string;
  name: string;                    // e.g. "Paris Trip 2026"
  destination: string;             // primary destination city/country
  dates: DateRange;
  flights: Flight[];
  stays: Stay[];
  carRentals: CarRental[];
  transports: Transport[];
  activities: Activity[];
  attractions: Attraction[];
  itineraryItems: ItineraryItem[];
  createdAt: string;               // ISO timestamp
  updatedAt: string;               // ISO timestamp
}

// ----- Flight -----
export interface Flight extends SearchResultBase {
  origin: string;                  // IATA airport code
  destination: string;             // IATA airport code
  departureAt: string;             // ISO 8601 datetime
  arrivalAt: string;               // ISO 8601 datetime
  airline: string;
  flightNumber: string;
  durationMinutes: number;
  stops: number;
  price: Price;
  link: ExternalLink;
}

// ----- Stay (hotel / accommodation) -----
export interface Stay extends SearchResultBase {
  name: string;
  location: GeoLocation;
  address: string;
  checkIn: string;                 // ISO date
  checkOut: string;                // ISO date
  pricePerNight: Price;
  rating: number | null;           // 0–5, null if unavailable
  link: ExternalLink;
}

// ----- CarRental -----
export interface CarRental extends SearchResultBase {
  vehicleType: string;             // e.g. 'Economy', 'SUV'
  pickUpLocation: string;
  dropOffLocation: string;
  pickUpAt: string;                // ISO datetime
  dropOffAt: string;               // ISO datetime
  price: Price;
  link: ExternalLink;
}

// ----- Transport (intercity bus/train) -----
export interface Transport extends SearchResultBase {
  mode: 'bus' | 'train' | 'ferry' | 'other';
  origin: string;
  destination: string;
  departureAt: string;             // ISO datetime
  arrivalAt: string;               // ISO datetime
  durationMinutes: number;
  price: Price;
  link: ExternalLink;
}

// ----- Activity (tour/experience) -----
export interface Activity extends SearchResultBase {
  name: string;
  description: string;
  location: GeoLocation;
  city: string;
  durationMinutes: number | null;
  price: Price;
  link: ExternalLink;
}

// ----- Attraction -----
export interface Attraction extends SearchResultBase {
  name: string;
  description: string;
  location: GeoLocation;
  city: string;
  category: string;                // e.g. 'museum', 'park', 'landmark'
  link: ExternalLink | null;       // null when no official page available
}

// ----- ItineraryItem (concrete scheduled slot in the timeline) -----
export type ItineraryItemType =
  | 'flight'
  | 'stay'
  | 'car-rental'
  | 'transport'
  | 'activity'
  | 'attraction'
  | 'custom';

export interface ItineraryItem {
  id: string;
  type: ItineraryItemType;
  refId: string | null;            // references Flight.id, Stay.id, etc. (null for custom items)
  date: string;                    // ISO date (YYYY-MM-DD) — which day it appears in the timeline
  timeSlot: string | null;         // HH:MM (24h), null = all-day / time not specified
  label: string;                   // display name (populated from referenced model or user-supplied)
  notes: string;                   // user notes (empty string by default)
  order: number;                   // integer, sort key within a day+timeSlot group
}
```

### Pattern 2: LocalStorageService Safe Wrapper
**What:** A thin `@Injectable({ providedIn: 'root' })` class that wraps all `localStorage` calls in try/catch. Detects `QuotaExceededError` by checking both `DOMException` codes (22 for most browsers, 1014 for Firefox) and names. Exposes `get<T>`, `set`, `remove`, `clear` methods. Emits a visible warning via Angular Material `MatSnackBar` when quota is exceeded.
**When to use:** All localStorage access in this project must go through this service. `TripStateService` uses it; components never access `localStorage` directly.

```typescript
// Source: mmazzarolo.com/blog/2022-06-25-local-storage-status/ (QuotaExceededError detection)
// Source: angular.dev/api/core/Injectable (service pattern)
// src/app/core/services/local-storage.service.ts

import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class LocalStorageService {
  private readonly snackBar = inject(MatSnackBar);

  /**
   * Retrieve and deserialize a stored value.
   * Returns null if the key does not exist or if the stored JSON is malformed.
   */
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  /**
   * Serialize and store a value.
   * If localStorage is full, catches QuotaExceededError, shows a snackbar warning,
   * and does NOT crash the application.
   */
  set(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      if (this.isQuotaExceededError(err)) {
        this.snackBar.open(
          'Storage full — your trip could not be saved. Please remove some items.',
          'Dismiss',
          { duration: 8000, panelClass: 'snack-warning' },
        );
      }
      // Non-quota errors (e.g. SecurityError in private mode) are swallowed silently;
      // the app continues to function with in-memory state only.
    }
  }

  /** Remove a single key. */
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore — private browsing may disallow this
    }
  }

  /** Clear all localStorage keys for this origin. */
  clear(): void {
    try {
      localStorage.clear();
    } catch {
      // Ignore
    }
  }

  /**
   * Cross-browser QuotaExceededError detection.
   * Chrome/Safari: DOMException.code === 22 && name === 'QuotaExceededError'
   * Firefox:       DOMException.code === 1014 && name === 'NS_ERROR_DOM_QUOTA_REACHED'
   * Edge: same as Chrome
   */
  private isQuotaExceededError(err: unknown): boolean {
    return (
      err instanceof DOMException &&
      (err.code === 22 ||
        err.code === 1014 ||
        err.name === 'QuotaExceededError' ||
        err.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    );
  }
}
```

### Pattern 3: TripStateService — Private Writable, Public Readonly, Effect Persistence
**What:** Root-provided service with a single private `WritableSignal<Trip>` as the source of truth. Public surface exposes `.asReadonly()` signals and `computed()` views. Mutation only through explicit service methods. An `effect()` in the constructor auto-persists on every change. On startup, signal initializer reads from `LocalStorageService` synchronously.
**When to use:** This is the only place in the application that holds trip state. All feature components inject this service.

```typescript
// Source: angular.dev/guide/signals — private writable + asReadonly() pattern
// Source: angular.dev/guide/signals/effect — effect() in service constructor
// src/app/core/services/trip-state.service.ts

import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { LocalStorageService } from './local-storage.service';
import { Trip, Flight, Stay, CarRental, Transport, Activity, Attraction, ItineraryItem } from '../models/trip.models';

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

@Injectable({ providedIn: 'root' })
export class TripStateService {
  private readonly storage = inject(LocalStorageService);

  // Single source of truth — private writable
  private readonly _trip = signal<Trip>(
    this.storage.get<Trip>(STORAGE_KEY) ?? { ...DEFAULT_TRIP }
  );

  // Public read-only view of the whole trip
  readonly trip = this._trip.asReadonly();

  // Computed slices — components read these, not _trip() directly
  readonly flights = computed(() => this._trip().flights);
  readonly stays = computed(() => this._trip().stays);
  readonly carRentals = computed(() => this._trip().carRentals);
  readonly transports = computed(() => this._trip().transports);
  readonly activities = computed(() => this._trip().activities);
  readonly attractions = computed(() => this._trip().attractions);
  readonly itineraryItems = computed(() => this._trip().itineraryItems);
  readonly hasItems = computed(() => this._trip().itineraryItems.length > 0);

  constructor() {
    // Auto-persist: effect() fires at least once, then on every _trip() change.
    // In a root service, this is a root effect (microtask-scheduled before any component check).
    effect(() => {
      this.storage.set(STORAGE_KEY, this._trip());
    });
  }

  // ----- Mutation methods -----

  setTripMeta(name: string, destination: string, dates: { start: string; end: string }): void {
    this._trip.update(t => ({ ...t, name, destination, dates, updatedAt: new Date().toISOString() }));
  }

  addFlight(flight: Flight): void {
    this._trip.update(t => ({ ...t, flights: [...t.flights, flight], updatedAt: new Date().toISOString() }));
  }

  removeFlight(id: string): void {
    this._trip.update(t => ({ ...t, flights: t.flights.filter(f => f.id !== id), updatedAt: new Date().toISOString() }));
  }

  addStay(stay: Stay): void {
    this._trip.update(t => ({ ...t, stays: [...t.stays, stay], updatedAt: new Date().toISOString() }));
  }

  removeStay(id: string): void {
    this._trip.update(t => ({ ...t, stays: t.stays.filter(s => s.id !== id), updatedAt: new Date().toISOString() }));
  }

  addCarRental(car: CarRental): void {
    this._trip.update(t => ({ ...t, carRentals: [...t.carRentals, car], updatedAt: new Date().toISOString() }));
  }

  removeCarRental(id: string): void {
    this._trip.update(t => ({ ...t, carRentals: t.carRentals.filter(c => c.id !== id), updatedAt: new Date().toISOString() }));
  }

  addTransport(transport: Transport): void {
    this._trip.update(t => ({ ...t, transports: [...t.transports, transport], updatedAt: new Date().toISOString() }));
  }

  removeTransport(id: string): void {
    this._trip.update(t => ({ ...t, transports: t.transports.filter(tr => tr.id !== id), updatedAt: new Date().toISOString() }));
  }

  addActivity(activity: Activity): void {
    this._trip.update(t => ({ ...t, activities: [...t.activities, activity], updatedAt: new Date().toISOString() }));
  }

  removeActivity(id: string): void {
    this._trip.update(t => ({ ...t, activities: t.activities.filter(a => a.id !== id), updatedAt: new Date().toISOString() }));
  }

  addAttraction(attraction: Attraction): void {
    this._trip.update(t => ({ ...t, attractions: [...t.attractions, attraction], updatedAt: new Date().toISOString() }));
  }

  removeAttraction(id: string): void {
    this._trip.update(t => ({ ...t, attractions: t.attractions.filter(a => a.id !== id), updatedAt: new Date().toISOString() }));
  }

  addItineraryItem(item: ItineraryItem): void {
    this._trip.update(t => ({ ...t, itineraryItems: [...t.itineraryItems, item], updatedAt: new Date().toISOString() }));
  }

  removeItineraryItem(id: string): void {
    this._trip.update(t => ({ ...t, itineraryItems: t.itineraryItems.filter(i => i.id !== id), updatedAt: new Date().toISOString() }));
  }

  updateItineraryItem(updated: ItineraryItem): void {
    this._trip.update(t => ({
      ...t,
      itineraryItems: t.itineraryItems.map(i => i.id === updated.id ? updated : i),
      updatedAt: new Date().toISOString(),
    }));
  }

  resetTrip(): void {
    this._trip.set({ ...DEFAULT_TRIP, id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    this.storage.remove(STORAGE_KEY);
  }
}
```

### Pattern 4: Trip Recovery on Startup
**What:** The signal initializer reads from `LocalStorageService.get<Trip>()` synchronously. If the key is missing or JSON is malformed, `get()` returns `null` and the signal falls back to `DEFAULT_TRIP`. No `APP_INITIALIZER` or lifecycle hooks needed — the signal is hydrated at construction time, which happens when the service is first injected (i.e., during app bootstrap, before any component renders).
**When to use:** This is already handled by the pattern in Pattern 3 (`signal(this.storage.get<Trip>(STORAGE_KEY) ?? { ...DEFAULT_TRIP })`). No additional code is needed.

```typescript
// Recovery happens in the signal initializer — NOT in ngOnInit or afterViewInit.
// The service is provided at root, so it constructs during app bootstrap.
// By the time any component calls this.tripState.flights(), the signal is already hydrated.
private readonly _trip = signal<Trip>(
  this.storage.get<Trip>(STORAGE_KEY) ?? { ...DEFAULT_TRIP }
);
```

### Pattern 5: Models Barrel Export
**What:** A single `trip.models.ts` file exports all 8 model types. Feature phases import from this one path, not from individual files.
**When to use:** Every feature phase (4–9) and the itinerary phase (10) will import from `core/models/trip.models.ts`.

```typescript
// Barrel — all models in one file for this project's scale.
// This is the "single models barrel" the success criteria requires.
// Feature usage:
import { Flight, Stay, CarRental, ItineraryItem } from '../../../core/models/trip.models';
```

**Note on single-file vs multi-file barrel:** At this project's scale (8 related model types for one domain), a single file is cleaner than 8 separate files with an `index.ts`. If models grow significantly in Phase 10+, split is straightforward.

### Anti-Patterns to Avoid
- **Accessing `localStorage` directly in components or features:** All localStorage access MUST go through `LocalStorageService`. Components that call `localStorage.setItem()` bypass error handling and create untestable code.
- **Storing raw API response objects in `TripStateService`:** State must use internal canonical models (e.g., `Flight` not `AmadeusFlightOffer`). Phase 4 mappers are responsible for the translation before calling `addFlight()`.
- **Using `APP_INITIALIZER` for trip recovery:** This is deprecated in Angular 21. The signal initializer provides synchronous hydration without any lifecycle ceremony.
- **Putting `effect()` outside the constructor:** `effect()` requires an injection context. The constructor of a root-provided service is the correct, natural location.
- **Using `allowSignalWrites: true`:** This option was deprecated in Angular 19 and is a no-op in Angular 21. Remove it if encountered in old code.
- **Calling `_trip.set()` directly from components:** The `_trip` field is private. Components must call service methods like `addFlight()`. Bypassing the service API breaks the single-source-of-truth invariant.
- **Storing `Date` objects in the signal:** JSON serialization of `Date` produces a string but `JSON.parse` returns it as a string, not a `Date`. Always use ISO strings (`new Date().toISOString()`) in models; convert to `Date` at display time.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| QuotaExceededError detection | Custom error code checking inline in every `setItem` call | `LocalStorageService.isQuotaExceededError()` private helper | Firefox uses code 1014 AND name `NS_ERROR_DOM_QUOTA_REACHED`; Chrome uses code 22. Missing either case causes silent data loss in a specific browser |
| Reactive persistence | Manual `ngOnChanges` watching or RxJS BehaviorSubject + subscribe | `effect()` in service constructor | `effect()` is the Angular-idiomatic reactive side effect primitive; it handles batching and scheduling correctly |
| Signal exposure | Exposing `WritableSignal` directly as public field | `.asReadonly()` + explicit mutation methods | Direct public `WritableSignal` allows any component to call `.set()`, bypassing service validation and breaking testability |
| Trip hydration | `APP_INITIALIZER` token + async factory | Synchronous signal initializer | `APP_INITIALIZER` is deprecated in Angular 21; synchronous `localStorage.getItem()` + signal initializer is simpler and sufficient |
| UUID generation for model IDs | Custom random string generator | `crypto.randomUUID()` | Built into all modern browsers; RFC 4122 compliant; no import needed |

**Key insight:** The localStorage persistence layer is deceptively simple to break. The three hard problems are: (1) cross-browser QuotaExceededError variants, (2) keeping effect() in a valid injection context, and (3) ensuring JSON serialization round-trips correctly for all model types (no `Date`, `Map`, `Set`, `undefined` — only JSON-safe primitives).

---

## Common Pitfalls

### Pitfall 1: effect() Created Outside Injection Context
**What goes wrong:** `TypeError: injection context required` at runtime. The effect is never registered and persistence silently stops.
**Why it happens:** `effect()` internally calls `inject(DestroyRef)` to register cleanup. This only works in a constructor, field initializer, or code wrapped in `runInInjectionContext()`.
**How to avoid:** Always create `effect()` inside the service constructor. Never in a method body called later (e.g., `initialize()` method called from outside).
**Warning signs:** `ERROR Error: NG0203: inject() must be called from an injection context` in the console.

### Pitfall 2: effect() Runs Asynchronously — Not Suitable for Derived State
**What goes wrong:** Code that expects the effect to have already run after calling `addFlight()` will read stale localStorage data.
**Why it happens:** Root effects run as microtasks. After `_trip.update()`, the effect has NOT yet written to localStorage. It will run before the next component check, but not synchronously.
**How to avoid:** Never write code that depends on the effect having already fired after a synchronous signal mutation. If a method needs to ensure persistence happened before proceeding, call `this.storage.set(STORAGE_KEY, this._trip())` directly rather than relying on the effect timing. The effect's job is "eventually consistent" persistence, not synchronous persistence.
**Warning signs:** Integration tests that read localStorage immediately after calling a service mutation method find stale data.

### Pitfall 3: JSON.parse Fails on Corrupt localStorage Data
**What goes wrong:** `SyntaxError: Unexpected token` at app startup. The signal initializer throws, crashing the app before it renders.
**Why it happens:** `localStorage` data can be corrupted by the user, a browser extension, or a previous app crash mid-write. `JSON.parse()` does not handle partial JSON.
**How to avoid:** The `LocalStorageService.get<T>()` method wraps `JSON.parse()` in a try/catch and returns `null` on error. The `??` fallback in the signal initializer then uses `DEFAULT_TRIP`. Never call `JSON.parse()` directly outside the service.
**Warning signs:** App crashes on startup only in specific users' browsers; error mentions `JSON.parse`.

### Pitfall 4: Date Serialization Round-Trip
**What goes wrong:** Model field stored as `Date` object; after `JSON.parse`, field is a `string` not a `Date`. Code calling `.getFullYear()` throws `TypeError: not a function`.
**Why it happens:** `JSON.stringify(new Date())` → `"2026-02-12T10:00:00.000Z"`. `JSON.parse(...)` → `string`, not `Date`. TypeScript types lie after deserialization.
**How to avoid:** All datetime fields in models use `string` type with ISO 8601 format. Convert to `Date` at the last moment (in a pipe or a computed display value), never in the model.
**Warning signs:** `TypeError: Cannot read properties of undefined (reading 'getFullYear')` in templates that use date methods on model fields.

### Pitfall 5: allowSignalWrites Warning in console
**What goes wrong:** Console shows `NG0600: Writing to signals is not allowed in a computed` or deprecation warning about `allowSignalWrites`.
**Why it happens:** Older code or tutorials used `allowSignalWrites: true` option on effects. In Angular 19, this was deprecated. In Angular 21, the option is a no-op.
**How to avoid:** Never pass `allowSignalWrites` to `effect()`. In Angular 21, signal writes inside effects are permitted by default.
**Warning signs:** Console warning `allowSignalWrites` is deprecated.

### Pitfall 6: localStorage Not Available (Private Browsing / Security Restriction)
**What goes wrong:** `SecurityError: Access is denied for this document` or similar. The `setItem` call throws a non-quota error.
**Why it happens:** Some browsers in private/incognito mode disable or heavily restrict localStorage. Safari in private mode simulates localStorage but clears it on tab close. Firefox in some privacy modes throws on access.
**How to avoid:** The `LocalStorageService.set()` catch block silently swallows non-quota errors. The application continues with in-memory state only. No crash.
**Warning signs:** Trip is lost on page refresh when user is in private browsing mode — this is expected and acceptable behavior.

---

## Code Examples

Verified patterns from official sources:

### effect() in Root Service Constructor (Official Pattern)
```typescript
// Source: angular.dev/guide/signals/effect
// Effect in a root-provided service constructor — this is a "root effect",
// runs as a microtask before any component check.
@Injectable({ providedIn: 'root' })
export class TripStateService {
  private readonly storage = inject(LocalStorageService);
  private readonly _trip = signal<Trip>(this.storage.get<Trip>('triply_trip') ?? DEFAULT_TRIP);

  constructor() {
    effect(() => {
      // Reads _trip() — registers it as a dependency.
      // Runs once immediately, then whenever _trip() changes.
      this.storage.set('triply_trip', this._trip());
    });
  }
}
```

### signal() + asReadonly() Encapsulation Pattern
```typescript
// Source: angular.dev/api/core/WritableSignal
// Source: angular.dev/guide/signals (private writable, public readonly pattern)
private readonly _count = signal(0);

// Exposes a Signal<number> — consumers cannot call .set() or .update()
readonly count = this._count.asReadonly();

// Mutation through controlled methods only
increment(): void { this._count.update(c => c + 1); }
```

### computed() for Derived Slices
```typescript
// Source: angular.dev/guide/signals — computed() is cached until dependencies change
readonly flights = computed(() => this._trip().flights);
readonly hasItems = computed(() => this._trip().itineraryItems.length > 0);

// In template: no need to call this._trip().flights — use the computed slice
// {{ tripState.flights().length }} results
```

### QuotaExceededError Cross-Browser Detection
```typescript
// Source: mmazzarolo.com/blog/2022-06-25-local-storage-status/
// Source: crocodillon.com/blog/always-catch-localstorage-security-and-quota-exceeded-errors
// Covers: Chrome (code 22), Firefox (code 1014), all modern browsers by name
private isQuotaExceededError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    (err.code === 22 ||
      err.code === 1014 ||
      err.name === 'QuotaExceededError' ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  );
}
```

### Startup Trip Recovery (No APP_INITIALIZER Needed)
```typescript
// Source: angular.dev/guide/signals — signal initializer is synchronous
// APP_INITIALIZER is deprecated in Angular 21; this pattern replaces it for localStorage hydration.
private readonly _trip = signal<Trip>(
  this.storage.get<Trip>(STORAGE_KEY) ?? { ...DEFAULT_TRIP }
);
// ^ This line runs synchronously at service construction (during app bootstrap).
// By the time any component reads this.tripState.flights(), the signal is hydrated.
```

### Safe get() with Malformed JSON Protection
```typescript
// Source: mmazzarolo.com/blog/2022-06-25-local-storage-status/
get<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;  // may throw SyntaxError for corrupt data
  } catch {
    return null;  // return null — caller uses fallback (DEFAULT_TRIP)
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `APP_INITIALIZER` token for startup data loading | Signal initializer with synchronous `localStorage.getItem()` | Angular 21 deprecated `APP_INITIALIZER` | No async factory or injection token needed for simple localStorage hydration |
| `allowSignalWrites: true` on `effect()` | Not needed — signal writes in effects are allowed by default | Angular 19 (deprecated), Angular 20 (no-op) | Remove the option from all `effect()` calls; no behavior change |
| `BehaviorSubject` + RxJS for state services | `signal()` + `computed()` + `effect()` | Signals stable: Angular 17; `effect()` stable: Angular 20 | Cleaner, synchronous read, no subscription management |
| Multiple `@NgModule` `forRoot()` providers | `@Injectable({ providedIn: 'root' })` | Angular 14+ (standalone), mainstream in Angular 17+ | No module needed for singleton services |
| `retryWhen` for backoff (previous phase reference) | `retry({ count, delay })` | RxJS 7.3+ | (carried from Phase 2 research — not directly relevant to Phase 3) |

**Deprecated/outdated:**
- `APP_INITIALIZER` token: Deprecated in Angular 21. For simple synchronous localStorage hydration, use the signal initializer instead.
- `allowSignalWrites: true` option on `effect()`: Deprecated in Angular 19, no-op in Angular 20+. Remove it.
- `NgRx` for signal-based apps: Not deprecated, but the project decision is signals-only. NgRx is explicitly excluded.

---

## Open Questions

1. **`ItineraryItem.refId` lookup strategy**
   - What we know: `ItineraryItem` references domain objects (Flight, Stay, etc.) via `refId`. Phase 10 (itinerary view) needs to resolve these references to display details.
   - What's unclear: Should `TripStateService` provide a `computed(() => resolveItem(item))` helper, or should the itinerary component do the lookup itself from the signal slices?
   - Recommendation: Defer to Phase 10. For Phase 3, just define the `refId: string | null` field and document the lookup contract. The service provides slices (`flights`, `stays`, etc.) by ID; callers find the referenced object via array `.find()`.

2. **Schema versioning for localStorage migrations**
   - What we know: If the `Trip` model changes (new fields, renamed fields), existing localStorage data from a previous app version will be incompatible.
   - What's unclear: Phase 3 is the first version, so no migration is needed yet. But the question is whether to add a `schemaVersion: number` field to `Trip` now.
   - Recommendation: Add `schemaVersion: 1` to the `Trip` interface and to `DEFAULT_TRIP`. The `LocalStorageService.get<Trip>()` fallback-to-default pattern already handles corrupt/missing data. When a schema change occurs (Phase 10+), a version field makes migration possible. Cost: one extra integer field.

3. **effect() timing guarantees for the "within one render cycle" success criterion**
   - What we know: Root effects (effects in root-provided services) run as microtasks, before any component checking begins. This means after `_trip.update()` returns, the effect will run before the browser paints and before any Angular change detection runs on components.
   - What's unclear: The success criterion says "within one render cycle." If this means "before the next paint," root effect timing satisfies it. If it means "synchronously after `update()`," it does NOT — effects are always asynchronous.
   - Recommendation: The success criterion is met by the root effect timing pattern. Document the clarification: "one render cycle" means "before the next Angular change detection pass," not "synchronously." If strict synchronous write is needed (e.g., for `beforeunload` event), add a direct `this.storage.set()` call in the service mutation methods as a fallback.

---

## Sources

### Primary (HIGH confidence)
- `angular.dev/guide/signals` — `signal()`, `computed()`, `.asReadonly()`, `WritableSignal`, signal initialization pattern
- `angular.dev/guide/signals/effect` — `effect()` in service constructor, injection context requirements, onCleanup, root vs component effects
- `angular.dev/api/core/effect` — Function signature, effect types (root vs component), timing description
- `angular.dev/api/core/CreateEffectOptions` — `allowSignalWrites` deprecated status confirmed; `manualCleanup`, `injector`, `debugName` options documented
- `angular.dev/api/core/WritableSignal` — `.set()`, `.update()`, `.asReadonly()` API

### Secondary (MEDIUM confidence)
- `mmazzarolo.com/blog/2022-06-25-local-storage-status/` — Cross-browser `QuotaExceededError` detection (code 22 vs 1014, name variants); storage support detection; verified against multiple community sources
- `blog.angular.dev/announcing-angular-v20-b5c9c06cf301` — `effect()`, `linkedSignal()`, `toSignal()` stable in Angular 20 (confirmed via WebSearch result from official Angular blog)
- `www.infoq.com/news/2025/11/angular-21-released/` — Angular 21 release features: Zoneless stable, Signal Forms experimental, Vitest default; no breaking changes to core signals API
- `angular.dev/api/core/APP_INITIALIZER` — Deprecated in Angular 21 (confirmed via Phase 2 research and prior architecture research)
- Multiple WebSearch results confirming: `allowSignalWrites` deprecated in Angular 19, no-op in Angular 20+

### Tertiary (LOW confidence — validate before implementing)
- Effect microtask timing guarantees: "root effects run as microtasks" stated in search results summary; not directly verified from the official `angular.dev/api/core/effect` page. Implementation should treat this as correct but test with a `beforeunload` fallback if strict persistence before tab close is required.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Angular Signals API verified via angular.dev; no new packages needed
- Architecture patterns: HIGH — signal service pattern, `asReadonly()`, `effect()` in constructor all verified via official docs
- LocalStorage QuotaExceededError handling: HIGH — cross-browser error codes verified via dedicated blog post + multiple community sources, consistent with MDN
- Model design (8 domain types): MEDIUM — interfaces are designed from requirements; actual field shapes will be refined when feature phases (4–9) implement their mappers
- Effect timing guarantees: MEDIUM — root effect = microtask stated in search results; not directly verified from primary source

**Research date:** 2026-02-12
**Valid until:** 2026-03-14 (30 days — Angular Signals API stable; localStorage API stable; no fast-moving dependencies)
