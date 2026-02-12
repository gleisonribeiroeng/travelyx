# Phase 4: Flights - Research

**Researched:** 2026-02-12
**Domain:** Flight search integration with Amadeus API, Angular reactive forms, Material UI autocomplete
**Confidence:** MEDIUM-HIGH

## Summary

Phase 4 implements flight search functionality using the Amadeus Flight Offers Search API. The implementation requires three main components: (1) a FlightApiService that integrates with the Amadeus `/v2/shopping/flight-offers` endpoint, handling OAuth2 authentication and rate limiting, (2) a reactive form with origin/destination autocomplete using the Amadeus Airport & City Search API and Angular Material datepicker for date range selection, and (3) result cards with filtering capabilities for direct vs. stopover flights.

The Amadeus API is the industry-standard self-service flight search API, searching over 500 airlines and returning comprehensive flight data including itineraries, segments, pricing, and airline information. The API uses OAuth2 bearer token authentication with 30-minute token validity and has strict rate limits (1 request/100ms in test environment). The response structure is complex, with nested itineraries containing segments with departure/arrival data in ISO 8601 format, always in local airport timezone.

Key architectural decisions: Use the existing BaseApiService pattern for API integration, implement airport autocomplete using the Amadeus Airport & City Search API endpoint rather than a static IATA code library, use Angular Material's date range picker (mat-date-range-input with matStartDate/matEndDate) for departure/return date selection, and apply the established debouncedSearch pattern for autocomplete to minimize API calls.

**Primary recommendation:** Follow the established ApiService + Mapper + reactive form + result cards pattern from Phase 2-3, with special attention to OAuth2 token management, rate limit handling with exponential backoff, timezone-aware date handling (ISO 8601 strings, never Date objects), and autocomplete debouncing for airport search.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Amadeus Flight Offers Search API | v2 | Flight search endpoint | Industry-standard self-service flight API, searches 500+ airlines |
| Amadeus Airport & City Search API | v1 | Airport/city IATA code autocomplete | Official Amadeus autocomplete API, returns up to 20 matches sorted by importance |
| Angular Reactive Forms | 21+ | Form state management | Already established in codebase, signal-compatible |
| Angular Material Datepicker | 21+ | Date range selection | Built-in mat-date-range-input with validation support |
| Angular Material Autocomplete | 21+ | Airport code input with suggestions | Supports displayWith function for IATA code + city name display |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| RxJS debounceTime | 7+ | Autocomplete debouncing | Reduce API calls during typing (300-500ms recommended) |
| RxJS switchMap | 7+ | Cancel in-flight requests | Prevent race conditions in autocomplete |
| withBackoff utility | existing | Rate limit retry handling | Already implemented in 02-04, handles 429 errors |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Amadeus Airport API | Static IATA code JSON file | Static file is faster but outdated; API is canonical and always current |
| Date range picker | Two separate date pickers | Range picker enforces return >= departure; two pickers require custom validation |
| Server-side autocomplete | Client-side filtering | Server-side is slower but canonical; client requires maintaining airport list |

**Installation:**
No new packages required - all dependencies already in codebase from Phase 1-2.

## Architecture Patterns

### Recommended Project Structure
```
src/app/
├── features/
│   └── search/
│       ├── search.component.ts          # Main search page (already exists)
│       ├── search.component.html        # Flight search form + results
│       └── search.component.scss
├── core/
│   ├── api/
│   │   ├── flight-api.service.ts        # NEW: Extends BaseApiService
│   │   └── flight.mapper.ts             # NEW: Maps Amadeus response to Flight model
│   ├── models/
│   │   └── trip.models.ts               # Flight interface already exists
│   └── services/
│       └── trip-state.service.ts        # addFlight() already exists
```

