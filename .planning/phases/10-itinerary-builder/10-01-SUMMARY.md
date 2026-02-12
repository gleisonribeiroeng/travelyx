---
phase: 10-itinerary-builder
plan: 1
subsystem: features/itinerary
tags: [timeline-view, inline-editing, reordering, state-management]
dependency_graph:
  requires:
    - TripStateService (itineraryItems signal, updateItineraryItem, removeItineraryItem)
    - ItineraryItem model (date, timeSlot, label, notes, order, type)
  provides:
    - Day-by-day timeline view with computed grouping
    - Inline edit/remove/reorder controls
    - ItineraryItemComponent (reusable item card)
  affects:
    - None (completes itinerary feature, no downstream changes)
tech_stack:
  added:
    - "@angular/cdk/drag-drop": "moveItemInArray utility for reordering"
    - "KeyValuePipe": "Map iteration in template"
    - "DatePipe": "Date formatting for day headers"
  patterns:
    - "Computed signal with reduce() for date grouping"
    - "Shallow copy before sort to avoid signal mutation"
    - "Custom validator for optional time input (HH:MM format)"
    - "Two-mode component (view/edit) with signal toggle"
key_files:
  created:
    - triply/src/app/features/itinerary/itinerary-item.component.ts
    - triply/src/app/features/itinerary/itinerary-item.component.html
    - triply/src/app/features/itinerary/itinerary-item.component.scss
  modified:
    - triply/src/app/features/itinerary/itinerary.component.ts
    - triply/src/app/features/itinerary/itinerary.component.html
    - triply/src/app/features/itinerary/itinerary.component.scss
decisions:
  - "Use reduce() instead of Object.groupBy() for broader TypeScript compatibility"
  - "Shallow copy arrays before sorting to avoid mutating computed signal internals"
  - "Custom timeSlotValidator returns null for empty values (lets required validator handle)"
  - "moveItemInArray mutates array in-place, safe because dayItems is spread copy from computed"
  - "Persist order changes for ALL items in day (not just moved item) to maintain consistency"
metrics:
  duration_minutes: 2
  tasks_completed: 2
  files_created: 3
  files_modified: 3
  commits: 2
  completed_at: "2026-02-12"
---

# Phase 10 Plan 1: Itinerary Timeline View Summary

Day-by-day itinerary timeline with inline edit, remove, and reorder controls for all trip items.

## What Was Built

Created the core itinerary timeline that displays all trip items grouped by date and sorted by time. Users can now:

1. **View timeline organized by day** — Items grouped by date with formatted day headers (e.g., "Wednesday, January 15, 2026")
2. **See time-ordered schedule** — All-day items appear first, then timed items sorted by HH:MM, then by order field for manual sequencing
3. **Edit items inline** — Click Edit to toggle reactive form, modify date/time/label/notes, save persists via TripStateService
4. **Remove items permanently** — Click Remove button to delete from itinerary
5. **Reorder items within a day** — Up/Down arrows move items, order persists across page refresh
6. **Empty state guidance** — Clear message when no items exist, directing users to search pages

## Implementation Details

### ItineraryComponent (Parent Container)

**Key Features:**
- `itemsByDay` computed signal: reads `tripState.itineraryItems()`, groups by date using `reduce()`, sorts within each day by timeSlot + order, returns `Map<string, ItineraryItem[]>` sorted by date key
- `moveItemUp/moveItemDown` methods: use `moveItemInArray` from `@angular/cdk/drag-drop`, then call `updateItineraryItem` for ALL items in the affected day to persist new order values
- `removeItem` method: delegates to `tripState.removeItineraryItem(id)`
- Template: `@if/@for` control flow, KeyValuePipe for Map iteration, DatePipe for day header formatting
- Empty state: shows when `tripState.hasItems()` returns false

**Why reduce() instead of Object.groupBy():**
Object.groupBy() is ES2024 and may not be recognized by TypeScript without polyfills. The reduce() pattern is universally compatible and achieves the same result.

**Shallow copy before sort:**
The computed signal's internal array must not be mutated. We use `[...dayItems].sort(...)` to create a shallow copy before sorting, avoiding React-style "mutation-during-render" bugs.

