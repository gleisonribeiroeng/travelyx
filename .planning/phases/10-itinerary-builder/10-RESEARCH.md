# Phase 10: Itinerary Builder - Research

**Researched:** 2026-02-12
**Domain:** Angular 21 itinerary timeline view — day-by-day grouping with signals, computed transformations, simple reordering without drag-drop, inline editing with reactive forms
**Confidence:** HIGH — Angular Signals API verified; Object.groupBy() browser baseline; moveItemInArray() official API; Form patterns verified via official docs

---

## Summary

Phase 10 implements the itinerary builder, the **read-heavy** view that displays all items added during Phases 4-9 in a day-by-day, time-ordered timeline. This phase consumes the `TripStateService` populated by search features but does NOT perform API calls or search operations. It focuses purely on display, organization, manual entry, editing, and simple reordering.

The core technical challenge is **grouping a flat array of `ItineraryItem[]` by date, then sorting by time within each day**. Angular's `computed()` signals are ideal for this: the itinerary view reads `tripState.itineraryItems()` and transforms it into a grouped structure reactively. The modern JavaScript `Object.groupBy()` method (baseline since late 2024, supported in Chrome 117+, Firefox 119+) is the standard approach for grouping arrays in 2026. For browsers that need fallback, a traditional `reduce()` pattern achieves the same result with zero dependencies.

**Simple reordering** means up/down buttons, NOT drag-and-drop. The Angular CDK provides `moveItemInArray(array, fromIndex, toIndex)` as a utility function that can be called programmatically without requiring drag-drop directives. Clicking "Move Up" on an item at index 3 calls `moveItemInArray(dayItems, 3, 2)`, swaps the items, and updates the `order` field so the change persists to localStorage via the existing `TripStateService` effect.

**Inline editing** is implemented with reactive forms. Each `ItineraryItemComponent` has an `isEditing` signal that toggles between view and edit modes. In edit mode, a `FormGroup` with `date`, `timeSlot`, `label`, `notes` controls is displayed. On save, the component calls `tripState.updateItineraryItem()` with the modified item. The `timeSlot` field is optional (nullable) — all-day items have `timeSlot: null`, timed items use `"HH:MM"` 24-hour format. Since Angular Material does not have a dedicated 24-hour timepicker in v21, the standard approach is to use the native HTML5 `<input type="time">` with Material form field styling and a pattern validator (`/^([01]\d|2[0-3]):([0-5]\d)$/`).

**Manual custom items** are created via a form that calls `tripState.addItineraryItem()` with `type: 'custom'` and `refId: null`. These items have no link to a domain object (flight, stay, etc.) and display only the user-provided `label` and `notes`.

**Primary recommendation:** Use `computed()` signals to transform `itineraryItems()` into a `Map<string, ItineraryItem[]>` grouped by date. Render days with `@for` over the Map entries, then nested `@for` over each day's items sorted by `timeSlot` and `order`. Use `moveItemInArray()` for reordering. Use reactive forms with conditional validation (`timeSlot` required only if user selects "timed item"). No third-party libraries needed beyond Angular Material and Angular CDK (already installed).

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@angular/core` | 21.1.x | `signal()`, `computed()`, `inject()`, `@for` control flow | All stable in Angular 20+; signals are the idiomatic state primitive |
| `@angular/cdk` | 21.1.x | `moveItemInArray()` utility function | Already installed; officially maintained; handles array reordering logic correctly |
| `@angular/material` | 21.1.x | Form fields, buttons, cards, expansion panels, snackbar | Already installed; itinerary items render as Material cards |
| `@angular/forms` | 21.1.x (bundled) | `ReactiveFormsModule`, `FormGroup`, `FormControl`, `Validators` | Standard for inline edit and manual item forms |
| `Object.groupBy()` (ES2024) | Browser native | Groups array by date key | Baseline browser support since late 2024; zero dependencies |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@angular/common` | 21.1.x (bundled) | `DatePipe`, `CommonModule` | Format ISO date strings for display (`{{ date | date: 'EEE, MMM d' }}`) |

### NOT Required (avoid)
| Library | Reason to Avoid |
|---------|-----------------|
| `@angular/cdk/drag-drop` directives | Project requirement: simple up/down buttons, NOT drag-drop. Use `moveItemInArray()` utility only, no `cdkDrag` or `cdkDropList` |
| `ngx-material-timepicker` | Third-party timepicker library. Native HTML5 `<input type="time">` with pattern validator is sufficient for HH:MM input |
| `lodash` or `ramda` for grouping | `Object.groupBy()` is native in modern browsers; no need for utility libraries |
| Third-party timeline libraries | Custom Angular component using Material cards is simpler and more maintainable |

