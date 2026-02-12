# Phase 6: Car Rental - Research

**Researched:** 2026-02-12
**Domain:** Car rental search and booking aggregation
**Confidence:** MEDIUM

## Summary

Phase 6 implements car rental search functionality using the Booking.com RapidAPI (booking-com15.p.rapidapi.com), the same provider used for Phase 5 Hotels. The implementation follows the established Phase 5 pattern: CarApiService extends BaseApiService('carRental'), CarMapper implements Mapper<TExternal, CarRental>. The infrastructure is already in place: proxy configured, API key interceptor supports RapidAPI headers for both hotel and carRental sources, TripStateService has addCarRental/removeCarRental methods, and CarRental model is defined.

**Key differences from hotels:**
- Cars require **pickup/dropoff locations** (potentially different) + **dates with TIMES** (not just dates)
- Location search accepts **airport IATA codes**, **city IDs**, or **lat/lon coordinates**
- Cars have **vehicle type/category** for filtering (economy, compact, SUV, etc.)
- Filters: **transmission type** (automatic/manual), **mileage type** (limited/unlimited), **vehicle categories**
- No star rating equivalent, but has **vehicle category** and **supplier** information

**Primary recommendation:** Use Booking.com RapidAPI (booking-com15) for car rental search with the same authentication pattern as hotels. Research confirms the Demand API structure but **CRITICAL**: actual RapidAPI endpoint paths, parameter names, and response schemas **MUST be verified via RapidAPI dashboard** before implementation. The official Booking.com Demand API uses different paths/authentication than the RapidAPI proxy version.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Booking.com RapidAPI | booking-com15 | Car rental search and availability | Same provider as hotels Phase 5, real-time car rental data from Booking.com, free tier available, consistent authentication |
| Angular HttpClient | 17+ | HTTP requests via proxy | Existing infrastructure, RapidAPI interceptor already configured for 'carRental' source |
| Angular Material | 17+ | Date/time pickers, autocomplete | Mature UI components, built-in accessibility, consistent with existing hotel search UI |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| RxJS | 7+ | Observable composition, retry logic | Use withBackoff() for rate-limited requests (already implemented Phase 2), use debounceTime() for location autocomplete |
| Angular Material Datepicker | 17+ | Date selection with time input | Car rentals need date AND time; use datepicker + separate time input or datetime-local input |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Booking.com RapidAPI | Expedia Rapid Car API | Expedia Rapid Car in beta (2026 release), 47,000 vendors, but requires new provider setup; Booking.com already integrated |
| Shared RapidAPI key | Separate car rental key | Environment has `carRentalApiKey` placeholder; could share `hotelApiKey` (same provider) or use separate key for quota isolation |
| Airport IATA codes | City IDs or coordinates | IATA codes simpler for airport pickups (common use case), but city IDs/coords needed for non-airport locations |

**Installation:**
```bash
# No new npm packages required — Angular Material, RxJS, HttpClient already in use from Phase 5
```

## Architecture Patterns

### Recommended Project Structure
```
src/app/features/car-rental/
├── car-search/              # Search form component
│   ├── car-search.component.ts
│   ├── car-search.component.html
│   └── car-search.component.scss
├── car-results/             # Result cards list
│   ├── car-results.component.ts
│   └── car-results.component.html
└── car-result-card/         # Individual result card
    ├── car-result-card.component.ts
    └── car-result-card.component.html

src/app/core/api/
├── car-api.service.ts       # Extends BaseApiService('carRental')
├── car.mapper.ts            # Implements Mapper<BookingComCar, CarRental>
└── interceptors/
    └── api-key.interceptor.ts  # ALREADY CONFIGURED for 'carRental' RapidAPI source
```

