---
phase: 10-itinerary-builder
plan: 3
subsystem: itinerary-builder
tags: [itinerary, search-integration, state-management]
dependency_graph:
  requires: [10-01, 10-02, phase-04, phase-05, phase-06, phase-07, phase-08, phase-09]
  provides: [search-to-itinerary-wiring]
  affects: [all-search-components, itinerary-view]
tech_stack:
  added: []
  patterns: [datetime-parsing, fallback-dates, crypto-uuid]
key_files:
  created: []
  modified:
    - triply/src/app/features/search/search.component.ts
    - triply/src/app/features/hotel-search/hotel-search.component.ts
    - triply/src/app/features/car-search/car-search.component.ts
    - triply/src/app/features/transport-search/transport-search.component.ts
    - triply/src/app/features/tour-search/tour-search.component.ts
    - triply/src/app/features/attraction-search/attraction-search.component.ts
    - triply/src/app/features/itinerary/itinerary.component.ts
decisions:
  - key: datetime-extraction-pattern
    summary: "Split ISO 8601 datetime strings on 'T' to extract date and time separately"
    rationale: "Flights, cars, and transport have departureAt/pickUpAt as ISO datetime strings; splitting on 'T' gives YYYY-MM-DD date and HH:MM:SS time, with substring(0,5) for HH:MM timeSlot"
  - key: null-timeslot-for-all-day
    summary: "Hotels use null timeSlot (all-day items)"
    rationale: "Check-in is a date-only field (YYYY-MM-DD); no specific time slot needed, so timeSlot is null to indicate all-day item"
  - key: fallback-date-strategy
    summary: "Tours and attractions use trip start date as default, with today's date fallback"
    rationale: "These items don't have inherent dates; using trip start date provides sensible default while allowing user to edit; today's date fallback handles edge case of trip dates not set"
  - key: order-always-zero
    summary: "All ItineraryItem.order set to 0 at creation"
    rationale: "Computed signal in ItineraryComponent sorts by timeSlot first, then order; new items default to 0 and user can reorder via UI"
metrics:
  duration: 2 min
  tasks_completed: 1
  files_modified: 7
  tests_added: 0
  completed_at: "2026-02-12T18:34:00Z"
---

# Phase 10 Plan 3: Wire Search Components to Create Itinerary Items Summary

**One-liner:** All 6 search components now create ItineraryItem entries alongside domain entries, auto-populating the itinerary timeline with dates and times extracted from search results.

## What Was Built

Modified all 6 search category components (flights, hotels, cars, transport, tours, attractions) so that clicking "Add to itinerary" creates both:
1. The domain entry (Flight, Stay, CarRental, Transport, Activity, Attraction) via existing add* calls
2. A corresponding ItineraryItem entry via new addItineraryItem() calls

Each ItineraryItem is populated with:
- **Date**: Extracted from domain model's datetime fields (flights/cars/transport use departureAt/pickUpAt; hotels use checkIn; tours/attractions use trip start date with today's date fallback)
- **Time slot**: Extracted from ISO datetime strings (HH:MM format) for flights/cars/transport; null for hotels/tours/attractions (all-day items)
- **Label**: Human-readable description (e.g., "Flight: JFK → LAX", "Stay: Hotel Name", "Tour: Tour Name")
- **Notes**: Additional context (airline/flight number for flights, address for hotels, city for tours, category for attractions)
- **Type**: Discriminated union type matching the domain model
- **RefId**: Links back to the domain model entry by id

## Implementation Details

**1. Flights (search.component.ts):**
- Extracts date and time from `flight.departureAt` (ISO 8601 datetime string)
- Split on 'T' gives date (YYYY-MM-DD), substring(0,5) on time portion gives HH:MM
- Label: `Flight: ${origin} → ${destination}`
- Notes: `${airline} ${flightNumber}`

**2. Hotels (hotel-search.component.ts):**
- Uses `hotel.checkIn` directly (already YYYY-MM-DD format)
- timeSlot is null (all-day item)
- Label: `Stay: ${hotel.name}`
- Notes: `hotel.address || ''`