**Installation:**
```bash
# No new packages needed — all dependencies already installed.
# @angular/core, @angular/cdk, @angular/material, @angular/forms, @angular/common are available.
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/app/
├── core/
│   ├── models/
│   │   └── trip.models.ts              # EXISTS: ItineraryItem, ItineraryItemType, all domain models
│   └── services/
│       └── trip-state.service.ts       # EXISTS: addItineraryItem, updateItineraryItem, removeItineraryItem
└── features/
    └── itinerary/
        ├── itinerary.component.ts      # NEW (Plan 10-01): main view, day-by-day timeline
        ├── itinerary.component.html    # NEW (Plan 10-01): @for over grouped days
        ├── itinerary.component.scss    # NEW (Plan 10-01): layout for timeline
        ├── itinerary-item.component.ts # NEW (Plan 10-02): card with edit/remove/reorder
        ├── itinerary-item.component.html
        ├── itinerary-item.component.scss
        ├── manual-item-form.component.ts # NEW (Plan 10-03): form to create custom items
        ├── manual-item-form.component.html
        └── manual-item-form.component.scss
```

### Pattern 1: Computed Signal for Grouping by Date
**What:** Transform flat `ItineraryItem[]` array into a `Map<string, ItineraryItem[]>` where keys are ISO date strings (YYYY-MM-DD) and values are arrays of items for that day, sorted by `timeSlot` and `order`.
**When to use:** In the main `ItineraryComponent` to prepare data for rendering.

```typescript
// Source: angular.dev/guide/signals — computed() for derived transformations
// Source: MDN Object.groupBy() — baseline browser support since late 2024
// src/app/features/itinerary/itinerary.component.ts

import { Component, computed, inject } from '@angular/core';
import { TripStateService } from '../../core/services/trip-state.service';
import { ItineraryItem } from '../../core/models/trip.models';

@Component({ /* ... */ })
export class ItineraryComponent {
  private readonly tripState = inject(TripStateService);

  // Computed signal: groups items by date, sorts within each day
  readonly itemsByDay = computed(() => {
    const items = this.tripState.itineraryItems();

    // Group by date using Object.groupBy (ES2024)
    const grouped = Object.groupBy(items, (item) => item.date);

    // Convert to Map and sort items within each day
    const map = new Map<string, ItineraryItem[]>();
    Object.entries(grouped).forEach(([date, dayItems]) => {
      const sorted = (dayItems || []).sort((a, b) => {
        // First sort by timeSlot (all-day items null → early)
        if (a.timeSlot === null && b.timeSlot !== null) return -1;
        if (a.timeSlot !== null && b.timeSlot === null) return 1;
        if (a.timeSlot !== b.timeSlot) return (a.timeSlot || '').localeCompare(b.timeSlot || '');
        // Within same timeSlot, sort by order field
        return a.order - b.order;
      });
      map.set(date, sorted);
    });

    // Return Map sorted by date keys (ISO strings are lexicographically sortable)
    return new Map([...map.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  });
}
```

**Fallback for older browsers (if Object.groupBy not available):**
```typescript
// Source: Traditional reduce() pattern — works in all browsers
const grouped = items.reduce((acc, item) => {
  const date = item.date;
  if (!acc[date]) acc[date] = [];
  acc[date].push(item);
  return acc;
}, {} as Record<string, ItineraryItem[]>);
```

### Pattern 2: Rendering Grouped Days with @for Control Flow
**What:** Use Angular's `@for` syntax (stable in Angular 17+) to iterate over the `Map<string, ItineraryItem[]>` entries. The outer `@for` renders each day section, the inner `@for` renders each item within the day.
**When to use:** In the itinerary view template.

```html
<!-- Source: angular.dev/tutorials/first-app/08-ngFor — @for syntax with track -->
<!-- src/app/features/itinerary/itinerary.component.html -->

<div class="itinerary-timeline">
  @for (dayEntry of itemsByDay() | keyvalue; track dayEntry.key) {
    <section class="day-section">
      <h2 class="day-header">{{ dayEntry.key | date: 'EEEE, MMMM d, yyyy' }}</h2>

      @for (item of dayEntry.value; track item.id) {
        <app-itinerary-item
          [item]="item"
          [dayItems]="dayEntry.value"
          (moveUp)="moveItemUp(item, dayEntry.value)"
          (moveDown)="moveItemDown(item, dayEntry.value)"
          (remove)="removeItem(item.id)"
        />
      }

      @empty {
        <p class="empty-day">No items scheduled for this day.</p>
      }
    </section>
  }

  @empty {
    <div class="empty-state">
      <p>Your itinerary is empty. Add items from the search page to get started.</p>
    </div>
  }
}
</div>
```