### Pattern 1: BaseApiService Extension for Cars
**What:** CarApiService extends BaseApiService with 'carRental' as apiSource
**When to use:** Phase 6 car rental search service implementation
**Example:**
```typescript
@Injectable({ providedIn: 'root' })
export class CarApiService extends BaseApiService {
  private readonly mapper = inject(CarMapper);

  constructor() {
    super('carRental'); // Key source from ApiConfigService
    // Endpoint resolves to 'carRental' -> /api/cars proxy
  }

  searchCars(params: CarSearchParams): Observable<ApiResult<CarRental[]>> {
    const queryParams = {
      // NOTE: Parameter names are HYPOTHETICAL — verify via RapidAPI dashboard
      pickup_location: params.pickupLocation,    // Airport code or city ID
      dropoff_location: params.dropoffLocation,  // Airport code or city ID
      pickup_datetime: params.pickupAt,          // ISO 8601: 2026-03-15T10:00:00
      dropoff_datetime: params.dropoffAt,        // ISO 8601: 2026-03-20T10:00:00
      driver_age: params.driverAge,              // Required by most APIs (21-99)
      currency: params.currency || 'USD',
    };

    return this.get<BookingComCarResponse>('/cars/search', queryParams).pipe(
      withBackoff(), // Exponential backoff from Phase 2
      map(response => ({
        data: response.cars.map(car => this.mapper.mapResponse(car)),
        error: null,
      })),
      catchError((error: AppError): Observable<ApiResult<CarRental[]>> =>
        of({ data: [], error })
      )
    );
  }
}
```

**WARNING:** Endpoint path `/cars/search` is **HYPOTHETICAL**. Booking.com Demand API uses `/cars/search` with POST, but RapidAPI wrapper may use different paths/methods. **CRITICAL:** Verify actual endpoint via RapidAPI dashboard.

### Pattern 2: Location Search for Pickup/Dropoff
**What:** Search for locations (airports, cities) to populate pickup/dropoff fields with autocomplete
**When to use:** Car search form location input
**Example (Booking.com Demand API structure):**
```typescript
// Option 1: Airport search (if RapidAPI exposes common/locations/airports endpoint)
searchAirports(query: string, country?: string): Observable<LocationOption[]> {
  const body = {
    ...(country && { country }), // Optional country filter
    languages: ['en'],
  };

  return this.post<any>('/common/locations/airports', body).pipe(
    withBackoff(),
    map(response => {
      const airports = response.airports || response.data || [];
      return airports
        .filter((a: any) =>
          a.name.toLowerCase().includes(query.toLowerCase()) ||
          a.iata_code.toLowerCase().includes(query.toLowerCase())
        )
        .map((a: any): LocationOption => ({
          id: a.iata_code,
          name: a.name,
          label: `${a.name} (${a.iata_code})`,
          type: 'airport',
        }));
    }),
    catchError(() => of([]))
  );
}

// Option 2: Hardcoded airport list (fallback if endpoint not available)
// Use a curated list of major airports for autocomplete
// Less ideal but viable for MVP if API doesn't expose location search
```

**CRITICAL UNCERTAINTY:** The Booking.com Demand API has `common/locations/airports` and `common/locations/cities` endpoints, but it's **NOT VERIFIED** whether the RapidAPI booking-com15 proxy exposes these endpoints. Phase planning **MUST** verify location search availability or plan fallback (hardcoded airport list, external location API).

### Pattern 3: Date + Time Input for Pickup/Dropoff
**What:** Car rentals require datetime (date + time), not just dates like hotels
**When to use:** Car search form pickup/dropoff inputs
**Example:**
```typescript
// car-search.component.ts
import { FormControl, Validators } from '@angular/forms';
import { formatDate } from '@angular/common';

pickupDateControl = new FormControl('', [Validators.required]);
pickupTimeControl = new FormControl('10:00', [Validators.required]); // Default 10:00 AM
dropoffDateControl = new FormControl('', [Validators.required]);
dropoffTimeControl = new FormControl('10:00', [Validators.required]);

// Combine date + time into ISO 8601 datetime
buildPickupDatetime(): string {
  const date = this.pickupDateControl.value;
  const time = this.pickupTimeControl.value;
  if (!date || !time) return '';

  // Format as ISO 8601: 2026-03-15T10:00:00
  return `${formatDate(date, 'yyyy-MM-dd', 'en-US')}T${time}:00`;
}

// Validation: dropoff datetime must be after pickup datetime
validateDropoffAfterPickup(): void {
  const pickupDt = this.buildPickupDatetime();
  const dropoffDt = this.buildDropoffDatetime();

  if (pickupDt && dropoffDt && new Date(dropoffDt) <= new Date(pickupDt)) {
    this.dropoffDateControl.setErrors({ beforePickup: true });
  }
}
```

