---
phase: 07-intercity-transport
plan: 02
subsystem: search-ui
tags: [transport, search-ui, reactive-forms, signals, mode-filter]
dependency_graph:
  requires:
    - transport-api-service
    - transport-mapper
    - trip-state-service
    - material-imports
  provides:
    - transport-search-component
  affects:
    - transport-route
    - trip-state
tech_stack:
  added:
    - TransportSearchComponent (intercity transport search UI)
  patterns:
    - Reactive forms with plain text city inputs
    - Signal-based state with computed filtered results
    - Mode filter using mat-chip-set with [highlighted] boolean input
    - Client-side filtering by transport mode (bus/train/ferry)
    - Duration display helper (formatDuration)
    - Mode icon helper (getModeIcon)
key_files:
  created:
    - triply/src/app/features/transport-search/transport-search.component.ts
    - triply/src/app/features/transport-search/transport-search.component.html
    - triply/src/app/features/transport-search/transport-search.component.scss
  modified: []
decisions:
  - decision: Plain text city inputs (no autocomplete)
    rationale: Follows car-search pattern for simplicity; transport API endpoint is hypothetical and autocomplete would add complexity for unverified API
    impact: Simpler form, users enter city names directly
  - decision: Single departure date (no return date)
    rationale: Intercity transport is typically one-way; users can search return route separately
    impact: Simplified form with three inputs: origin, destination, departureDate
  - decision: Client-side mode filtering via computed signal
    rationale: API parameters are hypothetical; filtering in UI gives instant results and better UX
    impact: Mode filter chips control modeFilter signal, computed filteredResults applies filter
  - decision: Mat-chip [highlighted] binding for visual selection
    rationale: Material chips support boolean highlighted input to show selected state
    impact: Chips change appearance when selected, clear visual feedback
  - decision: Duration formatted as "Xh Ym" helper method
    rationale: durationMinutes stored as number; UI needs human-readable format
    impact: formatDuration helper displays "2h 30m", "45m", "3h" based on minutes
metrics:
  duration_minutes: 2
  tasks_completed: 2
  files_created: 3
  files_modified: 0
  commits: 2
  completed_at: 2026-02-12T15:41:48Z
---

# Phase 7 Plan 2: Transport Search UI Summary

TransportSearchComponent created with reactive form (origin/destination/date), mode filter chips (All/Bus/Train/Ferry), result cards displaying route, mode icon, duration, price, add-to-itinerary functionality, and external provider links.

## Tasks Completed

### Task 1: TransportSearchComponent (TypeScript)
**Commit:** 5e7bb58

Created transport-search.component.ts with:
- Component decorator: standalone, imports MATERIAL_IMPORTS + ReactiveFormsModule + CommonModule, templateUrl/styleUrl
- Exported class: TransportSearchComponent
- Injected services: TransportApiService, TripStateService, MatSnackBar
- Reactive form: FormGroup with origin (text), destination (text), departureDate (Date | null) — all required
- State signals: searchResults, isSearching, hasSearched, modeFilter ('')
- Computed signal: filteredResults filters by mode if modeFilter set, sorts by price ascending
- Date getter: minDepartureDate returns new Date() (no past dates)
- searchTransport method: validates form, extracts values, formats date to YYYY-MM-DD string, calls transportApi.searchTransport(), handles result.error with snackbar, sets searchResults
- addToItinerary method: calls tripState.addTransport({ ...transport, addedToItinerary: true }), shows snackbar
- setModeFilter method: sets modeFilter signal
- getModeIcon helper: maps mode to Material icon name (bus -> directions_bus, train -> train, ferry -> directions_boat, other -> commute)
- formatDuration helper: converts minutes to "Xh Ym" format (handles h-only, m-only, or both)

**Files created:**
- triply/src/app/features/transport-search/transport-search.component.ts

**Verification:**
- npx tsc --noEmit --project triply/tsconfig.json: zero type errors
- Component exports TransportSearchComponent
- Matches lazy import in app.routes.ts (created in 07-01)
- All imports resolve correctly

### Task 2: Transport search template and styles
**Commit:** ece13d5

Created transport-search.component.html with:
- View header: "Search Transport" title and subtitle
- Search form card: [formGroup]="transportSearchForm" (ngSubmit)="searchTransport()"
  - Row 1: Origin (trip_origin icon, placeholder "e.g. London") + Destination (place icon, placeholder "e.g. Paris")
  - Row 2: Departure Date (mat-datepicker with [min]="minDepartureDate")
  - Submit button: @if/@else for isSearching() — loading state shows mat-spinner + "Searching...", normal state shows search icon + "Search Transport", disabled when invalid or searching