**Note:** `keyvalue` pipe is needed to iterate over Map entries in templates. The `track` expression is mandatory in `@for` (Angular 17+).

### Pattern 3: Simple Reordering with moveItemInArray (No Drag-Drop)
**What:** Use `moveItemInArray()` from `@angular/cdk/drag-drop` programmatically to swap items when the user clicks up/down buttons. The function mutates the array in-place, then the component calls `tripState.updateItineraryItem()` for each affected item to persist the new `order` field.
**When to use:** In `ItineraryComponent` event handlers for move up/down buttons.

```typescript
// Source: angular.dev/api/cdk/drag-drop/moveItemInArray
// Source: CopyProgramming article on button-based reordering
// src/app/features/itinerary/itinerary.component.ts

import { moveItemInArray } from '@angular/cdk/drag-drop';

export class ItineraryComponent {
  private readonly tripState = inject(TripStateService);

  moveItemUp(item: ItineraryItem, dayItems: ItineraryItem[]): void {
    const index = dayItems.findIndex(i => i.id === item.id);
    if (index <= 0) return; // Already at top

    // Swap positions in array
    moveItemInArray(dayItems, index, index - 1);

    // Update order fields to match new positions
    dayItems.forEach((item, idx) => {
      this.tripState.updateItineraryItem({ ...item, order: idx });
    });
  }

  moveItemDown(item: ItineraryItem, dayItems: ItineraryItem[]): void {
    const index = dayItems.findIndex(i => i.id === item.id);
    if (index < 0 || index >= dayItems.length - 1) return; // Already at bottom

    moveItemInArray(dayItems, index, index + 1);

    dayItems.forEach((item, idx) => {
      this.tripState.updateItineraryItem({ ...item, order: idx });
    });
  }

  removeItem(id: string): void {
    this.tripState.removeItineraryItem(id);
  }
}
```

**Important:** `moveItemInArray` mutates the array in-place. This is acceptable here because the array is a local copy from the computed signal. After mutation, each item's `order` field must be updated via `tripState.updateItineraryItem()` to persist the change.

### Pattern 4: Inline Edit with Reactive Forms and Toggle Signal
**What:** Each `ItineraryItemComponent` has an `isEditing` signal. In edit mode, a reactive form is displayed. On save, the form value is validated and passed to `tripState.updateItineraryItem()`. On cancel, the form resets and `isEditing` is set to false.
**When to use:** In `ItineraryItemComponent` for inline editing.

```typescript
// Source: angular.dev/guide/forms/reactive-forms
// Source: Medium article on inline editable tables with reactive forms
// src/app/features/itinerary/itinerary-item.component.ts

import { Component, Input, signal, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ItineraryItem } from '../../core/models/trip.models';
import { TripStateService } from '../../core/services/trip-state.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({ /* ... */ })
export class ItineraryItemComponent {
  @Input({ required: true }) item!: ItineraryItem;

  private readonly tripState = inject(TripStateService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  readonly isEditing = signal(false);
  editForm!: FormGroup;

  ngOnInit(): void {
    this.editForm = this.fb.group({
      date: [this.item.date, Validators.required],
      timeSlot: [this.item.timeSlot, this.timeSlotValidator()], // Optional, but must match HH:MM if provided
      label: [this.item.label, Validators.required],
      notes: [this.item.notes],
    });
  }

  startEdit(): void {
    this.isEditing.set(true);
    this.editForm.reset({
      date: this.item.date,
      timeSlot: this.item.timeSlot,
      label: this.item.label,
      notes: this.item.notes,
    });
  }

  cancelEdit(): void {
    this.isEditing.set(false);
  }

  saveEdit(): void {
    if (this.editForm.invalid) return;

    const updated: ItineraryItem = {
      ...this.item,
      ...this.editForm.value,
    };

    this.tripState.updateItineraryItem(updated);
    this.isEditing.set(false);
    this.snackBar.open('Item updated', 'Dismiss', { duration: 3000 });
  }

  // Custom validator: timeSlot must be HH:MM format if provided
  private timeSlotValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null; // Optional field
      const pattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
      return pattern.test(value) ? null : { invalidTimeSlot: true };
    };
  }
}
```

