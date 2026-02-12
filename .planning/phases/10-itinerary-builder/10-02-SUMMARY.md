---
phase: 10-itinerary-builder
plan: 2
subsystem: features/itinerary
tags: [manual-items, reactive-forms, custom-entries, form-validation]
dependency_graph:
  requires:
    - TripStateService.addItineraryItem
    - ItineraryItem model (type: 'custom', refId: null)
    - MATERIAL_IMPORTS from core/material.exports
  provides:
    - ManualItemFormComponent (collapsible form for custom items)
    - Integrated form in itinerary page
  affects:
    - ItineraryComponent (now includes manual entry capability)
tech_stack:
  added:
    - "ReactiveFormsModule": "Form controls for label, date, timeSlot, notes"
    - "crypto.randomUUID()": "Client-side ID generation for custom items"
  patterns:
    - "Signal-based form visibility toggle (showForm)"
    - "Custom timeSlotValidator shared from ItineraryItemComponent pattern"
    - "Normalize empty string to null for timeSlot (all-day items)"
    - "Form reset and hide after successful submission"
key_files:
  created:
    - triply/src/app/features/itinerary/manual-item-form.component.ts
    - triply/src/app/features/itinerary/manual-item-form.component.html
    - triply/src/app/features/itinerary/manual-item-form.component.scss
  modified:
    - triply/src/app/features/itinerary/itinerary.component.ts
    - triply/src/app/features/itinerary/itinerary.component.html
decisions:
  - "Use same timeSlotValidator from ItineraryItemComponent for consistency"
  - "Form collapsed by default to avoid cluttering timeline view"
  - "Place form above timeline content for visibility in both empty and populated states"
  - "Reset form and hide after submission for clean UX"
  - "Use crypto.randomUUID() for id, order: 0 as defaults (user can reorder later)"
metrics:
  duration_minutes: 2
  tasks_completed: 2
  files_created: 3
  files_modified: 2
  commits: 2
  completed_at: "2026-02-12"
---

# Phase 10 Plan 2: Manual Itinerary Item Form Summary

Form for adding custom itinerary entries alongside search-sourced items, integrated into itinerary page.

## What Was Built

Created ManualItemFormComponent, a reactive form that lets users add custom itinerary items (like "Dinner at restaurant" or "Check into Airbnb") that don't come from any search API. The form integrates into the existing itinerary timeline, and custom items appear alongside flights, hotels, activities, etc.

**Key Features:**

1. **Collapsible form** — "Add Custom Item" button (collapsed by default) toggles form visibility
2. **Four form fields:**
   - Label (required) — item name
   - Date (required) — YYYY-MM-DD via native date input
   - TimeSlot (optional) — HH:MM via native time input, validates format if provided
   - Notes (optional) — free text area
3. **Creates custom ItineraryItem** — type: 'custom', refId: null, id: crypto.randomUUID(), order: 0
4. **Timeline integration** — custom items appear in day-by-day view alongside search results
5. **Clean UX** — form resets and collapses after submission, snackbar confirmation

## Implementation Details

### ManualItemFormComponent

**Component Structure:**
- `showForm` signal: toggles form visibility (false by default)
- `form`: reactive FormGroup with label, date, timeSlot, notes controls
- `timeSlotValidator`: custom validator that returns null for empty values (all-day items) or validates HH:MM format if provided
- `toggleForm()`: flips showForm signal
- `onSubmit()`: validates form, creates ItineraryItem, calls TripStateService.addItineraryItem(), resets form, hides form, shows snackbar

**Template Pattern:**
```
@if (!showForm()) → "Add Custom Item" button
@if (showForm()) → mat-card with form fields and actions
```

**Form Validation:**
- Label: required
- Date: required
- TimeSlot: optional, but if provided must match HH:MM pattern (via timeSlotValidator)
- Notes: optional (no validation)

**TimeSlot Handling:**
The validator reuses the same pattern from ItineraryItemComponent:
- Empty value → null (all-day item)
- Non-empty value → must match `/^([01]\d|2[0-3]):([0-5]\d)$/` pattern
- Submitted value normalized: `timeSlot: this.form.value.timeSlot || null`

### Integration into ItineraryComponent

**Changes:**
1. Added `ManualItemFormComponent` to imports array
2. Imported component from `./manual-item-form.component`
3. Placed `<app-manual-item-form />` in template after view-header, before timeline content

**Placement Rationale:**
Form appears ABOVE both the `@if (tripState.hasItems())` block and the empty state, ensuring the "Add Custom Item" button is always visible whether the itinerary is empty or populated.

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

1. **Build:** `npx ng build` succeeded with zero errors
2. **TypeScript:** All components compile cleanly, no type errors
3. **Selector:** `app-manual-item-form` appears in itinerary template at line 6
4. **Bundle size:** itinerary-component chunk increased from 9.89 kB to 13.45 kB, confirming integration
5. **Validation:** timeSlotValidator correctly allows empty values (all-day) and validates HH:MM format

**Manual testing required (not executed in this phase):**
- Load itinerary route, verify "Add Custom Item" button visible
- Click button, verify form expands with all four fields
- Submit with valid label and date, verify custom item appears in timeline
- Submit with empty timeSlot, verify all-day item created
- Submit with HH:MM timeSlot, verify timed item created
- Verify form resets and collapses after submission
- Verify snackbar "Custom item added" appears

## Key Decisions

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Reuse timeSlotValidator | Consistency with ItineraryItemComponent edit form | Same validation rules across manual and search-sourced items |
| Form collapsed by default | Avoid cluttering timeline view | Better UX for users browsing existing items |
| Place form above timeline | Visibility in both empty and populated states | No need to scroll to find form when many items exist |
| Reset and hide after submit | Clean slate for next entry | Faster workflow for adding multiple items |
| crypto.randomUUID() for id | Client-side generation, no server dependency | Instant creation, no async complexity |
| order: 0 default | User can reorder via Up/Down arrows later | Simplest default for new items |

## Next Steps

**Immediate (Plan 10-03):**
- Already completed — "Add to Itinerary" buttons on all search result cards

**Future enhancements:**
- Add "duplicate" button on existing items to pre-fill form
- Support recurring items (e.g., "Daily breakfast at 8:00 AM")
- Add category selection for custom items (meal, meeting, activity)
- Validation hint: suggest timeSlot based on item type (e.g., "Dinner" → default 19:00)

## Self-Check

**Created files exist:**
```
FOUND: C:/Users/Pichau/triply/src/app/features/itinerary/manual-item-form.component.ts
FOUND: C:/Users/Pichau/triply/src/app/features/itinerary/manual-item-form.component.html
FOUND: C:/Users/Pichau/triply/src/app/features/itinerary/manual-item-form.component.scss
```

**Modified files exist:**
```
FOUND: C:/Users/Pichau/triply/src/app/features/itinerary/itinerary.component.ts
FOUND: C:/Users/Pichau/triply/src/app/features/itinerary/itinerary.component.html
```

**Commits exist:**
```
FOUND: 806e14c (Task 1: ManualItemFormComponent creation)
FOUND: 4e37e0b (Task 2: Integration into ItineraryComponent)
```

## Self-Check: PASSED

All files created, all commits verified, build succeeds with zero errors.
