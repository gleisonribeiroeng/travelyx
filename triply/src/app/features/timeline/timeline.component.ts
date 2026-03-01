import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { MatDialog } from '@angular/material/dialog';
import { TripStateService } from '../../core/services/trip-state.service';
import { NotificationService } from '../../core/services/notification.service';
import { computeAllConflicts } from '../../core/utils/conflict-engine.util';
import { buildTimeline, TimelineDay } from '../../core/utils/timeline-builder.util';
import { ItineraryItem, ConflictAlert } from '../../core/models/trip.models';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { AddItemDialogComponent } from './add-item-dialog.component';

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CommonModule, DragDropModule],
  templateUrl: './timeline.component.html',
  styleUrl: './timeline.component.scss',
})
export class TimelineComponent {
  protected readonly tripState = inject(TripStateService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);

  readonly viewMode = signal<'expanded' | 'compact'>('compact');
  readonly expandedDays = signal<Set<string>>(new Set());

  openAddDialog(): void {
    const ref = this.dialog.open(AddItemDialogComponent, { width: '480px' });
    ref.afterClosed().subscribe((item: ItineraryItem | undefined) => {
      if (!item) return;
      this.tripState.addItineraryItem(item);
      this.notify.success('Item adicionado ao roteiro');
      const next = new Set(this.expandedDays());
      next.add(item.date);
      this.expandedDays.set(next);
    });
  }

  toggleDay(date: string): void {
    const current = this.expandedDays();
    const next = new Set(current);
    if (next.has(date)) {
      next.delete(date);
    } else {
      next.add(date);
    }
    this.expandedDays.set(next);
  }

  isDayExpanded(date: string): boolean {
    return this.expandedDays().has(date);
  }

  expandAll(): void {
    const all = new Set(this.timeline().map(d => d.date));
    this.expandedDays.set(all);
  }

  collapseAll(): void {
    this.expandedDays.set(new Set());
  }

  readonly conflicts = computed<ConflictAlert[]>(() => {
    try { return computeAllConflicts(this.tripState.trip()); } catch { return []; }
  });

  readonly timeline = computed<TimelineDay[]>(() => {
    const trip = this.tripState.trip();
    return buildTimeline(trip, trip.itineraryItems, this.conflicts());
  });

  readonly hasDates = computed(() => {
    const t = this.tripState.trip();
    return !!t.dates.start && !!t.dates.end;
  });

  getTypeIcon(type: string): string {
    const map: Record<string, string> = {
      flight: 'flight', stay: 'hotel', 'car-rental': 'directions_car',
      transport: 'directions_bus', activity: 'local_activity',
      attraction: 'museum', custom: 'event',
    };
    return map[type] || 'event';
  }

  getTypeColor(type: string): string {
    const map: Record<string, string> = {
      flight: 'var(--triply-cat-flight)', stay: 'var(--triply-cat-stay)',
      'car-rental': 'var(--triply-cat-car)', transport: 'var(--triply-cat-transport)',
      activity: 'var(--triply-cat-activity)', attraction: 'var(--triply-cat-attraction)',
      custom: 'var(--triply-primary)',
    };
    return map[type] || 'var(--triply-primary)';
  }

  onDrop(event: CdkDragDrop<ItineraryItem[]>, targetDate: string): void {
    const item = event.item.data as ItineraryItem;
    if (!item) return;

    if (item.date !== targetDate || event.previousIndex !== event.currentIndex) {
      const updated: ItineraryItem = { ...item, date: targetDate, order: event.currentIndex };
      this.tripState.updateItineraryItem(updated);
    }
  }

  removeItem(id: string): void {
    this.tripState.removeItineraryItem(id);
  }

  togglePaid(item: ItineraryItem): void {
    this.tripState.toggleItemPaid(item.id);
  }
}