**Alternative:** Use `<input type="datetime-local">` native HTML5 input (simpler, no library needed, but less customizable styling).

### Pattern 4: CarRental Model Mapping
**What:** Transform Booking.com RapidAPI response to internal CarRental model
**When to use:** CarMapper implementation
**Example:**
```typescript
@Injectable({ providedIn: 'root' })
export class CarMapper implements Mapper<BookingComCar, CarRental> {
  mapResponse(raw: BookingComCar, searchParams: CarSearchParams): CarRental {
    return {
      id: raw.vehicle_id?.toString() || crypto.randomUUID(),
      source: 'booking-com',
      addedToItinerary: false,
      vehicleType: raw.vehicle_category || raw.category || 'Unknown',
      pickUpLocation: searchParams.pickupLocation, // Echo from search
      dropOffLocation: searchParams.dropoffLocation, // Echo from search
      pickUpAt: searchParams.pickupAt, // Echo ISO 8601 datetime
      dropOffAt: searchParams.dropoffAt, // Echo ISO 8601 datetime
      price: {
        total: parseFloat(raw.total_price || raw.price),
        currency: raw.currency_code || 'USD',
      },
      link: {
        url: raw.booking_url || raw.url || raw.deep_link,
        provider: raw.supplier_name || 'Booking.com',
      },
    };
  }
}
```

**WARNING:** Field names (`vehicle_id`, `vehicle_category`, `total_price`, `booking_url`, etc.) are **HYPOTHETICAL**. Actual response schema **MUST be verified** via RapidAPI testing.

### Pattern 5: Client-Side Filtering by Vehicle Type and Price
**What:** Filter results after API response if API doesn't support server-side filtering
**When to use:** When RapidAPI doesn't expose Booking.com Demand API filter parameters, or for enhanced UX
**Example:**
```typescript
// car-results.component.ts
filterResults(
  cars: CarRental[],
  vehicleTypeFilter?: string,
  maxPrice?: number
): CarRental[] {
  return cars.filter(car => {
    const matchesType = !vehicleTypeFilter ||
      car.vehicleType.toLowerCase().includes(vehicleTypeFilter.toLowerCase());

    const matchesPrice = !maxPrice || car.price.total <= maxPrice;

    return matchesType && matchesPrice;
  });
}

// Template
<mat-form-field>
  <mat-label>Vehicle Type</mat-label>
  <mat-select [(ngModel)]="selectedVehicleType">
    <mat-option [value]="null">All Types</mat-option>
    <mat-option value="economy">Economy</mat-option>
    <mat-option value="compact">Compact</mat-option>
    <mat-option value="suv">SUV</mat-option>
    <mat-option value="sedan">Sedan</mat-option>
  </mat-select>
</mat-form-field>
```

**NOTE:** Booking.com Demand API supports server-side filters (car_categories, transmission_type, mileage_type) but RapidAPI wrapper may not expose these. Verify if filters are available; if not, implement client-side filtering.

