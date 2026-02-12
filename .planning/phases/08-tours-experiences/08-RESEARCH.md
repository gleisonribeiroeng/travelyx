# Phase 8: Tours & Experiences - Research

**Researched:** 2026-02-12
**Domain:** Tours and activities API integration (Viator Partner API)
**Confidence:** MEDIUM

## Summary

Phase 8 implements tours and experiences search functionality following the exact pattern established in Phases 4-7. The primary recommendation is Viator Partner API, which requires a partnership application with potential lead time but offers comprehensive tours/activities data with good sandbox testing support.

The implementation follows the project's established architecture: TourApiService extending BaseApiService, TourMapper for response transformation, standalone search component with reactive forms and signals, and integration with TripStateService.addActivity() for itinerary management. The Activity model already exists and matches Viator's product structure.

**Critical blocker:** Viator Partner API requires formal partner application and approval before production access. Sandbox environment (api.sandbox.viator.com) is available immediately for testing, but production API key requires onboarding process with potential lead time. Alternative is Amadeus Tours and Activities API which offers free monthly quota and immediate sandbox access.

**Primary recommendation:** Start with Viator sandbox for development (follows proxy config), apply for partnership early, implement with fallback structure allowing API provider swap if approval delays occur.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Viator Partner API | v2 | Tours/activities search and product data | Industry-leading inventory (500k+ products), well-documented REST API, comprehensive product metadata |
| Angular HttpClient | 19.x | HTTP requests via BaseApiService | Project standard, already integrated with proxy and interceptors |
| RxJS | 7.x | Async data flow with retry/error handling | Project standard, withBackoff() and ApiResult<T> pattern established |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Angular Signals | 19.x | State management in component | All search features use signals (searchResults, isSearching, hasSearched) |
| Angular Reactive Forms | 19.x | Search form with validation | Standard for all search components (consistent UX) |
| Material Components | 19.x | UI via MATERIAL_IMPORTS | Project design system (cards, buttons, form controls, progress) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Viator API | GetYourGuide Partner API | Similar features, potentially easier approval but smaller inventory |
| Viator API | Amadeus Tours & Activities API | Free monthly quota, immediate access, but limited to 120k products vs Viator's 500k+ |
| Viator API | Custom aggregator (Bridgify) | Multi-source data but adds complexity, multiple API keys, inconsistent schemas |

**Installation:**
```bash
# No new npm packages required
# All dependencies already installed in Phases 4-7
# API access requires partner application to Viator
```

## Architecture Patterns

### Recommended Project Structure
```
src/app/
├── core/
│   ├── api/
│   │   ├── tour-api.service.ts      # NEW: Extends BaseApiService('tours')
│   │   ├── tour.mapper.ts           # NEW: Maps Viator products to Activity model
│   │   ├── base-api.service.ts      # EXISTING: Provides get/post with API_SOURCE context
│   │   ├── retry.utils.ts           # EXISTING: withBackoff() operator
│   │   └── api-error.utils.ts       # EXISTING: ApiResult<T> discriminated union
│   ├── models/
│   │   └── trip.models.ts           # EXISTING: Activity interface already defined
│   └── services/
│       └── trip-state.service.ts    # EXISTING: addActivity() method exists
└── features/
    └── tour-search/                 # NEW: Feature module
        ├── tour-search.component.ts
        ├── tour-search.component.html
        └── tour-search.component.scss
```

### Pattern 1: TourApiService with Viator Integration
**What:** Service extending BaseApiService for Viator Partner API /products/search endpoint
**When to use:** Tours search by destination (Phase 8 requirement TOUR-01)
**Example:**
```typescript
// Source: Project pattern from TransportApiService + Viator API docs
@Injectable({ providedIn: 'root' })
export class TourApiService extends BaseApiService {
  private readonly mapper = inject(TourMapper);

  constructor() {
    super('tours'); // Maps to /api/tours proxy -> https://api.viator.com
  }

  /**
   * Search tours/activities by destination using Viator /products/search
   * Endpoint: POST /partner/products/search
   * Auth: X-API-Key header via apiKeyInterceptor
   */
  searchTours(params: TourSearchParams): Observable<ApiResult<Activity[]>> {
    return this.post<ViatorSearchResponse>('/partner/products/search', {
      filtering: {
        destination: params.destination, // Free text or destId
      },
      pagination: {
        offset: 0,
        limit: 20, // Results per page
      },
      sorting: {
        sort: 'REVIEW_AVG_RATING_D', // Highest rated first
      },
    }).pipe(
      withBackoff(),
      map((response): ApiResult<Activity[]> => {
        const products = response.products || [];
        return {
          data: products.map(p => this.mapper.mapResponse(p, params)),
          error: null,
        };
      }),
      catchError((error: AppError): Observable<ApiResult<Activity[]>> =>
        of({ data: [], error })
      ),
    );
  }
}
```

