# Architecture Research

**Domain:** Angular 17+ Travel Planning SPA (Triply)
**Researched:** 2026-02-11
**Confidence:** MEDIUM — Based on Angular 17+ training knowledge (cutoff ~Jan 2025). Angular signals and standalone component patterns were stable in Angular 17. Verify any claims about Angular 18/19 specifics against official docs before implementation.

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Feature Layer                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────┐ │
│  │ Flights  │ │  Hotels  │ │   Cars   │ │Transport │ │ Tours │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬───┘ │
│       │            │            │            │            │     │
│  ┌────┴────────────┴────────────┴────────────┴────────────┴─┐   │
│  │                  Itinerary Builder Module                  │   │
│  └────────────────────────────┬──────────────────────────────┘   │
├───────────────────────────────┼─────────────────────────────────┤
│                          Core Layer                              │
│  ┌──────────────┐  ┌──────────┴────┐  ┌───────────────────┐     │
│  │ TripState    │  │  HTTP Client  │  │  LocalStorage     │     │
│  │ Service      │  │  Interceptors │  │  Service          │     │
│  │ (Signals)    │  │  (Functional) │  │                   │     │
│  └──────┬───────┘  └───────────────┘  └───────────────────┘     │
├──────────┼──────────────────────────────────────────────────────┤
│          │                  API Layer                            │
│  ┌───────┴──────────────────────────────────────────────────┐   │
│  │  Feature API Services (with Mappers: raw → internal model)│   │
│  │  FlightApiService | HotelApiService | CarApiService ...   │   │
│  └───────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                         Shared Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Angular      │  │ Common UI    │  │ Shared Models /       │   │
│  │ Material     │  │ Components   │  │ Interfaces            │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                      External APIs (6)                           │
│  Amadeus / Skyscanner | Booking.com | RentalCars | ...          │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| Feature Module (e.g., Flights) | Search UI, results display, item selection | TripStateService, FlightApiService, SharedModule |
| Itinerary Builder Module | Compose, reorder, display full trip itinerary | TripStateService only (reads from it) |
| TripStateService | Global state via signals: selected flights/hotels/cars/etc., active trip | All feature modules + Itinerary Builder |
| Feature ApiService (e.g., FlightApiService) | HTTP calls to one external API; maps raw response to internal model | HttpClient, ApiConfigService, ErrorHandlerService |
| Mapper (e.g., FlightMapper) | Pure transform: ExternalFlightResponse -> Flight (internal model) | Called only by FlightApiService |
| LocalStorageService | Persist/restore TripState to/from browser localStorage | TripStateService (on init + on state change) |
| Core Interceptors (functional) | Auth tokens, error normalization, loading state | HttpClient pipeline |
| SharedModule | Re-export Angular Material modules + common UI components | All feature modules import this |
| AppRouting | Lazy-load feature modules by route | Angular Router |

## Recommended Project Structure

```
src/
├── app/
│   ├── core/                        # Singleton services, interceptors, guards
│   │   ├── interceptors/
│   │   │   ├── auth.interceptor.ts          # Functional interceptor
│   │   │   ├── error.interceptor.ts         # Functional interceptor
│   │   │   └── loading.interceptor.ts       # Functional interceptor
│   │   ├── services/
│   │   │   ├── trip-state.service.ts        # Global signal-based state
│   │   │   ├── local-storage.service.ts     # Persist/restore state
│   │   │   └── api-config.service.ts        # API keys, base URLs
│   │   ├── guards/
│   │   │   └── active-trip.guard.ts         # Functional guard
│   │   ├── models/                          # Internal canonical models
│   │   │   ├── flight.model.ts
│   │   │   ├── hotel.model.ts
│   │   │   ├── car.model.ts
│   │   │   ├── transport.model.ts
│   │   │   ├── tour.model.ts
│   │   │   ├── attraction.model.ts
│   │   │   └── itinerary.model.ts
│   │   └── errors/
│   │       └── api-error.model.ts
│   │
│   ├── shared/                      # Shared UI — imported by feature modules
│   │   ├── shared.module.ts                 # Re-exports Material + common components
│   │   ├── components/
│   │   │   ├── search-card/
│   │   │   ├── result-card/
│   │   │   ├── loading-spinner/
│   │   │   └── error-banner/
│   │   └── pipes/
│   │       └── duration.pipe.ts
│   │
│   ├── features/
│   │   ├── flights/
│   │   │   ├── flights.routes.ts            # Lazy route config (standalone)
│   │   │   ├── components/
│   │   │   │   ├── flight-search/
│   │   │   │   │   └── flight-search.component.ts
│   │   │   │   └── flight-results/
│   │   │   │       └── flight-results.component.ts
│   │   │   ├── services/
│   │   │   │   └── flight-api.service.ts    # HTTP + mapping
│   │   │   └── mappers/
│   │   │       └── flight.mapper.ts         # Raw API -> internal model
│   │   │
│   │   ├── hotels/                  # Same structure as flights/
│   │   ├── cars/
│   │   ├── transport/
│   │   ├── tours/
│   │   └── attractions/
│   │
│   ├── itinerary/
│   │   ├── itinerary.routes.ts
│   │   └── components/
│   │       ├── itinerary-view/
│   │       │   └── itinerary-view.component.ts
│   │       └── itinerary-item/
│   │           └── itinerary-item.component.ts
│   │
│   ├── app.component.ts             # Root standalone component
│   ├── app.config.ts                # provideRouter, provideHttpClient, etc.
│   └── app.routes.ts                # Top-level lazy routes
│
├── environments/
│   ├── environment.ts
│   └── environment.prod.ts
└── index.html
```

