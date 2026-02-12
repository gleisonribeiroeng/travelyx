# Phase 9: Attractions - Research

**Researched:** 2026-02-12
**Domain:** OpenTripMap API integration for tourist attraction discovery
**Confidence:** MEDIUM

## Summary

Phase 9 implements tourist attraction search using the OpenTripMap API, following the established pattern from Phases 4-8 (flights, stays, cars, transport, tours). OpenTripMap provides access to over 10 million tourist attractions and facilities worldwide via a free API with simple query parameter authentication. The integration requires a two-step search flow: (1) convert city name to coordinates via `/places/geoname`, (2) fetch nearby attractions via `/places/radius`, then optionally (3) fetch detailed info including descriptions and external links via `/places/xid/{xid}`.

Key differences from prior phases: Attraction.link is nullable (not all attractions have official websites), no price field (attractions are free informational listings), and the category field enables optional filtering/display. The proxy is already configured, API key slot exists in environment.ts, and TripStateService.addAttraction() is implemented.

**Primary recommendation:** Use a three-endpoint pattern (geoname → radius → xid details) with defensive null-handling for the link field. Follow existing BaseApiService + Mapper + standalone component architecture. Handle nullable links in UI via conditional `@if` blocks or disabled button states.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| OpenTripMap API | v0.1 | Global POI/attraction database | Free tier available, 10M+ attractions, open data license |
| Angular HttpClient | 18.x | HTTP requests via BaseApiService | Project standard for all API integrations |
| RxJS | 7.x | Observable streams with retry/backoff | Required for Angular HTTP, project uses withBackoff() |
| Angular Signals | 18.x | Reactive state management | Project-wide decision, no NgRx |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Angular Material | 18.x | UI components (cards, buttons, forms) | All feature components use MATERIAL_IMPORTS |
| Angular Reactive Forms | 18.x | Form controls with validation | All search features use reactive forms |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| OpenTripMap | Foursquare Places API | Foursquare has richer commercial data but requires business API access; OpenTripMap is free with open data |
| Two-step search (geoname + radius) | Google Places API autocomplete | Google Places is more accurate but costs money; OpenTripMap is free but requires coordinate conversion |
| Three-endpoint pattern | Cache geoname results | Reduces API calls but adds complexity; project requirement is "CORS status must be validated live" suggesting live API priority |

**Installation:**
```bash
# No new dependencies required - existing Angular HTTP stack
# Only need to configure OpenTripMap API key in environment.development.ts
```

## Architecture Patterns

### Recommended Project Structure
```
src/app/
├── core/
│   ├── api/
│   │   ├── attraction-api.service.ts    # NEW: OpenTripMap HTTP client
│   │   ├── attraction.mapper.ts         # NEW: Maps OpenTripMap responses to Attraction model
│   │   └── ...
│   └── models/
│       └── trip.models.ts               # EXISTS: Attraction interface already defined
└── features/
    └── attraction-search/               # NEW: Feature directory
        ├── attraction-search.component.ts
        ├── attraction-search.component.html
        └── attraction-search.component.scss
```

### Pattern 1: Three-Endpoint Search Flow

**What:** OpenTripMap requires coordinate-based search, so city name must be converted to lat/lon first, then attractions fetched, then optionally enriched with details.

**When to use:** Every attraction search by city name

**Example:**
```typescript
// Step 1: Convert city name to coordinates
searchAttractions(cityName: string): Observable<ApiResult<Attraction[]>> {
  return this.getGeoname(cityName).pipe(
    switchMap((geonameResult) => {
      if (geonameResult.error || !geonameResult.data) {
        return of({ data: [], error: geonameResult.error });
      }
      // Step 2: Fetch attractions in radius around coordinates
      return this.getRadius(
        geonameResult.data.lat,
        geonameResult.data.lon,
        params.radius || 5000
      );
    }),
    // Step 3 (optional): Enrich with place details for descriptions/links
    switchMap((radiusResult) => {
      if (radiusResult.error || radiusResult.data.length === 0) {
        return of(radiusResult);
      }
      return this.enrichWithDetails(radiusResult.data);
    })
  );
}
```

### Pattern 2: Nullable Link Handling