### Anti-Patterns to Avoid
- **Using date-only inputs for car rentals:** Cars need time (10:00 AM vs 10:00 PM matters); always use datetime
- **Hardcoding location IDs:** Airport codes change; use location search/autocomplete to get valid IDs
- **Ignoring driver age:** Most car rental APIs require driver age (typically 21+ minimum); UI should prompt and validate
- **Same location validation:** Don't prevent pickup ≠ dropoff; one-way rentals are valid and common
- **Skipping currency parameter:** Price display breaks if currency isn't specified or doesn't match user preference

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| **Location autocomplete** | Custom airport/city database | Booking.com locations API OR curated airport list | Location data changes, IATA codes get reassigned, city IDs are API-specific; use authoritative source |
| **Date + time picker** | Custom datetime selector | Angular Material Datepicker + native time input OR `<input type="datetime-local">` | Browser native datetime inputs are accessible, localized, and mobile-optimized; Material components have mature validation |
| **ISO 8601 datetime formatting** | Custom string concatenation | `formatDate()` from Angular common OR native `Date.toISOString()` | Edge cases: timezone offsets, leap seconds, DST transitions; use tested formatters |
| **Vehicle category mapping** | Custom category normalization | API's native categories + display mapping | Different APIs use different taxonomies; don't try to unify; map for display only if needed |
| **Currency conversion** | Custom exchange rates | Display API's native currency + amount | Exchange rates change hourly; liability for inaccurate conversions; let user see provider's price |

**Key insight:** Car rental APIs have complex location resolution (airport codes, city IDs, coordinates) and datetime requirements. Delegate location search to API endpoints when available, or use curated lists. Datetime handling has many edge cases (timezones, DST); use standard library functions.

## Common Pitfalls

### Pitfall 1: Mixing Date and Datetime Formats
**What goes wrong:** API rejects requests or returns unexpected results due to date format mismatch
**Why it happens:** Hotels use date-only (YYYY-MM-DD), cars use datetime (YYYY-MM-DDTHH:MM:SS)
**How to avoid:**
- Always include time component for car rental dates: `2026-03-15T10:00:00`
- Use separate date + time inputs, combine programmatically
- Validate format before API call: check for `T` separator and `:` in time
**Warning signs:** API errors mentioning date format, or cars returned for wrong times

### Pitfall 2: Location Type Confusion (Airport vs City vs Coordinates)
**What goes wrong:** API returns empty results or errors because location type doesn't match format
**Why it happens:** Booking.com API accepts `{ airport: "AMS" }` OR `{ city: 12345 }` OR `{ coordinates: {lat, lon} }` but NOT multiple types simultaneously
**How to avoid:**
- Determine location type from user selection (airport search → IATA code, city search → city ID)
- Build request with ONLY the relevant location field:
  ```typescript
  const location = isAirport
    ? { airport: iataCode }
    : { city: cityId };
  ```
- Don't send `{ airport: "", city: 123 }` (empty airport field causes issues)
**Warning signs:** API returns "invalid location" errors even with valid codes

### Pitfall 3: RapidAPI Endpoint Path Mismatch
**What goes wrong:** 404 errors or incorrect responses because RapidAPI paths differ from official Demand API
**Why it happens:** Booking.com Demand API uses `/cars/search` (POST), but RapidAPI wrapper may use `/api/v1/cars/searchCars` (GET) or different structure
**How to avoid:**
- **CRITICAL PRE-PLANNING TASK:** Test endpoints via RapidAPI dashboard playground
- Document actual paths, methods (GET vs POST), parameter names
- Don't assume Demand API documentation applies to RapidAPI wrapper
**Warning signs:** 404 Not Found, unexpected response schemas, authentication errors on valid keys

### Pitfall 4: Driver Age Requirement Missing
**What goes wrong:** API returns empty results or errors, or results show inflated prices (young driver surcharge not factored)
**Why it happens:** Car rental pricing varies by driver age; API needs age to calculate accurate prices
**How to avoid:**
- Include driver age input in search form (default: 30, range: 18-99)
- Pass `driver_age` or `driver: { age: 30 }` in API request
- Validate age is within acceptable range (typically 21+ for most rentals)
**Warning signs:** API errors mentioning driver age, or price discrepancies with booking site