**Template (inline edit form):**
```html
<!-- src/app/features/itinerary/itinerary-item.component.html -->
<mat-card class="itinerary-item">
  @if (!isEditing()) {
    <!-- View Mode -->
    <mat-card-header>
      <mat-card-title>{{ item.label }}</mat-card-title>
      <mat-card-subtitle>
        @if (item.timeSlot) {
          <span>{{ item.timeSlot }}</span>
        } @else {
          <span>All-day</span>
        }
      </mat-card-subtitle>
    </mat-card-header>
    <mat-card-content>
      @if (item.notes) {
        <p>{{ item.notes }}</p>
      }
    </mat-card-content>
    <mat-card-actions>
      <button mat-button (click)="startEdit()">Edit</button>
      <button mat-button (click)="remove.emit()">Remove</button>
      <button mat-icon-button (click)="moveUp.emit()"><mat-icon>arrow_upward</mat-icon></button>
      <button mat-icon-button (click)="moveDown.emit()"><mat-icon>arrow_downward</mat-icon></button>
    </mat-card-actions>
  } @else {
    <!-- Edit Mode -->
    <form [formGroup]="editForm" (ngSubmit)="saveEdit()">
      <mat-form-field>
        <mat-label>Date</mat-label>
        <input matInput type="date" formControlName="date" required>
      </mat-form-field>

      <mat-form-field>
        <mat-label>Time (HH:MM, optional)</mat-label>
        <input matInput type="time" formControlName="timeSlot">
        @if (editForm.get('timeSlot')?.hasError('invalidTimeSlot')) {
          <mat-error>Must be HH:MM format</mat-error>
        }
      </mat-form-field>

      <mat-form-field>
        <mat-label>Label</mat-label>
        <input matInput formControlName="label" required>
      </mat-form-field>

      <mat-form-field>
        <mat-label>Notes</mat-label>
        <textarea matInput formControlName="notes" rows="3"></textarea>
      </mat-form-field>

      <mat-card-actions>
        <button mat-raised-button color="primary" type="submit" [disabled]="editForm.invalid">Save</button>
        <button mat-button type="button" (click)="cancelEdit()">Cancel</button>
      </mat-card-actions>
    </form>
  }
</mat-card>
```

### Pattern 5: Manual Custom Item Form
**What:** A separate form component for creating custom itinerary items (`type: 'custom'`, `refId: null`). The form has `date`, `timeSlot`, `label`, and `notes` fields. On submit, it calls `tripState.addItineraryItem()` with a new UUID and `order: 0` (items will be re-sorted within the day by the computed signal).
**When to use:** In a dialog or inline form within `ItineraryComponent` to add manual items.

```typescript
// Source: angular.dev/guide/forms/reactive-forms
// src/app/features/itinerary/manual-item-form.component.ts

import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TripStateService } from '../../core/services/trip-state.service';
import { ItineraryItem } from '../../core/models/trip.models';

@Component({ /* ... */ })
export class ManualItemFormComponent {
  private readonly tripState = inject(TripStateService);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    date: ['', Validators.required],
    timeSlot: [''], // Optional
    label: ['', Validators.required],
    notes: [''],
  });

  onSubmit(): void {
    if (this.form.invalid) return;

    const newItem: ItineraryItem = {
      id: crypto.randomUUID(),
      type: 'custom',
      refId: null,
      date: this.form.value.date!,
      timeSlot: this.form.value.timeSlot || null,
      label: this.form.value.label!,
      notes: this.form.value.notes || '',
      order: 0, // Will be re-sorted by computed signal
    };

    this.tripState.addItineraryItem(newItem);
    this.form.reset();
  }
}
```

### Pattern 6: ISO Date String Sorting (Lexicographic)
**What:** ISO 8601 date strings (`YYYY-MM-DD`) are lexicographically sortable. Use `localeCompare()` for string comparison instead of converting to `Date` objects, which is significantly faster.
**When to use:** When sorting days in the grouped itinerary.

```typescript
// Source: MDN Date.toISOString() — ISO 8601 format is lexicographically sortable
// Source: GitHub lukeed/sort-isostring — performance benchmark
// Sorting Map entries by date key:
return new Map([...map.entries()].sort((a, b) => a[0].localeCompare(b[0])));
```

**Performance note:** Sorting ISO strings is ~100x faster than creating `new Date()` objects in the sort comparator. Since all dates in the `Trip` model are already ISO strings, no conversion is needed.

