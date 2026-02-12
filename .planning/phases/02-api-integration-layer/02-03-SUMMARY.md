---
phase: 02-api-integration-layer
plan: "03"
subsystem: api
tags: [angular, typescript, rxjs, http-client, abstract-class, generics]

requires:
  - phase: 02-01
    provides: "API_SOURCE HttpContextToken, apiKeyInterceptor, AppError model, ApiConfigService"

provides:
  - "Price, DateRange, GeoLocation, ExternalLink, SearchResultBase base types in core/models/base.model.ts"
  - "Mapper<TExternal, TInternal> interface and MapperFn type in core/api/mapper.interface.ts"
  - "BaseApiService abstract class with typed get/post and automatic API_SOURCE context injection"
  - "ApiResult<T> type and withFallback<T> RxJS operator for forkJoin-safe partial-success patterns"

affects:
  - 02-04
  - 02-05
  - phases/03-domain-models
  - phases/04-flights
  - phases/05-hotels
  - phases/06-car-rental
  - phases/07-transport
  - phases/08-tours
  - phases/09-attractions

tech-stack:
  added: []
  patterns:
    - "ApiService + Mapper: feature services extend BaseApiService, use a Mapper class for response transformation"
    - "withFallback operator: per-source catchError pattern that makes every observable safe for forkJoin"
    - "Abstract base without @Injectable: subclasses declare @Injectable({ providedIn: 'root' }) themselves"

key-files:
  created:
    - triply/src/app/core/models/base.model.ts
    - triply/src/app/core/api/mapper.interface.ts
    - triply/src/app/core/api/base-api.service.ts
    - triply/src/app/core/api/api-error.utils.ts
  modified: []

key-decisions:
  - "BaseApiService omits @Injectable — abstract class registration would cause double-provider issues; subclasses own their own @Injectable decorator"
  - "ApiResult<T> is a discriminated union (error: null vs error: AppError) so template type narrowing works with a simple !== null check"
  - "withFallback returns an operator function (not a class) to match RxJS pipe() ergonomics and keep call sites concise"

patterns-established:
  - "Feature API service pattern: extend BaseApiService, call super(apiSource), use this.get/this.post — no manual HttpContext boilerplate"
  - "Mapper pattern: implement Mapper<TExternal, TInternal>, expose mapResponse(raw) — one clear transformation boundary per feature"
  - "Partial-success pattern: .pipe(withFallback([])) on every forkJoin branch — one source failure cannot cancel sibling requests"

duration: 2min
completed: 2026-02-12
---

# Phase 2 Plan 03: Shared API Abstractions Summary

**Abstract base types and service utilities — BaseApiService with automatic API_SOURCE injection, Mapper interface, ApiResult/withFallback for forkJoin-safe partial success, and canonical domain base types — establishing the patterns all 6 feature phases (4-9) will extend.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-12T02:44:09Z
- **Completed:** 2026-02-12T02:45:40Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- 5 shared base types (Price, DateRange, GeoLocation, ExternalLink, SearchResultBase) for all feature domain models
- Mapper<TExternal, TInternal> interface establishing a consistent external-to-internal transformation contract
- BaseApiService abstract class that auto-injects API_SOURCE HttpContextToken and resolves proxy URLs via ApiConfigService
- withFallback<T> RxJS operator with ApiResult<T> discriminated union enabling safe forkJoin composition across multiple API sources

## Task Commits

Each task was committed atomically:

1. **Task 1: Create canonical model base types and Mapper interface** - `0e7ee6b` (feat)
2. **Task 2: Create BaseApiService and per-source error handling utility** - `3d4e8ff` (feat)

**Plan metadata:** committed with this SUMMARY (docs)

## Files Created/Modified

- `triply/src/app/core/models/base.model.ts` - Price, DateRange, GeoLocation, ExternalLink, SearchResultBase interfaces
- `triply/src/app/core/api/mapper.interface.ts` - Mapper<TExternal, TInternal> interface and MapperFn type alias
- `triply/src/app/core/api/base-api.service.ts` - Abstract BaseApiService with typed get/post and API_SOURCE context injection
- `triply/src/app/core/api/api-error.utils.ts` - ApiResult<T> discriminated union and withFallback<T> operator

## Decisions Made

- BaseApiService is abstract with no @Injectable decorator — concrete subclasses declare their own `@Injectable({ providedIn: 'root' })` to avoid double-registration and keep DI intent explicit at the feature level.
- ApiResult<T> uses a discriminated union on `error` (`null` vs `AppError`) rather than a separate `success` boolean, enabling TypeScript type narrowing in templates via `result.error !== null`.
- withFallback is a function returning an operator (not a class) to match standard RxJS pipe() ergonomics and keep call sites concise: `.pipe(withFallback([]))`.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All abstractions are in place for feature API service phases (04-09)
- Phase 3 (domain models) can compose Price, DateRange, GeoLocation, ExternalLink, SearchResultBase into feature-specific models (FlightOffer, HotelResult, etc.)
- Phases 4-9 follow an identical pattern: `class XxxApiService extends BaseApiService` + `class XxxMapper implements Mapper<ExternalDto, InternalModel>`
- No blockers — the two remaining Phase 2 plans (04 API connectivity tests, 05 error/loading state) can proceed immediately

---
*Phase: 02-api-integration-layer*
*Completed: 2026-02-12*