**What:** Attraction.link is `ExternalLink | null` (unlike other models where link is always present). UI must handle both cases.

**When to use:** Template rendering for "View official site" action

**Example:**
```html
<!-- Option 1: Conditional rendering -->
@if (attraction.link !== null) {
  <a mat-button [href]="attraction.link.url" target="_blank">
    <mat-icon>open_in_new</mat-icon>
    View Official Site
  </a>
}

<!-- Option 2: Disabled state -->
<button
  mat-button
  [disabled]="attraction.link === null"
  [attr.href]="attraction.link?.url"
  target="_blank">
  <mat-icon>open_in_new</mat-icon>
  {{ attraction.link ? 'View Official Site' : 'No Official Site' }}
</button>
```

### Pattern 3: Category Display/Filtering

**What:** Attraction.category is a string field (e.g., "cultural", "historic", "natural"). Can be displayed as metadata or used for client-side filtering.

**When to use:** Result cards and optional filter UI

**Example:**
```typescript
// Computed signal for filtered results
filteredResults = computed(() => {
  const results = this.searchResults();
  const categoryFilter = this.selectedCategory(); // signal<string | null>

  if (!categoryFilter) return results;

  return results.filter(attr =>
    attr.category.toLowerCase().includes(categoryFilter.toLowerCase())
  );
});
```

```html
<!-- Display category in card -->
<div class="attraction-meta">
  <mat-chip>{{ attraction.category }}</mat-chip>
  <span>{{ attraction.city }}</span>
</div>
```

### Pattern 4: Per-Source Error Isolation

**What:** All API calls use `catchError` to return `ApiResult<T>` discriminated union, never throw. Follows Phase 2 requirement.

**When to use:** Every observable in AttractionApiService

**Example:**
```typescript
// Source: Existing pattern from tour-api.service.ts
getRadius(lat: number, lon: number, radius: number): Observable<ApiResult<Attraction[]>> {
  return this.get<any>('/0.1/en/places/radius', {
    lat: lat.toString(),
    lon: lon.toString(),
    radius: radius.toString(),
    apikey: 'key-injected-by-interceptor',
  }).pipe(
    withBackoff(),
    map((response): ApiResult<Attraction[]> => {
      const features = response.features || response || [];
      const attractions = Array.isArray(features) ? features : [];
      return {
        data: attractions.map(f => this.mapper.mapResponse(f)),
        error: null,
      };
    }),
    catchError((error: AppError): Observable<ApiResult<Attraction[]>> =>
      of({ data: [], error })
    ),
  );
}
```

### Anti-Patterns to Avoid

- **Hardcoding API key in service:** Use apiKeyInterceptor via BaseApiService — API key is injected automatically when API_SOURCE context is set
- **Throwing errors from API methods:** Always return `ApiResult<T>` with `{ data, error }` structure
- **Using `|| null` for nullable numbers:** Use `?? null` to avoid 0 being treated as falsy (lesson from Phase 8 TourMapper.durationMinutes)
- **Blocking on missing link:** UI must gracefully handle `link: null` — don't assume every attraction has an external URL
- **Single API call assumption:** OpenTripMap requires multi-step flow (geoname → radius → optional details) — plan for chained observables

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP retry with backoff | Custom retry logic | `withBackoff()` from retry.utils | Already implemented, handles rate limits correctly |
| API error handling | Try-catch in service | `ApiResult<T>` discriminated union with catchError | Project standard from Phase 2, provides type-safe error state |
| State management | Custom Observable store | Angular Signals + TripStateService | Project decision, already has addAttraction() method |
| Form validation | Manual input checks | Angular Reactive Forms with Validators | All search features use this pattern |
| Coordinate geocoding | Custom geocoding service | OpenTripMap `/places/geoname` endpoint | Built into the API, free, handles fuzzy city name matching |
| Result caching | LocalStorage caching | Live API calls with per-request caching only | Project requirement: "CORS status must be validated live" |

**Key insight:** OpenTripMap's multi-endpoint flow (geoname → radius → details) is non-obvious but required — don't try to bypass it with single-call solutions. The API doesn't support direct city-name searches; coordinate conversion is mandatory.