### Pitfall 5: Pickup/Dropoff Time Validation Edge Cases
**What goes wrong:** User selects invalid rental period (too short, pickup after dropoff, past dates)
**Why it happens:** Car rentals typically require minimum rental period (1 day); datetime comparison has edge cases
**How to avoid:**
- Validate dropoff > pickup (datetime comparison, not just date)
- Enforce minimum rental period (e.g., 24 hours)
- Disable past dates in datepicker
- Disable past times if pickup date is today
  ```typescript
  const now = new Date();
  const pickupDt = new Date(this.buildPickupDatetime());
  const isToday = formatDate(pickupDt, 'yyyy-MM-dd', 'en-US') ===
                  formatDate(now, 'yyyy-MM-dd', 'en-US');

  if (isToday && pickupDt <= now) {
    this.pickupTimeControl.setErrors({ pastTime: true });
  }
  ```
**Warning signs:** API errors about invalid date ranges, or rental period too short

### Pitfall 6: Vehicle Type Filter Values Not Matching API
**What goes wrong:** Filter dropdown has "SUV" but API expects "suv" or "sport_utility_vehicle"
**Why it happens:** API's vehicle category values are case-sensitive or use different naming
**How to avoid:**
- Verify exact vehicle category values from API documentation
- Map display labels to API values:
  ```typescript
  const VEHICLE_TYPE_MAP = {
    'Economy': 'economy',
    'Compact': 'compact',
    'SUV': 'suv',
    'Full Size': 'full_size',
  };
  ```
- Use API's values in filter request, display human-friendly labels in UI
**Warning signs:** Filter selection has no effect, or API returns errors

## Code Examples

Verified patterns from official sources and existing codebase:

### Location Autocomplete with Debouncing (Airport Search)
```typescript
// car-search.component.ts
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

pickupLocationInput$ = new Subject<string>();
pickupLocationOptions$: Observable<LocationOption[]>;

ngOnInit() {
  this.pickupLocationOptions$ = this.pickupLocationInput$.pipe(
    debounceTime(300), // Wait for user to stop typing
    distinctUntilChanged(), // Only if value changed
    switchMap(query => this.carApi.searchLocations(query)),
    catchError(() => of([]))
  );
}

onPickupLocationInput(value: string) {
  this.pickupLocationInput$.next(value);
}
```

### Car Search with Error Handling
```typescript
// car-api.service.ts - Following Phase 5 pattern
searchCars(params: CarSearchParams): Observable<ApiResult<CarRental[]>> {
  const queryParams = {
    // VERIFY these parameter names via RapidAPI dashboard
    pickup_location: params.pickupLocation,
    dropoff_location: params.dropoffLocation,
    pickup_datetime: params.pickupAt, // ISO 8601
    dropoff_datetime: params.dropoffAt, // ISO 8601
    driver_age: params.driverAge,
    currency: params.currency || 'USD',
  };

  return this.get<BookingComCarResponse>('/cars/search', queryParams).pipe(
    withBackoff(), // Exponential backoff from Phase 2
    map(response => ({
      data: response.cars.map(car => this.mapper.mapResponse(car, params)),
      error: null,
    })),
    catchError((error: AppError): Observable<ApiResult<CarRental[]>> =>
      of({ data: [], error })
    )
  );
}
```

### Datetime Combination and Validation
```typescript
// car-search.component.ts
import { FormControl, Validators } from '@angular/forms';
import { formatDate } from '@angular/common';

pickupDateControl = new FormControl('', [Validators.required]);
pickupTimeControl = new FormControl('10:00', [Validators.required]);
dropoffDateControl = new FormControl('', [Validators.required]);
dropoffTimeControl = new FormControl('10:00', [Validators.required]);

buildDatetime(dateControl: FormControl, timeControl: FormControl): string {
  const date = dateControl.value;
  const time = timeControl.value;
  if (!date || !time) return '';

  return `${formatDate(date, 'yyyy-MM-dd', 'en-US')}T${time}:00`;
}

validateDatetimeRange(): boolean {
  const pickupDt = this.buildDatetime(this.pickupDateControl, this.pickupTimeControl);
  const dropoffDt = this.buildDatetime(this.dropoffDateControl, this.dropoffTimeControl);

  if (!pickupDt || !dropoffDt) return false;

  const pickup = new Date(pickupDt);
  const dropoff = new Date(dropoffDt);
  const now = new Date();

  // Pickup must be in future
  if (pickup <= now) {
    this.pickupDateControl.setErrors({ pastDate: true });
    return false;
  }

  // Dropoff must be after pickup
  if (dropoff <= pickup) {
    this.dropoffDateControl.setErrors({ beforePickup: true });
    return false;
  }

  // Minimum rental period: 24 hours
  const hoursDiff = (dropoff.getTime() - pickup.getTime()) / (1000 * 60 * 60);
  if (hoursDiff < 24) {
    this.dropoffDateControl.setErrors({ tooShort: true });
    return false;
  }

  return true;
}
```