### Pattern 1: Amadeus OAuth2 Token Management
**What:** Amadeus API requires OAuth2 bearer token obtained from `/v1/security/oauth2/token` endpoint, valid for 30 minutes.
**When to use:** Every FlightApiService request must include `Authorization: Bearer {token}` header.
**Example:**
```typescript
// Source: https://developers.amadeus.com/self-service/apis-docs/guides/developer-guides/API-Keys/authorization/
// FlightApiService handles token lifecycle internally

private async getAccessToken(): Promise<string> {
  // Check if cached token is still valid
  if (this.cachedToken && this.tokenExpiresAt > Date.now()) {
    return this.cachedToken;
  }

  // Request new token
  const tokenResponse = await this.http.post<TokenResponse>(
    `${this.config.amadeus}/v1/security/oauth2/token`,
    'grant_type=client_credentials&client_id=API_KEY&client_secret=API_SECRET',
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      context: new HttpContext().set(API_SOURCE, 'amadeus')
    }
  ).toPromise();

  this.cachedToken = tokenResponse.access_token;
  this.tokenExpiresAt = Date.now() + (tokenResponse.expires_in * 1000);
  return this.cachedToken;
}

// Override BaseApiService.get to inject token
protected override get<T>(path: string, params?: Record<string, string>): Observable<T> {
  return from(this.getAccessToken()).pipe(
    switchMap(token => this.http.get<T>(`${this.config.amadeus}${path}`, {
      params,
      headers: { Authorization: `Bearer ${token}` },
      context: new HttpContext().set(API_SOURCE, 'amadeus')
    }))
  );
}
```

### Pattern 2: Airport Autocomplete with Amadeus Airport & City Search API
**What:** Use Amadeus `/v1/reference-data/locations` endpoint with debounced search and displayWith function.
**When to use:** Origin and destination input fields in flight search form.
**Example:**
```typescript
// Source: https://developers.amadeus.com/self-service/category/flights/api-doc/airport-and-city-search
// search.component.ts

interface AirportOption {
  iataCode: string;
  name: string;
  cityName: string;
}

originControl = new FormControl('');
filteredOrigins$: Observable<AirportOption[]>;

ngOnInit() {
  this.filteredOrigins$ = this.originControl.valueChanges.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    filter(value => typeof value === 'string' && value.length >= 2),
    switchMap(keyword => this.flightApiService.searchAirports(keyword)),
    catchError(() => of([]))
  );
}

displayAirport(airport: AirportOption | null): string {
  return airport ? `${airport.iataCode} - ${airport.cityName}` : '';
}
```

```html
<!-- search.component.html -->
<mat-form-field>
  <mat-label>Origin</mat-label>
  <input matInput
         [formControl]="originControl"
         [matAutocomplete]="autoOrigin"
         placeholder="City or airport code">
  <mat-autocomplete #autoOrigin="matAutocomplete" [displayWith]="displayAirport">
    <mat-option *ngFor="let airport of filteredOrigins$ | async" [value]="airport">
      {{airport.iataCode}} - {{airport.name}}, {{airport.cityName}}
    </mat-option>
  </mat-autocomplete>
</mat-form-field>
```

### Pattern 3: Date Range Picker for Departure/Return Dates
**What:** Use Angular Material's mat-date-range-input with matStartDate/matEndDate for departure and return.
**When to use:** Flight search form date selection.
**Example:**
```typescript
// Source: https://material.angular.dev/components/datepicker/overview
// search.component.ts

flightSearchForm = new FormGroup({
  origin: new FormControl<AirportOption | null>(null, Validators.required),
  destination: new FormControl<AirportOption | null>(null, Validators.required),
  dateRange: new FormGroup({
    departure: new FormControl<Date | null>(null, Validators.required),
    return: new FormControl<Date | null>(null)
  }),
  passengers: new FormControl(1, [Validators.required, Validators.min(1)])
});

get minDepartureDate(): Date {
  return new Date(); // Today
}

get minReturnDate(): Date {
  const departure = this.flightSearchForm.value.dateRange?.departure;
  return departure || new Date();
}
```

```html
<!-- search.component.html -->
<mat-form-field>
  <mat-label>Travel dates</mat-label>
  <mat-date-range-input [rangePicker]="picker" [min]="minDepartureDate">
    <input matStartDate formControlName="departure" placeholder="Departure">
    <input matEndDate formControlName="return" placeholder="Return (optional)">
  </mat-date-range-input>
  <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
  <mat-date-range-picker #picker></mat-date-range-picker>
</mat-form-field>
```

### Pattern 4: Flight Result Filtering (Direct vs. Stopovers)
**What:** Client-side filtering of flight results by number of stops.
**When to use:** After receiving search results, allow users to filter by direct/stopover flights.
**Example:**
```typescript
// search.component.ts

filterType = signal<'all' | 'direct' | 'stopovers'>('all');

filteredFlights = computed(() => {
  const filter = this.filterType();
  const flights = this.searchResults();

  if (filter === 'all') return flights;
  if (filter === 'direct') return flights.filter(f => f.stops === 0);
  if (filter === 'stopovers') return flights.filter(f => f.stops > 0);
  return flights;
});
```

