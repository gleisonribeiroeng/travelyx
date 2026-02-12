---
phase: 09-attractions
plan: 01
subsystem: attractions-api
tags: [api-integration, mapper, opentrip-map, three-step-flow]
dependencies:
  requires:
    - 02-03-PLAN.md # BaseApiService
    - 02-04-PLAN.md # withBackoff
  provides:
    - AttractionApiService with three-step search flow
    - AttractionMapper with nullable link pattern
  affects:
    - /attractions route configuration
    - Header navigation (Attractions link)
tech_stack:
  added:
    - OpenTripMap API integration
  patterns:
    - Three-step chained search (geoname -> radius -> details)
    - Nullable link field for attractions without URLs
    - forkJoin parallel details enrichment
key_files:
  created:
    - triply/src/app/core/api/attraction.mapper.ts
    - triply/src/app/core/api/attraction-api.service.ts
  modified:
    - triply/src/app/app.routes.ts
    - triply/src/app/core/components/header/header.component.html
decisions:
  - Use museum icon for Attractions nav link (most recognizable for tourist attractions)
  - Place Attractions link between Tours and Itinerary (follows phase order)
  - Three-step OpenTripMap flow with switchMap chaining
  - Nullable link pattern: details.url ? { url, provider } : null
  - Default search radius of 5000 meters with rate filter 2 (named attractions only)
metrics:
  duration_minutes: 2
  completed_date: 2026-02-12
  task_commits: 2
  files_created: 2
  files_modified: 2
---

# Phase 09 Plan 01: Attractions API Integration Summary

**One-liner:** OpenTripMap three-step search flow (geoname -> radius -> details enrichment) with nullable link pattern for attractions.

## What Was Built

### AttractionMapper (`attraction.mapper.ts`)
- **External Response Interfaces**: GeonameResponse, RadiusFeature, PlaceDetails, AttractionSearchParams
- **mapResponse(raw, params)**: Transforms OpenTripMap radius features to canonical Attraction model
  - Sets `link: null` by default (enriched later)
  - Extracts primary category from comma-separated kinds string
  - Safe fallbacks for all optional fields
- **enrichWithDetails(attraction, details)**: Merges detail data into attractions
  - Nullable link pattern: `details.url ? { url, provider: 'Official' } : null`
  - Description from Wikipedia link or "Official site available" fallback
- **extractPrimaryCategory**: Private helper to normalize kinds string to human-readable category

### AttractionApiService (`attraction-api.service.ts`)
- **Three-Step Search Flow** (unique to attractions):
  1. **getGeoname(city)**: Resolve city name to coordinates
  2. **getRadius(lat, lon)**: Search attractions within 5km radius (rate=2 for named only)
  3. **enrichWithDetails(features)**: Parallel details fetching via forkJoin
- **searchAttractions(params)**: Public method orchestrating full flow with switchMap chaining
  - Early exit if geoname or radius fails
  - Graceful degradation: returns basic attractions if enrichment fails
- **withBackoff()** on all API calls for retry with exponential backoff
- **Re-exports**: AttractionSearchParams for convenience

### Route and Navigation
- **/attractions route**: Lazy-loaded AttractionSearchComponent (added before wildcard)
- **Attractions nav link**: Header link with museum icon between Tours and Itinerary

## Key Patterns

### Three-Step Chained Search
```typescript
searchAttractions(params): Observable<ApiResult<Attraction[]>> {
  return this.getGeoname(params.city).pipe(
    switchMap(geonameResult => {
      if (geonameResult.error !== null || geonameResult.data === null) {
        return of({ data: [], error: geonameResult.error });
      }
      const { lat, lon } = geonameResult.data;
      return this.getRadius(lat, lon);
    }),
    switchMap(radiusResult => {
      if (radiusResult.error !== null) {
        return of({ data: [], error: radiusResult.error });
      }
      return this.enrichWithDetails(radiusResult.data, params);
    })
  );
}
```

### Nullable Link Pattern
```typescript
enrichWithDetails(attraction: Attraction, details: PlaceDetails): Attraction {
  return {
    ...attraction,
    link: details.url ? { url: details.url, provider: 'Official' } : null,
  };
}
```

