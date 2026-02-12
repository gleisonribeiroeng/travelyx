---
phase: 11-ux-polish
plan: 03
subsystem: ux-layer
tags: [error-handling, button-prominence, consistency]
requires: [11-01-error-banner, 11-02-global-styles]
provides: [flights-error-banner, hotels-error-banner, cars-error-banner, raised-button-consistency]
affects: [search, hotel-search, car-search]
dependency_graph:
  upstream: [ErrorBannerComponent, global-empty-state-styles]
  downstream: [transport-search, tour-search, attraction-search]
tech_stack:
  added: []
  patterns: [persistent-error-banner, signal-based-error-state, mat-raised-button]
key_files:
  created: []
  modified:
    - triply/src/app/features/search/search.component.ts
    - triply/src/app/features/search/search.component.html
    - triply/src/app/features/search/search.component.scss
    - triply/src/app/features/hotel-search/hotel-search.component.ts
    - triply/src/app/features/hotel-search/hotel-search.component.html
    - triply/src/app/features/car-search/car-search.component.ts
    - triply/src/app/features/car-search/car-search.component.html
decisions:
  - "Replace transient snackbar errors with persistent error banners for better error visibility"
  - "Use mat-raised-button for primary 'Add to Itinerary' actions for visual prominence"
  - "Remove duplicate .empty-state styles from search component (covered by global styles)"
  - "Keep external link buttons as mat-button (text-only, secondary action)"
metrics:
  duration_minutes: 4
  tasks_completed: 2
  files_modified: 7
  commits: 2
  build_status: success
completed_at: 2026-02-12T20:40:01Z
---

# Phase 11 Plan 03: Error Banners and Button Prominence for Flights, Hotels, Cars

**One-liner:** Persistent error banners and raised-button prominence for Flights, Hotels, and Cars search components.

## What Was Built

Upgraded the first three search components (Flights, Hotels, Cars) with persistent error banners and visually prominent primary action buttons:

1. **Error Banner Integration**
   - Imported ErrorBannerComponent into all three components
   - Added errorMessage and errorSource signals
   - Implemented dismissError() method for user-initiated error clearing
   - Added error banner elements in templates before results sections
   - Updated search methods to set error signals instead of showing snackbars
   - Removed error handler callback (withFallback already catches all errors)

2. **Button Prominence Upgrade**
   - Changed "Add to Itinerary" buttons from mat-button to mat-raised-button
   - Maintained color="primary" attribute for brand consistency
   - Kept external link buttons as mat-button (secondary actions remain subtle)

3. **SCSS Cleanup**
   - Removed duplicate .empty-state block from search.component.scss
   - Now relies on global .empty-state styles from 11-02-PLAN.md
   - Retained flight-specific layout styles (.flight-card, .flight-header, etc.)

## Technical Implementation

**Error State Pattern (applied to all 3 components):**
```typescript
errorMessage = signal<string | null>(null);
errorSource = signal<string | null>(null);

dismissError(): void {
  this.errorMessage.set(null);
  this.errorSource.set(null);
}

searchFlights(): void {
  this.errorMessage.set(null); // Clear previous errors
  // ... search logic
  .subscribe({
    next: (result) => {
      if (result.error) {
        this.errorMessage.set(result.error.message);
        this.errorSource.set(result.error.source);
        this.searchResults.set([]);
      } else {
        this.searchResults.set(result.data);
      }
    },
    // No error handler - withFallback catches all
  });
}
```

**Template Pattern (all 3 components):**
```html
<!-- Error Banner -->
@if (errorMessage()) {
  <app-error-banner
    [source]="errorSource() ?? 'Flights'"
    [message]="errorMessage()!"
    (dismiss)="dismissError()"
  />
}
```

**Button Upgrade:**
```html
<!-- Before -->
<button mat-button color="primary" (click)="addToItinerary(item)">

<!-- After -->
<button mat-raised-button color="primary" (click)="addToItinerary(item)">
```

## Deviations from Plan

None - plan executed exactly as written. All modifications followed the documented pattern.

## Verification Results

**Build Status:** Success

```bash
npx ng build --configuration=development
# Build completed without errors
```

**Template Verification:**
- search.component.html: app-error-banner at line 116, mat-raised-button at line 198
- hotel-search.component.html: app-error-banner at line 122, mat-raised-button at line 171
- car-search.component.html: app-error-banner at line 151, mat-raised-button at line 216

**Component Integration:**
- All 3 components import ErrorBannerComponent
- All 3 components have errorMessage and errorSource signals
- All 3 components have dismissError() method
- No snackbar.open calls remain in error paths (only success snackbars for itinerary add)

## Dependencies

**Requires:**
- ErrorBannerComponent (11-01)
- Global .empty-state styles (11-02)

**Enables:**
- Consistent error handling pattern for transport-search (11-04)
- Consistent error handling pattern for tour-search (11-05)
- Consistent error handling pattern for attraction-search (11-06)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1    | d7428fe | Add error banners and button prominence to Flights search |
| 2    | 6f52c5e | Add error banners and button prominence to Hotels and Cars search |

## Self-Check: PASSED

**Modified files verified:**
```bash
# All files exist
[FOUND] triply/src/app/features/search/search.component.ts
[FOUND] triply/src/app/features/search/search.component.html
[FOUND] triply/src/app/features/search/search.component.scss
[FOUND] triply/src/app/features/hotel-search/hotel-search.component.ts
[FOUND] triply/src/app/features/hotel-search/hotel-search.component.html
[FOUND] triply/src/app/features/car-search/car-search.component.ts
[FOUND] triply/src/app/features/car-search/car-search.component.html
```

**Commits verified:**
```bash
[FOUND] d7428fe - feat(11-03): add error banners and button prominence to Flights search
[FOUND] 6f52c5e - feat(11-03): add error banners and button prominence to Hotels and Cars search
```

**Template assertions:**
- ✓ All 3 components have <app-error-banner> element
- ✓ All 3 components use mat-raised-button for "Add to Itinerary"
- ✓ All external links remain as mat-button
- ✓ Search component no longer has duplicate .empty-state styles

## Next Steps

Apply the same error banner + raised-button pattern to the remaining 3 search components (transport-search, tour-search, attraction-search) in plans 11-04, 11-05, 11-06.