### Pattern 2: TourMapper for Viator Product Response
**What:** Injectable mapper transforming Viator product schema to Activity model
**When to use:** Every Viator API response requires normalization to canonical model
**Example:**
```typescript
// Source: Project pattern from TransportMapper + Viator product structure
export interface ViatorProduct {
  productCode: string;
  title: string;
  description?: string;
  images?: Array<{ variants: Array<{ url: string }> }>;
  pricing?: {
    summary?: {
      fromPrice?: number;
      fromPriceBeforeDiscount?: number;
    };
    currency?: string;
  };
  bookingInfo?: {
    bookingUrl?: string;
  };
  location?: {
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  duration?: {
    fixedDurationInMinutes?: number;
  };
}

@Injectable({ providedIn: 'root' })
export class TourMapper {
  mapResponse(raw: ViatorProduct, params: TourSearchParams): Activity {
    return {
      id: raw.productCode || crypto.randomUUID(),
      source: 'tours',
      addedToItinerary: false,
      name: raw.title || 'Untitled Tour',
      description: raw.description || '',
      location: {
        latitude: raw.location?.latitude || 0,
        longitude: raw.location?.longitude || 0,
      },
      city: params.destination, // Fallback to search destination
      durationMinutes: raw.duration?.fixedDurationInMinutes || null,
      price: {
        total: raw.pricing?.summary?.fromPrice || 0,
        currency: raw.pricing?.currency || 'USD',
      },
      link: {
        url: raw.bookingInfo?.bookingUrl || '#',
        provider: 'Viator',
      },
    };
  }
}
```

### Pattern 3: Tour Search Component with Signals
**What:** Standalone component with reactive form, signal state, and Material UI
**When to use:** All search features (Phases 4-9 established pattern)
**Example:**
```typescript
// Source: Project pattern from TransportSearchComponent
@Component({
  selector: 'app-tour-search',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule],
  templateUrl: './tour-search.component.html',
})
export class TourSearchComponent {
  private readonly tourApi = inject(TourApiService);
  private readonly tripState = inject(TripStateService);
  private readonly snackBar = inject(MatSnackBar);

  searchForm = new FormGroup({
    destination: new FormControl('', Validators.required),
  });

  searchResults = signal<Activity[]>([]);
  isSearching = signal(false);
  hasSearched = signal(false);

  searchTours(): void {
    if (this.searchForm.invalid) return;

    const destination = this.searchForm.value.destination ?? '';
    this.isSearching.set(true);
    this.hasSearched.set(true);

    this.tourApi.searchTours({ destination })
      .pipe(finalize(() => this.isSearching.set(false)))
      .subscribe({
        next: (result) => {
          if (result.error) {
            this.snackBar.open('Failed to search tours. Please try again.', 'Close', { duration: 3000 });
            this.searchResults.set([]);
          } else {
            this.searchResults.set(result.data);
          }
        },
      });
  }

  addToItinerary(tour: Activity): void {
    this.tripState.addActivity({ ...tour, addedToItinerary: true });
    this.snackBar.open('Tour added to itinerary', 'Close', { duration: 3000 });
  }
}
```