```html
<!-- search.component.html -->
<mat-chip-listbox [(value)]="filterType" aria-label="Filter flights">
  <mat-chip-option value="all">All flights</mat-chip-option>
  <mat-chip-option value="direct">Direct only</mat-chip-option>
  <mat-chip-option value="stopovers">With stopovers</mat-chip-option>
</mat-chip-listbox>

<mat-card *ngFor="let flight of filteredFlights()">
  <!-- Result card content -->
</mat-card>
```

### Pattern 5: FlightMapper Response Transformation
**What:** Map complex Amadeus response structure to simplified Flight model.
**When to use:** Every flight search API response.
**Example:**
```typescript
// Source: https://developers.amadeus.com/self-service/category/flights/api-doc/flight-offers-search/api-reference
// flight.mapper.ts

interface AmadeusFlightOffer {
  id: string;
  itineraries: Array<{
    duration: string; // PT3H35M format
    segments: Array<{
      departure: { iataCode: string; at: string };
      arrival: { iataCode: string; at: string };
      carrierCode: string;
      number: string;
      numberOfStops: number;
    }>;
  }>;
  price: {
    total: string;
    currency: string;
  };
  validatingAirlineCodes: string[];
}

@Injectable({ providedIn: 'root' })
export class FlightMapper implements Mapper<AmadeusFlightOffer, Flight> {
  mapResponse(raw: AmadeusFlightOffer): Flight {
    const outbound = raw.itineraries[0];
    const firstSegment = outbound.segments[0];
    const lastSegment = outbound.segments[outbound.segments.length - 1];

    return {
      id: raw.id,
      source: 'amadeus',
      addedToItinerary: false,
      origin: firstSegment.departure.iataCode,
      destination: lastSegment.arrival.iataCode,
      departureAt: firstSegment.departure.at, // Already ISO 8601 string
      arrivalAt: lastSegment.arrival.at,
      airline: raw.validatingAirlineCodes[0],
      flightNumber: `${firstSegment.carrierCode}${firstSegment.number}`,
      durationMinutes: this.parseDuration(outbound.duration),
      stops: outbound.segments.length - 1,
      price: {
        total: parseFloat(raw.price.total),
        currency: raw.price.currency
      },
      link: {
        url: `https://www.amadeus.com/booking/${raw.id}`, // Provider link
        provider: 'Amadeus'
      }
    };
  }

  private parseDuration(isoDuration: string): number {
    // PT3H35M -> 215 minutes
    const hours = /(\d+)H/.exec(isoDuration)?.[1] || '0';
    const minutes = /(\d+)M/.exec(isoDuration)?.[1] || '0';
    return parseInt(hours) * 60 + parseInt(minutes);
  }
}
```

### Anti-Patterns to Avoid
- **Using Date objects for API parameters:** Amadeus API requires ISO 8601 strings (YYYY-MM-DD), not Date objects. Convert immediately before API call.
- **Storing entire Amadeus response in state:** The response is massive (200+ lines per offer). Map to Flight model immediately after API call.
- **Autocomplete without debouncing:** Every keystroke triggers an API call. Use debounceTime(300) minimum.
- **Missing token expiry check:** OAuth2 tokens expire after 30 minutes. Cache and refresh proactively.
- **Displaying flight duration in PT format:** Users expect "3h 35m" not "PT3H35M". Parse in mapper.
- **Assuming same-day arrival:** Flights can arrive next day or previous day (timezone). Display full ISO datetime, not just time.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Airport IATA code database | Custom JSON file with airport codes | Amadeus Airport & City Search API | API is canonical, always up-to-date, handles typos, sorted by importance |
| OAuth2 token refresh logic | Manual token caching with setTimeout | Interceptor with token cache + expiry check | Centralized, testable, handles concurrent requests |
| Flight duration parsing | Regex parsing of ISO 8601 duration | Existing Flight model stores minutes; parse once in mapper | PT format is confusing; convert at boundary |
| Date range validation | Custom validator for departure < return | Angular Material's min attribute on return datepicker | Built-in, accessible, visual feedback |
| Rate limit retry logic | Custom retry with setTimeout | withBackoff utility from 02-04 | Exponential backoff already implemented, handles 429 errors |
| Autocomplete race conditions | Manual request cancellation | RxJS switchMap operator | Automatically cancels in-flight requests on new input |

**Key insight:** Flight search has many edge cases (timezones, multi-leg flights, overnight flights, DST). The Amadeus API handles these complexities. Map their response faithfully; don't try to "simplify" datetime or duration logic.

## Common Pitfalls

### Pitfall 1: Timezone Naive Date Handling
**What goes wrong:** Flight times are always in local airport timezone. A flight departing LAX at 10:00 PM and arriving JFK at 6:00 AM next day looks like only 8 hours, but it's actually 11 hours (3-hour timezone difference + 8-hour flight).
**Why it happens:** Developers assume UTC or assume same timezone. Amadeus returns ISO 8601 strings with timezone offset (e.g., "2022-02-01T10:40:00-08:00").
**How to avoid:** Store datetime strings as-is (ISO 8601 format). Never convert to Date objects for storage. Display with timezone indicator or convert to user's local timezone for display only.
**Warning signs:** Flight duration doesn't match arrival - departure calculation, overnight flights showing negative duration, DST edge cases failing.

### Pitfall 2: Amadeus API Rate Limiting (1 request/100ms in test)
**What goes wrong:** Autocomplete or rapid search form submissions trigger 429 "Too many requests" errors.
**Why it happens:** Test environment limit is 1 request per 100ms. Production limit is higher but still enforced.
**How to avoid:**
  - Use debounceTime(300) minimum for autocomplete
  - Apply withBackoff() to all Amadeus API calls
  - Cache autocomplete results client-side (same search term within session)
  - Disable search button during in-flight request
**Warning signs:** 429 errors in console, autocomplete stops responding after rapid typing, search button allows double-submit.

### Pitfall 3: OAuth2 Token Expiry (30-minute validity)
**What goes wrong:** Token expires mid-session. Next API call fails with 401 Unauthorized. User must refresh page.
**Why it happens:** Token cached on first request, never refreshed. After 30 minutes, all requests fail.
**How to avoid:**
  - Store token expiry timestamp (Date.now() + expires_in * 1000)
  - Check expiry before every request
  - Refresh proactively at 28 minutes (2-minute buffer)
  - Handle 401 by refreshing token and retrying original request
**Warning signs:** API works initially, fails after 30 minutes, 401 errors in network tab, token refresh endpoint not being called.

### Pitfall 4: Airport Autocomplete Validation
**What goes wrong:** User types "New York" but doesn't select from dropdown. Form submits with string "New York" instead of IATA code object.
**Why it happens:** mat-autocomplete allows free-text input unless explicitly validated.
**How to avoid:**
  - Add custom validator checking formControl.value is object with iataCode property
  - Clear invalid input on blur: if (typeof value === 'string') formControl.setValue(null)
  - Disable search button until valid airport object selected
  - Show validation error: "Please select an airport from the list"
**Warning signs:** API call fails with "invalid origin parameter", string appears in API request instead of IATA code, autocomplete shows value but API errors.

### Pitfall 5: Complex Amadeus Response Structure (Nested Itineraries/Segments)
**What goes wrong:** Developer tries to display raw Amadeus response, gets confused by multi-leg flights, round-trip vs one-way structure differences.
**Why it happens:** Amadeus returns itineraries array (outbound + return for round-trip), each with segments array (layovers). Structure is deeply nested.
**How to avoid:**
  - Map response immediately after API call using FlightMapper
  - Handle one-way (1 itinerary) vs round-trip (2 itineraries) separately
  - For Phase 4, display only OUTBOUND itinerary (first in array)
  - Calculate total stops as segments.length - 1
  - Use first segment's departure and last segment's arrival for origin/destination
**Warning signs:** Displaying "PT3H35M" instead of "3h 35m", showing segment count instead of stops count, round-trip flights showing double in results.

### Pitfall 6: Date Picker Format Mismatch (Date object vs ISO string)
**What goes wrong:** Angular Material datepicker returns Date object, but Amadeus API requires "YYYY-MM-DD" string.
**Why it happens:** FormControl value is Date, but API parameter is string.
**How to avoid:**
  - Convert Date to ISO string before API call: `new Date().toISOString().split('T')[0]`
  - Or use date pipe in service: `this.datePipe.transform(date, 'yyyy-MM-dd')`
  - Validate format in mapper tests
**Warning signs:** API returns 400 "invalid date format", datepicker shows value but search fails, timezone offset causes day-off-by-one errors.

### Pitfall 7: Missing External Provider Link Validation
**What goes wrong:** Flight result card shows "Book" button, but link.url is placeholder or broken.
**Why it happens:** Amadeus doesn't provide deep links to booking pages in test environment. Provider links must be constructed.
**How to avoid:**
  - For Phase 4, construct Amadeus booking URL: `https://www.amadeus.com/booking/${flightId}`
  - Validate link opens in new tab with rel="noopener noreferrer"
  - Consider showing "View on Amadeus" instead of "Book" to set expectations
  - In production, use Flight Offers Price API to get actual booking links