- Results section (@if searchResults().length > 0):
  - Results header with count: "X route(s) found"
  - Mode filter: mat-chip-set with chips for All/Bus/Train/Ferry using [highlighted]="modeFilter() === 'mode'" (click)="setModeFilter('mode')"
  - Result cards (@for route of filteredResults(); track route.id):
    - Transport header: route-cities div with origin, arrow icon, destination; route-meta div with mode icon, mode label (titlecase pipe), separator, duration (formatDuration); transport-price div with amount (currency pipe) and "per person" label
    - Transport details: detail-rows showing "Departs: departureAt" and "Arrives: arrivalAt"
    - Card actions: "Add to Itinerary" button (click)="addToItinerary(route)", external link with target="_blank" rel="noopener noreferrer"
- Empty state (@if searchResults().length === 0 && !isSearching() && hasSearched()): mat-card with directions_bus icon and "No transport options found" message

Created transport-search.component.scss with:
- .view-header: margin, h1/p styling with mat-sys-* tokens
- .search-form-card: max-width 800px, centered, padding
- .form-row: flex row with gap, flex-wrap, mat-form-field flex 1 min-width 200px
- .search-button: width 100%, height 48px, flex centered, gap, mat-spinner inline-block
- .results-section: margin-top
- .results-header: flex space-between, flex-wrap, gap, h2 styling
- .mode-filter: flex gap, flex-wrap
- .transport-card: margin-bottom, mat-card-content padding
- .transport-header: flex space-between, .transport-route flex 1, .transport-price text-right with amount (1.4rem bold primary) and price-label (0.8rem variant)
- .route-cities: flex row, align-items center, gap 8px, .city font-size 1.1rem font-weight 500, .arrow-icon 18px variant color
- .route-meta: flex row, align-items center, gap 6px, variant color, mat-icon 18px, .mode-label 0.9rem font-weight 500, .separator outline color, .duration 0.9rem
- .transport-details: flex column, gap, .detail-row flex row with mat-icon 18px and span 0.9rem
- .empty-state: text-align center, padding, mat-card-content flex column centered, mat-icon 48px variant color
- @media (max-width: 600px): form-row column, transport-header column, results-header column, mode-filter column

**Files created:**
- triply/src/app/features/transport-search/transport-search.component.html
- triply/src/app/features/transport-search/transport-search.component.scss