### Anti-Patterns to Avoid
- **DON'T use /products/bulk for real-time search:** Bulk endpoints are for data ingestion only (caching product catalog). Use /products/search for user-initiated searches. Violating this may result in API access shutdown.
- **DON'T skip destination ID lookup if using destId:** Viator destinations have numeric IDs (use /taxonomy/destinations to retrieve). Free text search is simpler for MVP (destination name string).
- **DON'T implement booking flow in Phase 8:** Requirements are search + add to itinerary only. External provider redirect (link.url) is sufficient. Booking requires merchant partner status and certification.
- **DON'T forget addedToItinerary flag:** When calling addActivity(), spread the tour and override `addedToItinerary: true` to maintain consistency with other features.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tours/activities data scraping | Custom web scraper for TripAdvisor/Viator | Viator Partner API or Amadeus API | Legal compliance (TOS violations), data freshness (prices change hourly), scale (500k+ products), reliability (schema changes break scrapers) |
| Destination geocoding | Manual lat/lng lookup service | Existing Google Places API (already configured) or Viator's location data | Viator products include coordinates, Google Places autocomplete already integrated in Phase 2 proxy config |
| Duration string parsing | Regex for every format variant | Mapper with standard cases (ISO 8601 PT format, "Xh Ym" pattern) | Viator uses fixedDurationInMinutes (number) or flexible duration (null). Simple null-safe access, not complex parsing |
| Rate limit retry logic | Custom retry with setTimeout | withBackoff() operator (already implemented) | Exponential backoff for 429/502/503/504, immediate fail for 4xx errors. Battle-tested pattern from Phases 4-7 |

**Key insight:** Tours/activities APIs are complex (legal agreements, certification, rate limits, schema variations). Partner APIs exist specifically to handle this complexity. Custom solutions risk legal issues, data staleness, and API bans.

## Common Pitfalls

### Pitfall 1: Assuming Immediate API Access
**What goes wrong:** Viator Partner API requires formal application and onboarding with TripAdvisor/Viator team. Production API key is NOT instant.
**Why it happens:** Documentation is public, sandbox is available, so developers assume API key works like RapidAPI (instant signup).
**How to avoid:**
1. Apply for partnership IMMEDIATELY (email: affiliateapi@tripadvisor.com)
2. Use sandbox environment (api.sandbox.viator.com) for development
3. Implement API provider abstraction (TourApiService) allowing swap to Amadeus if approval delays
4. Set expectation: 1-2 weeks for basic affiliate access, longer for merchant access
**Warning signs:** "Invalid API key" errors in production, no response from partner team after 3 days, certification requirements blocking launch

### Pitfall 2: Misusing Bulk Endpoints for Search
**What goes wrong:** Using /products/bulk or /availability/schedules/bulk in real-time triggers rate limit blocks or API suspension.
**Why it happens:** Bulk endpoints appear in docs, developers think "bulk = better performance for multiple results".
**How to avoid:**
1. Use /products/search for user-initiated searches (20 results per request, paginated)
2. Reserve bulk endpoints for nightly ingestion IF building local product cache (advanced, not Phase 8)
3. Follow Viator's update frequency rules: never more than 1 request per 10 seconds for bulk
4. Monitor API response headers for rate limit warnings
**Warning signs:** 429 Too Many Requests, API onboarding team emails about excessive calls, responses slowing down

### Pitfall 3: Missing Destination ID vs Free Text Search
**What goes wrong:** Searching by city name "Paris" returns no results because API expects destId: 235 (Paris numeric ID).
**Why it happens:** Viator docs show both approaches, unclear which is required vs optional.
**How to avoid:**
1. For MVP: Use free text search (filtering.destination: "Paris") - simpler, works immediately
2. For optimization: Call /taxonomy/destinations once on app init, cache destination mappings
3. Provide autocomplete using cached destination names, submit destId on search
4. Fallback: If destId search fails, retry with free text
**Warning signs:** Zero results for valid cities, inconsistent search behavior, users typing "New York" but needing "New York City"

### Pitfall 4: Ignoring Booking URL Expiry
**What goes wrong:** Storing Viator booking URLs in itinerary, users click days later and get "product unavailable" errors.
**Why it happens:** Booking URLs may include session tokens or time-limited parameters.
**How to avoid:**
1. Store productCode only in Activity model, NOT full booking URL
2. Generate fresh booking URL when user clicks "Book on Viator" (call /products/{productCode} for current URL)
3. Alternative: Use generic Viator product URL pattern: https://www.viator.com/tours/{productCode}
4. Document that external links are "best effort" - provider may change URLs
**Warning signs:** Users reporting "link doesn't work", 404s on Viator site, booking URLs with ?sessionId= or ?exp= parameters