### Client-Side Filtering (Fallback if API Doesn't Support Filters)
```typescript
// car-results.component.ts
applyFilters(
  cars: CarRental[],
  vehicleType?: string,
  maxPrice?: number
): CarRental[] {
  return cars.filter(car => {
    const matchesType = !vehicleType ||
      car.vehicleType.toLowerCase().includes(vehicleType.toLowerCase());

    const matchesPrice = !maxPrice || car.price.total <= maxPrice;

    return matchesType && matchesPrice;
  });
}

// Sort by price
sortByPrice(cars: CarRental[], ascending = true): CarRental[] {
  return [...cars].sort((a, b) => {
    const diff = a.price.total - b.price.total;
    return ascending ? diff : -diff;
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SOAP/XML car rental APIs | RESTful JSON APIs | 2010s+ | Modern HTTP clients, type-safe TypeScript interfaces, Observable composition |
| Separate date and time fields | HTML5 datetime-local input | 2015+ | Native browser support, mobile-optimized, accessibility built-in |
| Custom location databases | API-provided location endpoints | Ongoing | Delegating to API reduces maintenance; location data (airports, cities) changes frequently |
| Server-side filtering only | Hybrid (server + client filtering) | 2020s | Initial API call gets broad results, client-side filtering enables instant UX without extra API calls |
| Booking.com Demand API direct | Booking.com via RapidAPI aggregator | N/A (RapidAPI model) | RapidAPI provides proxy, rate limiting, unified dashboard; direct API requires partnership agreement |

**Deprecated/outdated:**
- X-API-Key for RapidAPI: RapidAPI requires X-RapidAPI-Key and X-RapidAPI-Host (already handled in apiKeyInterceptor)
- Date-only inputs for car rentals: Cars always need time component; use datetime inputs

## Open Questions

### 1. What are the exact Booking.com RapidAPI car rental endpoint paths and parameters?
**What we know:**
- Base URL: `https://booking-com15.p.rapidapi.com` (verified in proxy.conf.json)
- Proxy path: `/api/cars` → strips to `/` then appends relative path
- Booking.com Demand API uses `/cars/search` (POST) with request body
- RapidAPI often converts POST endpoints to GET with query params

**What's unclear:**
- Is the RapidAPI endpoint `/api/v1/cars/search`, `/cars/searchCars`, `/searchCars`, or something else?
- Does it use GET with query params or POST with body?
- What are the exact parameter names: `pickup_location` vs `pickupLocation` vs `pickup_loc`?
- What is the response JSON structure and field names?

**Recommendation:**
- **CRITICAL PRE-PLANNING TASK:** Log into RapidAPI dashboard, navigate to booking-com15 API
- Find car rental search endpoint, test via playground
- Document actual endpoint path, HTTP method, required/optional parameters, response structure
- Update CarApiService and CarMapper with verified data before implementation

