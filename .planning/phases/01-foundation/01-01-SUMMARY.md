---
phase: 01-foundation
plan: 01
subsystem: ui
tags: [angular, angular-cli, standalone-components, routing, typescript, scss]

# Dependency graph
requires: []
provides:
  - Angular 21 project scaffolded in triply/ with standalone bootstrap
  - Lazy-loaded routing to SearchComponent and ItineraryComponent
  - Feature-first folder structure (features/search/, features/itinerary/)
  - Strict mode TypeScript build passing with zero errors
affects:
  - 01-02 (Angular Material setup builds on this project)
  - 01-03 (global styles build on this SCSS setup)
  - 01-04 (TripStateService uses this routing infrastructure)
  - All subsequent phases (every plan extends this Angular project)

# Tech tracking
tech-stack:
  added: [angular@21, @angular/cli@21, @angular/router, typescript, scss]
  patterns:
    - Standalone component architecture (no NgModule)
    - Lazy-loaded feature routes via loadComponent
    - Feature-first folder structure (features/{name}/{name}.component.ts)

key-files:
  created:
    - triply/src/main.ts
    - triply/src/app/app.config.ts
    - triply/src/app/app.routes.ts
    - triply/src/app/app.ts
    - triply/src/app/app.html
    - triply/src/app/features/search/search.component.ts
    - triply/src/app/features/search/search.component.html
    - triply/src/app/features/itinerary/itinerary.component.ts
    - triply/src/app/features/itinerary/itinerary.component.html
    - triply/angular.json
    - triply/package.json
    - triply/tsconfig.json
  modified: []

key-decisions:
  - "Angular CLI v21 was installed (not v19 as assumed by plan) — file naming convention adapted: components use .component.ts suffix manually since CLI v21 generates .ts without .component"
  - "Class names SearchComponent and ItineraryComponent explicitly defined to match plan's loadComponent import paths"
  - "standalone: true explicitly declared in components for clarity even though it is the default in v21"
  - "provideZoneChangeDetection({ eventCoalescing: true }) added to appConfig as required by plan"

patterns-established:
  - "Feature component naming: {name}.component.ts, {name}.component.html, {name}.component.scss under features/{name}/"
  - "All components are standalone (no NgModule declarations)"
  - "Routes use loadComponent for lazy loading: import('./features/{name}/{name}.component').then(m => m.{Name}Component)"
  - "Default route redirects to search, wildcard falls back to search"

# Metrics
duration: 3min
completed: 2026-02-11
---

# Phase 1 Plan 01: Angular Project Scaffold Summary

**Angular 21 standalone project with lazy-loaded routing to placeholder SearchComponent and ItineraryComponent, building with zero errors in strict mode**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-11T17:15:21Z
- **Completed:** 2026-02-11T17:18:08Z
- **Tasks:** 2 of 2
- **Files modified:** 15

## Accomplishments

- Angular 21 project scaffolded in `triply/` with `--standalone --routing --style=scss --strict`
- `main.ts` uses `bootstrapApplication(App, appConfig)` with no NgModule
- `app.config.ts` exports `appConfig` with `provideRouter(routes)` and `provideZoneChangeDetection({ eventCoalescing: true })`
- `app.html` reduced to `<router-outlet>` only
- Two placeholder feature components created: `SearchComponent` and `ItineraryComponent`
- `app.routes.ts` has 4 routes with `loadComponent` lazy loading for both features
- `ng build` passes with zero errors; lazy chunks `search-component` and `itinerary-component` generated

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Angular project with standalone defaults** - `f3c198c` (feat)
2. **Task 2: Create feature placeholder components and lazy route table** - `1412be5` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `triply/src/main.ts` — Application entry point, bootstraps App with appConfig
- `triply/src/app/app.config.ts` — ApplicationConfig with provideRouter and provideZoneChangeDetection
- `triply/src/app/app.routes.ts` — 4-route table: redirect, search (lazy), itinerary (lazy), wildcard
- `triply/src/app/app.ts` — Root App component (standalone), imports RouterOutlet
- `triply/src/app/app.html` — Template with only `<router-outlet>`
- `triply/src/app/features/search/search.component.ts` — Placeholder SearchComponent (standalone: true)
- `triply/src/app/features/search/search.component.html` — Search placeholder template
- `triply/src/app/features/itinerary/itinerary.component.ts` — Placeholder ItineraryComponent (standalone: true)
- `triply/src/app/features/itinerary/itinerary.component.html` — Itinerary placeholder template
- `triply/angular.json` — Angular CLI workspace config
- `triply/package.json` — Dependencies for Angular 21
- `triply/tsconfig.json` — TypeScript config with strict mode

## Decisions Made

- **Angular CLI v21 used instead of v19:** The plan referenced Angular 19+ but CLI v21 was installed. File names were adapted — CLI v21 generates `component.ts` without `.component` suffix, but we manually created files with `.component.ts` naming convention as specified in the plan's must_haves artifacts.
- **Class names explicitly set:** CLI v21 uses short class names (`Search`, `Itinerary`), but plan requires `SearchComponent` and `ItineraryComponent` for the lazy route imports — manually created component files with correct export names.
- **provideBrowserGlobalErrorListeners retained:** CLI v21 generates this in appConfig by default; kept alongside provideZoneChangeDetection as it is non-breaking and part of v21's error handling.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Adaptation] Angular CLI v21 naming convention differs from plan expectations**
- **Found during:** Task 1 and Task 2
- **Issue:** CLI v21 generates files as `search.ts` / `itinerary.ts` with class names `Search`/`Itinerary`, but the plan's must_haves require `search.component.ts` and exports `SearchComponent`/`ItineraryComponent`
- **Fix:** After generating with CLI (for correct angular.json registration), manually created `.component.ts` files with correct export names and removed CLI-generated `.ts` files
- **Files modified:** All feature component files
- **Verification:** `ng build` produces lazy chunks named `search-component` and `itinerary-component` with zero errors
- **Committed in:** `1412be5` (Task 2 commit)

---

**Total deviations:** 1 auto-adaptation (naming convention difference between CLI v21 and plan expectations)
**Impact on plan:** Naming adaptation was required for correctness — route import paths in must_haves explicitly reference `.component` naming. No scope creep.

## Issues Encountered

- Angular CLI v21.1.3 was installed (latest) rather than targeting v19 as plan assumed. All API differences were handled automatically. The standalone component model and lazy routing APIs are identical between v19 and v21.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Angular project in `triply/` builds and serves with zero errors
- Standalone component architecture established — all future components follow the same pattern
- Ready for Plan 01-02: Angular Material installation and theme setup
- No blockers

---
*Phase: 01-foundation*
*Completed: 2026-02-11*

## Self-Check: PASSED

All 9 key files found on disk. Both task commits (f3c198c, 1412be5) verified in git log.