### Pitfall 5: Not Handling Variable Duration Products
**What goes wrong:** Displaying "Duration: NaN hours" or crashes when duration is null/undefined.
**Why it happens:** Some tours have flexible duration (walking tours, multi-day packages) - Viator returns null for fixedDurationInMinutes.
**How to avoid:**
1. Activity model has durationMinutes: number | null (already correct)
2. In template: `{{ tour.durationMinutes ? formatDuration(tour.durationMinutes) : 'Flexible' }}`
3. In mapper: Safe access raw.duration?.fixedDurationInMinutes || null (NOT || 0, that hides nulls)
4. Sort by duration: Filter out nulls first, or treat null as Infinity
**Warning signs:** Template errors "Cannot read property 'toString' of null", duration showing "0 minutes" for multi-day tours

## Code Examples

Verified patterns from official sources:

### Viator API Search Request (POST /partner/products/search)
```typescript
// Source: Viator Partner API documentation
// https://partnerresources.viator.com/travel-commerce/affiliate/search-api/

interface ViatorSearchRequest {
  filtering?: {
    destination?: string;           // Free text: "Paris" or "New York"
    destId?: number;                // Numeric ID: 235 (Paris), 684 (NYC)
    startDate?: string;             // YYYY-MM-DD (optional, for availability filter)
    endDate?: string;               // YYYY-MM-DD
    tags?: number[];                // Category IDs (e.g. 19 = "Food & Drink")
    flags?: string[];               // "FREE_CANCELLATION", "SKIP_THE_LINE"
    priceRange?: {
      from?: number;
      to?: number;
    };
  };
  pagination?: {
    offset: number;                 // Start index (0-based)
    limit: number;                  // Results per page (max 100, recommend 20)
  };
  sorting?: {
    sort: 'REVIEW_AVG_RATING_D' |   // Highest rated
          'PRICE_FROM_A' |          // Cheapest first
          'PRICE_FROM_D' |          // Most expensive first
          'TOP_SELLERS';            // Viator recommended
  };
}

// Example request body
const requestBody = {
  filtering: {
    destination: "Paris",
    flags: ["FREE_CANCELLATION"],
  },
  pagination: {
    offset: 0,
    limit: 20,
  },
  sorting: {
    sort: "REVIEW_AVG_RATING_D",
  },
};
```

### Viator API Authentication
```typescript
// Source: Viator Partner API technical guide
// https://docs.viator.com/partner-api/technical/

// Authentication uses X-API-Key header (handled by apiKeyInterceptor)
// BaseApiService automatically sets API_SOURCE context token
// Interceptor reads environment.toursApiKey and injects header

// NO ACTION NEEDED in TourApiService - BaseApiService handles this
// Proxy config already set: /api/tours -> https://api.viator.com
```

### Handle Null Duration Safely
```typescript
// Source: Project pattern + Viator schema
// Template helper for displaying duration

formatDuration(minutes: number | null): string {
  if (minutes === null) {
    return 'Flexible duration';
  }

  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// In template
<p>Duration: {{ tour.durationMinutes !== null ? formatDuration(tour.durationMinutes) : 'Flexible' }}</p>
```