**Sources for verification:**
- [RapidAPI Booking.com15 Playground](https://rapidapi.com/DataCrawler/api/booking-com15/playground)
- [RapidAPI Booking.com15 Documentation](https://rapidapi.com/DataCrawler/api/booking-com15)

### 2. Does booking-com15 RapidAPI expose location search endpoints?
**What we know:**
- Booking.com Demand API has `common/locations/airports` and `common/locations/cities` endpoints
- These endpoints return lists of locations filtered by country, language
- Hotels Phase 5 used `/api/v1/hotels/searchDestination` (hypothetical, not verified)

**What's unclear:**
- Does the RapidAPI wrapper expose `common/locations/airports` and `common/locations/cities`?
- If yes, what are the actual paths in RapidAPI (`/common/locations/airports` or `/api/v1/locations/airports`)?
- If no, is there a search/autocomplete endpoint, or do we need a fallback (hardcoded airport list, external API)?

**Recommendation:**
- Check RapidAPI dashboard for location-related endpoints
- If location endpoints exist: Use Booking.com's location search (consistent with provider)
- If not: **Option A** — Use curated airport list (50-100 major airports hardcoded), **Option B** — Use external location API (Google Places, Aviation Edge)
- Phase 06-01 plan should document the chosen approach and justify it

**Fallback:** If no location endpoint, use hardcoded list of top 100 airports by passenger volume (IATA codes + names). Less ideal but viable for MVP.

### 3. Does booking-com15 RapidAPI support server-side filtering?
**What we know:**
- Booking.com Demand API supports filters: `car_categories` (array), `transmission_type` (automatic/manual), `mileage_type` (limited/unlimited)
- Filters are passed in request body to `/cars/search` (Demand API structure)

**What's unclear:**
- Does the RapidAPI wrapper expose these filter parameters?
- If yes, are they query params (GET) or body params (POST)?
- If no, do we need to implement client-side filtering only?

**Recommendation:**
- Verify filter parameter availability via RapidAPI dashboard
- If filters available: Use server-side filtering for better performance (fewer results returned)
- If not: Implement client-side filtering (fetch all results, filter in Angular)
- Document in PLAN.md which approach is used

### 4. Should carRentalApiKey be separate or shared with hotelApiKey?
**What we know:**
- Environment has `carRentalApiKey: ''` placeholder
- Both hotel and carRental use same RapidAPI provider (booking-com15.p.rapidapi.com)
- Same RapidAPI account can use one key for multiple endpoints on same API
- ApiConfigService has separate keys configured: `hotel: environment.hotelApiKey`, `carRental: environment.carRentalApiKey`

**What's unclear:**
- Should we use the same RapidAPI key for both (simpler setup, shared quota)?
- Or use separate keys (quota isolation, separate billing/monitoring)?

**Recommendation:**
- **SHORT-TERM (MVP):** Share the same RapidAPI key — set `carRentalApiKey: environment.hotelApiKey` in ApiConfigService, or leave carRentalApiKey empty and update apiKeyInterceptor to fallback to hotelApiKey for carRental source
- **LONG-TERM:** Separate keys if quota becomes an issue or if separate billing/monitoring is needed
- Document the decision in PLAN.md

### 5. What vehicle category values does the API return?
**What we know:**
- Booking.com uses categories: economy, compact, intermediate, full_size, suv, pickup, etc.
- Research suggests standard ACRISS codes (industry standard for car rental categories)

**What's unclear:**
- What exact values does booking-com15 API return in `vehicle_category` field?
- Are they lowercase (`economy`) or title case (`Economy`) or ACRISS codes (`ECAR`)?
- What categories are available for filtering?

**Recommendation:**
- Test API response via RapidAPI dashboard to see actual category values
- Document available categories for UI filter dropdown
- Don't try to normalize/map categories unless necessary; use API's native values

## Sources

### Primary (HIGH confidence)
- [Booking.com Demand API - Car Rentals](https://developers.booking.com/demand/docs/open-api/demand-api/cars) - Request/response structure verified
- [Booking.com Demand API - Car Search](https://developers.booking.com/demand/docs/cars/search-for-cars) - Pickup/dropoff parameters, location types verified
- [Booking.com Demand API - Filtering and Sorting](https://developers.booking.com/demand/docs/cars/cars-filter-sorting) - Filter parameters verified (car_categories, transmission_type, mileage_type)
- [Booking.com Demand API - Locations](https://developers.booking.com/demand/docs/open-api/demand-api/commonlocations) - Airports, cities endpoints verified
- Existing codebase:
  - `triply/src/proxy.conf.json` - Cars proxy configuration verified (`/api/cars` → booking-com15.p.rapidapi.com)
  - `triply/src/app/core/api/api-config.service.ts` - carRental key and endpoint verified
  - `triply/src/app/core/api/interceptors/api-key.interceptor.ts` - RapidAPI headers for 'carRental' source verified
  - `triply/src/app/core/models/trip.models.ts` - CarRental model structure verified
  - `triply/src/app/core/services/trip-state.service.ts` - addCarRental/removeCarRental methods verified
  - `triply/src/app/core/api/hotel-api.service.ts` - Phase 5 pattern reference for BaseApiService extension

### Secondary (MEDIUM confidence)
- [RapidAPI Booking.com15 API Page](https://rapidapi.com/DataCrawler/api/booking-com15) - API provider verified, endpoint names mentioned but not detailed
- [Booking.com Car Categories Guide](https://www.booking.com/guides/article/cars/guide-rental-car-categories.html) - Vehicle type categories (economy, compact, SUV, etc.)
- [ACRISS Car-Hire Codes](https://holacarrentals.com/en-gb/blogs/car-rental-united-states/what-do-acriss-car-hire-codes-like-icar-or-sfar-mean-on-us-bookings) - Industry standard car rental codes

### Tertiary (LOW confidence - requires verification)
- Assumed RapidAPI endpoint paths (e.g., `/cars/search`, `/api/v1/cars/searchCars`) - **MUST be verified via RapidAPI dashboard**
- Assumed response field names in CarMapper example (`vehicle_id`, `vehicle_category`, `total_price`) - **MUST be verified via API testing**
- WebSearch results mentioning location autocomplete - not confirmed for booking-com15 specifically

## Metadata

**Confidence breakdown:**
- Standard stack: **MEDIUM** - Booking.com RapidAPI proxy verified in codebase, same provider as hotels Phase 5, but endpoint details NOT verified
- Architecture: **HIGH** - BaseApiService pattern established in Phases 4-5, CarRental model defined, TripStateService methods exist, interceptor already configured
- Pitfalls: **MEDIUM** - Datetime requirements and location types verified in Demand API docs, but RapidAPI wrapper specifics unknown
- Code examples: **MEDIUM** - Patterns follow verified Phase 5 structure, but API-specific details (endpoint paths, response fields, parameter names) are hypothetical

**Research date:** 2026-02-12
**Valid until:** 2026-03-14 (30 days - car rental APIs are stable)

## Critical Pre-Planning Action Required

**BEFORE creating 06-01-PLAN.md, the planner or developer MUST:**

1. Access RapidAPI dashboard: https://rapidapi.com/DataCrawler/api/booking-com15
2. Locate car rental search endpoint in endpoints list
3. Test endpoint via playground:
   - Find actual endpoint path (e.g., `/cars/search`, `/api/v1/cars/searchCars`, etc.)
   - Determine HTTP method (GET with query params vs POST with body)
   - Identify required parameters (pickup_location, pickup_datetime, driver_age, etc.)
   - Test with sample values (e.g., airport: "JFK", datetime: "2026-04-01T10:00:00")
   - Document response JSON structure (field names: vehicle_id, vehicle_category, price, etc.)
4. Check for location search endpoints:
   - Look for endpoints like `/locations/airports`, `/locations/cities`, `/searchLocations`
   - If found, test and document parameters/response
   - If not found, plan fallback (hardcoded airport list or external API)
5. Check for filter support:
   - Test if API accepts vehicle_type, transmission_type, mileage_type parameters
   - Document filter parameter names and accepted values
6. Update this RESEARCH.md with verified information (or create separate VERIFIED-ENDPOINTS.md)
7. Proceed with planning using real endpoint data

**Without this verification, implementation will fail at first API call.** The Booking.com Demand API structure (documented above) is authoritative for the official API, but the RapidAPI wrapper (booking-com15) may use different paths, methods, and schemas.
