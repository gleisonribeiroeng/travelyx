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
import { CalendarApiService } from '../../core/api/calendar-api.service';

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
  private readonly calendarApi = inject(CalendarApiService);

  readonly syncing = signal(false);

  readonly expandedDays = signal<Set<string>>(new Set());

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

  readonly totalTripCost = computed(() =>
    this.timeline().reduce((sum, d) => sum + d.stats.totalCost, 0)
  );

  readonly totalActivities = computed(() =>
    this.timeline().reduce((sum, d) => sum + d.stats.itemCount, 0)
  );

  openAddDialog(presetType?: string, presetDate?: string): void {
    const ref = this.dialog.open(AddItemDialogComponent, {
      width: '480px',
      data: { presetType, presetDate },
    });
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
    const next = new Set(this.expandedDays());
    if (next.has(date)) { next.delete(date); } else { next.add(date); }
    this.expandedDays.set(next);
  }

  isDayExpanded(date: string): boolean {
    return this.expandedDays().has(date);
  }

  expandAll(): void {
    this.expandedDays.set(new Set(this.timeline().map(d => d.date)));
  }

  collapseAll(): void {
    this.expandedDays.set(new Set());
  }

  getTypeIcon(type: string): string {
    const map: Record<string, string> = {
      flight: 'flight', stay: 'hotel', 'car-rental': 'directions_car',
      transport: 'directions_bus', activity: 'local_activity',
      attraction: 'place', custom: 'edit_note',
    };
    return map[type] || 'event';
  }

  getTypeLabel(type: string): string {
    const map: Record<string, string> = {
      flight: 'Voo', stay: 'Hotel', 'car-rental': 'Carro',
      transport: 'Transporte', activity: 'Passeio',
      attraction: 'Atração', custom: 'Personalizado',
    };
    return map[type] || type;
  }

  getItemPrice(item: ItineraryItem): number {
    if (!item.refId) return 0;
    const trip = this.tripState.trip();
    switch (item.type) {
      case 'flight': return trip.flights.find(f => f.id === item.refId)?.price?.total ?? 0;
      case 'stay': return trip.stays.find(s => s.id === item.refId)?.pricePerNight?.total ?? 0;
      case 'car-rental': return trip.carRentals.find(c => c.id === item.refId)?.price?.total ?? 0;
      case 'transport': return trip.transports.find(t => t.id === item.refId)?.price?.total ?? 0;
      case 'activity': return trip.activities.find(a => a.id === item.refId)?.price?.total ?? 0;
      default: return 0;
    }
  }

  getItemLocation(item: ItineraryItem): string {
    if (item.location) return item.location;
    if (!item.refId) return '';
    const trip = this.tripState.trip();
    switch (item.type) {
      case 'flight': {
        const f = trip.flights.find(x => x.id === item.refId);
        return f ? `${f.origin} → ${f.destination}` : '';
      }
      case 'stay': return trip.stays.find(x => x.id === item.refId)?.address ?? '';
      case 'activity': return trip.activities.find(x => x.id === item.refId)?.city ?? '';
      case 'attraction': return trip.attractions.find(x => x.id === item.refId)?.city ?? '';
      default: return '';
    }
  }

  formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes}min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h${m}min` : `${h}h`;
  }

  formatCurrency(value: number): string {
    if (!value) return '';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: this.tripState.trip().currency || 'BRL' });
  }

  onDrop(event: CdkDragDrop<ItineraryItem[]>, targetDate: string): void {
    const item = event.item.data as ItineraryItem;
    if (!item) return;
    if (item.date !== targetDate || event.previousIndex !== event.currentIndex) {
      const updated: ItineraryItem = { ...item, date: targetDate, order: event.currentIndex };
      this.tripState.updateItineraryItem(updated);
    }
  }

  removeItem(id: string, event: Event): void {
    event.stopPropagation();
    this.tripState.removeItineraryItem(id);
  }

  togglePaid(item: ItineraryItem, event: Event): void {
    event.stopPropagation();
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
      width: '600px', maxWidth: '95vw', maxHeight: '90vh', data,
    });

    ref.afterClosed().subscribe((result: ItemDetailResult) => {
      if (result?.action === 'remove') {
        this.tripState.removeItineraryItem(item.id);
        this.removeDomainItem(item.type, item.refId!);
      } else if (result?.action === 'togglePaid') {
        this.tripState.toggleItemPaid(item.id);
      }
    });
  }

  syncToCalendar(): void {
    const trip = this.tripState.trip();
    const allItems = trip.itineraryItems;
    if (allItems.length === 0) {
      this.notify.info('Nenhum item na timeline para sincronizar');
      return;
    }

    this.syncing.set(true);

    // First check if Calendar is connected
    this.calendarApi.checkStatus().subscribe({
      next: (status) => {
        if (status.connected) {
          this.doSync(trip.name, allItems);
        } else {
          // Not connected — redirect to authorize Calendar
          this.syncing.set(false);
          this.authorizeCalendar();
        }
      },
      error: () => {
        // Status check failed — try authorize
        this.syncing.set(false);
        this.authorizeCalendar();
      },
    });
  }

  private authorizeCalendar(): void {
    this.calendarApi.getAuthorizeUrl().subscribe({
      next: ({ url }) => {
        this.notify.info('Autorizando acesso ao Google Calendar...');
        window.location.href = url;
      },
      error: () => {
        this.notify.error('Erro ao iniciar autorização do Calendar.');
      },
    });
  }

  private doSync(tripName: string, allItems: ItineraryItem[]): void {
    const events = allItems.map(item => ({
      id: item.id,
      type: item.type,
      label: item.label,
      date: item.date,
      timeSlot: item.timeSlot,
      durationMinutes: item.durationMinutes,
      notes: item.notes,
      location: this.getItemLocation(item) || undefined,
    }));

    this.calendarApi.syncToCalendar({ tripName: tripName || 'Viagem', events }).subscribe({
      next: (result) => {
        this.syncing.set(false);
        if (result.errors.length > 0) {
          this.notify.info(`${result.created} eventos criados, ${result.errors.length} erros`);
        } else {
          this.notify.success(`${result.created} eventos adicionados ao Google Calendar`);
        }
      },
      error: (err) => {
        this.syncing.set(false);
        if (err?.status === 500 && err?.error?.message?.includes('Autorize')) {
          this.authorizeCalendar();
        } else {
          const msg = err?.error?.message || 'Erro ao sincronizar com o Google Calendar.';
          this.notify.error(msg);
        }
      },
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