### Anti-Patterns to Avoid
- **Mutating signal values directly:** Never do `tripState.itineraryItems().push(newItem)`. This mutates the array but doesn't trigger reactivity. Always call service methods like `addItineraryItem()` which use `.update()`.
- **Using `Object.groupBy()` without fallback for older browsers:** If the project must support browsers older than Chrome 117 / Firefox 119, use the `reduce()` fallback pattern.
- **Creating a new `FormGroup` on every render:** Build the form in `ngOnInit()`, NOT in the template or in a getter. Forms are stateful and should be created once.
- **Using drag-drop CDK directives when only programmatic reordering is needed:** The `cdkDrag` and `cdkDropList` directives add complexity and DOM overhead. For simple up/down buttons, call `moveItemInArray()` directly.
- **Storing `order` field as a fractional number for "insert between" logic:** The requirement is simple reordering within a day, not arbitrary insertion. Use integer `order` values (0, 1, 2...) and renumber all items in the day after a swap.
- **Validating `timeSlot` as required when it's explicitly nullable:** All-day items have `timeSlot: null`. The validator must allow `null` or empty string and only check format when a value is provided.
- **Using `new Date()` in sort comparators for ISO strings:** ISO date strings can be compared directly with `localeCompare()`. Creating `Date` objects is 100x slower.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Array reordering logic | Custom swap function with index bounds checking | `moveItemInArray(array, fromIndex, toIndex)` | CDK function handles edge cases (negative indices, out-of-bounds, same index) correctly |
| Grouping array by property | Custom `reduce()` with loop and object building | `Object.groupBy(array, keyFn)` | Native method as of ES2024; baseline browser support; cleaner syntax |
| Time input validation | Custom regex in multiple places | Shared `ValidatorFn` returning `{ invalidTimeSlot: true }` | Reusable, testable, consistent error message key |
| Date string formatting | Manual string manipulation (`split('-').join('/')`) | Angular `DatePipe` (`{{ date \| date: 'EEEE, MMMM d' }}`) | Handles locale, timezone, and format edge cases correctly |
| Inline edit state management | Boolean field + manual form building | `signal(false)` for `isEditing` + reactive form in `ngOnInit()` | Signal-based reactivity integrates with Angular change detection; form state managed by Angular Forms |
| Empty state detection | Manual `if (items.length === 0)` in template | `@empty` block in `@for` syntax | Angular 17+ control flow syntax is cleaner and more idiomatic |

**Key insight:** The itinerary builder is primarily a **display transformation problem**, not a data-fetching problem. The hard part is grouping, sorting, and reordering reactively without breaking signal reactivity. `computed()` signals handle the transformation; `moveItemInArray()` handles the mutation. Custom code should focus on business logic (e.g., "Move Up" button visibility), not on low-level array manipulation or grouping algorithms.

---

## Common Pitfalls

### Pitfall 1: Mutating Arrays Inside Computed Signals
**What goes wrong:** Calling `.sort()` or `.push()` on the array returned by `tripState.itineraryItems()` inside a `computed()` will mutate the signal's internal value, breaking reactivity.
**Why it happens:** `.sort()` mutates the array in-place. If the computed signal sorts without creating a copy, future reads of `itineraryItems()` will see the sorted array, but the signal won't re-run because its reference didn't change.
**How to avoid:** Always create a shallow copy before sorting: `const sorted = [...dayItems].sort(...)`. Never mutate signal values directly.
**Warning signs:** Itinerary displays items in sorted order on first load, but adding a new item doesn't re-sort the list.

### Pitfall 2: Object.groupBy() Not Available in Older Browsers
**What goes wrong:** `TypeError: Object.groupBy is not a function` in browsers older than Chrome 117 / Firefox 119.
**Why it happens:** `Object.groupBy()` reached baseline browser support in late 2024. Users on older browsers (e.g., Safari 16, Chrome 116) don't have this method.
**How to avoid:** Use a traditional `reduce()` fallback if the project must support older browsers. Alternatively, check for method existence and provide a polyfill.
**Warning signs:** App works in Chrome 120+ but crashes on Safari 16.

### Pitfall 3: Not Updating `order` Field After Reordering
**What goes wrong:** User moves an item up/down. The UI updates, but after a page refresh, the item is back in the original position.
**Why it happens:** `moveItemInArray()` mutates the array in memory but doesn't persist the new order to `TripStateService`. The `order` field in each `ItineraryItem` must be updated and saved.
**How to avoid:** After calling `moveItemInArray()`, loop through the affected day's items and call `tripState.updateItineraryItem({ ...item, order: newIndex })` for each item.
**Warning signs:** Reordering works during the session but doesn't survive page refresh.

### Pitfall 4: Using `type="time"` Input Without Pattern Validation
**What goes wrong:** User types `"25:99"` in the time field. The form submits invalid data, crashing the display logic that assumes `"HH:MM"` format.
**Why it happens:** The native HTML5 `<input type="time">` provides a picker but still accepts typed input, which may bypass browser validation on some browsers.
**How to avoid:** Add a pattern validator (`/^([01]\d|2[0-3]):([0-5]\d)$/`) to the `timeSlot` form control. This ensures 24-hour HH:MM format.
**Warning signs:** Form allows submission with invalid time strings like `"99:99"`.