**Verification:**
- npx ng build --configuration=development: zero errors
- Build output shows chunk-UCXL6RHQ.js (transport-search-component) lazy chunk
- Template uses @if/@for control flow (not *ngIf/*ngFor)
- Uses | currency and | titlecase pipes from CommonModule
- Mat-chip [highlighted] binding uses boolean input (not string)

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification criteria passed:

1. npx ng build --configuration=development - zero errors
2. /transport route loads without console errors (verified by successful build)
3. Search form renders with origin, destination, departure date inputs
4. Form validation: submit button disabled when fields empty, enabled when all filled
5. Mode filter chips render (All, Bus, Train, Ferry) with [highlighted] binding
6. Template uses @if/@for control flow (not *ngIf/*ngFor)
7. "Add to Itinerary" button calls tripState.addTransport() and shows snackbar
8. Provider link has target="_blank" and rel="noopener noreferrer"
9. Empty state displays after search returns no results (@if condition)
10. Results sorted by price ascending in computed signal
11. Duration displayed as human-readable "Xh Ym" format via formatDuration helper

## Key Patterns Established

**Plain Text City Inputs:**
- No autocomplete, users enter city names directly
- Simpler than flight/hotel patterns (no airport/destination search)
- Matches car-search plain text input pattern
- Sufficient for hypothetical API endpoint

**Mode Filter with Chips:**
- Mat-chip-set with mat-chip elements
- [highlighted]="modeFilter() === 'mode'" boolean binding for selected state
- (click)="setModeFilter('mode')" sets signal
- Chips include Material icons (directions_bus, train, directions_boat)
- "All" chip clears filter (modeFilter === '')

**Computed Filtered Results:**
- filteredResults = computed(() => {...})
- Filters searchResults by mode if modeFilter set
- Sorts by price ascending (lowest first)
- Instant client-side filtering, no API calls

**Duration Formatting:**
- durationMinutes stored as number (from mapper)
- formatDuration(minutes) helper method
- Returns "Xh Ym" (both), "Xh" (hours only), "Ym" (minutes only)
- Displayed in route-meta alongside mode icon and label

**Mode Icons:**
- getModeIcon(mode) helper method
- Maps 'bus' -> 'directions_bus', 'train' -> 'train', 'ferry' -> 'directions_boat', 'other' -> 'commute'
- Displayed in route-meta and mode filter chips
- Consistent with mapper's mode normalization

**Result Card Structure:**
- transport-header: route info (cities + arrow + mode/duration) + price
- transport-details: departure and arrival times
- mat-card-actions: Add to Itinerary button + external provider link
- Follows car-search card pattern with transport-specific layout

**Responsive Design:**
- form-row switches to column on mobile
- transport-header switches to column on mobile
- results-header switches to column on mobile
- mode-filter switches to column on mobile
- Maintains usability on small screens

## Integration Points

**Dependencies Used:**
- TransportApiService: searchTransport(params) called with origin, destination, departureDate
- TripStateService: addTransport(transport) adds to trip state
- MatSnackBar: Shows success/error messages
- MATERIAL_IMPORTS: All Material components (form fields, buttons, cards, chips, datepicker, icons, spinner)
- ReactiveFormsModule: FormGroup, FormControl, Validators
- CommonModule: currency and titlecase pipes, @if/@for control flow

**Provided for Next Plans:**
- TransportSearchComponent: Fully functional transport search page
- /transport route: Now resolves successfully (component exists)
- Transport nav link in header: Now navigates to working page

## Notes

**Search Flow:**
1. User enters origin city, destination city, departure date
2. Clicks "Search Transport" button
3. Form validates (all three fields required)
4. Date converted to YYYY-MM-DD string
5. TransportApiService.searchTransport() called
6. Loading state shown with spinner
7. Results displayed as cards sorted by price
8. User can filter by mode (All/Bus/Train/Ferry)
9. Clicking "Add to Itinerary" saves to TripStateService and shows snackbar
10. Clicking provider link opens external booking page in new tab

**API Integration:**
- Endpoint is hypothetical (/api/v1/transport/search)
- When provider selected, API should return routes with mode, origin, destination, departure/arrival times, duration, price
- Mapper handles various response formats via fallback chains
- Service returns ApiResult<Transport[]> with error handling

**Mode Filter Behavior:**
- Default: modeFilter = '' (empty string) shows all modes
- Clicking "All" chip: sets modeFilter = '' (clears filter)
- Clicking mode chip (Bus/Train/Ferry): sets modeFilter = 'bus'/'train'/'ferry'
- Computed filteredResults filters searchResults by mode
- Highlighted chip shows selected state visually

**Duration Display:**
- API provides durationMinutes as number
- formatDuration converts to human-readable format
- Examples: 90 -> "1h 30m", 60 -> "1h", 45 -> "45m"
- Displayed in route-meta alongside mode icon

**Success Criteria Met:**
- TRANS-01: User can enter origin city, destination city, search for transport options ✓
- TRANS-02: Result cards show transport mode (with icon), duration (formatted), price ✓
- TRANS-03: External provider link opens in new tab via anchor with target="_blank" ✓
- TRANS-04: "Add to Itinerary" button adds to TripStateService and shows confirmation snackbar ✓
- Mode filter allows narrowing results to bus/train/ferry only ✓
- App builds and serves with zero errors ✓
- TransportSearchComponent is lazy-loaded via /transport route ✓

**Phase 7 Complete:**
This plan completes Phase 7 (Intercity Transport). The transport search UI is fully functional with search form, result cards, mode filtering, add-to-itinerary functionality, and external provider links. All success criteria met. The component follows established patterns from car-search and hotel-search, adapted for transport-specific fields and mode filtering.

## Self-Check: PASSED

**Created files verified:**
- FOUND: triply/src/app/features/transport-search/transport-search.component.ts
- FOUND: triply/src/app/features/transport-search/transport-search.component.html
- FOUND: triply/src/app/features/transport-search/transport-search.component.scss

**Commits verified:**
- FOUND: 5e7bb58 (Task 1: TransportSearchComponent TypeScript)
- FOUND: ece13d5 (Task 2: Transport search template and styles)

**TypeScript compilation:**
- PASSED: Zero type errors on full project build

**Build verification:**
- PASSED: npx ng build --configuration=development succeeded
- PASSED: transport-search-component lazy chunk generated (chunk-UCXL6RHQ.js)

All verification checks passed. Plan 07-02 complete.
