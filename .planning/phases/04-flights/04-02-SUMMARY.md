---
phase: 04-flights
plan: 02
subsystem: ui
tags: [search, flights, autocomplete, material, angular]

# Dependency graph
requires:
  - phase: 04-flights
    plan: 01
    provides: FlightApiService with OAuth2 and searchAirports/searchFlights
  - phase: 03-state-persistence
    provides: TripStateService with addFlight() method
provides:
  - SearchComponent with flight search form, autocomplete, result cards, filter, and add-to-itinerary
  - MatAutocompleteModule in MATERIAL_IMPORTS for shared use across feature components
affects: [phase-4-verification, user-facing-search-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Reactive forms with custom validators (airportValidator for type validation)
    - RxJS autocomplete with debounce and switchMap for API-backed suggestions
    - Signal-based computed filtering and sorting for client-side result manipulation
    - Material date range picker with dynamic min date validation
    - Content projection with @if/@else for button states (separate buttons to avoid projection warnings)

key-files:
  created: []
  modified:
    - triply/src/app/core/material.exports.ts
    - triply/src/app/features/search/search.component.ts
    - triply/src/app/features/search/search.component.html
    - triply/src/app/features/search/search.component.scss

key-decisions:
  - "Autocomplete uses string type guard with explicit (v as string) cast to satisfy TypeScript strict mode"
  - "Filter chip counts computed via helper methods (countDirectFlights/countStopoverFlights) to avoid arrow functions in template bindings"
  - "Search button split into two separate buttons wrapped in @if/@else to avoid Angular content projection warnings with Material button slots"
  - "Airport validator returns null for empty values (lets required validator handle), invalidAirport error for string or missing iataCode"

patterns-established:
  - "Signal-based computed() for derived state (filteredFlights) enables reactive filter/sort without manual subscriptions"
  - "FormGroup with nested FormGroup for dateRange maintains clean structure for date range picker binding"
  - "displayAirport() function provides clean display format for autocomplete without template logic"
  - "Add-to-itinerary pattern: call TripStateService.addFlight() then show snackbar confirmation"

# Metrics
duration: 3min
completed: 2026-02-12
---

# Phase 04 Plan 02: Flight Search UI Summary

**Full-featured flight search form with airport autocomplete, Material date range picker, result cards with filter/sort, and add-to-itinerary integration**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-12T12:31:34Z
- **Completed:** 2026-02-12T12:34:35Z
- **Tasks:** 1
- **Files modified:** 4

## Accomplishments
- SearchComponent replaces placeholder with fully functional flight search form
- Airport autocomplete backed by FlightApiService.searchAirports() with 300ms debounce
- Material date range picker validates departure required, return optional, min dates enforced
- Flight result cards display all data: airline, flight number, route, duration, stops, price, times
- Filter chips toggle between all/direct/stopovers with live count display
- Sort dropdown orders by price (lowest), duration (shortest), or stops (fewest)
- Add to Itinerary button writes to TripStateService and persists via Phase 3 effect() auto-save
- Provider link opens booking site in new tab with rel="noopener noreferrer" security
- Empty state shown when no results found after search
- Loading state with spinner during API call

## Task Commits

Each task was committed atomically:

1. **Task 1: Add MatAutocompleteModule to shared imports and build SearchComponent with flight form and results** - `7364278` (feat)

## Files Created/Modified
- `triply/src/app/core/material.exports.ts` - Added MatAutocompleteModule to MATERIAL_IMPORTS array for shared use
- `triply/src/app/features/search/search.component.ts` - Full SearchComponent with reactive form, autocomplete observables, search/filter/sort signals, add-to-itinerary integration
- `triply/src/app/features/search/search.component.html` - Flight search form template with autocomplete, date range picker, result cards, filter chips, sort dropdown
- `triply/src/app/features/search/search.component.scss` - Complete layout styles for form, cards, responsive breakpoints

## Decisions Made
- Used separate buttons wrapped in @if/@else for search/searching states to avoid Angular Material content projection warnings with mat-raised-button slots
- Autocomplete observables use explicit `(v as string)` cast in filter operator to satisfy TypeScript strict mode type checking
- Filter chip counts moved to helper methods (countDirectFlights, countStopoverFlights) because Angular template parser rejects arrow functions in interpolation bindings
- Airport validator checks for object with iataCode property, returning invalidAirport error if user types string but doesn't select from autocomplete

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Angular template parser errors with arrow functions in bindings**
- **Found during:** Task 1 verification (build step)
- **Issue:** Angular template parser rejects arrow function syntax in interpolation bindings like `{{ searchResults().filter(f => f.stops === 0).length }}`. Error: "Bindings cannot contain assignments at column 28"
- **Fix:** Created helper methods countDirectFlights() and countStopoverFlights() in component class to compute filter counts
- **Files modified:** search.component.ts, search.component.html
- **Commit:** 7364278 (included in original commit)

**2. [Rule 1 - Bug] Fixed TypeScript type inference error in RxJS filter operator**
- **Found during:** Task 1 verification (build step)
- **Issue:** TypeScript couldn't infer that v.length is valid after `typeof v === 'string'` check. Error: "Property 'length' does not exist on type 'never'"
- **Fix:** Added explicit type cast `(v as string).length` in filter predicate to satisfy strict type checking
- **Files modified:** search.component.ts
- **Commit:** 7364278 (included in original commit)

**3. [Rule 1 - Bug] Fixed Material button content projection warning**
- **Found during:** Task 1 verification (build step)
- **Issue:** Angular warning NG8011 about content projection when @else block contains multiple nodes (mat-icon + span). Material button expects single projectable node in icon slot.
- **Fix:** Split into two separate buttons wrapped in @if/@else blocks instead of single button with conditional content
- **Files modified:** search.component.html
- **Commit:** 7364278 (included in original commit)

## Issues Encountered

None after fixes applied. All build errors were auto-fixed per deviation rules 1-3.

## User Setup Required

None. FlightApiService is already configured with OAuth2 token management from Plan 04-01. Search component works immediately.

## Next Phase Readiness

Flight search feature is fully functional and ready for user testing. The vertical slice is complete:
- User enters origin/destination with autocomplete
- User selects dates and passengers
- User sees flight results with price/duration/stops
- User filters by direct/stopover and sorts by price/duration/stops
- User adds flight to itinerary (persisted to localStorage via Phase 3)
- User follows provider link to external booking site

No blockers. Phase 4 (Flights) is complete. Ready to proceed to Phase 5 (Hotels) or Phase 6 (Car Rentals).

## Self-Check: PASSED

All files and commits verified:
- FOUND: triply/src/app/core/material.exports.ts
- FOUND: triply/src/app/features/search/search.component.ts
- FOUND: triply/src/app/features/search/search.component.html
- FOUND: triply/src/app/features/search/search.component.scss
- FOUND: 7364278 (Task 1 commit)

---
*Phase: 04-flights*
*Completed: 2026-02-12*
