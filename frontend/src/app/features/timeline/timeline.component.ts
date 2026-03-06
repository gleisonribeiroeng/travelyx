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
import { ItemDetailDialogComponent, ItemDetailData, ItemDetailResult } from '../../shared/components/item-detail-dialog/item-detail-dialog.component';

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

  openItemDetail(item: ItineraryItem): void {
    if (!item.refId || item.type === 'custom') return;

    const trip = this.tripState.trip();
    let data: ItemDetailData | null = null;

    switch (item.type) {
      case 'flight': {
        const found = trip.flights.find(f => f.id === item.refId);
        if (found) data = { type: 'flight', item: found, isAdded: true, isPaid: item.isPaid };
        break;
      }
      case 'stay': {
        const found = trip.stays.find(s => s.id === item.refId);
        if (found) data = { type: 'stay', item: found, isAdded: true, isPaid: item.isPaid };
        break;
      }
      case 'car-rental': {
        const found = trip.carRentals.find(c => c.id === item.refId);
        if (found) data = { type: 'car-rental', item: found, isAdded: true, isPaid: item.isPaid };
        break;
      }
      case 'transport': {
        const found = trip.transports.find(t => t.id === item.refId);
        if (found) data = { type: 'transport', item: found, isAdded: true, isPaid: item.isPaid };
        break;
      }
      case 'activity': {
        const found = trip.activities.find(a => a.id === item.refId);
        if (found) data = { type: 'activity', item: found, isAdded: true, isPaid: item.isPaid };
        break;
      }
      case 'attraction': {
        const found = trip.attractions.find(a => a.id === item.refId);
        if (found) data = { type: 'attraction', item: found, isAdded: true, isPaid: item.isPaid };
        break;
      }
    }

    if (!data) return;

    const ref = this.dialog.open(ItemDetailDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data,
    });

    ref.afterClosed().subscribe((result: ItemDetailResult) => {
      if (result?.action === 'remove') {
        this.removeItem(item.id);
        this.removeDomainItem(item.type, item.refId!);
      } else if (result?.action === 'togglePaid') {
        this.togglePaid(item);
      }
    });
  }

  private removeDomainItem(type: string, refId: string): void {
    switch (type) {
      case 'flight':     this.tripState.removeFlight(refId);     break;
      case 'stay':       this.tripState.removeStay(refId);       break;
      case 'car-rental': this.tripState.removeCarRental(refId);  break;
      case 'transport':  this.tripState.removeTransport(refId);  break;
      case 'activity':   this.tripState.removeActivity(refId);   break;
      case 'attraction': this.tripState.removeAttraction(refId); break;
    }
  }
}
