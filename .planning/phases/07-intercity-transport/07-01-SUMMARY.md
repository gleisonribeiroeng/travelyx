---
phase: 07-intercity-transport
plan: 01
subsystem: api-integration
tags: [transport, mapper, api-service, routing]
dependency_graph:
  requires:
    - base-api-service
    - api-error-utils
    - retry-utils
    - trip-models
  provides:
    - transport-mapper
    - transport-api-service
    - transport-route
  affects:
    - app-routing
    - header-navigation
tech_stack:
  added:
    - TransportMapper (provider-agnostic route mapping)
    - TransportApiService (intercity transport search)
  patterns:
    - Flexible field mapping with fallback chains
    - Mode normalization to union type
    - Multi-format duration parsing (ISO 8601, human-readable, number)
    - Two-parameter mapper (raw + params)
key_files:
  created:
    - triply/src/app/core/api/transport.mapper.ts
    - triply/src/app/core/api/transport-api.service.ts
  modified:
    - triply/src/app/app.routes.ts
    - triply/src/app/core/components/header/header.component.html
decisions:
  - decision: TransportMapper does not implement Mapper interface
    rationale: Two-parameter mapResponse signature (raw, params) matches CarMapper pattern, incompatible with single-parameter Mapper interface
    impact: Consistent with Phase 6 car rental mapper pattern
  - decision: Transport is NOT a RapidAPI source
    rationale: Uses standard X-API-Key header via apiKeyInterceptor, not X-RapidAPI-Key/Host
    impact: No interceptor changes needed, follows standard API pattern
  - decision: API endpoint and params are hypothetical placeholders
    rationale: Transport API provider is TBD (Rome2rio unavailable per Phase 2 decision)
    impact: Endpoint /api/v1/transport/search and params must be updated when provider selected
  - decision: Mode normalization uses case-insensitive substring matching
    rationale: Accommodates various provider formats (bus/coach, train/rail, ferry/boat)
    impact: Robust mode mapping to union type regardless of provider naming
  - decision: Duration parsing supports three formats
    rationale: Different providers use ISO 8601 (PT2H30M), human-readable (2h 30m), or raw minutes
    impact: Parser handles number, ISO 8601 regex, and human-readable regex with total minutes conversion
metrics:
  duration_minutes: 3
  tasks_completed: 2
  files_created: 2
  files_modified: 2
  commits: 2
  completed_at: 2026-02-12T15:36:39Z
---

# Phase 7 Plan 1: Transport API Service and Mapper Summary

TransportMapper and TransportApiService created with provider-agnostic flexible mapping, mode normalization to union type, multi-format duration parsing, and /transport route with header nav link added.

## Tasks Completed

### Task 1: TransportMapper and TransportApiService
**Commit:** 84a751e

Created transport.mapper.ts with:
- ExternalRoute interface with all optional fields for hypothetical API response
- TransportSearchParams interface for search criteria (origin, destination, departureDate, currency)
- TransportMapper class with mapResponse(raw, params) two-parameter signature
- mapMode() method with case-insensitive substring matching: bus/coach -> 'bus', train/rail -> 'train', ferry/boat -> 'ferry', default -> 'other'
- parseDuration() method supporting number (as-is), ISO 8601 (PT2H30M regex), and human-readable (2h 30m regex) formats
- Safe fallback chains for all optional ExternalRoute fields

Created transport-api.service.ts with:
- TransportApiService extending BaseApiService('transport')
- searchTransport(params) method calling hypothetical /api/v1/transport/search endpoint
- withBackoff() for rate-limit retry
- Per-source catchError returning ApiResult<Transport[]> with empty data on error
- Flexible response extraction: response.data?.routes || response.data?.results || response.data || []
- Re-exports TransportSearchParams for convenience

**Files created:**
- triply/src/app/core/api/transport.mapper.ts
- triply/src/app/core/api/transport-api.service.ts

**Verification:**
- TypeScript compilation: zero errors
- Transport model import resolves correctly
- BaseApiService extension compiles
- ApiResult/AppError types match
- Mode union type 'bus' | 'train' | 'ferry' | 'other' matches Transport.mode exactly

### Task 2: /transport route and nav link
**Commit:** 3053c7c

Updated app.routes.ts:
- Added lazy-loaded /transport route before wildcard ** route
- Follows exact pattern of /cars route
- Points to features/transport-search/transport-search.component (will be created in 07-02)

