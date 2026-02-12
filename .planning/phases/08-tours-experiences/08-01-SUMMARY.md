---
phase: 08-tours-experiences
plan: 01
subsystem: tours
tags: [api-integration, viator, tours, experiences, mapper]
dependency_graph:
  requires:
    - BaseApiService (from 02-api-integration-layer)
    - Activity model (from trip.models.ts)
    - withBackoff (from retry.utils)
  provides:
    - TourApiService.searchTours()
    - TourMapper.mapResponse()
    - TourSearchParams interface
  affects:
    - app.routes.ts (added /tours route)
    - header.component.html (added Tours nav link)
tech_stack:
  added: []
  patterns:
    - Two-parameter mapper pattern (mapResponse takes raw + params)
    - POST request for search endpoint (Viator /products/search requirement)
    - Nullish coalescing (??) for nullable duration field
    - Standard X-API-Key authentication (not RapidAPI)
key_files:
  created:
    - triply/src/app/core/api/tour.mapper.ts
    - triply/src/app/core/api/tour-api.service.ts
  modified:
    - triply/src/app/app.routes.ts
    - triply/src/app/core/components/header/header.component.html
decisions:
  - "Use POST for Viator /partner/products/search (API requires request body)"
  - "Use ?? null for durationMinutes (preserves null for missing values, not 0)"
  - "Use standard X-API-Key auth (Tours is not a RapidAPI source)"
  - "Use local_activity Material icon for Tours navigation"
metrics:
  duration_minutes: 1
  tasks_completed: 2
  files_created: 2
  files_modified: 2
  commits: 2
  completed_at: "2026-02-12T16:34:19Z"
---

# Phase 08 Plan 01: Tour API Integration Summary

**One-liner:** Viator Partner API integration with TourApiService POST search and TourMapper transforming products to Activity model, plus /tours route and header nav link.

## What Was Built

Created the API layer for tours/experiences search using Viator Partner API:

1. **TourMapper** - Transforms ViatorProduct responses to Activity model
   - Handles all optional fields with safe fallback chains
   - Uses nullish coalescing (?? null) for durationMinutes to preserve null (not convert to 0)
   - Two-parameter mapResponse signature (raw + params) matching TransportMapper pattern
   - Exports ViatorProduct interface and TourSearchParams interface

2. **TourApiService** - Extends BaseApiService('tours') for Viator API calls
   - searchTours() uses POST (not GET) because Viator /products/search requires request body
   - Includes withBackoff() for rate-limit retry with exponential backoff
   - Per-source catchError returns ApiResult<Activity[]> with empty data on error
   - Re-exports TourSearchParams for convenience
   - Uses standard X-API-Key authentication (not RapidAPI headers)

3. **Route and Navigation**
   - Added lazy-loaded /tours route to app.routes.ts (before wildcard)
   - Added Tours nav link to header with local_activity icon
   - Positioned between Transport and Itinerary links (following phase order)

## Technical Decisions

**POST vs GET for search endpoint**
- Decision: Use this.post() for searchTours()
- Rationale: Viator /partner/products/search endpoint accepts complex filtering criteria in request body (not query params)
- Impact: API service differs from TransportApiService which uses GET

**Null handling for duration**
- Decision: Use durationMinutes: raw.duration?.fixedDurationInMinutes ?? null
- Rationale: ?? null preserves null for missing/undefined duration; || null would convert 0 duration to null (incorrect)
- Impact: Zero-duration tours correctly display as "0 minutes", missing duration displays as null

**Authentication method**
- Decision: Use standard X-API-Key header (not RapidAPI X-RapidAPI-Key/Host)
- Rationale: Viator Partner API uses standard API key authentication, not RapidAPI marketplace
- Impact: Tours source excluded from RAPID_API_SOURCES array in api-key.interceptor

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification criteria passed:

✓ npx tsc --noEmit - zero type errors
✓ tour.mapper.ts exports TourMapper, ViatorProduct, TourSearchParams
✓ tour-api.service.ts exports TourApiService, re-exports TourSearchParams
✓ TourApiService constructor calls super('tours')
✓ searchTours uses this.post() (POST request, not GET)
✓ durationMinutes uses ?? null (not || null)
✓ app.routes.ts has /tours path before ** wildcard
✓ header.component.html has Tours link with local_activity icon between Transport and Itinerary

## Task Breakdown

### Task 1: TourMapper and TourApiService
**Status:** Complete
**Commit:** ab94bbb
**Duration:** ~1 minute

Created tour.mapper.ts with:
- ViatorProduct interface (all optional fields)
- TourSearchParams interface (destination: string)
- TourMapper class with mapResponse(raw, params) method
- Safe fallback chains for all optional fields
- Nullish coalescing for durationMinutes

Created tour-api.service.ts with:
- TourApiService extends BaseApiService
- super('tours') constructor call
- inject(TourMapper) as private readonly mapper
- searchTours() method using this.post() for POST endpoint
- Request body with filtering, pagination, sorting
- Defensive extraction with response.products || response.data?.products || response.data || []
- Per-source catchError returning ApiResult<Activity[]>
- Re-export of TourSearchParams type

### Task 2: /tours route and Tours nav link
**Status:** Complete
**Commit:** 36d2ce1
**Duration:** <1 minute

Updated app.routes.ts:
- Added lazy-loaded /tours route before wildcard
- Points to features/tour-search/tour-search.component (created in 08-02)

Updated header.component.html:
- Added Tours nav link with routerLink="/tours"
- Used local_activity Material icon
- Positioned between Transport and Itinerary links

## Next Steps

Plan 08-02 will create the TourSearchComponent UI with:
- Search form with destination input
- Results grid with Activity cards
- Add to itinerary functionality
- Integration with TripStateService

## Self-Check

Verifying all claimed artifacts exist and commits are recorded:

**Files created:**
```bash
[ -f "C:/Users/Pichau/triply/src/app/core/api/tour.mapper.ts" ] && echo "FOUND: tour.mapper.ts" || echo "MISSING: tour.mapper.ts"
[ -f "C:/Users/Pichau/triply/src/app/core/api/tour-api.service.ts" ] && echo "FOUND: tour-api.service.ts" || echo "MISSING: tour-api.service.ts"
```

**Commits:**
```bash
git log --oneline --all | grep -q "ab94bbb" && echo "FOUND: ab94bbb" || echo "MISSING: ab94bbb"
git log --oneline --all | grep -q "36d2ce1" && echo "FOUND: 36d2ce1" || echo "MISSING: 36d2ce1"
```

**Results:**
- FOUND: tour.mapper.ts
- FOUND: tour-api.service.ts
- FOUND: ab94bbb
- FOUND: 36d2ce1

## Self-Check: PASSED

All claimed files exist and all commits are recorded in git history.