**Warning signs:** Clicking provider link shows 404, link opens in same tab, security warning about external site.

## Code Examples

Verified patterns from official sources:

### Amadeus Flight Search GET Request
```typescript
// Source: https://developers.amadeus.com/self-service/apis-docs/guides/developer-guides/resources/flights/
// flight-api.service.ts

@Injectable({ providedIn: 'root' })
export class FlightApiService extends BaseApiService {
  private readonly mapper = inject(FlightMapper);

  constructor() {
    super('amadeus');
  }

  searchFlights(params: {
    origin: string;      // IATA code
    destination: string; // IATA code
    departureDate: string; // YYYY-MM-DD
    returnDate?: string;   // YYYY-MM-DD
    adults: number;
  }): Observable<ApiResult<Flight[]>> {
    return this.get<{ data: AmadeusFlightOffer[] }>('/v2/shopping/flight-offers', {
      originLocationCode: params.origin,
      destinationLocationCode: params.destination,
      departureDate: params.departureDate,
      ...(params.returnDate && { returnDate: params.returnDate }),
      adults: params.adults.toString(),
      max: '50' // Limit results
    }).pipe(
      map(response => ({
        error: null,
        data: response.data.map(offer => this.mapper.mapResponse(offer))
      })),
      catchError(error => of({
        error: this.handleError(error),
        data: [] as Flight[]
      }))
    );
  }

  searchAirports(keyword: string): Observable<AirportOption[]> {
    if (keyword.length < 2) return of([]);

    return this.get<{ data: AmadeusAirport[] }>('/v1/reference-data/locations', {
      keyword,
      subType: 'AIRPORT,CITY'
    }).pipe(
      map(response => response.data.map(airport => ({
        iataCode: airport.iataCode,
        name: airport.name,
        cityName: airport.address?.cityName || airport.name
      }))),
      catchError(() => of([]))
    );
  }
}
```