Updated header.component.html:
- Added Transport nav link with directions_bus icon
- Positioned between Cars and Itinerary links
- Uses routerLink="/transport" and routerLinkActive="active-link"

**Files modified:**
- triply/src/app/app.routes.ts
- triply/src/app/core/components/header/header.component.html

**Verification:**
- app.routes.ts contains path: 'transport'
- header.component.html contains routerLink="/transport" with directions_bus icon
- Syntax is correct (lazy import will resolve when component exists in 07-02)

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification criteria passed:

1. npx tsc --noEmit --project triply/tsconfig.json - zero type errors
2. transport.mapper.ts exports TransportMapper, ExternalRoute, TransportSearchParams
3. transport-api.service.ts exports TransportApiService and re-exports TransportSearchParams
4. TransportApiService constructor calls super('transport')
5. TransportMapper.mapMode handles bus/coach -> 'bus', train/rail -> 'train', ferry/boat -> 'ferry', default -> 'other'
6. TransportMapper.parseDuration handles number, ISO 8601 "PT2H30M", and human-readable "2h 30m"
7. app.routes.ts has /transport path before wildcard
8. header.component.html has Transport link with directions_bus icon

## Key Patterns Established

**Flexible Field Mapping:**
- All ExternalRoute fields are optional
- Mapper uses fallback chains: raw.origin || raw.from || params.origin
- Accommodates different provider response structures without breaking

**Mode Normalization:**
- Case-insensitive substring matching on external type/mode string
- Maps to strict union type 'bus' | 'train' | 'ferry' | 'other'
- Handles provider variations (bus/coach, train/rail, ferry/boat)

**Duration Parsing:**
- Supports three formats: number (minutes), ISO 8601 (PT2H30M), human-readable (2h 30m)
- Uses regex matching for ISO 8601 ((\d+)H, (\d+)M)
- Uses regex matching for human-readable ((\d+)\s*h, (\d+)\s*m)
- Returns total minutes as number

**Two-Parameter Mapper:**
- mapResponse(raw, params) signature
- Echoes search params (origin, destination) when missing from raw response
- Consistent with CarMapper pattern from Phase 6

**API Service Pattern:**
- Extends BaseApiService with source identifier
- Uses withBackoff() for retry on rate-limit errors
- Per-source catchError returning ApiResult with empty data array
- Hypothetical endpoint with JSDoc warnings for future updates

## Integration Points

**Dependencies Used:**
- BaseApiService: Extended by TransportApiService with 'transport' source
- Transport model: Imported from trip.models.ts for return type
- ApiResult/AppError: Used for result typing and error handling
- withBackoff: Applied for exponential backoff retry

**Provided for Next Plans:**
- TransportMapper: Available for injection in TransportSearchComponent (07-02)
- TransportApiService: Ready to call searchTransport() from component (07-02)
- /transport route: Registered for lazy loading when component exists
- Transport nav link: Visible in header navigation

## Notes

**Hypothetical API:**
The endpoint path /api/v1/transport/search and all parameter names are placeholders. The actual transport API provider is TBD (Rome2rio unavailable per Phase 2 decision). When the provider is selected:
1. Update endpoint path in TransportApiService.searchTransport()
2. Update query parameter names to match provider documentation
3. Test response structure and update fallback chain if needed
4. ExternalRoute interface and mapper fallbacks should handle structure variations

**Not RapidAPI:**
Transport source uses standard X-API-Key authentication via apiKeyInterceptor, not RapidAPI's X-RapidAPI-Key/Host pattern. This is correct and requires no interceptor changes.

**Next Plan:**
07-02 will create TransportSearchComponent with search form (origin, destination, date), result cards displaying mode/duration/price, and add-to-itinerary functionality. The lazy route will resolve successfully once the component exists.

## Self-Check: PASSED

**Created files verified:**
- FOUND: triply/src/app/core/api/transport.mapper.ts
- FOUND: triply/src/app/core/api/transport-api.service.ts

**Modified files verified:**
- FOUND: triply/src/app/app.routes.ts (contains path: 'transport')
- FOUND: triply/src/app/core/components/header/header.component.html (contains routerLink="/transport")

**Commits verified:**
- FOUND: 84a751e (Task 1: TransportMapper and TransportApiService)
- FOUND: 3053c7c (Task 2: /transport route and nav link)

**TypeScript compilation:**
- PASSED: Zero type errors on full project build

All verification checks passed. Plan 07-01 complete.