### Parallel Details Enrichment
```typescript
const detailRequests = features.map(feature => {
  if (!feature.xid) return of(null);
  return this.get<PlaceDetails>(`/0.1/en/places/xid/${feature.xid}`).pipe(
    withBackoff(),
    catchError(() => of(null))
  );
});

return forkJoin(detailRequests).pipe(
  map(detailsArray => {
    const enrichedAttractions = basicAttractions.map((attraction, index) => {
      const details = detailsArray[index];
      return details ? this.mapper.enrichWithDetails(attraction, details) : attraction;
    });
    return { data: enrichedAttractions, error: null };
  }),
  catchError(error => of({ data: basicAttractions, error }))
);
```

## Technical Decisions

| Decision | Rationale | Alternative Considered |
|----------|-----------|------------------------|
| Three-step flow with switchMap | OpenTripMap requires city->coords->search->details sequence | Single endpoint (not available in OpenTripMap) |
| Nullable link field | Many attractions lack official URLs | Always provide placeholder URL (poor UX) |
| forkJoin for parallel details | Faster than sequential fetching | Sequential requests (too slow) |
| Museum icon for nav link | Most recognizable for tourist attractions | photo_camera, place (less distinct) |
| Rate filter 2 (named only) | Filters out unnamed POIs for better results | Rate 1 (all) or 3 (famous only) |
| Default radius 5000m | Balances coverage and result quality | 1000m (too few), 10000m (too many) |

## Deviations from Plan

None - plan executed exactly as written.

## Testing Notes

**TypeScript Compilation**: Zero errors after both tasks.

**Pattern Verification**:
- AttractionMapper exports: GeonameResponse, RadiusFeature, PlaceDetails, AttractionSearchParams ✓
- AttractionApiService extends BaseApiService('attractions') ✓
- searchAttractions uses switchMap chaining for three-step flow ✓
- enrichWithDetails handles nullable link correctly ✓
- mapResponse sets link: null by default ✓
- /attractions route exists before wildcard ✓
- Header has Attractions link with museum icon between Tours and Itinerary ✓

**Runtime Testing Required** (Plan 02):
- OpenTripMap API authentication (X-API-Key header vs apikey query param)
- Geoname lookup for various city names
- Radius search response structure (features array vs direct array)
- Details enrichment for attractions with/without URLs
- Nullable link rendering in AttractionSearchComponent

## Next Steps

**Plan 02 (Attraction Search UI)**:
- Create AttractionSearchComponent with city-only search form
- Display attraction cards with category badges
- Handle nullable link (show "Visit Site" button only when link exists)
- Add to itinerary functionality
- Filter by category using client-side filtering

## Self-Check: PASSED

### Created Files Exist
```bash
[X] triply/src/app/core/api/attraction.mapper.ts
[X] triply/src/app/core/api/attraction-api.service.ts
```

### Modified Files Updated
```bash
[X] triply/src/app/app.routes.ts (contains 'attractions' route)
[X] triply/src/app/core/components/header/header.component.html (contains museum icon and Attractions link)
```

### Commits Exist
```bash
[X] 7e4136b: feat(09-01): create AttractionMapper and AttractionApiService
[X] 3b737ef: feat(09-01): add /attractions route and Attractions nav link
```

### Exports Verified
```bash
[X] AttractionMapper class exported
[X] GeonameResponse interface exported
[X] RadiusFeature interface exported
[X] PlaceDetails interface exported
[X] AttractionSearchParams interface exported
[X] AttractionApiService class exported
[X] AttractionSearchParams re-exported from service
```

### Key Patterns Verified
```bash
[X] super('attractions') called in constructor
[X] searchAttractions method exists with switchMap chaining
[X] enrichWithDetails handles nullable link (details.url ? { url, provider } : null)
[X] mapResponse sets link: null by default
[X] /attractions route lazy-loads AttractionSearchComponent
[X] Header has Attractions link with museum icon
```

All verification checks passed. Plan executed successfully with zero deviations.