## Common Pitfalls

### Pitfall 1: Assuming Single-Step Search

**What goes wrong:** Developer tries to search attractions by city name directly, gets 400/404 errors because OpenTripMap doesn't have a city-name search endpoint.

**Why it happens:** Other APIs (Google Places, Foursquare) support direct city searches. OpenTripMap is coordinate-based only.

**How to avoid:** Always use two-step flow: (1) `GET /places/geoname?name=Paris` to get coordinates, (2) `GET /places/radius?lat=X&lon=Y` to get attractions. Plan for `switchMap` chaining in the service.

**Warning signs:** API errors with "missing lat/lon parameters" or "invalid search query"

### Pitfall 2: Not Handling Null Links

**What goes wrong:** Template assumes `attraction.link.url` always exists, causes runtime error "Cannot read property 'url' of null"

**Why it happens:** Attraction is the only model where link is nullable. Other models (Flight, Stay, CarRental, Transport, Activity) have non-null links, so templates use `tour.link.url` without guards.

**How to avoid:** Always use `@if (attraction.link !== null)` before rendering link-dependent UI, or use optional chaining `attraction.link?.url` with fallback states.

**Warning signs:** Console errors when rendering results, blank cards, or "No official site" displayed for all results

### Pitfall 3: API Key Not Passed Correctly

**What goes wrong:** Requests return 401/403 errors even though API key is configured in environment.ts

**Why it happens:** OpenTripMap uses query parameter `apikey` (lowercase), not HTTP headers. But apiKeyInterceptor injects `X-API-Key` header. Need to verify if query param or header is required.

**How to avoid:** Research blocker flagged: "CORS status and access model for OpenTripMap must be validated live." Test with real API key to confirm authentication method. If query param is required, override BaseApiService.get() or add manual param.

**Warning signs:** 401/403 responses, "API key invalid" errors, CORS errors (may indicate auth header rejection)

### Pitfall 4: Ignoring Category Field

**What goes wrong:** All attractions look identical in UI, users can't distinguish between museums, parks, monuments, etc.

**Why it happens:** Category is a new field not present in Activity/Tour models. Developers may copy tour-search template without utilizing category metadata.

**How to avoid:** Display category in result cards using mat-chip or icon mapping. Optionally add client-side filtering by category using computed signals.

**Warning signs:** User feedback: "How do I find only museums?" or "Results are too mixed, need filtering"

### Pitfall 5: Over-Fetching Place Details

**What goes wrong:** App makes `/places/xid/{xid}` detail requests for every attraction on every search, causing slow performance and hitting rate limits.

**Why it happens:** Details endpoint provides rich data (images, descriptions, URLs), tempting to fetch for all results. But rate limits may restrict high-volume detail fetching.

**How to avoid:** Use lazy loading — fetch details only when user clicks "View Details" or expands a card. The radius endpoint provides basic data (name, category, coordinates) sufficient for list view.

**Warning signs:** Slow search results, rate limit errors (429 responses), excessive API calls in network tab

## Code Examples

Verified patterns from official sources and existing project code:

### OpenTripMap Geoname Endpoint (City to Coordinates)

```typescript
// Source: https://www.worldindata.com/api/opentripmap-city-location-api/
// Verified via WebSearch (MEDIUM confidence)
interface GeonameResponse {
  name: string;
  country: string;
  lat: number;
  lon: number;
  population: number;
  timezone: string;
}

// In AttractionApiService
getGeoname(cityName: string): Observable<ApiResult<{ lat: number; lon: number }>> {
  return this.get<GeonameResponse>('/0.1/en/places/geoname', {
    name: cityName,
  }).pipe(
    withBackoff(),
    map((response): ApiResult<{ lat: number; lon: number }> => ({
      data: { lat: response.lat, lon: response.lon },
      error: null,
    })),
    catchError((error: AppError): Observable<ApiResult<{ lat: number; lon: number }>> =>
      of({ data: null, error })
    ),
  );
}
```

### OpenTripMap Radius Endpoint (Fetch Attractions by Coordinates)

