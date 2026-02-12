---
phase: 08-tours-experiences
plan: 02
subsystem: ui
tags: [angular, signals, reactive-forms, material, tour-search]

# Dependency graph
requires:
  - phase: 08-01
    provides: TourApiService with searchTours() method and TourMapper
  - phase: 03-02
    provides: TripStateService with addActivity() method for itinerary management
  - phase: 01-02
    provides: Material Design theming with design tokens
provides:
  - TourSearchComponent with destination search form
  - Tour result cards with name, description, duration, price display
  - Add-to-itinerary button integration with TripStateService
  - External provider link with security attributes (target="_blank" rel="noopener noreferrer")
affects: [09-attractions, itinerary-timeline, user-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Simple single-field search form (destination only, no dates/travelers)
    - Null-safe duration rendering with @if/@else showing "Flexible duration"
    - 3-line description clamp using -webkit-line-clamp CSS
    - sortedResults computed signal for price-ascending sort without filter controls

key-files:
  created:
    - triply/src/app/features/tour-search/tour-search.component.ts
    - triply/src/app/features/tour-search/tour-search.component.html
    - triply/src/app/features/tour-search/tour-search.component.scss
  modified: []

key-decisions:
  - "Tours search uses destination-only form (simpler than transport/hotel multi-field forms)"
  - "No client-side filtering controls - results only sorted by price ascending via computed signal"
  - "Description clamped to 3 lines with -webkit-line-clamp for compact cards"
  - "Duration null handling with explicit 'Flexible duration' text instead of hiding field"

patterns-established:
  - "Activity search pattern: destination field → API call → result cards with add-to-itinerary"
  - "Null-safe duration rendering: @if (tour.durationMinutes !== null) {...} @else {Flexible}"
  - "Price display with | currency pipe using tour.price.currency for dynamic currency symbol"

# Metrics
duration: 1min
completed: 2026-02-12
---

# Phase 08 Plan 02: Tour Search Component Summary

**Destination-based tour search with result cards showing name, description (3-line clamp), duration/flexible, and price sorted ascending**

## Performance

- **Duration:** 1 min 33 sec
- **Started:** 2026-02-12T16:36:56Z
- **Completed:** 2026-02-12T16:38:29Z
- **Tasks:** 2
- **Files created:** 3

## Accomplishments

- TourSearchComponent with destination-only reactive form (simpler than transport/hotel patterns)
- Tour result cards with comprehensive display: name, city, description, duration (or "Flexible"), price
- Null-safe duration rendering with @if/@else control flow
- External provider link with security attributes and "Add to Itinerary" button
- sortedResults computed signal for automatic price-ascending sort
- Responsive layout with mobile-first design collapsing to single column

## Task Commits

Each task was committed atomically:

1. **Task 1: TourSearchComponent TypeScript** - `9f092b9` (feat)
   - Component with destination-only form, signal state, sortedResults computed signal
   - searchTours() calls TourApiService.searchTours()
   - addToItinerary() calls TripStateService.addActivity()
   - formatDuration() helper for minutes to 'Xh Ym' format

2. **Task 2: Tour search template and styles** - `47ccb7a` (feat)
   - Template with @if/@for control flow, destination search form
   - Result cards with name, description (3-line clamp), city, duration/flexible, price
   - | currency pipe for dynamic currency display
   - External link with target="_blank" rel="noopener noreferrer"
   - Responsive styles following transport-search pattern

## Files Created/Modified

**Created:**
- `triply/src/app/features/tour-search/tour-search.component.ts` - Tour search component with reactive form, signal state, search/add-to-itinerary methods
- `triply/src/app/features/tour-search/tour-search.component.html` - Template with destination form, result cards (name, description, duration/flexible, price), empty state
- `triply/src/app/features/tour-search/tour-search.component.scss` - Styles with design tokens, 3-line description clamp, responsive mobile layout

## Decisions Made

1. **Single-field form:** Tours search requires only destination (no dates/travelers) for simpler UX compared to flights/hotels
2. **No filter controls:** Unlike transport (bus/train/ferry filters), tours show all results sorted by price ascending only
3. **3-line description clamp:** Used -webkit-line-clamp CSS to keep result cards compact and scannable
4. **Explicit "Flexible duration" text:** Rather than hiding the duration field when null, show descriptive text for clarity

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - straightforward implementation following transport-search pattern with simplified form structure.

## User Setup Required

None - no external service configuration required. API integration handled by TourApiService created in 08-01.

## Next Phase Readiness

Tour search feature complete. Ready for:
- **Phase 09 (Attractions):** Final search feature using similar pattern
- **Itinerary timeline:** Activities from tour search can now be added to itinerary via TripStateService.addActivity()
- **User flow testing:** End-to-end tour search → add to itinerary → view in timeline

**Blockers:** None

**Notes:**
- Viator API endpoint (`/partner/products/search`) is hypothetical pending partnership approval
- API will be validated in production via CORS proxy when credentials obtained
- Mapper handles response format uncertainty with defensive extraction chains

---

## Self-Check: PASSED

**Files exist:**
```
FOUND: triply/src/app/features/tour-search/tour-search.component.ts
FOUND: triply/src/app/features/tour-search/tour-search.component.html
FOUND: triply/src/app/features/tour-search/tour-search.component.scss
```

**Commits exist:**
```
FOUND: 9f092b9
FOUND: 47ccb7a
```

All claims verified.

---
*Phase: 08-tours-experiences*
*Completed: 2026-02-12*