**3. Car Rentals (car-search.component.ts):**
- Extracts date/time from `car.pickUpAt` (same pattern as flights)
- Label: `Car Rental: ${vehicleType}`
- Notes: `Pick-up: ${pickUpLocation}`

**4. Intercity Transport (transport-search.component.ts):**
- Extracts date/time from `transport.departureAt` (same pattern as flights)
- Label: Capitalizes mode and formats as `${Mode}: ${origin} → ${destination}`
- Notes: Empty string

**5. Tours (tour-search.component.ts):**
- Uses trip start date (`this.tripState.trip().dates.start`) as default
- Falls back to today's date if trip dates not set
- timeSlot is null (flexible timing)
- Label: `Tour: ${tour.name}`
- Notes: `tour.city || ''`

**6. Attractions (attraction-search.component.ts):**
- Same fallback date strategy as tours
- timeSlot is null
- Label: `Attraction: ${attraction.name}`
- Notes: `attraction.category || ''`

**All items:**
- `id`: Generated via `crypto.randomUUID()`
- `order`: Set to 0 (user can reorder via UI)
- `refId`: Links to domain model entry id

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing ItineraryItemComponent import in ItineraryComponent**
- **Found during:** Task 1 build verification
- **Issue:** ItineraryComponent template uses `<app-itinerary-item>` but the component wasn't imported in the standalone imports array, causing build error "Can't bind to 'isLast' since it isn't a known property"
- **Fix:** Added `import { ItineraryItemComponent } from './itinerary-item.component'` and added to imports array
- **Files modified:** triply/src/app/features/itinerary/itinerary.component.ts
- **Commit:** e268c6f (included in main task commit)
- **Rationale:** This was a blocking issue preventing build completion and verification of the plan's changes; classified as Rule 3 (missing critical functionality for build to work)

## Verification Results

1. ✅ Build succeeds with zero errors: `npx ng build` completed successfully
2. ✅ All 6 search components contain `addItineraryItem` calls: `grep -r "addItineraryItem" triply/src/app/features/ --include="*.ts" -l` returns all 6 files
3. ✅ Each addToItinerary method contains both original add* call and new addItineraryItem call
4. ✅ Date/time extraction logic correctly implemented for each domain model type

## Tasks Completed

| Task | Description | Commit | Files Modified |
|------|-------------|--------|----------------|
| 1 | Wire all 6 search components to create ItineraryItem entries | e268c6f | search.component.ts, hotel-search.component.ts, car-search.component.ts, transport-search.component.ts, tour-search.component.ts, attraction-search.component.ts, itinerary.component.ts |

## Success Criteria

✅ Every search category's "Add to itinerary" action creates both a domain entry AND an ItineraryItem (ITIN-07)
✅ Date and time are extracted from the domain model's relevant datetime fields
✅ Items without dates (tours, attractions) use trip start date as sensible default
✅ No existing functionality is broken — add* calls remain unchanged
✅ Project builds with zero errors

## Known Issues / Blockers

None.

## Next Steps

1. Plan 10-04: Implement itinerary view UI rendering with timeline display
2. Test end-to-end flow: search → add to itinerary → view in itinerary timeline

## Self-Check: PASSED

**Created files check:**
- No new files created in this plan ✓

**Modified files check:**
```bash
[ -f "C:/Users/Pichau/triply/src/app/features/search/search.component.ts" ] ✓
[ -f "C:/Users/Pichau/triply/src/app/features/hotel-search/hotel-search.component.ts" ] ✓
[ -f "C:/Users/Pichau/triply/src/app/features/car-search/car-search.component.ts" ] ✓
[ -f "C:/Users/Pichau/triply/src/app/features/transport-search/transport-search.component.ts" ] ✓
[ -f "C:/Users/Pichau/triply/src/app/features/tour-search/tour-search.component.ts" ] ✓
[ -f "C:/Users/Pichau/triply/src/app/features/attraction-search/attraction-search.component.ts" ] ✓
[ -f "C:/Users/Pichau/triply/src/app/features/itinerary/itinerary.component.ts" ] ✓
```

**Commits check:**
```bash
git log --oneline --all | grep "e268c6f" ✓
```

All files exist and commit is in git history.