```typescript
// Source: https://www.worldindata.com/api/opentripmap-point-of-interest-api/
// Verified via WebSearch + WebFetch (MEDIUM confidence)
interface RadiusFeature {
  name: string;
  xid: string;         // Unique ID for detail fetching
  osm?: string;
  wikidata?: string;
  kind: string;        // Category (may be comma-separated list)
  point: {
    lon: number;
    lat: number;
  };
}

interface RadiusResponse {
  features?: RadiusFeature[];  // May be nested under "features" or top-level array
}

// In AttractionApiService
getRadius(lat: number, lon: number, radius: number): Observable<ApiResult<RadiusFeature[]>> {
  return this.get<RadiusResponse>('/0.1/en/places/radius', {
    lat: lat.toString(),
    lon: lon.toString(),
    radius: radius.toString(),
    limit: '20',
  }).pipe(
    withBackoff(),
    map((response): ApiResult<RadiusFeature[]> => {
      // Defensive extraction - may be nested or top-level
      const features = response.features || (Array.isArray(response) ? response : []);
      return { data: features, error: null };
    }),
    catchError((error: AppError): Observable<ApiResult<RadiusFeature[]>> =>
      of({ data: [], error })
    ),
  );
}
```

### OpenTripMap Place Details Endpoint (Optional Enrichment)

```typescript
// Source: https://dev.opentripmap.org/product + GitHub examples
// Verified via WebSearch (MEDIUM confidence)
interface PlaceDetails {
  xid: string;
  name: string;
  address?: {
    city?: string;
    road?: string;
    house_number?: string;
  };
  kinds: string;       // Comma-separated categories
  wikipedia?: string;  // Wikipedia article URL
  url?: string;        // Official external link (nullable!)
  image?: string;      // Primary image URL
  preview?: {
    source: string;
    width: number;
    height: number;
  };
  point: {
    lon: number;
    lat: number;
  };
}

// In AttractionApiService
getPlaceDetails(xid: string): Observable<ApiResult<PlaceDetails>> {
  return this.get<PlaceDetails>(`/0.1/en/places/xid/${xid}`).pipe(
    withBackoff(),
    map((response): ApiResult<PlaceDetails> => ({ data: response, error: null })),
    catchError((error: AppError): Observable<ApiResult<PlaceDetails>> =>
      of({ data: null, error })
    ),
  );
}
```

### Mapper Pattern with Nullable Link

```typescript
// Source: Existing project pattern (tour.mapper.ts) + Attraction model requirements
// Confidence: HIGH (verified in codebase)
@Injectable({ providedIn: 'root' })
export class AttractionMapper {
  /**
   * Maps OpenTripMap radius feature to Attraction model.
   * Note: Basic radius response doesn't include descriptions or URLs.
   * Call getPlaceDetails(xid) separately for enrichment.
   */
  mapResponse(raw: RadiusFeature): Attraction {
    return {
      id: raw.xid || crypto.randomUUID(),
      source: 'attractions',
      addedToItinerary: false,
      name: raw.name || 'Unnamed Attraction',
      description: '',  // Not available in radius response
      location: {
        latitude: raw.point.lat,
        longitude: raw.point.lon,
      },
      city: '',  // Set from search params or geoname response
      category: this.extractPrimaryCategory(raw.kind),
      link: null,  // Not available in radius response; fetch via getPlaceDetails if needed
    };
  }

  /**
   * Enriches basic Attraction with place details (description, link).
   */
  enrichWithDetails(attraction: Attraction, details: PlaceDetails): Attraction {
    return {
      ...attraction,
      description: this.extractDescription(details),
      link: details.url ? { url: details.url, provider: 'Official' } : null,
    };
  }

  private extractPrimaryCategory(kindString: string): string {
    // "kinds" is comma-separated, e.g., "architecture,historic,interesting_places"
    // Take first category or default to "attraction"
    const categories = kindString?.split(',') || [];
    return categories[0] || 'attraction';
  }

  private extractDescription(details: PlaceDetails): string {
    // OpenTripMap may provide Wikipedia link but not always full text description
    // Fallback to generic message if no description available
    return details.wikipedia
      ? `Learn more: ${details.wikipedia}`
      : 'Details available on site.';
  }
}
```

