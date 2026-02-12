---
phase: 09-attractions
plan: 02
subsystem: attractions-ui
tags: [angular, component, search-ui, attractions, material-design]
dependency_graph:
  requires:
    - 09-01-PLAN.md (AttractionApiService and AttractionMapper)
    - 01-02-PLAN.md (Material theme and MATERIAL_IMPORTS)
    - 03-02-PLAN.md (TripStateService.addAttraction method)
  provides:
    - AttractionSearchComponent (city search form, result cards, add to itinerary)
  affects:
    - app.routes.ts (will need routing configuration in future integration)
tech_stack:
  added:
    - AttractionSearchComponent (Angular standalone component)
  patterns:
    - City-only search form (simpler pattern from tours, not multi-field like hotels/transport)
    - Nullable link conditional rendering with @if (attraction.link !== null)
    - Category chip display with mat-chip component
    - Signal-based state management (searchResults, isSearching, hasSearched)
    - NO sorting computed signal (attractions have no price unlike tours)
key_files:
  created:
    - triply/src/app/features/attraction-search/attraction-search.component.ts
    - triply/src/app/features/attraction-search/attraction-search.component.html
    - triply/src/app/features/attraction-search/attraction-search.component.scss
  modified: []
decisions:
  - decision: "Use city-only form instead of multi-field form"
    rationale: "Attractions search only needs city parameter, following TourSearchComponent simplicity pattern"
    alternatives: "Could have added date range or category filters, but keeping MVP scope focused"
  - decision: "NO sorting computed signal for attractions"
    rationale: "Attractions have no price field (unlike tours), so sorting by price is not applicable"
    alternatives: "Could sort by category or distance, but API order is sufficient for initial version"
  - decision: "Conditional link rendering with @if (attraction.link !== null)"
    rationale: "Attractions may not have official URLs (link field is nullable), must handle gracefully"
    alternatives: "Could hide entire card actions section when no link, but would lose Add to Itinerary button"
  - decision: "Category displayed as mat-chip instead of plain text"
    rationale: "Visual distinction for category makes cards more scannable and follows Material Design chip pattern"
    alternatives: "Could use icon mapping (museum -> museum icon), but chips are simpler and more flexible"
metrics:
  tasks_completed: 2
  duration_minutes: 2
  files_created: 3
  commits: 2
  completed_at: "2026-02-12T17:45:04Z"
---

# Phase 09 Plan 02: Attraction Search UI Summary

**One-liner:** City-based attraction search component with category chips, nullable official links, and add-to-itinerary functionality following established search pattern.

## Objective Achieved

Created AttractionSearchComponent as the final UI component for Phase 9, completing the attractions feature. The component provides a city-based search form, displays results as cards with category chips and conditional official links, and integrates with TripStateService for itinerary management. This is the last of 6 search categories (flights, hotels, cars, transport, tours, attractions).

## Implementation Summary

### Task 1: AttractionSearchComponent TypeScript
**Duration:** 1 minute | **Commit:** f9b0770

Created standalone component with:
- **Form structure:** City-only reactive form with Validators.required (simpler than hotels/transport multi-field forms)
- **Signal state:** searchResults, isSearching, hasSearched (following tour-search pattern)
- **NO sorting computed signal:** Attractions have no price field, results displayed in API order
- **searchAttractions() method:** Calls AttractionApiService.searchAttractions() with finalize pattern for loading state
- **addToItinerary() method:** Calls TripStateService.addAttraction() (NOT addActivity like tours)
- **Error handling:** Snackbar notifications for search failures