### Structure Rationale

- **core/**: Everything that should be instantiated once app-wide. Services here use `providedIn: 'root'` or are registered in `app.config.ts`. Interceptors and guards are functional (no class-based providers needed).
- **shared/**: Avoids Angular Material imports being duplicated across 6+ feature modules. `SharedModule` re-exports `MatButtonModule`, `MatCardModule`, `MatInputModule`, etc., plus common UI components. Feature modules import `SharedModule` once.
- **features/[name]/**: Each feature is self-contained. The `*.routes.ts` file is the public contract — it lazy-loads via `loadChildren` or `loadComponent`. Internals (components, services, mappers) are not exposed outside the feature.
- **Mappers as separate files**: Keeps ApiService thin and makes the transformation logic independently testable. A mapper is a pure function or stateless class.
- **itinerary/**: Kept separate from features because it is a read/compose view — it never calls external APIs itself. It only reads from `TripStateService`.

## Architectural Patterns

### Pattern 1: Signal-Based Global State (TripStateService)

**What:** Use Angular signals (`signal()`, `computed()`, `effect()`) inside a root-provided service as the single source of truth for the trip being built. No NgRx needed.
**When to use:** App-wide shared state that multiple unrelated modules need to read/write.
**Trade-offs:** Simple to start, harder to time-travel debug vs NgRx. Fine for a travel planner with no undo/redo.

**Example:**
```typescript
// core/services/trip-state.service.ts
import { Injectable, signal, computed } from '@angular/core';
import { Flight } from '../models/flight.model';
import { Hotel } from '../models/hotel.model';

@Injectable({ providedIn: 'root' })
export class TripStateService {
  // Writable signals — write via service methods only
  private _selectedFlight = signal<Flight | null>(null);
  private _selectedHotel = signal<Hotel | null>(null);

  // Public read-only computed views
  readonly selectedFlight = this._selectedFlight.asReadonly();
  readonly selectedHotel = this._selectedHotel.asReadonly();

  readonly hasCompletedBooking = computed(() =>
    this._selectedFlight() !== null && this._selectedHotel() !== null
  );

  selectFlight(flight: Flight): void {
    this._selectedFlight.set(flight);
  }

  clearFlight(): void {
    this._selectedFlight.set(null);
  }
}
```

### Pattern 2: Functional HTTP Interceptors (Angular 15+, recommended in 17+)

**What:** Register interceptors as pure functions using `withInterceptors()` in `provideHttpClient()`. No class-based `HTTP_INTERCEPTORS` token needed.
**When to use:** Always in Angular 17+. Class interceptors are legacy.
**Trade-offs:** Simpler DI, better tree-shaking, no boilerplate class.

**Example:**
```typescript
// core/interceptors/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { ApiConfigService } from '../services/api-config.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const apiConfig = inject(ApiConfigService);
  const cloned = req.clone({
    setHeaders: { Authorization: `Bearer ${apiConfig.getToken()}` }
  });
  return next(cloned);
};

// app.config.ts
import { provideHttpClient, withInterceptors } from '@angular/common/http';
export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor]))
  ]
};
```

### Pattern 3: API Service + Mapper Separation

**What:** Each feature has one `*ApiService` that handles HTTP and delegates transformation to a `*Mapper`. The mapper is a pure function (or static class) that converts the external API shape to the internal canonical model.
**When to use:** Any time an external API schema differs from your internal representation — always true for 3rd-party travel APIs.
**Trade-offs:** Slightly more files, but the boundary is extremely valuable when APIs change (only mapper changes) and for testing (mappers are pure unit tests).

**Example:**
```typescript
// features/flights/mappers/flight.mapper.ts
import { Flight } from '../../../core/models/flight.model';
import { AmadeusFlightOffer } from '../models/amadeus-flight-offer.type';

export function mapAmadeusFlightToFlight(raw: AmadeusFlightOffer): Flight {
  return {
    id: raw.id,
    origin: raw.itineraries[0].segments[0].departure.iataCode,
    destination: raw.itineraries[0].segments.at(-1)!.arrival.iataCode,
    price: parseFloat(raw.price.total),
    currency: raw.price.currency,
    departureAt: new Date(raw.itineraries[0].segments[0].departure.at),
  };
}

// features/flights/services/flight-api.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Flight } from '../../../core/models/flight.model';
import { mapAmadeusFlightToFlight } from '../mappers/flight.mapper';

@Injectable({ providedIn: 'root' })
export class FlightApiService {
  private http = inject(HttpClient);

  searchFlights(params: FlightSearchParams): Observable<Flight[]> {
    return this.http
      .get<AmadeusSearchResponse>('/api/flights', { params: { ...params } })
      .pipe(map(response => response.data.map(mapAmadeusFlightToFlight)));
  }
}
```

### Pattern 4: inject() in Standalone Components (No Constructor DI)

**What:** Use `inject()` function at field level instead of constructor parameter injection. Standard in Angular 17+ standalone component style.
**When to use:** All standalone components. Also usable in services and guards.
**Trade-offs:** Cleaner code, no need to declare constructor. Must be called during construction context (field initializer or constructor body).

**Example:**
```typescript
// features/flights/components/flight-search/flight-search.component.ts
import { Component, inject, signal } from '@angular/core';
import { FlightApiService } from '../../services/flight-api.service';
import { TripStateService } from '../../../../core/services/trip-state.service';
import { SharedModule } from '../../../../shared/shared.module';

@Component({
  selector: 'app-flight-search',
  standalone: true,
  imports: [SharedModule, ReactiveFormsModule],
  templateUrl: './flight-search.component.html',
})
export class FlightSearchComponent {
  private flightApi = inject(FlightApiService);
  private tripState = inject(TripStateService);

  results = signal<Flight[]>([]);
  isLoading = signal(false);

  search(params: FlightSearchParams): void {
    this.isLoading.set(true);
    this.flightApi.searchFlights(params).subscribe({
      next: (flights) => {
        this.results.set(flights);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  selectFlight(flight: Flight): void {
    this.tripState.selectFlight(flight);
  }
}
```

### Pattern 5: localStorage Persistence via effect()

**What:** Use Angular's `effect()` inside `TripStateService` (or a dedicated persistence service) to reactively persist state changes to localStorage. On app init, hydrate signals from localStorage.
**When to use:** When state must survive page refreshes without a backend.
**Trade-offs:** Simple, synchronous. Breaks down >5MB storage (travel app with rich data can hit this). Serialize carefully.

**Example:**
```typescript
// core/services/trip-state.service.ts
import { Injectable, signal, effect, inject } from '@angular/core';
import { LocalStorageService } from './local-storage.service';

@Injectable({ providedIn: 'root' })
export class TripStateService {
  private storage = inject(LocalStorageService);
  private _trip = signal<Trip>(this.storage.load('trip') ?? defaultTrip);

  constructor() {
    // Auto-persist on every signal change
    effect(() => {
      this.storage.save('trip', this._trip());
    });
  }
}
```

### Pattern 6: Functional Route Guards

**What:** Guards as functions (no class), registered directly in route config. Standard in Angular 15+, idiomatic in 17+.
**When to use:** All guards. Class-based guards are legacy.

**Example:**
```typescript
// core/guards/active-trip.guard.ts
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { TripStateService } from '../services/trip-state.service';

export const activeTripGuard = () => {
  const trip = inject(TripStateService);
  const router = inject(Router);
  return trip.hasActiveTripDates() ? true : router.parseUrl('/');
};

// In route config:
{
  path: 'itinerary',
  loadComponent: () => import('./itinerary/components/itinerary-view/itinerary-view.component'),
  canActivate: [activeTripGuard]
}
```

## Data Flow

### Search → Selection → Itinerary Flow

```
User enters search params (e.g., flight search form)
    ↓
FlightSearchComponent.search(params)
    ↓
FlightApiService.searchFlights(params)      [HTTP GET to Amadeus API]
    ↓ (raw response)
mapAmadeusFlightToFlight(raw)               [pure mapper function]
    ↓ (Flight[] internal model)
results signal set in FlightSearchComponent (local display)
    ↓
User clicks "Select Flight"
    ↓
TripStateService.selectFlight(flight)       [signal mutation]
    ↓ (effect auto-fires)
LocalStorageService.save('trip', state)     [persisted to browser]
    ↓
ItineraryViewComponent reads tripState.selectedFlight()   [reactive read]
    ↓
Itinerary re-renders with new flight block
```

### State Management Flow

```
TripStateService (signals)
    ↓ asReadonly() signals exposed
Feature Components ──read──→ tripState.selectedFlight()
                                         ↑
Feature Components ──write─→ tripState.selectFlight(flight)
                                         ↓
                              effect() fires → localStorage.save()
                                         ↑
                              App init → localStorage.load() → signal hydration
```

### Key Data Flows

1. **API Response Normalization:** External API raw JSON → Mapper function → Internal canonical model. Only the mapper knows about the external API schema. The rest of the app only ever sees internal models.
2. **Cross-Feature State:** Features communicate only through `TripStateService` — never directly to each other. This prevents tight coupling between, e.g., FlightsModule and HotelsModule.
3. **Itinerary Assembly:** `ItineraryViewComponent` reads all `computed()` values from `TripStateService` (selected flight + hotel + cars + etc.) and assembles the display. It never modifies state.
4. **Error Propagation:** The `errorInterceptor` catches HTTP errors, normalizes to `ApiError` model, and re-throws. Feature components catch via `subscribe({ error })` or `catchError` in the service. No silent swallowing.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Current architecture is correct — localStorage + signals + no backend. No changes needed. |
| 1k-100k users | Still a SPA with no backend. If adding a backend: extract ApiServices to call your own backend endpoints rather than third-party APIs directly. Keeps API keys server-side. |
| 100k+ users | Add server-side rendering (Angular SSR / Angular Universal). Hydration is supported in Angular 17+. Move state to a backend session store. |

### Scaling Priorities

1. **First concern (already applicable at launch):** API keys exposed in frontend. Mitigation: use a lightweight proxy (Cloudflare Worker or Vercel function) to gate the real API calls. LocalStorage-only is acceptable for MVP but plan this for production.
2. **Second concern:** localStorage 5MB limit with rich itinerary data. Mitigation: only persist essential references (IDs + key fields), not full API responses. Reconstruct full data on load if needed.

## Anti-Patterns

### Anti-Pattern 1: Feature Modules Importing Each Other

**What people do:** `HotelsModule` imports `FlightsModule` (or its services) directly to show selected flight context.
**Why it's wrong:** Creates circular dependencies, tight coupling. Changes to FlightsModule break HotelsModule.
**Do this instead:** Both modules read from `TripStateService`. State is the shared communication channel, not direct imports.

### Anti-Pattern 2: Using NgModules for Feature Modules When You Can Use Standalone + Routes

**What people do:** Create `@NgModule` for each feature (old Angular 13- style) even in an Angular 17 app.
**Why it's wrong:** Defeats tree-shaking improvements, adds boilerplate, mixes idioms. Angular 17 fully supports standalone component trees with lazy-loaded route configs as the module boundary.
**Do this instead:** Use `*.routes.ts` as the feature's public boundary. Components inside are standalone. Only `SharedModule` (which re-exports Material) remains as an NgModule for convenience.

### Anti-Pattern 3: Putting Business Logic in Components

**What people do:** Filtering, sorting, transformation of API results inside component class methods.
**Why it's wrong:** Hard to test, duplicated across components, breaks when requirements change.
**Do this instead:** Business logic in services. Transformation in mappers. Components only call services and bind to signals/observables.

### Anti-Pattern 4: Subscribing in Services and Storing Mutable State on the Service Directly

**What people do:** A service subscribes to HTTP in its constructor and stores `results: Flight[] = []` as a plain array property.
**Why it's wrong:** No change detection integration, stale data, race conditions, no cleanup.
**Do this instead:** Services return `Observable<Flight[]>` — components subscribe (or use `async` pipe / `toSignal()`). State only lives in `TripStateService` signals, not in individual feature services.

### Anti-Pattern 5: Loading All Feature Modules Eagerly

**What people do:** Import all 6 feature route configs directly in `AppModule` or eagerly in `app.routes.ts`.
**Why it's wrong:** Huge initial bundle. Travel app has complex search UIs — lazy loading cuts initial load significantly.
**Do this instead:** Every feature route uses `loadComponent` or `loadChildren: () => import('./features/flights/flights.routes')`.

### Anti-Pattern 6: Storing Full API Response Objects in TripStateService

**What people do:** `_selectedFlight = signal<AmadeusFlightOffer>(...)` — the raw external type.
**Why it's wrong:** `TripStateService` should only know internal models. If you swap Amadeus for Skyscanner, you'd have to change the state service.
**Do this instead:** Always map to internal `Flight` model before calling `tripState.selectFlight()`. The mapper is the boundary.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Flight API (Amadeus/Skyscanner) | `FlightApiService` via `HttpClient` with mapper | API key in `environment.ts` — expose via proxy in production |
| Hotel API (Booking.com/Amadeus Hotels) | `HotelApiService` via `HttpClient` with mapper | Same pattern as flights |
| Car Rental API | `CarApiService` via `HttpClient` with mapper | Same pattern |
| Transport API (Rome2Rio/Google Maps Routes) | `TransportApiService` via `HttpClient` with mapper | May need CORS proxy |
| Tours API (Viator/GetYourGuide) | `TourApiService` via `HttpClient` with mapper | Partner API, check rate limits |
| Attractions API (Foursquare/Google Places) | `AttractionApiService` via `HttpClient` with mapper | Google Places has JS SDK alternative — stick with HTTP for consistency |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Feature Module → TripStateService | Direct inject + signal read/write | One-way writes via service methods; reads via `.asReadonly()` signals |
| Feature Module → ApiService | Direct inject, returns Observable | ApiService lives in the feature's own services/ folder |
| ItineraryModule → TripStateService | Direct inject, read-only | Itinerary never writes to state; it's a view |
| Feature Module → SharedModule | NgModule import (SharedModule re-exports Material) | Single import in component's `imports: [SharedModule]` |
| Any component → LocalStorageService | Never directly — only via TripStateService | Prevent scattered localStorage access; centralize in one service |

## Build Order (Module Dependencies)

Build in this sequence to avoid blocked work:

```
Phase 1: Foundation
  core/models/*          (all internal models — nothing depends on these but everything imports them)
  core/services/local-storage.service.ts
  core/services/api-config.service.ts
  core/interceptors/*
  app.config.ts + app.routes.ts

Phase 2: Shared
  shared/shared.module.ts  (once Material is installed)
  shared/components/*      (search-card, result-card, loading-spinner, error-banner)

Phase 3: State
  core/services/trip-state.service.ts  (depends on models + localStorage service)

Phase 4: Features (can be parallelized — independent of each other)
  features/flights/   → mapper → api service → search component → results component
  features/hotels/    → same pattern
  features/cars/      → same pattern
  features/transport/ → same pattern
  features/tours/     → same pattern
  features/attractions/ → same pattern

Phase 5: Itinerary Builder
  itinerary/   (depends on TripStateService having data from Phase 4)
```

## Sources

- Angular 17 official documentation (angular.dev) — standalone components, signals API, functional interceptors, functional guards — MEDIUM confidence (verified via training knowledge, not live fetch due to tool restriction)
- Angular Signals RFC and stable release notes (Angular 16-17) — signals stabilized in Angular 17 — MEDIUM confidence
- Angular HTTP interceptor migration guide (withInterceptors pattern) — Angular 15+, standard in 17 — MEDIUM confidence
- `inject()` in field initializers — documented Angular 14+ feature, production-ready in 17 — MEDIUM confidence

**Confidence note:** All patterns described here were stable and idiomatic in Angular 17 (released November 2023). The `inject()` function, functional interceptors, functional guards, `signal()`, `computed()`, `effect()`, and standalone components were all stable APIs in Angular 17. If the project uses Angular 18 or 19, verify against angular.dev for any deprecations or new idiomatic patterns (e.g., `input()` signal inputs may have changed the component pattern).

---
*Architecture research for: Angular 17+ Travel Planning SPA (Triply)*
*Researched: 2026-02-11*