### Component Pattern with Nullable Link Handling

```typescript
// Source: Existing tour-search.component pattern + nullable link requirements
// Confidence: HIGH (verified in codebase)
@Component({
  selector: 'app-attraction-search',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule],
  templateUrl: './attraction-search.component.html',
  styleUrl: './attraction-search.component.scss',
})
export class AttractionSearchComponent {
  private readonly attractionApi = inject(AttractionApiService);
  private readonly tripState = inject(TripStateService);
  private readonly snackBar = inject(MatSnackBar);

  attractionSearchForm = new FormGroup({
    city: new FormControl('', Validators.required),
  });

  searchResults = signal<Attraction[]>([]);
  isSearching = signal(false);
  hasSearched = signal(false);

  // Client-side category filtering (optional)
  selectedCategory = signal<string | null>(null);

  filteredResults = computed(() => {
    const results = this.searchResults();
    const category = this.selectedCategory();

    if (!category) return results;

    return results.filter(attr =>
      attr.category.toLowerCase().includes(category.toLowerCase())
    );
  });

  searchAttractions(): void {
    if (this.attractionSearchForm.invalid) return;

    const city = this.attractionSearchForm.value.city ?? '';

    this.isSearching.set(true);
    this.hasSearched.set(true);

    this.attractionApi
      .searchAttractions({ city })
      .pipe(finalize(() => this.isSearching.set(false)))
      .subscribe({
        next: (result) => {
          if (result.error) {
            this.snackBar.open(
              'Failed to search attractions. Please try again.',
              'Close',
              { duration: 3000 }
            );
            this.searchResults.set([]);
          } else {
            this.searchResults.set(result.data);
          }
        },
      });
  }

  addToItinerary(attraction: Attraction): void {
    this.tripState.addAttraction({ ...attraction, addedToItinerary: true });
    this.snackBar.open('Attraction added to itinerary', 'Close', {
      duration: 3000,
    });
  }
}
```

### Template Pattern with Conditional Link Rendering

```html
<!-- Source: tour-search.component.html pattern + nullable link handling -->
<!-- Confidence: HIGH -->
@for (attraction of filteredResults(); track attraction.id) {
  <mat-card class="attraction-card">
    <mat-card-content>
      <div class="attraction-header">
        <div class="attraction-info">
          <h3 class="attraction-name">{{ attraction.name }}</h3>
          <div class="attraction-meta">
            <mat-chip>{{ attraction.category }}</mat-chip>
            <span class="separator">•</span>
            <mat-icon>place</mat-icon>
            <span>{{ attraction.city }}</span>
          </div>
        </div>
      </div>
      @if (attraction.description) {
        <p class="attraction-description">{{ attraction.description }}</p>
      }
    </mat-card-content>

    <mat-card-actions>
      <button mat-button color="primary" (click)="addToItinerary(attraction)">
        <mat-icon>add</mat-icon>
        Add to Itinerary
      </button>

      <!-- Conditional link rendering: only show if link exists -->
      @if (attraction.link !== null) {
        <a mat-button [href]="attraction.link.url" target="_blank" rel="noopener noreferrer">
          <mat-icon>open_in_new</mat-icon>
          View Official Site
        </a>
      }
    </mat-card-actions>
  </mat-card>
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Foursquare API (commercial) | OpenTripMap (open data) | N/A | Free tier available, open license, but less commercial/booking data |
| Single-step city search | Multi-step geoname + radius | OpenTripMap API design | Requires chained observables, more complex service logic |
| All links required | Nullable ExternalLink | Phase 9 requirements | UI must handle null links gracefully with conditional rendering |
| Price field on all models | No price for attractions | Phase 9 Attraction model | Attractions are informational, not bookable items |

**Deprecated/outdated:**
- N/A — OpenTripMap API v0.1 is current stable version

## Open Questions

1. **OpenTripMap API Authentication Method**
   - What we know: OpenTripMap uses `apikey` query parameter based on web search examples
   - What's unclear: Does it also accept `X-API-Key` header (which apiKeyInterceptor injects)? Or does BaseApiService need override to add query param manually?
   - Recommendation: Test with live API key. If header doesn't work, add manual `apikey` param in AttractionApiService.get() calls or create helper method.

2. **Free Tier Rate Limits**
   - What we know: Free tier exists, paid plans start at $19/month
   - What's unclear: Exact request quota (daily/hourly), whether detail fetching counts separately from radius searches
   - Recommendation: Start with conservative approach (20 results per search, lazy-load details on demand). Monitor for 429 rate limit errors in testing.

3. **CORS Configuration**
   - What we know: Proxy configured to `https://api.opentripmap.com`, project requirement is "CORS status must be validated live"
   - What's unclear: Whether OpenTripMap allows direct browser requests (CORS-enabled) or requires server-side proxy
   - Recommendation: Proxy already configured, use it. Don't attempt direct browser calls until CORS is confirmed working.