### External Provider Link Pattern
```typescript
// Source: Activity model + project requirements
// TOUR-03: External provider redirect link

// In result card template
<a
  [href]="tour.link.url"
  target="_blank"
  rel="noopener noreferrer"
  mat-raised-button
  color="primary"
>
  Book on {{ tour.link.provider }}
  <mat-icon>open_in_new</mat-icon>
</a>

// Security: rel="noopener noreferrer" prevents tabnabbing
// UX: mat-icon indicates external link
// Accessibility: Link text includes provider name
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Viator XML API | Viator Partner API v2 (REST/JSON) | 2020 | Simpler integration, better performance, modern auth (API key vs SOAP credentials) |
| Product ingestion required | /products/search real-time | 2022 | Faster implementation (no local database), always fresh prices/availability |
| Basic/Advanced Access tiers | Basic/Full/Booking Affiliate levels | 2024 | Clearer feature gates, free upgrade path for high-traffic partners |
| retryWhen() operator | retry({ count, delay }) | RxJS 7.3 (2021) | More readable backoff logic, better TypeScript inference |

**Deprecated/outdated:**
- **Viator XML SOAP API:** Replaced by REST API v2. Old integrations still work but no new features/support.
- **affiliate/product endpoint:** Use /partner/products/search instead. Old endpoint lacks filtering/sorting options.
- **RxJS retryWhen():** Deprecated in RxJS 7.0+, use retry({ delay }) with modern API (project already uses this).

## Open Questions

1. **What is the actual Viator partner approval timeline?**
   - What we know: Requires application, certification for booking features, sandbox available immediately
   - What's unclear: Time from application to production API key (1 week? 1 month?)
   - Recommendation: Apply ASAP, implement with sandbox, have Amadeus as fallback plan. Email affiliateapi@tripadvisor.com for timeline estimate.

2. **Should we implement destination ID lookup or use free text?**
   - What we know: destId is more precise (numeric ID), free text is simpler (city name string), both work
   - What's unclear: Performance difference, edge cases where one fails and other succeeds
   - Recommendation: Start with free text (MVP simplicity), add destId lookup as optimization if search quality issues arise.

3. **Do we need product caching for Phase 8?**
   - What we know: Bulk endpoints support ingestion, /products/search is real-time, search results are short-lived
   - What's unclear: Rate limits on /products/search for high-traffic scenarios
   - Recommendation: NO caching for Phase 8. Real-time search is simpler, faster to implement, sufficient for MVP traffic. Add caching only if rate limits become blocker.

4. **Should tour results show availability or just products?**
   - What we know: Activity model has no availability fields, /products/search returns product summaries (not availability)
   - What's unclear: User expectation - do they want "available tomorrow" or just "tours in Paris"?
   - Recommendation: Phase 8 shows products only (matches current Activity model). Availability requires date input + /availability/check calls (out of scope).

## Sources

### Primary (HIGH confidence)
- [Viator Partner API Technical Documentation](https://docs.viator.com/partner-api/technical/) - Official API specification, endpoint schemas, authentication guide
- [Viator Partner Resource Center - Technical Guide](https://partnerresources.viator.com/travel-commerce/technical-guide/) - Implementation patterns, best practices, certification requirements
- [Viator API Search Documentation](https://partnerresources.viator.com/travel-commerce/affiliate/search-api/) - /products/search endpoint details, filtering/sorting options
- Project codebase - TransportApiService, TransportMapper, transport-search.component.ts patterns (Phases 4-7 established architecture)

### Secondary (MEDIUM confidence)
- [Viator Partner Certification Requirements](https://partnerresources.viator.com/travel-commerce/certification/) - Verified via official docs, details merchant vs affiliate access levels
- [Viator Sandbox Environment Guide](https://partnerhelp.viator.com/en/articles/139-what-are-the-differences-between-the-sandbox-and-production-environments) - Sandbox API endpoint, demo booking headers
- [Amadeus Tours and Activities API](https://developers.amadeus.com/self-service/category/destination-experiences/api-doc/tours-and-activities) - Alternative provider option, free tier confirmed
- [GetYourGuide API Reference](https://code.getyourguide.com/partner-api-spec/) - Backup alternative, smaller inventory than Viator

### Tertiary (LOW confidence - requires validation)
- WebSearch results on Viator integration pitfalls - Common errors mentioned (booking timeouts, ticket type mismatches) but not verified in official docs
- Third-party integration tutorials (Adivaha, TripWorks, Technosoftwares) - General guidance but may be outdated, defer to official Viator docs for accuracy
- Angular tour libraries (Intro.js, Shepherd) - UNRELATED to tours/activities feature (these are UI walkthroughs, not travel tours)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Viator API is industry standard, project architecture patterns proven in Phases 4-7
- Architecture: HIGH - Direct replication of TransportApiService/TransportMapper pattern with Viator-specific schemas
- Pitfalls: MEDIUM - Official docs confirm bulk endpoint restrictions and booking URL concerns, but approval timeline is uncertain

**Research date:** 2026-02-12
**Valid until:** 30 days (2026-03-14) - Viator API is stable, core patterns won't change, but verify partner application process timeline before Phase 8 execution
