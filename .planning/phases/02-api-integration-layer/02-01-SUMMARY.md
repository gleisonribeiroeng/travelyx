---
phase: 02-api-integration-layer
plan: 01
subsystem: api
tags: [angular, httpclient, interceptors, signals, rxjs]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Angular project structure, environment files with 7 API key slots, app.config.ts bootstrap

provides:
  - AppError interface for normalized HTTP error shape (status, code, message, source, timestamp)
  - ApiConfigService for centralized API key and endpoint registry (7 sources, 7 endpoints)
  - LoadingService signal-based in-flight request counter with isLoading computed
  - apiKeyInterceptor functional interceptor injecting X-API-Key via HttpContextToken API_SOURCE
  - errorInterceptor functional interceptor normalizing HttpErrorResponse to AppError
  - loadingInterceptor functional interceptor tracking requests via finalize()
  - provideHttpClient(withFetch(), withInterceptors([...])) registered in app.config.ts

affects:
  - 02-02 through 02-07 (all remaining API integration plans)
  - 04 through 09 (all feature phases that call HttpClient)

# Tech tracking
tech-stack:
  added: [@angular/common/http - HttpClient, HttpInterceptorFn, HttpContextToken, provideHttpClient, withFetch, withInterceptors]
  patterns:
    - Functional interceptors (HttpInterceptorFn) — no class-based interceptors
    - HttpContextToken for per-request metadata (API_SOURCE)
    - Signal-based reactive state for loading indicator
    - Normalized error shape (AppError) — feature code never sees raw HttpErrorResponse
    - Proxy-relative endpoints via environment.apiBaseUrl

key-files:
  created:
    - triply/src/app/core/api/api-config.service.ts
    - triply/src/app/core/api/models/app-error.model.ts
    - triply/src/app/core/services/loading.service.ts
    - triply/src/app/core/api/interceptors/api-key.interceptor.ts
    - triply/src/app/core/api/interceptors/error.interceptor.ts
    - triply/src/app/core/api/interceptors/loading.interceptor.ts
  modified:
    - triply/src/app/app.config.ts

key-decisions:
  - "Interceptor order: apiKey -> error -> loading ensures keys injected first, errors caught second, loading wraps full lifecycle"
  - "loadingInterceptor uses only finalize() — no catchError — to guarantee decrement on both success and error paths"
  - "API_SOURCE HttpContextToken exported from api-key.interceptor.ts so feature services set source identity per-request"
  - "errorInterceptor normalizes message from error.detail > error.message > error.message (HTTP) > fallback string"

patterns-established:
  - "Feature services inject HttpContextToken API_SOURCE on every request to enable key injection and error attribution"
  - "All HTTP errors emerge as AppError — feature code uses (err as AppError).code/message/status, never HttpErrorResponse"
  - "LoadingService.isLoading computed signal drives global spinner in shell component"

# Metrics
duration: 2min
completed: 2026-02-12
---

# Phase 2 Plan 01: HTTP Infrastructure Summary

**Angular HttpClient infrastructure with three functional interceptors: per-request API key injection via HttpContextToken, normalized AppError shape, and signal-based loading counter via finalize()**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-12T02:22:07Z
- **Completed:** 2026-02-12T02:24:09Z
- **Tasks:** 3
- **Files modified:** 7 (6 created, 1 updated)

## Accomplishments
- AppError interface established as the sole error contract for all feature code — no raw HttpErrorResponse ever reaches feature services
- ApiConfigService centralizes 7 API key slots and 7 proxy-relative endpoints, reading only from environment files
- LoadingService uses Angular Signals (signal + computed) for reactive in-flight request tracking
- Three functional interceptors wired in correct order in app.config.ts with withFetch() and withInterceptors()

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ApiConfigService, AppError model, and LoadingService** - `edd1982` (feat)
2. **Task 2: Create three functional interceptors** - `e37a1f9` (feat)
3. **Task 3: Register provideHttpClient with interceptors in app.config.ts** - `69c4253` (feat)

## Files Created/Modified
- `triply/src/app/core/api/models/app-error.model.ts` - AppError interface: status, code, message, source, timestamp
- `triply/src/app/core/api/api-config.service.ts` - Centralized API key map (7 slots) and endpoint registry (7 endpoints), getKey()/getEndpoint()
- `triply/src/app/core/services/loading.service.ts` - Signal-based counter: isLoading computed, increment/decrement (never negative)
- `triply/src/app/core/api/interceptors/api-key.interceptor.ts` - API_SOURCE HttpContextToken + apiKeyInterceptor
- `triply/src/app/core/api/interceptors/error.interceptor.ts` - errorInterceptor normalizing to AppError via catchError
- `triply/src/app/core/api/interceptors/loading.interceptor.ts` - loadingInterceptor with finalize() guarantee
- `triply/src/app/app.config.ts` - Added provideHttpClient(withFetch(), withInterceptors([apiKey, error, loading]))

## Decisions Made
- Interceptor order (apiKey -> error -> loading) ensures API keys are injected on outbound path before network, errors are normalized on inbound path, and loading wraps the complete request/response lifecycle via finalize().
- loadingInterceptor uses only finalize() with no catchError — finalize fires on both terminal paths (complete and error), so the counter always decrements. Adding catchError before finalize would re-emit errors and break the chain.
- API_SOURCE is exported from api-key.interceptor.ts so feature services can import a single token to identify themselves and enable both key injection and error attribution in one place.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required at this stage. API keys remain empty string placeholders in environment files. Real keys will be needed when feature-phase API services are wired to live endpoints (Phases 4-9).

## Next Phase Readiness

- HTTP infrastructure complete: all feature services in Phases 4-9 can call HttpClient with withContext(new HttpContext().set(API_SOURCE, 'sourceName')) and receive AppError on failure
- LoadingService.isLoading ready for global spinner wiring in shell component
- Remaining Phase 2 plans (02-02 through 02-07) can proceed to add API-specific proxy configurations and service scaffolding

---
*Phase: 02-api-integration-layer*
*Completed: 2026-02-12*

## Self-Check: PASSED

Files verified present:
- FOUND: triply/src/app/core/api/api-config.service.ts
- FOUND: triply/src/app/core/api/models/app-error.model.ts
- FOUND: triply/src/app/core/services/loading.service.ts
- FOUND: triply/src/app/core/api/interceptors/api-key.interceptor.ts
- FOUND: triply/src/app/core/api/interceptors/error.interceptor.ts
- FOUND: triply/src/app/core/api/interceptors/loading.interceptor.ts
- FOUND: triply/src/app/app.config.ts (modified)

Commits verified:
- edd1982: feat(02-01): create ApiConfigService, AppError model, and LoadingService
- e37a1f9: feat(02-01): create three functional HTTP interceptors
- 69c4253: feat(02-01): register provideHttpClient with interceptors in app.config.ts

Build: ng build passes with zero errors.