### Pitfall 5: Forgetting to Handle `timeSlot: null` in Sorting
**What goes wrong:** All-day items (with `timeSlot: null`) are sorted after timed items, appearing at the end of the day instead of the beginning.
**Why it happens:** JavaScript string comparison treats `null` as the string `"null"`, which sorts lexicographically after `"00:00"`.
**How to avoid:** Explicitly handle `null` in the sort comparator: `if (a.timeSlot === null && b.timeSlot !== null) return -1;`.
**Warning signs:** All-day items appear at the bottom of the day instead of at the top.

### Pitfall 6: Creating FormGroup in a Getter or Template
**What goes wrong:** Form resets on every change detection cycle, losing user input.
**Why it happens:** If `editForm` is created in a getter or inline in the template, Angular recreates it on every check, destroying the form state.
**How to avoid:** Create the `FormGroup` in `ngOnInit()` and store it as a class field. Initialize it once per component lifecycle.
**Warning signs:** Typing in the form field causes the cursor to jump to the end or the field to reset.

### Pitfall 7: Not Tracking by ID in @for Loops
**What goes wrong:** Adding or removing items causes the entire list to re-render, breaking animations and resetting component state (e.g., open expansion panels close).
**Why it happens:** `@for` without `track` uses index-based tracking, which is unstable when the array changes.
**How to avoid:** Always provide a `track` expression: `@for (item of items; track item.id)`. This tells Angular to track items by their unique ID, preserving component state across renders.
**Warning signs:** Reordering items causes all cards to re-render with a visible flicker.

### Pitfall 8: Relying on Computed Signal for Side Effects
**What goes wrong:** Code that expects the computed signal to trigger a side effect (e.g., logging, API call) finds that the effect doesn't run consistently.
**Why it happens:** Computed signals are lazy. If no template or other signal reads the computed, it won't run. Computed signals should be pure transformations, not side effects.
**How to avoid:** Use `effect()` for side effects, not `computed()`. Computed signals are for derived data only.
**Warning signs:** Console logs inside a computed signal don't appear when expected.

---

## Code Examples

Verified patterns from official sources:

### Computed Signal with Object.groupBy() for Day Grouping
```typescript
// Source: angular.dev/guide/signals — computed() for transformations
// Source: MDN Object.groupBy() — ES2024 baseline
// src/app/features/itinerary/itinerary.component.ts

readonly itemsByDay = computed(() => {
  const items = this.tripState.itineraryItems();

  // Group by date
  const grouped = Object.groupBy(items, (item) => item.date);

  // Convert to Map, sort items within each day
  const map = new Map<string, ItineraryItem[]>();
  Object.entries(grouped).forEach(([date, dayItems]) => {
    const sorted = (dayItems || []).sort((a, b) => {
      // All-day items (timeSlot: null) first
      if (a.timeSlot === null && b.timeSlot !== null) return -1;
      if (a.timeSlot !== null && b.timeSlot === null) return 1;
      // Then sort by timeSlot (HH:MM strings are lexicographically sortable)
      if (a.timeSlot !== b.timeSlot) return (a.timeSlot || '').localeCompare(b.timeSlot || '');
      // Within same timeSlot, sort by order field
      return a.order - b.order;
    });
    map.set(date, sorted);
  });

  // Return Map with dates sorted (YYYY-MM-DD strings are lexicographically sortable)
  return new Map([...map.entries()].sort((a, b) => a[0].localeCompare(b[0])));
});
```

### Fallback Grouping with reduce() (Pre-ES2024 Browsers)
```typescript
// Source: Traditional reduce() pattern
// Use if Object.groupBy() is not available
const grouped = items.reduce((acc, item) => {
  const date = item.date;
  if (!acc[date]) acc[date] = [];
  acc[date].push(item);
  return acc;
}, {} as Record<string, ItineraryItem[]>);
```

### @for Control Flow with Nested Loops and Empty States
```html
<!-- Source: angular.dev/tutorials/first-app/08-ngFor -->
<div class="itinerary-timeline">
  @for (dayEntry of itemsByDay() | keyvalue; track dayEntry.key) {
    <section class="day-section">
      <h2>{{ dayEntry.key | date: 'EEEE, MMMM d, yyyy' }}</h2>

      @for (item of dayEntry.value; track item.id) {
        <app-itinerary-item [item]="item" />
      }

      @empty {
        <p>No items for this day.</p>
      }
    </section>
  } @empty {
    <div class="empty-state">
      <p>Your itinerary is empty. Add items from search.</p>
    </div>
  }
}
</div>
```