### Flight Search Form Component
```typescript
// Source: Angular reactive forms + Material datepicker patterns
// search.component.ts

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule],
  templateUrl: './search.component.html'
})
export class SearchComponent {
  private flightApiService = inject(FlightApiService);
  private tripState = inject(TripStateService);
  private snackBar = inject(MatSnackBar);

  // Form controls
  originControl = new FormControl<AirportOption | null>(null, [
    Validators.required,
    this.airportValidator()
  ]);
  destinationControl = new FormControl<AirportOption | null>(null, [
    Validators.required,
    this.airportValidator()
  ]);

  flightSearchForm = new FormGroup({
    origin: this.originControl,
    destination: this.destinationControl,
    dateRange: new FormGroup({
      departure: new FormControl<Date | null>(null, Validators.required),
      return: new FormControl<Date | null>(null)
    }),
    passengers: new FormControl(1, [Validators.required, Validators.min(1), Validators.max(9)])
  });

  // Autocomplete observables
  filteredOrigins$ = this.originControl.valueChanges.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    filter(v => typeof v === 'string' && v.length >= 2),
    switchMap(keyword => this.flightApiService.searchAirports(keyword))
  );

  filteredDestinations$ = this.destinationControl.valueChanges.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    filter(v => typeof v === 'string' && v.length >= 2),
    switchMap(keyword => this.flightApiService.searchAirports(keyword))
  );

  // Search state
  searchResults = signal<Flight[]>([]);
  isSearching = signal(false);
  filterType = signal<'all' | 'direct' | 'stopovers'>('all');

  filteredFlights = computed(() => {
    const filter = this.filterType();
    const flights = this.searchResults();
    if (filter === 'direct') return flights.filter(f => f.stops === 0);
    if (filter === 'stopovers') return flights.filter(f => f.stops > 0);
    return flights;
  });

  get minDepartureDate(): Date {
    return new Date();
  }

  get minReturnDate(): Date {
    return this.flightSearchForm.value.dateRange?.departure || new Date();
  }

  searchFlights(): void {
    if (this.flightSearchForm.invalid) {
      this.flightSearchForm.markAllAsTouched();
      return;
    }

    const formValue = this.flightSearchForm.value;
    const origin = formValue.origin as AirportOption;
    const destination = formValue.destination as AirportOption;
    const departure = formValue.dateRange?.departure as Date;
    const returnDate = formValue.dateRange?.return as Date | null;

    this.isSearching.set(true);

    this.flightApiService.searchFlights({
      origin: origin.iataCode,
      destination: destination.iataCode,
      departureDate: departure.toISOString().split('T')[0],
      returnDate: returnDate?.toISOString().split('T')[0],
      adults: formValue.passengers || 1
    }).pipe(
      finalize(() => this.isSearching.set(false))
    ).subscribe(result => {
      if (result.error) {
        this.snackBar.open(`Search failed: ${result.error.message}`, 'Close', { duration: 5000 });
        this.searchResults.set([]);
      } else {
        this.searchResults.set(result.data);
      }
    });
  }

  addToItinerary(flight: Flight): void {
    this.tripState.addFlight(flight);
    this.snackBar.open('Flight added to itinerary', 'View', { duration: 3000 });
  }

  displayAirport(airport: AirportOption | null): string {
    return airport ? `${airport.iataCode} - ${airport.cityName}` : '';
  }

  private airportValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null; // Let required validator handle empty
      if (typeof value === 'string') return { invalidAirport: true };
      if (!value.iataCode) return { invalidAirport: true };
      return null;
    };
  }
}
```