**Key differences from TourSearchComponent:**
- No sortedResults computed signal (no price to sort by)
- addAttraction() instead of addActivity()
- No formatDuration() helper (attractions don't have duration)

### Task 2: Attraction Search Template and Styles
**Duration:** 1 minute | **Commit:** ef67f36

**Template features:**
- **View header:** "Search Attractions" with descriptive subtitle about tourist attractions
- **Search form:** Single city field with place icon prefix and required validation
- **Submit button:** Two-button @if/@else pattern (searching spinner vs enabled search button)
- **Result cards:** Name, category chip, city, conditional description
- **Conditional link:** `@if (attraction.link !== null)` guards "View Official Site" button
- **Add to itinerary:** Primary button calling addToItinerary(attraction)
- **Empty state:** Museum icon with "No attractions found" message
- **Modern control flow:** Uses @if/@for exclusively (NOT *ngIf/*ngFor)

**SCSS features:**
- **Renamed classes:** .attraction-card, .attraction-header, .attraction-info, .attraction-name, .attraction-meta, .attraction-description (NOT .tour-*)
- **NO price section:** Removed .tour-price block entirely since attractions are free informational listings
- **Mat-chip styling:** Added specific font-size: 0.75rem for category chips in .attraction-meta
- **Consistent layout:** Follows tour-search pattern for view-header, search-form-card, results-section, empty-state
- **Responsive design:** Mobile breakpoint collapses form-row and attraction-header to single column

**Key template differences from tours:**
- No price display (attractions are free)
- Category displayed as `<mat-chip>{{ attraction.category }}</mat-chip>`
- Link conditionally rendered (tours always have link)
- No duration display (attractions don't have duration)
- Results iterated directly from searchResults() (no sortedResults)

## Deviations from Plan

None - plan executed exactly as written. All component patterns followed TourSearchComponent closely with documented differences for attractions-specific fields (category chip, nullable link, no price/duration).

## Verification Results

All verification steps passed:

1. **TypeScript compilation:** `npx tsc --noEmit` passes with zero errors
2. **Component export:** AttractionSearchComponent is exported
3. **Service injection:** inject(AttractionApiService) and inject(TripStateService) present
4. **Method calls:** addToItinerary calls tripState.addAttraction() (verified via grep)
5. **API integration:** searchAttractions subscribes to attractionApi.searchAttractions()
6. **Template control flow:** Uses @if/@for exclusively (7 instances, 0 *ngIf/*ngFor)
7. **Key patterns:**
   - `@if (attraction.link !== null)` guards official link rendering
   - `<mat-chip>{{ attraction.category }}</mat-chip>` displays category
   - `addToItinerary(attraction)` called on button click
   - Empty state uses museum icon
8. **SCSS classes:** All .attraction-* classes present (7 instances), zero .tour-* classes remain
9. **Responsive layout:** Mobile breakpoint defined for single-column layout

## Self-Check: PASSED

**Files verification:**
- FOUND: triply/src/app/features/attraction-search/attraction-search.component.ts
- FOUND: triply/src/app/features/attraction-search/attraction-search.component.html
- FOUND: triply/src/app/features/attraction-search/attraction-search.component.scss

**Commits verification:**
- FOUND: f9b0770 (feat(09-02): create AttractionSearchComponent with city search form)
- FOUND: ef67f36 (feat(09-02): add attraction search template and styles)

## Success Criteria Met

- [x] User can enter a city name and submit the form to search for attractions
- [x] Search results display as cards with name, category chip, city, optional description
- [x] Each card has "Add to Itinerary" button that calls TripStateService.addAttraction()
- [x] Official link button ("View Official Site") appears ONLY when attraction.link is not null
- [x] Empty state message appears when search returns no results
- [x] Styles are consistent with tour-search component (same spacing, layout, design tokens)
- [x] Zero TypeScript compilation errors

## Integration Notes

**Ready for integration:**
- Component is standalone with all dependencies injected
- Follows Material Design with MATERIAL_IMPORTS
- Uses TripStateService for state management
- Calls AttractionApiService for data fetching

**Routing required:**
- Add route to app.routes.ts: `{ path: 'attractions', component: AttractionSearchComponent }`
- Add navigation link in app.component.ts sidenav (already added in Phase 09-01)

**API key required:**
- OpenTripMap API key must be set in environment.attractionsApiKey
- Key injected via apiKeyInterceptor with source: 'attractions'
- Proxy configured in proxy.conf.json (added in Phase 09-01)

## Phase 9 Status

**Phase 9 (Attractions) is now COMPLETE:**
- 09-01: Attractions API Integration (AttractionApiService, AttractionMapper) ✓
- 09-02: Attraction Search UI (AttractionSearchComponent) ✓

**All 6 search categories implemented:**
1. Flights (Phase 4) ✓
2. Hotels (Phase 5) ✓
3. Car Rental (Phase 6) ✓
4. Intercity Transport (Phase 7) ✓
5. Tours (Phase 8) ✓
6. Attractions (Phase 9) ✓

Next phase: 10-itinerary-timeline (Itinerary timeline UI and drag-and-drop scheduling)