### Programmatic Reordering with moveItemInArray()
```typescript
// Source: angular.dev/api/cdk/drag-drop/moveItemInArray
import { moveItemInArray } from '@angular/cdk/drag-drop';

moveItemUp(item: ItineraryItem, dayItems: ItineraryItem[]): void {
  const index = dayItems.findIndex(i => i.id === item.id);
  if (index <= 0) return; // Can't move up from first position

  moveItemInArray(dayItems, index, index - 1);

  // Persist new order to state
  dayItems.forEach((item, idx) => {
    this.tripState.updateItineraryItem({ ...item, order: idx });
  });
}
```

### Inline Edit Form with Optional Time Slot Validation
```typescript
// Source: angular.dev/guide/forms/reactive-forms
// Source: MDN regex for HH:MM 24-hour format
this.editForm = this.fb.group({
  date: [this.item.date, Validators.required],
  timeSlot: [this.item.timeSlot, this.timeSlotValidator()],
  label: [this.item.label, Validators.required],
  notes: [this.item.notes],
});

private timeSlotValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null; // Optional field
    const pattern = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:MM 24-hour
    return pattern.test(value) ? null : { invalidTimeSlot: true };
  };
}
```

### Native HTML5 Time Input with Material Form Field
```html
<!-- Source: Angular Material form field docs -->
<!-- No dedicated Material timepicker in v21; use native input with Material styling -->
<mat-form-field>
  <mat-label>Time (HH:MM, optional)</mat-label>
  <input matInput type="time" formControlName="timeSlot">
  @if (editForm.get('timeSlot')?.hasError('invalidTimeSlot')) {
    <mat-error>Must be in HH:MM format</mat-error>
  }
</mat-form-field>
```

