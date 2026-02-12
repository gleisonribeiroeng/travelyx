# Phase 5: Hotels - Research

**Researched:** 2026-02-12
**Domain:** Hotel search and booking aggregation
**Confidence:** MEDIUM

## Summary

Phase 5 implements hotel search functionality using the Booking.com RapidAPI (booking-com15.p.rapidapi.com). The implementation follows the established Phase 4 pattern: HotelApiService extends BaseApiService, HotelMapper implements Mapper<TExternal, Stay>. Key differences from flights: RapidAPI uses X-RapidAPI-Key and X-RapidAPI-Host headers (not OAuth2), and destination input requires city/location search rather than IATA codes.

**Research reveals a critical infrastructure gap:** The existing apiKeyInterceptor injects `X-API-Key` headers, but RapidAPI requires `X-RapidAPI-Key` AND `X-RapidAPI-Host` headers. This requires interceptor modification or a separate RapidAPI-specific interceptor.

**Primary recommendation:** Use Booking.com RapidAPI (booking-com15) for hotel search with properties/list endpoint, Google Places API for destination autocomplete, and modify apiKeyInterceptor to support RapidAPI header requirements. Consider Amadeus Hotel Search API as a future alternative if unified authentication (OAuth2) becomes a priority.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Booking.com RapidAPI | booking-com15 | Hotel search and availability | Real-time hotel data from Booking.com, free tier available (500 requests/month), GET-only endpoints simplify integration |
| Google Places API | Autocomplete (New) | Destination search and geocoding | Industry standard for location autocomplete, session-based pricing currently free, supports city-level filtering |
| Angular HttpClient | 17+ | HTTP requests via proxy | Existing infrastructure, functional interceptors already configured |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| RxJS | 7+ | Observable composition, retry logic | Use withBackoff() for rate-limited requests, use debounceTime() for search autocomplete |
| Google Places Autocomplete | ngx-google-places-autocomplete OR custom | Angular wrapper for Places API | If complex autocomplete UI needed; otherwise use direct HTTP calls |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Booking.com RapidAPI | Amadeus Hotel Search API | Amadeus uses OAuth2 (consistent with flights), but requires enterprise-level pricing for production; Booking.com has free tier |
| Google Places API | Booking.com destination search endpoint (if exists) | Reduces external dependencies, but Google Places is more accurate and well-documented |
| Custom autocomplete | Native browser datalist | Simpler but no geolocation, no real-time suggestions, poor UX |

**Installation:**
```bash
# No new npm packages required if using Google Places via HTTP
# If using ngx-google-places-autocomplete wrapper:
npm install ngx-google-places-autocomplete
```

## Architecture Patterns

### Recommended Project Structure
```
src/app/features/hotels/
├── hotel-search/           # Search form component
│   ├── hotel-search.component.ts
│   ├── hotel-search.component.html
│   └── hotel-search.component.scss
├── hotel-results/          # Result cards list
│   ├── hotel-results.component.ts
│   └── hotel-results.component.html
└── hotel-result-card/      # Individual result card
    ├── hotel-result-card.component.ts
    └── hotel-result-card.component.html

src/app/core/api/
├── hotel-api.service.ts    # Extends BaseApiService('hotel')
├── hotel.mapper.ts         # Implements Mapper<BookingComHotel, Stay>
└── interceptors/
    └── api-key.interceptor.ts  # REQUIRES MODIFICATION for RapidAPI headers
```

### Pattern 1: RapidAPI Authentication Headers
**What:** RapidAPI requires TWO headers: X-RapidAPI-Key (API key) and X-RapidAPI-Host (API-specific host identifier)
**When to use:** All requests to booking-com15.p.rapidapi.com
**Example:**
```typescript
// CURRENT apiKeyInterceptor (INCOMPATIBLE with RapidAPI):
const authReq = req.clone({
  headers: req.headers.set('X-API-Key', key),
});

// REQUIRED for RapidAPI:
const authReq = req.clone({
  headers: req.headers
    .set('X-RapidAPI-Key', key)
    .set('X-RapidAPI-Host', 'booking-com15.p.rapidapi.com'),
});
```