### Flight Result Card Template
```html
<!-- Source: Material Card + Angular patterns for result display -->
<!-- search.component.html -->

<mat-card>
  <mat-card-header>
    <mat-card-title>Search Flights</mat-card-title>
  </mat-card-header>

  <mat-card-content>
    <form [formGroup]="flightSearchForm" (ngSubmit)="searchFlights()">
      <div class="form-row">
        <!-- Origin autocomplete -->
        <mat-form-field>
          <mat-label>From</mat-label>
          <input matInput
                 [formControl]="originControl"
                 [matAutocomplete]="autoOrigin"
                 placeholder="City or airport">
          <mat-autocomplete #autoOrigin="matAutocomplete" [displayWith]="displayAirport">
            <mat-option *ngFor="let airport of filteredOrigins$ | async" [value]="airport">
              {{airport.iataCode}} - {{airport.name}}, {{airport.cityName}}
            </mat-option>
          </mat-autocomplete>
          <mat-error *ngIf="originControl.hasError('required')">Origin is required</mat-error>
          <mat-error *ngIf="originControl.hasError('invalidAirport')">Select from list</mat-error>
        </mat-form-field>

        <!-- Destination autocomplete -->
        <mat-form-field>
          <mat-label>To</mat-label>
          <input matInput
                 [formControl]="destinationControl"
                 [matAutocomplete]="autoDestination"
                 placeholder="City or airport">
          <mat-autocomplete #autoDestination="matAutocomplete" [displayWith]="displayAirport">
            <mat-option *ngFor="let airport of filteredDestinations$ | async" [value]="airport">
              {{airport.iataCode}} - {{airport.name}}, {{airport.cityName}}
            </mat-option>
          </mat-autocomplete>
          <mat-error *ngIf="destinationControl.hasError('required')">Destination is required</mat-error>
          <mat-error *ngIf="destinationControl.hasError('invalidAirport')">Select from list</mat-error>
        </mat-form-field>
      </div>

      <div class="form-row" formGroupName="dateRange">
        <!-- Date range picker -->
        <mat-form-field>
          <mat-label>Travel dates</mat-label>
          <mat-date-range-input [rangePicker]="picker" [min]="minDepartureDate">
            <input matStartDate formControlName="departure" placeholder="Departure">
            <input matEndDate formControlName="return" placeholder="Return (optional)" [min]="minReturnDate">
          </mat-date-range-input>
          <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-date-range-picker #picker></mat-date-range-picker>
          <mat-error>Please select valid dates</mat-error>
        </mat-form-field>

        <!-- Passengers -->
        <mat-form-field>
          <mat-label>Passengers</mat-label>
          <mat-select formControlName="passengers">
            <mat-option [value]="1">1 Adult</mat-option>
            <mat-option [value]="2">2 Adults</mat-option>
            <mat-option [value]="3">3 Adults</mat-option>
            <mat-option [value]="4">4 Adults</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <button mat-raised-button color="primary" type="submit" [disabled]="isSearching()">
        <mat-icon *ngIf="!isSearching()">search</mat-icon>
        <mat-spinner *ngIf="isSearching()" diameter="20"></mat-spinner>
        {{ isSearching() ? 'Searching...' : 'Search Flights' }}
      </button>
    </form>
  </mat-card-content>
</mat-card>

<!-- Results section -->
<section *ngIf="searchResults().length > 0">
  <h2>{{searchResults().length}} flights found</h2>

  <!-- Filter chips -->
  <mat-chip-listbox [(value)]="filterType" aria-label="Filter flights">
    <mat-chip-option value="all">All flights ({{searchResults().length}})</mat-chip-option>
    <mat-chip-option value="direct">Direct only ({{searchResults().filter(f => f.stops === 0).length}})</mat-chip-option>
    <mat-chip-option value="stopovers">With stopovers ({{searchResults().filter(f => f.stops > 0).length}})</mat-chip-option>
  </mat-chip-listbox>

  <!-- Result cards -->
  <mat-card *ngFor="let flight of filteredFlights()" class="flight-card">
    <mat-card-content>
      <div class="flight-header">
        <div class="route">
          <span class="iata">{{flight.origin}}</span>
          <mat-icon>arrow_forward</mat-icon>
          <span class="iata">{{flight.destination}}</span>
        </div>
        <div class="price">
          <strong>{{flight.price.total | currency:flight.price.currency}}</strong>
        </div>
      </div>

      <div class="flight-details">
        <div class="detail">
          <mat-icon>schedule</mat-icon>
          <span>{{flight.durationMinutes / 60 | number:'1.0-0'}}h {{flight.durationMinutes % 60}}m</span>
        </div>
        <div class="detail">
          <mat-icon>flight</mat-icon>
          <span>{{flight.airline}} {{flight.flightNumber}}</span>
        </div>
        <div class="detail">
          <mat-icon>{{flight.stops === 0 ? 'check_circle' : 'connecting_airports'}}</mat-icon>
          <span>{{flight.stops === 0 ? 'Direct' : flight.stops + ' stop(s)'}}</span>
        </div>
      </div>

      <div class="times">
        <div>
          <strong>{{flight.departureAt | date:'short'}}</strong>
          <small>Departure</small>
        </div>
        <div>
          <strong>{{flight.arrivalAt | date:'short'}}</strong>
          <small>Arrival</small>
        </div>
      </div>
    </mat-card-content>

    <mat-card-actions>
      <button mat-button color="primary" (click)="addToItinerary(flight)">
        <mat-icon>add</mat-icon>
        Add to Itinerary
      </button>
      <a mat-button [href]="flight.link.url" target="_blank" rel="noopener noreferrer">
        <mat-icon>open_in_new</mat-icon>
        View on {{flight.link.provider}}
      </a>
    </mat-card-actions>
  </mat-card>
</section>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static IATA code JSON files | Amadeus Airport & City Search API | 2020+ | Real-time data, handles typos, sorted by relevance |
| Two separate datepickers | mat-date-range-input with linked start/end | Angular Material v10+ (2020) | Built-in validation, better UX |
| Manual OAuth token refresh with setTimeout | Interceptor-based with expiry check | Modern practice | Handles concurrent requests, centralized |
| Client-side date validation | [min] attribute on mat-datepicker | Angular Material v5+ | Accessible, visual feedback, less code |
| Template-driven forms | Reactive forms with signals | Angular 16+ (2023) | Better type safety, composability, testability |

**Deprecated/outdated:**
- **Standalone Flight Booking API:** Amadeus now requires Flight Offers Search (v2) followed by Flight Offers Price for checkout. Phase 4 only implements search.
- **XML SOAP APIs:** Amadeus deprecated SOAP in favor of REST JSON APIs (self-service). All examples use REST.
- **Airport autocomplete libraries (airport-autocomplete-js):** Amadeus official API is canonical source. Third-party libraries become stale.

## Open Questions

1. **Should we cache airport autocomplete results client-side?**
   - What we know: Amadeus has 1 request/100ms rate limit in test, airport list is relatively stable
   - What's unclear: Cache duration, invalidation strategy, memory usage
   - Recommendation: Implement simple sessionStorage cache for autocomplete results, keyed by search term. Cache for session duration. Measure memory usage in production.

2. **How to handle round-trip vs one-way in UI?**
   - What we know: Amadeus supports both via optional returnDate parameter
   - What's unclear: Should we show toggle or detect from return date presence? Separate result sections?
   - Recommendation: Phase 4 focuses on one-way flights (simpler). Return date is optional but results show outbound only. Phase 5+ can handle round-trip display.

3. **Should we implement flight result sorting (price, duration, stops)?**
   - What we know: Amadeus returns results unsorted in test (or sorted by relevance)
   - What's unclear: User expectation - sort by price or duration?
   - Recommendation: Implement client-side sorting with mat-select dropdown: "Price (low to high)", "Duration (shortest)", "Stops (fewest)". Default to price ascending.

4. **How to handle multi-currency display?**
   - What we know: Amadeus returns price in single currency per search
   - What's unclear: Can users select preferred currency? Should we convert?
   - Recommendation: Phase 4 displays currency as returned by API. Currency selection is out of scope. Use Angular currency pipe with dynamic currency code.

5. **Should we implement pagination for 50+ results?**
   - What we know: Amadeus can return up to 250 results (we're limiting to 50)
   - What's unclear: UX pattern - infinite scroll, pagination, or "load more"?
   - Recommendation: Display all results (max 50) in single list. Add sorting/filtering to reduce cognitive load. Pagination deferred to Phase 10+ (polish).

## Sources

### Primary (HIGH confidence)
- [Amadeus Flight Offers Search API Documentation](https://developers.amadeus.com/self-service/category/flights/api-doc/flight-offers-search) - API overview, capabilities
- [Amadeus Flight Offers Search API Reference](https://developers.amadeus.com/self-service/category/flights/api-doc/flight-offers-search/api-reference) - Endpoint parameters and response structure
- [Amadeus Airport & City Search API](https://developers.amadeus.com/self-service/category/flights/api-doc/airport-and-city-search) - Airport autocomplete endpoint
- [Amadeus API Authorization (OAuth2)](https://developers.amadeus.com/self-service/apis-docs/guides/developer-guides/API-Keys/authorization/) - Bearer token authentication
- [Amadeus API Rate Limits](https://developers.amadeus.com/self-service/apis-docs/guides/developer-guides/api-rate-limits/) - 1 request/100ms in test
- [Amadeus Common Errors](https://developers.amadeus.com/self-service/apis-docs/guides/developer-guides/common-errors/) - Error codes and handling

### Secondary (MEDIUM confidence)
- [Angular Material Datepicker Overview](https://material.angular.dev/components/datepicker/overview) - Verified mat-date-range-input usage
- [Angular Reactive Forms](https://angular.dev/guide/forms/reactive-forms) - Form control patterns
- [Angular Material Autocomplete](https://material.angular.dev/components/autocomplete) - displayWith function pattern
- [Smashing Magazine: The UX Of Flight Searches](https://www.smashingmagazine.com/2023/07/reimagining-flight-search-ux/) - UX best practices for flight search
- [AltexSoft: Airline Website UX Best Practices](https://www.altexsoft.com/blog/airline-website-ux-mistakes-and-best-practices-targeting-economy-travelers/) - Common UX patterns
- [Angular Material Autocomplete with HTTP Lookup](https://codinglatte.com/posts/angular/ng-material-autocomplete-http-lookup/) - Debounce pattern example
- [GitHub: amadeus4dev/amadeus-node](https://github.com/amadeus4dev/amadeus-node) - Official Node SDK for reference
- [Mockoon: Flight Offers Search API Mock](https://mockoon.com/mock-samples/amadeuscom/) - Sample response structure

### Tertiary (LOW confidence)
- StackBlitz and GitHub examples for Angular flight search - Educational but not authoritative for Amadeus API specifics
- Third-party airport autocomplete libraries (airport-autocomplete-js, airport-data-js) - Useful patterns but Amadeus API is canonical
- Community blog posts on async validators and debouncing - Patterns verified against official Angular docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Amadeus is industry standard, Angular Material is established in codebase, patterns verified with official docs
- Architecture: MEDIUM-HIGH - Existing BaseApiService pattern proven in Phase 2-3, OAuth2 pattern is standard but not yet implemented in codebase
- Pitfalls: MEDIUM - Timezone/OAuth/rate limiting issues verified from official Amadeus docs and community experiences, but specific edge cases may emerge during implementation

**Research date:** 2026-02-12
**Valid until:** 2026-03-14 (30 days - API is stable, but test environment limits may change)

**Notes:**
- No CONTEXT.md exists for this phase - all architectural decisions are Claude's discretion
- Heavy reliance on Amadeus official documentation (canonical source)
- WebSearch results corroborated patterns but official docs took precedence
- OAuth2 token management is the highest implementation risk (new pattern for codebase)
- Airport autocomplete debouncing is critical for rate limit compliance
- Timezone handling requires special attention per official warnings in research