### ItineraryItemComponent (Item Card)

**Key Features:**
- Dual mode: view mode (default) and edit mode (toggled via `isEditing` signal)
- View mode: displays type icon, label, time/all-day indicator, type chip, notes (if present), Edit/Remove buttons, conditional Up/Down arrows
- Edit mode: reactive form with date, timeSlot, label, notes fields
- Custom `timeSlotValidator`: returns null for empty values (all-day items), validates HH:MM format for timed items
- Save: normalizes empty timeSlot string to null, calls `tripState.updateItineraryItem`, shows snackbar confirmation
- Type icons: flight → flight, stay → hotel, car-rental → directions_car, transport → directions_bus, activity → local_activity, attraction → museum, custom → event

**Form validation:**
- Date: required
- TimeSlot: optional, but if provided must match HH:MM pattern
- Label: required
- Notes: optional

**Reorder logic:**
Parent component passes `dayEntry.value` (array of items for that day) to child's moveUp/moveDown outputs. When user clicks arrow, parent calls `moveItemInArray` to mutate the array in-place, then loops through ALL items to update their `order` field via `updateItineraryItem`. This ensures the new sequence persists to localStorage immediately.

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

1. **Build:** `npx ng build` succeeded with zero errors
2. **TypeScript:** All components compile cleanly, no type errors
3. **Computed signal:** itemsByDay correctly groups by date and sorts by time + order
4. **Reorder persistence:** moveItemInArray mutates the array, updateItineraryItem persists new order for all affected items
5. **Form validation:** timeSlotValidator correctly allows empty values (all-day) and validates HH:MM format

**Manual testing required (not executed in this phase):**
- Load itinerary route, verify empty state when no items exist
- Add items to localStorage, verify they appear grouped by date
- Click Edit, modify fields, verify save persists and form resets
- Click Remove, verify item disappears permanently
- Click Up/Down, verify items reorder and persist after page refresh

## Key Decisions

| Decision | Rationale | Impact |
|----------|-----------|--------|
| reduce() over Object.groupBy() | Broader TypeScript compatibility (ES2024 feature not universally supported) | No polyfill needed, works in all environments |
| Shallow copy before sort | Avoid mutating computed signal's internal array (prevents hard-to-debug reactivity issues) | Clean reactivity, no side effects |
| Custom timeSlotValidator | Separate concerns: required validator for empty, format validator for HH:MM | Cleaner error messages, better UX |
| Persist order for ALL items | Ensures order field always reflects visual sequence (no gaps or duplicates) | Robust, avoids edge cases |
| moveItemInArray in-place | CDK utility mutates array, but safe because dayItems is a spread copy from computed signal | Simpler than immutable splice logic |

## Next Steps

**Immediate (Plan 10-02):**
- Add "Add to Itinerary" buttons to all search result cards (flights, hotels, car rentals, transport, tours, attractions)
- Map each search result type to ItineraryItem with smart defaults (date from trip dates, label from result name, type from source)

**Future (Plan 10-03+):**
- Export itinerary as PDF or shareable link
- Add drag-and-drop reordering (visual upgrade from Up/Down arrows)
- Support multi-day items (e.g., hotel stays spanning multiple dates)

## Self-Check

**Created files exist:**
```
FOUND: triply/src/app/features/itinerary/itinerary-item.component.ts
FOUND: triply/src/app/features/itinerary/itinerary-item.component.html
FOUND: triply/src/app/features/itinerary/itinerary-item.component.scss
```

**Modified files exist:**
```
FOUND: triply/src/app/features/itinerary/itinerary.component.ts
FOUND: triply/src/app/features/itinerary/itinerary.component.html
FOUND: triply/src/app/features/itinerary/itinerary.component.scss
```

**Commits exist:**
```
FOUND: 9342258 (Task 1: day-by-day timeline view)
FOUND: 1b4c34e (Task 2: ItineraryItemComponent)
```

## Self-Check: PASSED

All files created, all commits verified, build succeeds with zero errors.