4. **Category Taxonomy**
   - What we know: `kind` field is comma-separated string of categories (e.g., "architecture,historic,interesting_places")
   - What's unclear: Full list of available categories, whether to display all or just primary category
   - Recommendation: Extract primary category (first in comma list) for simplicity. Add full category list display in detail view if needed later.

5. **Description Availability**
   - What we know: Radius endpoint doesn't include descriptions; details endpoint may provide Wikipedia link
   - What's unclear: What percentage of attractions have rich descriptions vs. just Wikipedia links vs. nothing
   - Recommendation: Start with basic implementation (no descriptions in list view). Add optional detail-fetching on card expansion in Phase 9.5 if needed.

## Sources

### Primary (HIGH confidence)
- Existing project codebase:
  - `C:/Users/Pichau/triply/src/app/core/models/trip.models.ts` - Attraction model definition
  - `C:/Users/Pichau/triply/src/app/core/api/tour-api.service.ts` - ApiService pattern
  - `C:/Users/Pichau/triply/src/app/core/api/base-api.service.ts` - BaseApiService architecture
  - `C:/Users/Pichau/triply/src/app/core/services/trip-state.service.ts` - addAttraction() method
  - `C:/Users/Pichau/triply/src/app/features/tour-search/` - Component pattern

### Secondary (MEDIUM confidence)
- [OpenTripMap API Product Page](https://dev.opentripmap.org/product) - Official API overview, endpoint descriptions
- [OpenTripMap Point of Interest API - World In Data](https://www.worldindata.com/api/opentripmap-point-of-interest-api/) - Detailed endpoint parameters, response structure examples
- [OpenTripMap City Location API - World In Data](https://www.worldindata.com/api/opentripmap-city-location-api/) - Geoname endpoint documentation
- [OpenTripMap API on Medium](https://medium.com/@worldindata/opentripmap-point-of-interest-api-bfe3802a5ebd) - Usage overview and features
- [GitHub - serhiybutz/OpenTripMapAPI](https://github.com/serhiybutz/OpenTripMapAPI) - Swift wrapper with endpoint examples
- [GitHub - danielphung01/destination-vacation](https://github.com/danielphung01/destination-vacation) - Real-world implementation reference

### Tertiary (LOW confidence — needs validation)
- [Angular Material conditional href handling](https://www.angularfix.com/2022/01/angular2-what-is-correct-way-to-disable.html) - Nullable link pattern discussion
- [OpenTripMap free tier pricing](https://rapidapi.com/opentripmap/api/places1/pricing) - Pricing page (rate limits not detailed)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Angular patterns verified in existing codebase, OpenTripMap confirmed via multiple sources
- Architecture: HIGH - BaseApiService + Mapper + component pattern is project standard, verified in Phases 4-8
- OpenTripMap API specifics: MEDIUM - Endpoint paths/params verified via multiple web sources, but not tested live
- Rate limits/CORS: LOW - No official documentation found, requires live testing
- Pitfalls: MEDIUM - Based on API design analysis and existing project patterns, not field-tested

**Research date:** 2026-02-12
**Valid until:** 2026-03-14 (30 days - API is stable, but free tier policies may change)

**Critical blockers requiring live validation:**
1. OpenTripMap authentication method (query param vs. header)
2. CORS configuration and proxy necessity
3. Free tier rate limits and quotas
4. Response structure variations (nested vs. top-level arrays)
