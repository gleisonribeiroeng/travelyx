# Phase 7: Intercity Transport - Research

**Researched:** 2026-02-12
**Domain:** Intercity ground transport search (bus/train)
**Confidence:** MEDIUM-LOW

## Summary

Phase 7 implements intercity bus and train search functionality. Users enter origin and destination cities, receive transport options with duration and price, can view provider booking pages, and add routes to their itinerary.

**Critical constraint:** Rome2rio API is unavailable (not accepting new applications as of 2026). The proxy placeholder `https://api.example.com` must be replaced with an accessible alternative before implementation.

**Primary recommendation:** For a working prototype, use a mock transport API service that returns static sample data matching the Transport model shape. For production, investigate TransportAPI (UK-focused, free tier available), 12Go Asia API (partnership-based access), or Trainline API (B2B focused, requires business engagement).

**Confidence breakdown:**
- **Transport API landscape:** LOW — Most viable APIs (Omio, Trainline, 12Go) require business partnerships rather than open developer access. Rome2rio is confirmed closed to new applications. Free/open APIs are primarily regional (TransportAPI UK, local transit systems).
- **UI patterns:** HIGH — Autocomplete origin/destination inputs, date selection, result cards with "Add to itinerary" buttons follow established pattern from Phases 4-6.
- **Architecture patterns:** HIGH — TransportApiService + TransportMapper + search form component + result cards pattern is proven in existing features.
- **Error handling:** HIGH — Existing retry/backoff utilities and ApiResult pattern handle rate limits and partial failures.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Angular Signals | 19.x | State management | Project-wide decision; TripStateService already signal-based |
| RxJS | 7.8+ | HTTP observables, search debounce | Angular HTTP client dependency; debounceTime + switchMap for autocomplete |
| Angular Material | 19.x | Form controls, autocomplete, date pickers | Established in Phases 4-6; consistent UI |
| Angular Reactive Forms | 19.x | Form validation | Used in all search features |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | 2.x+ | Date formatting/parsing | Optional if datetime display formatting beyond ISO 8601 strings is needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Angular Signals | NgRx | Signals already project-wide; NgRx is overkill for feature-level state |
| RxJS debounce + switchMap | Custom debounce utility | RxJS is already a dependency; custom solution adds maintenance burden |
| Angular Material Autocomplete | Custom autocomplete | Material autocomplete handles keyboard navigation, ARIA, and accessibility out-of-box |

**Installation:**
```bash
# No new dependencies required
# Angular Material, RxJS, and Reactive Forms already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/app/
├── core/
│   ├── api/
│   │   ├── transport-api.service.ts    # HTTP layer + OAuth if needed
│   │   ├── transport.mapper.ts         # External API → Transport model
│   │   └── base-api.service.ts         # [Existing] Parent class
│   ├── models/
│   │   └── trip.models.ts              # [Existing] Transport interface
│   └── services/
│       └── trip-state.service.ts       # [Existing] addTransport()
└── features/
    └── transport-search/
        ├── transport-search.component.ts
        ├── transport-search.component.html
        └── transport-search.component.scss
```

### Pattern 1: TransportApiService Extends BaseApiService
**What:** HTTP service inherits proxy routing and API key injection from BaseApiService
**When to use:** Standard pattern for all feature APIs in this codebase
**Example:**
```typescript
// Source: Existing flight-api.service.ts pattern
@Injectable({ providedIn: 'root' })
export class TransportApiService extends BaseApiService {
  private readonly mapper = inject(TransportMapper);

  constructor() {
    super('transport'); // Maps to /api/transport proxy endpoint
  }

  searchTransport(params: TransportSearchParams): Observable<ApiResult<Transport[]>> {
    return this.get<ExternalTransportResponse>('/routes', {
      origin: params.origin,
      destination: params.destination,
      departureDate: params.departureDate,
    }).pipe(
      map((response): ApiResult<Transport[]> => ({
        data: response.routes.map(r => this.mapper.mapResponse(r)),
        error: null,
      })),
      catchError((error: AppError): Observable<ApiResult<Transport[]>> =>
        of({ data: [], error })
      ),
    );
  }
}
```

