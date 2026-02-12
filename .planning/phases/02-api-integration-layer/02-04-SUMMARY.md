---
phase: 02-api-integration-layer
plan: 04
subsystem: api
tags: [angular, rxjs, retry, backoff, debounce, operators, http]

# Dependency graph
requires:
  - phase: 02-api-integration-layer
    plan: 01
    provides: AppError interface with status field used by withBackoff error.status check

provides:
  - withBackoff<T>() MonoTypeOperatorFunction — exponential backoff retry for 429/502/503/504 errors
  - RETRIABLE_STATUS_CODES constant — [429, 502, 503, 504]
  - DEFAULT_RETRY_CONFIG constant — { maxRetries: 3, initialDelay: 1000, maxDelay: 8000 }
  - debouncedSearch<TInput, TOutput>() OperatorFunction — debounceTime + distinctUntilChanged + filter + switchMap for search forms
  - DEFAULT_DEBOUNCE_MS constant — 400

affects:
  - 04 through 09 (all feature phases that call HttpClient or build search forms)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Modern RxJS retry({ count, delay }) API — never deprecated retryWhen
    - Exponential backoff delay = initialDelay * 2^(retryIndex-1) capped at maxDelay
    - debounceTime BEFORE switchMap pattern — prevents request creation on every keystroke
    - switchMap for request cancellation — only latest search in flight at any time
    - distinctUntilChanged with JSON.stringify deep comparison for form value deduplication

key-files:
  created:
    - triply/src/app/core/api/retry.utils.ts
    - triply/src/app/core/api/search.utils.ts
  modified: []

key-decisions:
  - "retryIndex starts at 1 in the modern retry() API — delay formula is initialDelay * 2^(retryIndex-1) to produce 1s/2s/4s sequence"
  - "debounceTime placed before switchMap in debouncedSearch — prevents Observable creation per keystroke, not just per emission"
  - "distinctUntilChanged uses JSON.stringify deep comparison — handles object-typed form values correctly"

patterns-established:
  - "Feature HTTP calls: pipe(withBackoff()) for automatic retry on transient errors"
  - "Search form streams: pipe(debouncedSearch(params => apiService.search(params))) for debounced, cancellable requests"

# Metrics
duration: 2min
completed: 2026-02-12
---

# Phase 2 Plan 04: Retry and Search Utilities Summary

**RxJS exponential backoff operator (withBackoff) for retriable HTTP errors and debounced search operator (debouncedSearch) preventing request spam from rapid form input**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-12T02:44:20Z
- **Completed:** 2026-02-12T02:45:10Z
- **Tasks:** 2
- **Files modified:** 2 (2 created)

## Accomplishments
- withBackoff uses modern RxJS 7.3+ `retry({ count, delay })` API — never deprecated retryWhen — with 1s/2s/4s exponential delay capped at 8s
- Non-retriable errors (400, 401, 403, 404) propagate immediately without consuming retry budget
- debouncedSearch applies the correct operator order: debounceTime before switchMap, preventing Observable creation on every keystroke
- Both utilities are framework-agnostic pipeable operators, reusable in any Angular service or component

## Task Commits

Each task was committed atomically:

1. **Task 1: Create exponential backoff retry operator** - `70225a3` (feat)
2. **Task 2: Create debounced search utility operator** - `e121543` (feat)

## Files Created/Modified
- `triply/src/app/core/api/retry.utils.ts` - withBackoff<T>(), RETRIABLE_STATUS_CODES, DEFAULT_RETRY_CONFIG
- `triply/src/app/core/api/search.utils.ts` - debouncedSearch<TInput, TOutput>(), DEFAULT_DEBOUNCE_MS

## Decisions Made
- The `retryIndex` parameter in the modern `retry({ delay })` callback starts at 1 (not 0), so the delay formula is `initialDelay * Math.pow(2, retryIndex - 1)` to produce the intended 1s / 2s / 4s sequence.
- `distinctUntilChanged` uses `JSON.stringify` deep comparison because search form values are typically objects — referential equality would trigger duplicate requests on every form event even when values are identical.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Both utilities are pure RxJS code with no external dependencies beyond the Angular project's existing rxjs package.

## Next Phase Readiness

- withBackoff ready: feature services in Phases 4-9 call `.pipe(withBackoff())` on HttpClient observables for automatic retry on 429/502/503/504
- debouncedSearch ready: search components call `.pipe(debouncedSearch(params => apiService.search(params)))` on form valueChanges
- Remaining Phase 2 plans (02-05 through 02-07) can proceed to add API-specific service scaffolding

---
*Phase: 02-api-integration-layer*
*Completed: 2026-02-12*

## Self-Check: PASSED

Files verified present:
- FOUND: triply/src/app/core/api/retry.utils.ts
- FOUND: triply/src/app/core/api/search.utils.ts
- FOUND: .planning/phases/02-api-integration-layer/02-04-SUMMARY.md

Commits verified:
- 70225a3: feat(02-04): create exponential backoff retry operator
- e121543: feat(02-04): create debounced search utility operator

Build: ng build passes with zero errors.
