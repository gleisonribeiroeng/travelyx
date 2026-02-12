import { Component, computed, inject } from '@angular/core';
import { KeyValuePipe, DatePipe } from '@angular/common';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { TripStateService } from '../../core/services/trip-state.service';
import { ItineraryItem } from '../../core/models/trip.models';
import { ItineraryItemComponent } from './itinerary-item.component';
import { ManualItemFormComponent } from './manual-item-form.component';

@Component({
  selector: 'app-itinerary',
  standalone: true,
  imports: [MATERIAL_IMPORTS, KeyValuePipe, DatePipe, ItineraryItemComponent, ManualItemFormComponent],
  templateUrl: './itinerary.component.html',
  styleUrl: './itinerary.component.scss',
})
export class ItineraryComponent {
  protected readonly tripState = inject(TripStateService);

  /**
   * Groups itinerary items by date, sorts within each day by timeSlot + order.
   * Returns Map<string, ItineraryItem[]> sorted by date key ascending.
   */
  readonly itemsByDay = computed(() => {
    const items = this.tripState.itineraryItems();

    // Group by date using reduce (ES2024 Object.groupBy fallback for TypeScript compatibility)
    const grouped = items.reduce((acc, item) => {
      if (!acc[item.date]) {
        acc[item.date] = [];
      }
      acc[item.date].push(item);
      return acc;
    }, {} as Record<string, ItineraryItem[]>);

    // Sort each day's items: null timeSlot first (all-day), then by timeSlot, then by order
    // IMPORTANT: Shallow copy before sorting to avoid mutating signal's internal array
    const sortedGrouped: Record<string, ItineraryItem[]> = {};
    for (const [date, dayItems] of Object.entries(grouped)) {
      sortedGrouped[date] = [...dayItems].sort((a, b) => {
        // All-day items (null timeSlot) come first
        if (a.timeSlot === null && b.timeSlot !== null) return -1;
        if (a.timeSlot !== null && b.timeSlot === null) return 1;

        // Both have timeSlots: compare lexicographically (HH:MM strings)
        if (a.timeSlot !== null && b.timeSlot !== null) {
          const timeCompare = a.timeSlot.localeCompare(b.timeSlot);
          if (timeCompare !== 0) return timeCompare;
        }

        // Same timeSlot (or both null): sort by order
        return a.order - b.order;
      });
    }

    // Convert to Map, sorted by date key (ISO date strings are lexicographically sortable)
    const sortedEntries = Object.entries(sortedGrouped).sort(([dateA], [dateB]) =>
      dateA.localeCompare(dateB)
    );

    return new Map(sortedEntries);
  });

  /**
   * Moves an item up within its day. Persists new order to all affected items.
   */
  moveItemUp(item: ItineraryItem, dayItems: ItineraryItem[]): void {
    const index = dayItems.findIndex((i) => i.id === item.id);
    if (index <= 0) return; // Already at top

    // Mutate the array for reorder logic (safe: dayItems is the result of spread in computed)
    moveItemInArray(dayItems, index, index - 1);

    // Persist new order for all items in the day
    dayItems.forEach((i, idx) => {
      this.tripState.updateItineraryItem({ ...i, order: idx });
    });
  }

  /**
   * Moves an item down within its day. Persists new order to all affected items.
   */
  moveItemDown(item: ItineraryItem, dayItems: ItineraryItem[]): void {
    const index = dayItems.findIndex((i) => i.id === item.id);
    if (index < 0 || index >= dayItems.length - 1) return; // Already at bottom

    moveItemInArray(dayItems, index, index + 1);

    dayItems.forEach((i, idx) => {
      this.tripState.updateItineraryItem({ ...i, order: idx });
    });
  }

  /**
   * Removes an item from the itinerary permanently.
   */
  removeItem(id: string): void {
    this.tripState.removeItineraryItem(id);
  }
}