**Source:** [RapidAPI Authentication Documentation](https://docs.rapidapi.com/docs/configuring-api-authentication)

### Pattern 2: BaseApiService Extension for Hotels
**What:** HotelApiService extends BaseApiService with 'hotel' as apiSource (key) but 'hotels' as endpoint
**When to use:** Phase 5 hotel search service implementation
**Example:**
```typescript
@Injectable({ providedIn: 'root' })
export class HotelApiService extends BaseApiService {
  private readonly mapper = inject(HotelMapper);

  constructor() {
    super('hotel'); // Key source from ApiConfigService
    // Endpoint resolves to 'hotels' -> /api/hotels proxy
  }

  searchHotels(params: HotelSearchParams): Observable<ApiResult<Stay[]>> {
    const queryParams = {
      dest_id: params.destinationId,      // City ID from destination search
      checkin_date: params.checkIn,       // YYYY-MM-DD
      checkout_date: params.checkOut,     // YYYY-MM-DD
      adults_number: params.adults,
      room_number: params.rooms,
    };

    return this.get<BookingComResponse>('/api/v1/hotels/searchHotels', queryParams)
      .pipe(
        map(response => ({
          data: response.result.map(hotel => this.mapper.mapResponse(hotel)),
          error: null,
        })),
        catchError((error: AppError) => of({ data: [], error })),
        withBackoff() // Rate-limit retry from Phase 2
      );
  }
}
```

**Note:** Endpoint paths for booking-com15 are **NOT VERIFIED**. Official endpoint documentation was not accessible during research. The paths `/api/v1/hotels/searchHotels` and `/api/v1/hotels/searchDestination` are **HYPOTHETICAL** based on common API patterns. **CRITICAL:** Phase planning MUST verify actual endpoint paths via RapidAPI dashboard before implementation.

### Pattern 3: Google Places Autocomplete for Destination Search
**What:** Session-based autocomplete that links autocomplete requests with place details requests (currently free)
**When to use:** Hotel search form destination input
**Example:**
```typescript
// Autocomplete request
searchDestinations(query: string): Observable<PlaceAutocompletePrediction[]> {
  if (query.length < 2) return of([]);

  return this.http.post<AutocompleteResponse>(
    'https://places.googleapis.com/v1/places:autocomplete',
    {
      input: query,
      includedPrimaryTypes: ['(cities)'], // Filter to cities only
      languageCode: 'en',
      sessionToken: this.generateSessionToken(), // Reuse per session
    },
    { headers: { 'X-API-Key': environment.googlePlacesApiKey } }
  ).pipe(
    map(response => response.predictions),
    debounceTime(300), // Rate-limit user typing
    catchError(() => of([]))
  );
}
```

**Source:** [Google Places Autocomplete (New)](https://developers.google.com/maps/documentation/places/web-service/place-autocomplete)

### Pattern 4: Stay Model Mapping
**What:** Transform Booking.com RapidAPI response to internal Stay model
**When to use:** HotelMapper implementation
**Example:**
```typescript
@Injectable({ providedIn: 'root' })
export class HotelMapper implements Mapper<BookingComHotel, Stay> {
  mapResponse(raw: BookingComHotel): Stay {
    return {
      id: raw.hotel_id.toString(),
      source: 'booking-com',
      addedToItinerary: false,
      name: raw.hotel_name,
      location: {
        latitude: parseFloat(raw.latitude),
        longitude: parseFloat(raw.longitude),
      },
      address: raw.address,
      checkIn: raw.checkin, // Assume API echoes search params
      checkOut: raw.checkout,
      pricePerNight: {
        total: parseFloat(raw.min_total_price) / this.calculateNights(raw.checkin, raw.checkout),
        currency: raw.currency_code,
      },
      rating: raw.review_score ? raw.review_score / 2 : null, // Convert 0-10 to 0-5
      link: {
        url: raw.url,
        provider: 'Booking.com',
      },
    };
  }

  private calculateNights(checkIn: string, checkOut: string): number {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }
}
```

**WARNING:** Booking.com response field names are **NOT VERIFIED**. This mapper assumes common field patterns based on research but requires validation against actual API responses.

### Anti-Patterns to Avoid
- **Hardcoding RapidAPI host in service code:** Host should come from environment/config, not service logic
- **Skipping destination geocoding:** Free-text city input without validation leads to API errors (destination ID required)
- **Direct Date objects in API params:** APIs require ISO 8601 strings (YYYY-MM-DD), not Date objects
- **Ignoring null rating values:** Not all hotels have ratings; UI must handle `rating: null` gracefully

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| **Destination autocomplete** | Custom city name database | Google Places API | Handles typos, international cities, geocoding, multiple languages; free tier sufficient for MVP |
| **Date range validation** | Custom checkin/checkout validator | Angular Material DatePicker with min/max/filter | Handles disabled dates, 500-day future limit, checkout > checkin constraint built-in |
| **RapidAPI header injection** | Per-service header logic | Modified apiKeyInterceptor | Centralized auth logic, avoids header duplication across services |
| **Session token generation** | Custom UUID logic | crypto.randomUUID() | Native browser API, cryptographically secure, no dependencies |

**Key insight:** Hotel search APIs have complex destination resolution (city names vs IDs, geocoding). Delegating this to Google Places API prevents building a city database, handling international names, and managing geolocation edge cases.

## Common Pitfalls

### Pitfall 1: RapidAPI Authentication Mismatch
**What goes wrong:** Requests to booking-com15.p.rapidapi.com receive 401/403 errors despite valid API key
**Why it happens:** Existing apiKeyInterceptor injects `X-API-Key` header, but RapidAPI requires `X-RapidAPI-Key` AND `X-RapidAPI-Host`
**How to avoid:** Modify apiKeyInterceptor to detect RapidAPI endpoints and inject both required headers:
```typescript
export const apiKeyInterceptor: HttpInterceptorFn = (req, next) => {
  const apiConfig = inject(ApiConfigService);
  const source = req.context.get(API_SOURCE);

  if (!source) return next(req);

  const key = apiConfig.getKey(source);
  if (!key) return next(req);

  // Check if this is a RapidAPI request
  if (req.url.includes('.rapidapi.com')) {
    const authReq = req.clone({
      headers: req.headers
        .set('X-RapidAPI-Key', key)
        .set('X-RapidAPI-Host', new URL(req.url).hostname),
    });
    return next(authReq);
  }

  // Standard X-API-Key for other APIs
  const authReq = req.clone({
    headers: req.headers.set('X-API-Key', key),
  });

  return next(authReq);
};
```
**Warning signs:** 401 Unauthorized or 403 Forbidden on first API test request

### Pitfall 2: Destination ID Resolution Gap
**What goes wrong:** User types "Paris" but API requires dest_id: "-2138025"
**Why it happens:** Booking.com API uses internal destination IDs, not city names
**How to avoid:** Implement two-step search:
  1. User types destination → call destination search/autocomplete endpoint
  2. User selects from results → capture dest_id, display city name
  3. Hotel search uses dest_id, not raw city name
**Warning signs:** API returns empty results or error for valid city names

### Pitfall 3: Date Format Inconsistency
**What goes wrong:** API rejects date parameters or returns unexpected results
**Why it happens:** Mixing Date objects, locale-formatted strings, and ISO 8601 strings
**How to avoid:** Always convert DatePicker values to YYYY-MM-DD before API call:
```typescript
const checkIn = formatDate(form.value.checkInDate, 'yyyy-MM-dd', 'en-US');
```
**Warning signs:** API errors mentioning date format, or dates shifted by timezone offset

### Pitfall 4: Rate Limit Exhaustion on Free Tier
**What goes wrong:** 500 requests/month consumed in days, API stops responding
**Why it happens:** Every destination autocomplete keystroke + every hotel search counts toward quota
**How to avoid:**
  - Debounce destination autocomplete (300ms minimum)
  - Cache destination search results client-side
  - Apply withBackoff() to retry on 429 responses
  - Monitor usage via RapidAPI dashboard
**Warning signs:** 429 Too Many Requests responses, quota warnings in RapidAPI dashboard

### Pitfall 5: Null Rating Handling
**What goes wrong:** UI crashes or displays "NaN stars" for hotels without ratings
**Why it happens:** Not all hotels have review scores; `rating: null` is valid
**How to avoid:** Template guards for null ratings:
```html
<div *ngIf="hotel.rating !== null" class="rating">
  {{ hotel.rating }} / 5 stars
</div>
<div *ngIf="hotel.rating === null" class="rating">
  No reviews yet
</div>
```
**Warning signs:** Template errors on hotels without ratings, "NaN" displayed in UI

## Code Examples

Verified patterns from official sources and existing codebase:

### Destination Autocomplete with Debouncing
```typescript
// hotel-search.component.ts
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

destinationInput$ = new Subject<string>();
destinationOptions$: Observable<DestinationOption[]>;

ngOnInit() {
  this.destinationOptions$ = this.destinationInput$.pipe(
    debounceTime(300), // Wait for user to stop typing
    distinctUntilChanged(), // Only if value changed
    switchMap(query => this.hotelApi.searchDestinations(query)),
    catchError(() => of([]))
  );
}

onDestinationInput(value: string) {
  this.destinationInput$.next(value);
}
```

### Hotel Search with Error Handling
```typescript
// hotel-api.service.ts - Following Phase 4 pattern
searchHotels(params: HotelSearchParams): Observable<ApiResult<Stay[]>> {
  return this.get<BookingComResponse>('/api/v1/hotels/searchHotels', {
    dest_id: params.destinationId,
    checkin_date: params.checkIn,
    checkout_date: params.checkOut,
    adults_number: params.adults,
    room_number: params.rooms,
  }).pipe(
    map(response => ({
      data: response.result.map(hotel => this.mapper.mapResponse(hotel)),
      error: null,
    })),
    catchError((error: AppError): Observable<ApiResult<Stay[]>> =>
      of({ data: [], error })
    ),
    withBackoff() // Exponential backoff from Phase 2
  );
}
```

### Date Range Validation
```typescript
// hotel-search.component.ts
import { FormControl, Validators } from '@angular/forms';

checkInControl = new FormControl('', [Validators.required]);
checkOutControl = new FormControl('', [Validators.required]);

// Angular Material DatePicker filter
dateFilter = (date: Date | null): boolean => {
  if (!date) return false;
  const today = new Date();
  const maxDate = new Date();
  maxDate.setDate(today.getDate() + 500); // Booking.com 500-day limit

  return date >= today && date <= maxDate;
};

// Validate checkout > checkin
validateCheckout(): void {
  const checkIn = this.checkInControl.value;
  const checkOut = this.checkOutControl.value;

  if (checkIn && checkOut && new Date(checkOut) <= new Date(checkIn)) {
    this.checkOutControl.setErrors({ beforeCheckIn: true });
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Google Places Autocomplete (Legacy) | Autocomplete (New) with session pricing | 2024 | Session-based pricing is currently free; new endpoint uses POST requests; supports more granular type filtering |
| Direct Booking.com API | Booking.com via RapidAPI aggregator | N/A (RapidAPI model) | RapidAPI provides proxy, rate limiting, and unified dashboard; direct API requires partnership agreement |
| SOAP/XML hotel APIs | RESTful JSON APIs | 2010s+ | Modern HTTP clients, type-safe TypeScript interfaces, Observable composition |
| Airport-style IATA codes for cities | Geocoding + destination IDs | Ongoing | Hotels don't have standardized codes like flights; each API uses proprietary destination identifiers |

**Deprecated/outdated:**
- Google Places Autocomplete (Legacy): Still works but lacks session pricing benefits; migrate to Autocomplete (New)
- X-API-Key for RapidAPI: RapidAPI requires X-RapidAPI-Key and X-RapidAPI-Host, not generic X-API-Key

## Open Questions

### 1. What is the exact Booking.com RapidAPI endpoint structure?
**What we know:**
- Base URL: `https://booking-com15.p.rapidapi.com` (verified in proxy.conf.json)
- Proxy path: `/api/hotels` → strips to `/` then appends relative path
- Endpoints mentioned in research: `properties/list-by-map`, `properties/get-featured-reviews`
- **NOT VERIFIED:** Actual search endpoint paths, parameter names, response schemas

**What's unclear:**
- Is the hotel search endpoint `/properties/list`, `/properties/search`, `/hotels/search`, or something else?
- What parameters are required vs optional?
- What is the exact response JSON structure and field names?

**Recommendation:**
- **CRITICAL PRE-PLANNING TASK:** Log into RapidAPI dashboard, navigate to booking-com15 API, test endpoints via playground
- Document actual endpoint paths, required parameters, response structure
- Update HotelApiService and HotelMapper with verified data before implementation

**Sources for verification:**
- [RapidAPI Booking.com15 Playground](https://rapidapi.com/DataCrawler/api/booking-com15/playground)
- [RapidAPI Booking.com15 Documentation](https://rapidapi.com/DataCrawler/api/booking-com15)

### 2. Does Booking.com RapidAPI provide a destination search endpoint?
**What we know:**
- Google Places API can provide city autocomplete with geocoding
- Some hotel APIs have dedicated destination search endpoints (e.g., Amadeus Hotel Name Autocomplete)
- Research found references to Booking.com destination search but no verified endpoint

**What's unclear:**
- Does booking-com15 have a `/destinations/search` or similar endpoint?
- If yes, does it return dest_id values compatible with hotel search?
- If no, is Google Places API the recommended approach?

**Recommendation:**
- Check RapidAPI dashboard for destination/location search endpoints
- If exists: Use Booking.com's own destination search (reduces external dependencies)
- If not: Use Google Places API with `includedPrimaryTypes: ['(cities)']` filter
- Phase 05-02 plan should document the chosen approach and justify it

### 3. How should the interceptor handle mixed API authentication?
**What we know:**
- Amadeus uses OAuth2 Bearer tokens (handled in FlightApiService directly, bypassing interceptor)
- Booking.com/Cars RapidAPI use X-RapidAPI-Key + X-RapidAPI-Host headers
- Other future APIs may use X-API-Key or other auth schemes

**What's unclear:**
- Should apiKeyInterceptor become a multi-strategy interceptor (RapidAPI vs standard)?
- Should RapidAPI get a separate rapidApiKeyInterceptor?
- How to determine which strategy to use (URL pattern matching, API_SOURCE value, config flag)?

**Recommendation:**
- **SHORT-TERM:** Modify apiKeyInterceptor to detect `.rapidapi.com` in URL and inject RapidAPI headers
- **LONG-TERM:** Consider splitting into separate interceptors if more auth strategies emerge
- Document the detection logic clearly for future API integrations

### 4. What is the actual free tier rate limit for booking-com15?
**What we know:**
- Research found references to "500 requests/month" for free tier
- RapidAPI general free tier is sometimes 1,000 requests/month
- Rate limits vary by API and plan

**What's unclear:**
- Is the booking-com15 free tier 500 or 1,000 requests/month?
- Does destination search count separately from hotel search?
- What is the rate limit window (per second, per minute, per month)?

**Recommendation:**
- Verify exact rate limits in RapidAPI dashboard under booking-com15 pricing tab
- Document limits in PLAN.md for 05-01
- Plan withBackoff() retry strategy based on verified limits
- Consider caching strategies if limits are restrictive

## Sources

### Primary (HIGH confidence)
- [RapidAPI Authentication Documentation](https://docs.rapidapi.com/docs/configuring-api-authentication) - RapidAPI header requirements verified
- [Google Places Autocomplete (New)](https://developers.google.com/maps/documentation/places/web-service/place-autocomplete) - Autocomplete endpoint and session pricing
- Existing codebase:
  - `triply/src/proxy.conf.json` - Hotels proxy configuration verified
  - `triply/src/app/core/api/api-config.service.ts` - API registration verified
  - `triply/src/app/core/api/base-api.service.ts` - BaseApiService pattern verified
  - `triply/src/app/core/models/trip.models.ts` - Stay model structure verified
  - `triply/src/app/core/services/trip-state.service.ts` - addStay/removeStay methods verified
  - `triply/src/app/core/api/flight-api.service.ts` - Phase 4 pattern reference

### Secondary (MEDIUM confidence)
- [RapidAPI Booking.com15 API Page](https://rapidapi.com/DataCrawler/api/booking-com15) - Endpoint names mentioned but not detailed
- [Google Places Autocomplete Hotel Search Example](https://developers.google.com/maps/documentation/javascript/examples/places-autocomplete-hotelsearch) - UI pattern reference
- [Free & Paid Hotel APIs 2026 Booking, Prices, Integrations](https://phptravels.com/wp/what-is-a-hotel-api-and-why-does-it-matter/) - Market overview
- [Top Hotel APIs](https://rapidapi.com/collection/hotels-apis) - RapidAPI hotel API collection

### Tertiary (LOW confidence - requires verification)
- WebSearch results mentioning 500 requests/month free tier - not officially verified
- WebSearch results mentioning `properties/list-by-map` endpoint - name verified but parameters/response NOT verified
- Assumed response field names in HotelMapper example - **MUST be verified via API testing**

## Metadata

**Confidence breakdown:**
- Standard stack: **MEDIUM** - Booking.com RapidAPI proxy verified in codebase, endpoint details NOT verified; Google Places API well-documented
- Architecture: **HIGH** - BaseApiService pattern established in Phase 4, Stay model defined, TripStateService methods exist
- Pitfalls: **MEDIUM** - RapidAPI auth requirements verified, date/destination pitfalls inferred from common API patterns
- Code examples: **MEDIUM** - Patterns follow verified Phase 4 structure, but API-specific details (endpoint paths, response fields) are hypothetical

**Research date:** 2026-02-12
**Valid until:** 2026-03-14 (30 days - hotel APIs are stable, but RapidAPI plans may change)

## Critical Pre-Planning Action Required

**BEFORE creating 05-01-PLAN.md, the planner or developer MUST:**

1. Access RapidAPI dashboard: https://rapidapi.com/DataCrawler/api/booking-com15
2. Test endpoints via playground (look for hotel search, destination search)
3. Document:
   - Exact endpoint paths (e.g., `/api/v1/hotels/search` or `/properties/list`)
   - Required parameters (dest_id format, date formats, guest counts)
   - Optional parameters (filters, sorting, pagination)
   - Response JSON structure (field names: hotel_name vs hotelName vs name)
   - Rate limits and pricing tiers
4. Update this RESEARCH.md with verified information
5. Proceed with planning using real endpoint data

**Without this verification, implementation will fail at first API call.**