### Pattern 2: City Autocomplete with Debounced API Calls
**What:** Origin and destination inputs trigger autocomplete API calls after 300ms typing pause
**When to use:** Any search feature requiring location/city input
**Example:**
```typescript
// Source: hotel-search.component.ts autocomplete pattern
originControl = new FormControl<string>('', Validators.required);

filteredOrigins$: Observable<CityOption[]> = this.originControl.valueChanges.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  filter(v => typeof v === 'string' && v.length >= 2),
  switchMap(keyword => this.transportApi.searchCities(keyword))
);
```

### Pattern 3: Transport Mapper Converts API → Domain Model
**What:** Injectable mapper transforms external API response to canonical Transport interface
**When to use:** Every feature API service (flights, hotels, cars, transport)
**Example:**
```typescript
// Source: Existing flight.mapper.ts pattern
@Injectable({ providedIn: 'root' })
export class TransportMapper implements Mapper<ExternalRoute, Transport> {
  mapResponse(raw: ExternalRoute): Transport {
    return {
      id: raw.routeId,
      source: 'transport',
      addedToItinerary: false,
      mode: this.mapMode(raw.type),
      origin: raw.from,
      destination: raw.to,
      departureAt: raw.departureTime, // ISO 8601 string
      arrivalAt: raw.arrivalTime,     // ISO 8601 string
      durationMinutes: this.parseDuration(raw.duration),
      price: {
        total: parseFloat(raw.price),
        currency: raw.currency,
      },
      link: {
        url: raw.bookingUrl,
        provider: raw.operatorName,
      },
    };
  }

  private mapMode(type: string): 'bus' | 'train' | 'ferry' | 'other' {
    const lower = type.toLowerCase();
    if (lower.includes('bus')) return 'bus';
    if (lower.includes('train') || lower.includes('rail')) return 'train';
    if (lower.includes('ferry')) return 'ferry';
    return 'other';
  }

  private parseDuration(duration: string): number {
    // Parse "2h 30m" or ISO duration "PT2H30M" to minutes
    // Implementation varies by API format
  }
}
```

### Pattern 4: Result Cards with Add to Itinerary
**What:** Each transport option displays as mat-card with "Add to itinerary" button and external link
**When to use:** All search result displays (flights, hotels, cars, transport)
**Example:**
```html
<!-- Source: hotel-search.component.html result card pattern -->
@for (route of sortedRoutes(); track route.id) {
  <mat-card class="transport-card">
    <mat-card-content>
      <div class="route-header">
        <div class="route-cities">
          <span class="origin">{{ route.origin }}</span>
          <mat-icon>arrow_forward</mat-icon>
          <span class="destination">{{ route.destination }}</span>
        </div>
        <div class="route-price">
          {{ route.price.total | currency: route.price.currency }}
        </div>
      </div>

      <div class="route-details">
        <mat-icon>{{ getModeIcon(route.mode) }}</mat-icon>
        <span>{{ route.mode | titlecase }}</span>
        <span>{{ formatDuration(route.durationMinutes) }}</span>
      </div>
    </mat-card-content>

    <mat-card-actions>
      <button mat-button color="primary" (click)="addToItinerary(route)">
        <mat-icon>add</mat-icon>
        Add to Itinerary
      </button>
      <a mat-button [href]="route.link.url" target="_blank" rel="noopener noreferrer">
        <mat-icon>open_in_new</mat-icon>
        View on {{ route.link.provider }}
      </a>
    </mat-card-actions>
  </mat-card>
}
```

### Anti-Patterns to Avoid
- **Don't build custom autocomplete dropdown** — Use Angular Material `mat-autocomplete` for keyboard navigation, ARIA attributes, and accessibility compliance
- **Don't store Date objects in signals** — Keep ISO 8601 strings in Transport model; convert from Date picker to string format for API calls
- **Don't skip debounce on autocomplete** — Autocomplete without debounce floods API with requests on every keystroke
- **Don't hand-roll duration parsing** — If API uses ISO 8601 duration format ("PT2H30M"), use a helper function that handles all edge cases (hours-only "PT2H", minutes-only "PT45M", etc.)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| City autocomplete dropdown | Custom dropdown with manual keyboard handling | Angular Material `mat-autocomplete` | Handles keyboard nav (↑↓ arrows, Enter, Escape), screen reader support (aria-autocomplete), focus management, and mobile tap handling |
| Search input debouncing | setTimeout/clearTimeout state management | RxJS `debounceTime(300)` + `distinctUntilChanged()` | Handles unsubscription, avoids memory leaks, prevents duplicate identical queries |
| Date validation (departure before arrival) | Custom validator comparing two date strings | Angular Reactive Forms `Validators.min()` with dynamic `minCheckOutDate` getter | Date picker `[min]` binding prevents invalid selection in UI; validator provides fallback |
| Retry on rate limit (429) | Custom retry loop with exponential backoff | Existing `withBackoff()` utility | Already handles retriable status codes (429, 502, 503, 504), exponential backoff with max delay, non-retriable error passthrough |
| Parallel API error handling | Try/catch wrapper per API call | Existing `ApiResult<T>` + `withFallback()` pattern | Ensures forkJoin doesn't cancel sibling requests on one failure; enables partial-failure UI |