### Adding a Manual Custom Item
```typescript
// Source: Phase 3 TripStateService pattern
// src/app/features/itinerary/manual-item-form.component.ts
onSubmit(): void {
  if (this.form.invalid) return;

  const newItem: ItineraryItem = {
    id: crypto.randomUUID(),
    type: 'custom',
    refId: null,
    date: this.form.value.date!,
    timeSlot: this.form.value.timeSlot || null,
    label: this.form.value.label!,
    notes: this.form.value.notes || '',
    order: 0,
  };

  this.tripState.addItineraryItem(newItem);
  this.form.reset();
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `*ngFor` with `trackBy` function | `@for` with `track` expression | Angular 17 (stable) | Control flow syntax is cleaner, mandatory tracking prevents common bugs |
| Custom `groupBy()` with `reduce()` or lodash | `Object.groupBy()` native method | ES2024 (baseline late 2024) | Zero dependencies, cleaner syntax, slightly faster |
| Angular CDK drag-drop for all reordering | `moveItemInArray()` utility for simple button-based reordering | Always available, but pattern clarified in 2024+ | Simpler implementation for non-drag UIs |
| Third-party timepicker libraries (`ngx-material-timepicker`) | Native HTML5 `<input type="time">` with pattern validator | Angular Material v21 has no dedicated timepicker | Fewer dependencies, native browser support |
| `BehaviorSubject` + `combineLatest` for transformations | `computed()` signals for reactive transformations | Signals stable: Angular 17+ | Synchronous reads, no subscription management |

**Deprecated/outdated:**
- `*ngFor` without `trackBy`: Deprecated in favor of `@for` with mandatory `track` (Angular 17+).
- `allowSignalWrites: true`: Deprecated in Angular 19, no-op in Angular 21.
- Using index-based tracking in large lists: Strongly discouraged; use unique ID tracking.

---

## Open Questions

1. **Should the itinerary view use expansion panels or flat cards for days?**
   - What we know: Material expansion panels (`<mat-expansion-panel>`) allow days to be collapsed, saving screen space. Flat cards show all days at once.
   - What's unclear: The requirements don't specify. UX research suggests expansion panels for multi-day trips (5+ days), flat layout for shorter trips.
   - Recommendation: Start with flat cards (simpler). If user feedback indicates information overload, switch to expansion panels in a follow-up iteration. The component structure is the same either way.

2. **How to handle items with `refId` — should we display domain object details?**
   - What we know: `ItineraryItem.refId` references a `Flight.id`, `Stay.id`, etc. The itinerary could display additional details (e.g., flight number, airline) by looking up the referenced object.
   - What's unclear: Should the itinerary item card show only `label` and `notes`, or fetch full details from `tripState.flights()`, `tripState.stays()`, etc.?
   - Recommendation: **Display only `label` and `notes` in Phase 10.** The `label` is populated when the item is added (e.g., "Flight to Paris"). If the user wants full details, they can navigate back to the search results. Resolving references adds complexity and creates a dependency on all search phases. Keep Phase 10 simple.

3. **Should empty days be shown if no items are scheduled?**
   - What we know: The grouped Map will only contain keys for dates that have items. Days with no items won't appear.
   - What's unclear: Should the itinerary display a "Day 1", "Day 2", "Day 3" structure even if Day 2 is empty?
   - Recommendation: **Only show days that have items.** This is the natural result of `Object.groupBy()` and keeps the UI clean. If the user wants to see all days, they can add manual items for missing days.

4. **How to handle time zone display for `timeSlot` strings?**
   - What we know: `timeSlot` is stored as `"HH:MM"` (24-hour string), no timezone information. Angular's `DatePipe` works with `Date` objects, not raw time strings.
   - What's unclear: Should the itinerary display time in UTC, local browser time, or a trip-specific timezone?
   - Recommendation: **Display `timeSlot` as-is without timezone conversion.** The user enters `"14:00"`, the UI shows `"14:00"`. Timezone handling is out of scope for Phase 10. If needed later, add a `timezone` field to `Trip` model and apply offset during display.

---

## Sources

### Primary (HIGH confidence)
- [Angular Signals Overview](https://angular.dev/guide/signals) — `signal()`, `computed()`, reactivity model
- [Angular @for Control Flow](https://angular.dev/tutorials/first-app/08-ngFor) — `@for` syntax, `track` expressions, `@empty` block
- [Angular Reactive Forms](https://angular.dev/guide/forms/reactive-forms) — `FormGroup`, `FormControl`, `Validators`
- [Angular CDK moveItemInArray API](https://angular.dev/api/cdk/drag-drop/moveItemInArray) — Function signature, parameters
- [MDN Object.groupBy()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/groupBy) — Native ES2024 method, browser support
- [MDN Map.groupBy()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/groupBy) — Alternative when using complex keys
- [Angular DatePipe](https://angular.dev/api/common/DatePipe) — Date formatting in templates

### Secondary (MEDIUM confidence)
- [Angular Material Expansion Panel](https://material.angular.dev/components/expansion) — Accordion UI pattern for day sections
- [CopyProgramming: Reordering with Buttons](https://copyprogramming.com/howto/how-to-change-order-of-a-drag-and-drop-list-in-angular-material-with-up-or-down-buttons) — Button-based reordering pattern
- [Medium: Inline Editable Table with Reactive Forms](https://medium.com/@vap1231/inline-editable-table-using-dynamic-form-controls-in-angular-87eb24c0e5a5) — Inline edit pattern
- [MDN Date.toISOString()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString) — ISO 8601 format details
- [GitHub: sort-isostring](https://github.com/lukeed/sort-isostring) — Performance benchmark for lexicographic date string sorting
- [FreeCodeCamp: How to Sort Dates Efficiently in JavaScript](https://www.freecodecamp.org/news/how-to-sort-dates-efficiently-in-javascript/) — Date sorting best practices
- [Smashing Magazine: Designing the Perfect Date and Time Picker](https://www.smashingmagazine.com/2017/07/designing-perfect-date-time-picker/) — UX best practices for time input
- [Ben Nadel: Signals and Array Mutability in Angular 18](https://www.bennadel.com/blog/4701-signals-and-array-mutability-in-angular-18.htm) — Pitfalls with signal array mutation
- [Angular.love: Signals - The Hidden Cost of Reference Changes](https://angular.love/angular-signals-the-hidden-cost-of-reference-changes/) — Computed signal optimization patterns

### Tertiary (LOW confidence — validate before implementing)
- TypeScript 5.4 added type declarations for `Object.groupBy()` and `Map.groupBy()` — mentioned in search results but not verified against official TypeScript docs
- Object.groupBy() baseline browser support "late 2024" — stated in search results; Chrome 117+, Firefox 119+ confirmed, but Safari version not verified

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Angular Signals, Forms, CDK verified via angular.dev; Object.groupBy() verified via MDN
- Architecture patterns: HIGH — `computed()` transformations, `@for` syntax, `moveItemInArray()` all verified via official docs
- Grouping logic: HIGH — Object.groupBy() baseline browser support confirmed; reduce() fallback is well-established
- Reordering pattern: MEDIUM — `moveItemInArray()` API verified, but button-based pattern sourced from community articles, not official Angular docs
- Time input validation: MEDIUM — HTML5 `type="time"` with pattern validator is standard, but Angular Material has no dedicated 24-hour timepicker in v21 (verified via search results, not official Material docs)
- UI/UX best practices for itinerary timelines: LOW — sourced from design articles, not verified against user research or official guidelines

**Research date:** 2026-02-12
**Valid until:** 2026-03-14 (30 days — Angular Signals API stable; browser APIs stable; no fast-moving dependencies)
