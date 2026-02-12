---
phase: 11-ux-polish
plan: 04
subsystem: UX Polish (second half)
tags:
  - error-handling
  - ux
  - consistency
  - material-design
dependency_graph:
  requires:
    - 11-01-SUMMARY.md (ErrorBannerComponent)
    - 11-02-SUMMARY.md (shared card styles)
  provides:
    - Error banners in transport, tours, and attractions search
    - Consistent button prominence across all search components
  affects:
    - triply/src/app/features/transport-search/transport-search.component.ts
    - triply/src/app/features/transport-search/transport-search.component.html
    - triply/src/app/features/tour-search/tour-search.component.ts
    - triply/src/app/features/tour-search/tour-search.component.html
    - triply/src/app/features/attraction-search/attraction-search.component.ts
    - triply/src/app/features/attraction-search/attraction-search.component.html
tech_stack:
  added:
    - ErrorBannerComponent integration in 3 more search components
  patterns:
    - Signal-based error state (errorMessage, errorSource)
    - Persistent error banners with user dismissal
    - Mat-raised-button for primary actions
key_files:
  created: []
  modified:
    - triply/src/app/features/transport-search/transport-search.component.ts
    - triply/src/app/features/transport-search/transport-search.component.html
    - triply/src/app/features/tour-search/tour-search.component.ts
    - triply/src/app/features/tour-search/tour-search.component.html
    - triply/src/app/features/attraction-search/attraction-search.component.ts
    - triply/src/app/features/attraction-search/attraction-search.component.html
decisions: []
metrics:
  duration: 2 min
  completed: 2026-02-12T20:38:12Z
  tasks: 2
  commits: 2
---

# Phase 11 Plan 04: Error Banners and Button Prominence (Transport, Tours, Attractions) Summary

**One-liner:** Persistent error banners and raised-button styling applied to Transport, Tours, and Attractions search components (completing the 6-component UX upgrade).

## What Was Built

Integrated ErrorBannerComponent and upgraded button prominence for the second half of the 6 search categories:

1. **Transport Search** - Added error banner with Transport source, upgraded Add to Itinerary button to mat-raised-button
2. **Tours Search** - Added error banner with Tours source, upgraded Add to Itinerary button to mat-raised-button
3. **Attractions Search** - Added error banner with Attractions source, upgraded Add to Itinerary button to mat-raised-button

All three components now display persistent, dismissible error banners on API failure instead of transient snackbars, and use visually prominent raised buttons for primary actions.

## Implementation Details

### Pattern Applied (3x)

For each component (transport-search, tour-search, attraction-search):

**TypeScript changes:**
- Import ErrorBannerComponent from shared/components
- Add to imports array
- Add error state signals: `errorMessage = signal<string | null>(null)` and `errorSource = signal<string | null>(null)`
- Add dismissError() method to clear both signals
- In search method:
  - Call `this.errorMessage.set(null)` at start (clear previous errors)
  - On result.error: set errorMessage and errorSource from result.error (instead of snackbar)
  - Remove snackbar.open from error path (kept only itinerary success snackbar)

**HTML changes:**
- Add error banner after search form card, before results section:
  ```html
  @if (errorMessage()) {
    <app-error-banner
      [source]="errorSource() ?? '[Source]'"
      [message]="errorMessage()!"
      (dismiss)="dismissError()"
    />
  }
  ```
- Change `mat-button` to `mat-raised-button` on "Add to Itinerary" buttons

### Source Names Used
- Transport: "Transport"
- Tours: "Tours"
- Attractions: "Attractions"

## Technical Foundation

**Error state signals:**
- errorMessage: string | null - Holds error message text
- errorSource: string | null - Holds API source name
- Both cleared on new search and on user dismissal

**Error flow:**
1. User submits search → errorMessage.set(null)
2. API returns result.error → set errorMessage and errorSource from error object
3. Template displays <app-error-banner> with source and message
4. User clicks dismiss → dismissError() clears both signals
5. Banner disappears

**Button upgrade:**
- Changed from `mat-button` (flat) to `mat-raised-button` (elevated)
- Maintains `color="primary"` for theme consistency
- Increases visual prominence of primary action

## Verification Results

1. Build: `npx ng build --configuration=development` - PASSED (no errors)
2. All 3 components have errorMessage and errorSource signals - VERIFIED
3. All 3 HTML templates contain `<app-error-banner>` element - VERIFIED
4. All 3 HTML templates use `mat-raised-button` for "Add to Itinerary" - VERIFIED
5. No snackbar.open calls remain for error handling in these 3 components - VERIFIED

## Deviations from Plan

None - plan executed exactly as written.

## Before/After UX Impact

**Before:**
- Errors shown in transient snackbars that auto-dismiss in 3 seconds
- User might miss error message or not understand which API failed
- Add to Itinerary button used flat mat-button (low visual prominence)

**After:**
- Errors shown in persistent banners that remain until user dismisses
- Source name clearly identifies which API failed (Transport, Tours, or Attractions)
- Error banner uses Material Design error colors (red container)
- Add to Itinerary button uses elevated mat-raised-button (high visual prominence)
- Consistent error UX across all 6 search components (Flights, Hotels, Cars, Transport, Tours, Attractions)

## Commits

1. **5adc42b** - feat(11-04): add error banner and button prominence to Transport search
   - Import ErrorBannerComponent
   - Add errorMessage/errorSource signals
   - Replace snackbar with error banner
   - Upgrade button to mat-raised-button

2. **90d2684** - feat(11-04): add error banners and button prominence to Tours and Attractions
   - Apply same pattern to tour-search and attraction-search
   - Add error banners with Tours and Attractions sources
   - Upgrade buttons to mat-raised-button

## Self-Check: PASSED

**Files modified exist:**
```
FOUND: triply/src/app/features/transport-search/transport-search.component.ts
FOUND: triply/src/app/features/transport-search/transport-search.component.html
FOUND: triply/src/app/features/tour-search/tour-search.component.ts
FOUND: triply/src/app/features/tour-search/tour-search.component.html
FOUND: triply/src/app/features/attraction-search/attraction-search.component.ts
FOUND: triply/src/app/features/attraction-search/attraction-search.component.html
```

**Commits exist:**
```
FOUND: 5adc42b
FOUND: 90d2684
```

## Next Steps

Plan 11-05 will apply loading indicators and plan 11-06 will apply search field focus management to all 6 search components, completing the UX polish phase.