**Key insight:** Transport APIs are deceptively complex. Origin/destination may require city codes (not free text), timezone handling for datetime display is error-prone (store as ISO 8601 UTC, display in user's timezone), and duration formats vary (ISO 8601 "PT2H30M" vs human-readable "2h 30m"). Use established utilities and Angular Material components rather than rebuilding these wheels.

## Common Pitfalls

### Pitfall 1: City Autocomplete Returning Free Text Instead of Validated City Codes
**What goes wrong:** User types "Paris" and submits form before selecting a city from autocomplete dropdown; API receives "Paris" string instead of city code/ID and returns 400 error or empty results
**Why it happens:** Angular Material autocomplete allows free text input by default; validation only checks field is non-empty, not that a valid option was selected
**How to avoid:** Implement custom validator that checks `control.value` is an object (selected option) not a string (free text). See hotel-search.component.ts `destinationValidator()` pattern:
```typescript
private cityValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null; // Let 'required' handle empty
    if (typeof control.value === 'string' || !(control.value as CityOption).cityId) {
      return { invalidCity: true };
    }
    return null;
  };
}
```
**Warning signs:** Form submits successfully but API returns 400 error "invalid city"; autocomplete dropdown visible but user can still click Search button while typing

### Pitfall 2: Timezone Confusion with Departure/Arrival Times
**What goes wrong:** API returns departure time "2026-03-15T14:00:00Z" (UTC); frontend displays "14:00" to user in London (UTC+0 in winter, UTC+1 in summer); user expects "15:00" local Paris time but sees "14:00"
**Why it happens:** Transport APIs typically return times in UTC or local timezone of origin/destination without explicit timezone identifiers; frontend displays ISO string directly without timezone conversion
**How to avoid:**
- **Store as ISO 8601 strings** (no Date objects) in Transport model — preserve what API returns
- **Display using timezone-aware pipe** if showing user-facing times (optional; many transport sites show local times without conversion)
- **Don't convert during mapping** — Keep raw ISO string from API; conversion is a presentation concern, not data concern
**Warning signs:** Times displayed don't match what appears on transport provider's website; user reports "wrong departure time"

### Pitfall 3: Duration Format Mismatch Between API and Display
**What goes wrong:** API returns duration as ISO 8601 "PT2H30M"; mapper stores this string in `durationMinutes` field (type: number); runtime error or NaN displayed
**Why it happens:** Transport model defines `durationMinutes: number` but API may return various formats: ISO 8601 duration string, human-readable "2h 30m", or seconds/minutes as number
**How to avoid:**
- Mapper MUST parse duration to minutes (number) regardless of API format
- Handle all edge cases: "PT2H" (hours only), "PT45M" (minutes only), "PT2H30M" (both)
- Template displays minutes using helper: `formatDuration(minutes: number): string` → "2h 30m"
**Warning signs:** Result card shows "PT2H30M" instead of "2 hours 30 minutes"; template breaks with "Cannot read property 'toFixed' of undefined"

### Pitfall 4: Proxy Placeholder Not Replaced Before Testing
**What goes wrong:** Developer runs `ng serve`, fills out transport search form, clicks Search; HTTP request to `http://localhost:4200/api/transport` is proxied to `https://api.example.com` (placeholder); receives connection error or 404
**Why it happens:** proxy.conf.json line 30 contains placeholder target from Phase 2; no real transport API has been integrated yet
**How to avoid:**
- **Before Phase 7 implementation starts**, either:
  1. Replace proxy target with real transport API endpoint (if accessible)
  2. Create mock TransportApiService that returns static Observable of sample Transport[] data (bypasses HTTP)
  3. Update proxy to point to local mock server (e.g., json-server on localhost:3001)
- **Verification step in plan:** Confirm proxy target is valid or mock service is in place before building UI
**Warning signs:** Browser DevTools Network tab shows 404 or ERR_NAME_NOT_RESOLVED for `/api/transport` requests

### Pitfall 5: Mode Field Ambiguity and Icon Mapping Failures
**What goes wrong:** API returns `mode: "coach"` or `mode: "regional train"`; mapper assigns `mode: "other"` because it doesn't match "bus" or "train" exactly; UI displays generic icon instead of bus/train icon
**Why it happens:** Transport mode terminology varies by API: "coach" vs "bus", "rail" vs "train", "metro" vs "subway"; mapper uses strict string matching
**How to avoid:**
- Mapper should use **substring matching** or **case-insensitive matching**: `type.toLowerCase().includes('bus')` instead of `type === 'bus'`
- Handle common aliases: "coach" → "bus", "rail" → "train", "ferry" → "ferry"
- Default to "other" only when no match found
- Template maps mode to Material icon: `getModeIcon(mode: string): string` returns "directions_bus", "train", "directions_boat", "commute"
**Warning signs:** Result cards all show same generic icon; "coach" routes categorized as "other" instead of "bus"

### Pitfall 6: Search Button Enabled Before Autocomplete Finishes Loading
**What goes wrong:** User types "Lon" in origin field, autocomplete dropdown shows loading spinner, user immediately clicks Search button; form submits with "Lon" as free text before "London" option loads
**Why it happens:** Form validation only checks field is non-empty and valid option selected; doesn't check if autocomplete API call is still in-flight
**How to avoid:**
- Disable Search button while `isSearching()` signal is true
- Autocomplete validation (`invalidCity` error) prevents submission of free text
- Users must wait for dropdown to load and select option
- Alternatively, add `isLoadingCities` signal and disable button while `isLoadingCities() || isSearching()`
**Warning signs:** Form submits before autocomplete results appear; API returns "invalid origin" error despite user typing valid city name

### Pitfall 7: Not Handling Empty Results Gracefully
**What goes wrong:** User searches "London → Edinburgh"; API returns `{ routes: [] }` (no connections found); UI shows loading spinner forever or displays nothing
**Why it happens:** Component checks `searchResults().length > 0` to display result cards; doesn't handle zero results case
**How to avoid:**
- Add `hasSearched` signal (like hotel-search.component.ts)
- Show empty state card when `searchResults().length === 0 && !isSearching() && hasSearched()`
- Empty state displays message: "No transport options found. Try different cities or dates."
**Warning signs:** Search completes but UI shows nothing; user unclear if search failed or no results exist

## Code Examples

Verified patterns from official sources and existing codebase:

### TransportApiService Structure
```typescript
// Source: flight-api.service.ts (existing) + BaseApiService pattern
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { BaseApiService } from './base-api.service';
import { TransportMapper } from './transport.mapper';
import { Transport } from '../models/trip.models';
import { ApiResult } from './api-error.utils';
import { AppError } from './models/app-error.model';

export interface TransportSearchParams {
  origin: string;      // City name or code (depends on API)
  destination: string; // City name or code
  departureDate: string; // YYYY-MM-DD
}

@Injectable({ providedIn: 'root' })
export class TransportApiService extends BaseApiService {
  private readonly mapper = inject(TransportMapper);

  constructor() {
    super('transport'); // Maps to /api/transport proxy
  }

  /**
   * Search for transport options between two cities.
   * Returns bus, train, and ferry routes.
   */
  searchTransport(params: TransportSearchParams): Observable<ApiResult<Transport[]>> {
    // NOTE: Endpoint and query params depend on actual API chosen
    // This is a generic example pattern
    return this.get<{ routes: ExternalRoute[] }>('/search', {
      from: params.origin,
      to: params.destination,
      date: params.departureDate,
    }).pipe(
      map((response): ApiResult<Transport[]> => ({
        data: response.routes.map(r => this.mapper.mapResponse(r)),
        error: null,
      })),
      catchError((error: AppError): Observable<ApiResult<Transport[]>> =>
        of({ data: [], error })
      ),
    );
  }

  /**
   * Search for cities for autocomplete.
   * Returns city name and ID/code for API queries.
   */
  searchCities(keyword: string): Observable<CityOption[]> {
    if (keyword.length < 2) {
      return of([]);
    }

    // NOTE: Autocomplete endpoint depends on API
    return this.get<{ cities: ExternalCity[] }>('/cities', {
      query: keyword,
      limit: 10,
    }).pipe(
      map(response => response.cities.map(c => ({
        cityId: c.id,
        name: c.name,
        country: c.country,
        label: `${c.name}, ${c.country}`,
      }))),
      catchError(() => of([])),
    );
  }
}

export interface CityOption {
  cityId: string;
  name: string;
  country: string;
  label: string; // Display format: "London, UK"
}

interface ExternalRoute {
  id: string;
  type: string; // "bus", "train", "coach", "rail", etc.
  from: string;
  to: string;
  departure: string; // ISO 8601 datetime
  arrival: string;
  duration: string; // Format varies by API
  price: number;
  currency: string;
  operator: string;
  bookingUrl: string;
}

interface ExternalCity {
  id: string;
  name: string;
  country: string;
}
```

### City Autocomplete with Validation
```typescript
// Source: hotel-search.component.ts destination autocomplete
import { FormControl, Validators, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs/operators';

// In component class
originControl = new FormControl<CityOption | null>(null, [
  Validators.required,
  this.cityValidator(),
]);

filteredOrigins$: Observable<CityOption[]> = this.originControl.valueChanges.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  filter(v => typeof v === 'string' && (v as string).length >= 2),
  switchMap(keyword => this.transportApi.searchCities(keyword as string))
);

private cityValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // Let required validator handle empty
    }
    if (typeof control.value === 'string' || !(control.value as CityOption).cityId) {
      return { invalidCity: true };
    }
    return null;
  };
}

displayCity(city: CityOption | null): string {
  return city ? city.label : '';
}
```

### Duration Parsing (ISO 8601 and Human-Readable)
```typescript
// Source: flight.mapper.ts parseDuration() method
/**
 * Parse various duration formats to total minutes.
 * Handles ISO 8601 ("PT2H30M") and human-readable ("2h 30m").
 */
private parseDuration(duration: string): number {
  // ISO 8601 format: "PT2H30M"
  if (duration.startsWith('PT')) {
    const hoursMatch = duration.match(/(\d+)H/);
    const minutesMatch = duration.match(/(\d+)M/);

    const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
    const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;

    return hours * 60 + minutes;
  }

  // Human-readable format: "2h 30m" or "2 hours 30 minutes"
  const hoursMatch = duration.match(/(\d+)\s*h/i);
  const minutesMatch = duration.match(/(\d+)\s*m/i);

  const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
  const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;

  return hours * 60 + minutes;
}

/**
 * Format minutes to human-readable duration for display.
 */
formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
```

### Mode Icon Mapping
```typescript
// In component class
getModeIcon(mode: 'bus' | 'train' | 'ferry' | 'other'): string {
  const iconMap = {
    bus: 'directions_bus',
    train: 'train',
    ferry: 'directions_boat',
    other: 'commute',
  };
  return iconMap[mode] || 'commute';
}
```

### Search Form Template (Origin/Destination Autocomplete)
```html
<!-- Source: hotel-search.component.html autocomplete pattern -->
<mat-form-field appearance="outline">
  <mat-label>Origin City</mat-label>
  <input
    matInput
    [formControl]="originControl"
    [matAutocomplete]="autoOrigin"
    placeholder="Departure city"
  />
  <mat-icon matPrefix>location_on</mat-icon>
  <mat-autocomplete #autoOrigin [displayWith]="displayCity">
    @for (city of filteredOrigins$ | async; track city.cityId) {
      <mat-option [value]="city">
        {{ city.label }}
      </mat-option>
    }
  </mat-autocomplete>
  @if (originControl.hasError('required')) {
    <mat-error>Origin city is required</mat-error>
  }
  @if (originControl.hasError('invalidCity')) {
    <mat-error>Please select a city from the list</mat-error>
  }
</mat-form-field>

<mat-form-field appearance="outline">
  <mat-label>Destination City</mat-label>
  <input
    matInput
    [formControl]="destinationControl"
    [matAutocomplete]="autoDestination"
    placeholder="Arrival city"
  />
  <mat-icon matPrefix>location_on</mat-icon>
  <mat-autocomplete #autoDestination [displayWith]="displayCity">
    @for (city of filteredDestinations$ | async; track city.cityId) {
      <mat-option [value]="city">
        {{ city.label }}
      </mat-option>
    }
  </mat-autocomplete>
  @if (destinationControl.hasError('required')) {
    <mat-error>Destination city is required</mat-error>
  }
  @if (destinationControl.hasError('invalidCity')) {
    <mat-error>Please select a city from the list</mat-error>
  }
</mat-form-field>
```

### Add to Itinerary Action
```typescript
// Source: hotel-search.component.ts addToItinerary method
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TripStateService } from '../../core/services/trip-state.service';

private readonly tripState = inject(TripStateService);
private readonly snackBar = inject(MatSnackBar);

addToItinerary(route: Transport): void {
  this.tripState.addTransport({ ...route, addedToItinerary: true });
  this.snackBar.open('Transport added to itinerary', 'Close', { duration: 3000 });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Rome2rio API as default | Rome2rio closed to new applications | 2024-2025 | Must use alternative API; no drop-in replacement with Rome2rio's multimodal coverage |
| Custom autocomplete dropdowns | Angular Material mat-autocomplete | N/A | Material component handles accessibility (ARIA, keyboard nav) automatically |
| retryWhen() operator | retry({ count, delay }) | RxJS 7.3+ (2021) | Modern retry API is more readable; retryWhen() still works but deprecated |
| Date objects in models | ISO 8601 strings | Project decision (Phase 4+) | Avoids timezone conversion bugs; keeps datetime as API provides it |
| Per-API error handling | ApiResult<T> + withFallback() pattern | Phase 2 (02-03 plan) | Enables forkJoin parallel API calls without one failure canceling others |

**Deprecated/outdated:**
- **Rome2rio API:** Not accepting new applications as of 2026; existing integrations grandfathered but new projects cannot access
- **GoEuro brand:** Rebranded to Omio in 2019; any references to "GoEuro API" should use "Omio API"
- **TransportAPI unlimited free tier:** Now limited to 30 hits/day free; higher usage requires paid plan

## Open Questions

### Question 1: Which Transport API Should Phase 7 Use?
**What we know:**
- Rome2rio (original choice) is closed to new applications
- TransportAPI offers free tier (30 requests/day) but UK-focused only
- Omio, Trainline, 12Go require business partnerships (not open developer access)
- Kiwi.com Tequila platform includes ground transport but access unclear

**What's unclear:**
- Is there a free/low-cost transport API with global coverage accessible to independent developers?
- Should Phase 7 use a mock service for prototype and defer real API integration?

**Recommendation:**
- **For prototype/demo:** Create mock TransportApiService returning static sample data (bypasses HTTP/proxy entirely)
- **For production:** Investigate TransportAPI (if UK-only acceptable), contact 12Go/Omio for partnership terms, or use regional APIs (e.g., Trainline for Europe, 12Go for Asia)
- **Document in PLAN.md:** Note that transport API is TBD and proxy target must be updated before testing

### Question 2: Should City Autocomplete Use Transport API or Google Places API?
**What we know:**
- Google Places API already configured (`googlePlacesApiKey` in environment)
- Google Places returns lat/long and place IDs, but transport APIs need city codes/names
- Transport APIs often provide city search endpoints (e.g., TransportAPI `/places`)

**What's unclear:**
- Do transport APIs accept Google Place IDs or only their own city codes?
- Is city search endpoint available in free tier of transport APIs?

**Recommendation:**
- **Use transport API's city search endpoint if available** — ensures city codes match what API expects
- **Fall back to Google Places only if transport API lacks autocomplete** — will require mapping Place ID → city name for API query
- **For mock service:** Return hardcoded city list (e.g., "London, UK", "Paris, France", "Berlin, Germany")

### Question 3: How Should UI Display Departure/Arrival Times and Timezones?
**What we know:**
- Transport model stores `departureAt` and `arrivalAt` as ISO 8601 strings
- Times may be in UTC or local timezone of origin/destination (API-dependent)
- Users expect to see local times (e.g., "14:00 Paris time" not "13:00 UTC")

**What's unclear:**
- Do transport APIs include timezone identifiers (e.g., "Europe/Paris") in response?
- Should UI display times as-is or convert to user's browser timezone?

**Recommendation:**
- **Display times as provided by API** (no conversion) — most transport sites show local departure/arrival times
- **Add timezone suffix if API provides it** (e.g., "14:00 CET") — but don't assume or convert
- **Document limitation in verification:** Times displayed match API response; timezone conversion not implemented in Phase 7

### Question 4: Should Transport Search Include Date Range or Single Date?
**What we know:**
- Flight search supports return date (optional round-trip)
- Hotel search uses check-in/check-out date range
- Intercity transport typically one-way or round-trip

**What's unclear:**
- Should Phase 7 support round-trip transport search (outbound + return)?
- Does adding return date complexity align with "simple prototype" goal?

**Recommendation:**
- **Phase 7: One-way search only** — single departure date, simplifies UI and API integration
- **Future enhancement:** Add optional return date field for round-trip search
- **Document in PLAN.md:** Round-trip search deferred to future phase

## Sources

### Primary (HIGH confidence)
- Existing codebase:
  - `triply/src/app/core/models/trip.models.ts` — Transport interface definition (lines 86-97)
  - `triply/src/app/core/services/trip-state.service.ts` — addTransport() and removeTransport() methods (lines 151-165)
  - `triply/src/app/core/api/base-api.service.ts` — BaseApiService pattern for all feature APIs
  - `triply/src/app/core/api/flight-api.service.ts` — OAuth token caching, retry with backoff, ApiResult pattern
  - `triply/src/app/core/api/flight.mapper.ts` — ISO 8601 duration parsing pattern (lines 85-93)
  - `triply/src/app/core/api/hotel.mapper.ts` — Price calculation, optional field handling
  - `triply/src/app/features/hotel-search/hotel-search.component.ts` — Autocomplete with validation, search form pattern, add to itinerary action
  - `triply/src/proxy.conf.json` — Transport proxy placeholder at line 29-37
  - `triply/src/environments/environment.development.ts` — transportApiKey placeholder at line 16

### Secondary (MEDIUM confidence)
- [Rome2rio API Documentation](https://www.rome2rio.com/documentation/) — Confirmed not accepting new applications (WebSearch 2026-02-12)
- [Omio B2B Solutions](https://www.omio.com/b2b) — Meta Search API for transport search; requires business partnership
- [Trainline Global API](https://www.thetrainline.com/solutions/api) — 280+ rail and coach carriers; B2B focused, 12-week integration timeline
- [12Go Asia API](https://12go.asia/en/about) — 4,000+ operators, 50,000+ routes; partnership-based access
- [TransportAPI Developer Portal](https://developer.transportapi.com/) — UK bus/train data, 30 requests/day free tier
- [Transit API](https://transitapp.com/apis) — 900 cities, 25 countries; real-time departures
- [Google Maps Autocomplete Documentation](https://developers.google.com/maps/documentation/javascript/examples/places-autocomplete-directions) — Origin/destination autocomplete pattern
- [Moesif Blog: Datetime in APIs](https://www.moesif.com/blog/technical/timestamp/manage-datetime-timestamp-timezones-in-api/) — ISO 8601 best practices, timezone pitfalls
- [Baymard Institute: Autocomplete UX](https://baymard.com/blog/autocomplete-design) — Limit 10 suggestions, keyboard navigation, bolding search terms

### Tertiary (LOW confidence)
- [Kiwi.com Ground Transport](https://partners.kiwi.com/industries/ground-and-sea-transport/) — Mentions bus/train integration but no public API docs found
- [Travelpayouts API](https://support.travelpayouts.com/hc/en-us/categories/200358578-API-and-data) — Focuses on flights/hotels; bus/train integration unclear
- [RapidAPI Transportation APIs](https://rapidapi.com/collection/transportation-apis) — Collection of transit APIs; most are regional/city-specific

## Metadata

**Confidence breakdown:**
- **Standard stack:** HIGH — All dependencies already in use (Angular Material, RxJS, Reactive Forms)
- **Architecture patterns:** HIGH — TransportApiService + Mapper + search form component mirrors Phases 4-6
- **Transport API availability:** LOW — Rome2rio closed, major platforms (Omio, Trainline, 12Go) require partnerships, free global API not identified
- **UI/UX patterns:** HIGH — Autocomplete, form validation, result cards established in hotel/flight search
- **Error handling:** HIGH — Retry/backoff, ApiResult, per-source catchError proven in existing features
- **Common pitfalls:** MEDIUM — Timezone/datetime pitfalls verified from API best practices sources; city autocomplete validation proven in codebase; proxy placeholder issue confirmed from proxy.conf.json

**Research date:** 2026-02-12
**Valid until:** 30 days (2026-03-14) — Transport API landscape stable but partnerships/terms may change
