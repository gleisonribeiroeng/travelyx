import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { MatDialog } from '@angular/material/dialog';
import { TripStateService } from '../../core/services/trip-state.service';
import { NotificationService } from '../../core/services/notification.service';
import { WeatherService, DayWeather } from '../../core/services/weather.service';
import { computeAllConflicts } from '../../core/utils/conflict-engine.util';
import { buildTimeline, TimelineDay } from '../../core/utils/timeline-builder.util';
import { ItineraryItem, ItineraryItemType, ConflictAlert } from '../../core/models/trip.models';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { AddItemDialogComponent } from './add-item-dialog.component';
import { ItemDetailDialogComponent, ItemDetailData, ItemDetailResult } from '../../shared/components/item-detail-dialog/item-detail-dialog.component';
import { CalendarApiService } from '../../core/api/calendar-api.service';
import { TimeEditorDialogComponent, TimeEditorResult } from './time-editor-dialog.component';
import { ExportService } from '../../core/services/export.service';
import { PlanService } from '../../core/services/plan.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CommonModule, FormsModule, DragDropModule, TranslatePipe],
  templateUrl: './timeline.component.html',
  styleUrl: './timeline.component.scss',
})
export class TimelineComponent implements OnInit {
  protected readonly tripState = inject(TripStateService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly calendarApi = inject(CalendarApiService);
  private readonly exportService = inject(ExportService);
  protected readonly planService = inject(PlanService);
  protected readonly weather = inject(WeatherService);
  private readonly i18n = inject(TranslationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private calendarJustConnected = false;

  readonly syncing = signal(false);
  readonly exporting = signal(false);
  readonly optimizing = signal(false);

  // ── Filters ──
  readonly activeFilter = signal<string>('');
  readonly filterTypes: { value: string; icon: string; label: string }[] = [
    { value: '', icon: 'select_all', label: 'Todos' },
    { value: 'flight', icon: 'flight', label: 'Voos' },
    { value: 'stay', icon: 'hotel', label: 'Hospedagem' },
    { value: 'activity', icon: 'local_activity', label: 'Atividades' },
    { value: 'transport', icon: 'directions_bus', label: 'Transporte' },
    { value: 'car-rental', icon: 'directions_car', label: 'Carros' },
    { value: 'custom', icon: 'edit_note', label: 'Custom' },
  ];

  // ── Day notes editing ──
  readonly editingNoteDate = signal<string | null>(null);
  editingNoteText = '';

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['calendar_connected'] === 'true') {
        this.calendarJustConnected = true;
        this.notify.success(this.i18n.t('notify.calendarConnected'));
        this.router.navigate([], { queryParams: {}, replaceUrl: true });
        setTimeout(() => this.doAutoSync(), 2000);
      }
    });

    // Fetch weather if trip has destination with coords and dates
    this.loadWeather();
  }

  private loadWeather(): void {
    const trip = this.tripState.trip();
    if (!trip.dates.start || !trip.dates.end) return;

    // Try to get coords from stays or activities
    let lat: number | null = null;
    let lng: number | null = null;
    for (const s of trip.stays) {
      if (s.location) { lat = s.location.latitude; lng = s.location.longitude; break; }
    }
    if (!lat) {
      for (const a of trip.activities) {
        if (a.location) { lat = a.location.latitude; lng = a.location.longitude; break; }
      }
    }
    if (!lat) {
      for (const a of trip.attractions) {
        if (a.location) { lat = a.location.latitude; lng = a.location.longitude; break; }
      }
    }
    if (lat && lng) {
      this.weather.fetchForecast(lat, lng, trip.dates.start, trip.dates.end);
    }
  }

  private doAutoSync(): void {
    const trip = this.tripState.trip();
    const allItems = trip.itineraryItems;
    if (allItems.length === 0) return;
    this.syncing.set(true);
    this.doSync(trip.name, allItems);
  }

  readonly expandedDays = signal<Set<string>>(new Set());

  readonly conflicts = computed<ConflictAlert[]>(() => {
    try { return computeAllConflicts(this.tripState.trip()); } catch { return []; }
  });

  readonly timeline = computed<TimelineDay[]>(() => {
    const trip = this.tripState.trip();
    return buildTimeline(trip, trip.itineraryItems, this.conflicts());
  });

  /** Timeline filtered by active type filter */
  readonly filteredTimeline = computed<TimelineDay[]>(() => {
    const filter = this.activeFilter();
    if (!filter) return this.timeline();
    return this.timeline().map(day => ({
      ...day,
      allDayItems: day.allDayItems.filter(i => i.type === filter),
      timedItems: day.timedItems.filter(i => i.type === filter),
      stats: {
        ...day.stats,
        itemCount: day.allDayItems.filter(i => i.type === filter).length + day.timedItems.filter(i => i.type === filter).length,
      },
    }));
  });

  readonly hasDates = computed(() => {
    const t = this.tripState.trip();
    return !!t.dates.start && !!t.dates.end;
  });

  // ── Trip Summary Stats ──
  readonly tripSummary = computed(() => {
    const days = this.timeline();
    const trip = this.tripState.trip();
    const totalDays = days.length;
    const plannedDays = days.filter(d => !d.isEmpty).length;
    const emptyDays = totalDays - plannedDays;
    const totalItems = days.reduce((s, d) => s + d.stats.itemCount, 0);
    const totalCost = days.reduce((s, d) => s + d.stats.totalCost, 0);
    const totalDuration = days.reduce((s, d) => s + d.stats.totalDurationMinutes, 0);
    const paidItems = trip.itineraryItems.filter(i => i.isPaid).length;
    const paidPercent = totalItems > 0 ? Math.round((paidItems / totalItems) * 100) : 0;
    const conflictCount = this.conflicts().length;
    return { totalDays, plannedDays, emptyDays, totalItems, totalCost, totalDuration, paidItems, paidPercent, conflictCount, currency: trip.currency || 'BRL' };
  });

  // ── Type counts for filter badges ──
  readonly typeCounts = computed(() => {
    const items = this.tripState.trip().itineraryItems;
    const counts: Record<string, number> = {};
    for (const item of items) {
      counts[item.type] = (counts[item.type] || 0) + 1;
    }
    return counts;
  });

  // ── Available days for "move to" ──
  readonly availableDays = computed(() => {
    return this.timeline().map(d => ({ date: d.date, label: d.dayLabel }));
  });

  // ── Day notes ──
  getDayNote(date: string): string {
    return this.tripState.dayNotes()[date] || '';
  }

  startEditNote(date: string): void {
    this.editingNoteDate.set(date);
    this.editingNoteText = this.getDayNote(date);
  }

  saveNote(): void {
    const date = this.editingNoteDate();
    if (date) {
      this.tripState.setDayNote(date, this.editingNoteText);
    }
    this.editingNoteDate.set(null);
  }

  cancelEditNote(): void {
    this.editingNoteDate.set(null);
  }

  // ── Travel time between consecutive items ──
  getTravelTime(prevItem: ItineraryItem, currentItem: ItineraryItem): { minutes: number; km: number } | null {
    const trip = this.tripState.trip();
    const prevCoords = this.getItemCoords(prevItem, trip);
    const currCoords = this.getItemCoords(currentItem, trip);
    if (!prevCoords || !currCoords) return null;

    const km = this.haversineDistance(prevCoords.lat, prevCoords.lng, currCoords.lat, currCoords.lng);
    if (km < 0.2) return null; // Same location
    // Rough estimate: 30km/h in city, 60km/h outside
    const speed = km > 20 ? 60 : 30;
    const minutes = Math.round((km / speed) * 60);
    return { minutes, km: Math.round(km * 10) / 10 };
  }

  private getItemCoords(item: ItineraryItem, trip: any): { lat: number; lng: number } | null {
    if (!item.refId) return null;
    let loc: any = null;
    switch (item.type) {
      case 'stay': loc = trip.stays.find((s: any) => s.id === item.refId)?.location; break;
      case 'activity': loc = trip.activities.find((a: any) => a.id === item.refId)?.location; break;
      case 'attraction': loc = trip.attractions.find((a: any) => a.id === item.refId)?.location; break;
    }
    if (!loc) return null;
    return { lat: loc.latitude, lng: loc.longitude };
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ── Move item to another day ──
  moveItemToDay(item: ItineraryItem, targetDate: string): void {
    if (item.date === targetDate) return;
    const updated: ItineraryItem = { ...item, date: targetDate };
    this.tripState.updateItineraryItem(updated);
    this.notify.success(this.i18n.t('timeline.movedToDay'));
  }

  // ── Duplicate item ──
  duplicateItem(item: ItineraryItem, targetDate?: string): void {
    const newItem: ItineraryItem = {
      ...item,
      id: crypto.randomUUID(),
      date: targetDate || item.date,
      isPaid: false,
      attachment: null,
    };
    this.tripState.addItineraryItem(newItem);
    this.notify.success(this.i18n.t('timeline.itemDuplicated'));
  }

  // ── Weather for date ──
  getWeather(date: string): DayWeather | null {
    return this.weather.getForDate(date);
  }

  // ── Existing methods (preserved) ──

  openAddDialog(presetType?: string, presetDate?: string): void {
    const ref = this.dialog.open(AddItemDialogComponent, {
      width: '480px',
      data: { presetType, presetDate },
    });
    ref.afterClosed().subscribe((item: ItineraryItem | undefined) => {
      if (!item) return;
      this.tripState.addItineraryItem(item);
      this.notify.success(this.i18n.t('notify.itemAdded'));
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
      attraction: 'local_activity', custom: 'edit_note',
    };
    return map[type] || 'event';
  }

  getTypeLabel(type: string): string {
    const map: Record<string, string> = {
      flight: 'timeline.typeFlight', stay: 'timeline.typeHotel', 'car-rental': 'timeline.typeCar',
      transport: 'timeline.typeTransport', activity: 'timeline.typeActivity',
      attraction: 'timeline.typeActivity', custom: 'timeline.typeCustom',
    };
    return this.i18n.t(map[type] || type);
  }

  openTimeEditor(item: ItineraryItem, event: Event): void {
    event.stopPropagation();
    const ref = this.dialog.open(TimeEditorDialogComponent, {
      width: '380px',
      data: { label: item.label, type: item.type, timeSlot: item.timeSlot, durationMinutes: item.durationMinutes },
    });
    ref.afterClosed().subscribe((result: TimeEditorResult | undefined) => {
      if (!result) return;
      this.tripState.updateItineraryItem({ ...item, timeSlot: result.timeSlot, durationMinutes: result.durationMinutes });
      this.notify.success(this.i18n.t('notify.timeUpdated'));
    });
  }

  getEndTime(item: ItineraryItem): string {
    if (!item.timeSlot || !item.durationMinutes) return '';
    const [h, m] = item.timeSlot.split(':').map(Number);
    const total = h * 60 + m + item.durationMinutes;
    const endH = Math.floor(total / 60) % 24;
    const endM = total % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
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
      case 'flight': { const f = trip.flights.find(x => x.id === item.refId); return f ? `${f.origin} → ${f.destination}` : ''; }
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
      this.tripState.updateItineraryItem({ ...item, date: targetDate, order: event.currentIndex });
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
      case 'flight': { const f = trip.flights.find(x => x.id === item.refId); if (f) data = { type: 'flight', item: f, isAdded: true, isPaid: item.isPaid }; break; }
      case 'stay': { const f = trip.stays.find(x => x.id === item.refId); if (f) data = { type: 'stay', item: f, isAdded: true, isPaid: item.isPaid }; break; }
      case 'car-rental': { const f = trip.carRentals.find(x => x.id === item.refId); if (f) data = { type: 'car-rental', item: f, isAdded: true, isPaid: item.isPaid }; break; }
      case 'transport': { const f = trip.transports.find(x => x.id === item.refId); if (f) data = { type: 'transport', item: f, isAdded: true, isPaid: item.isPaid }; break; }
      case 'activity': { const f = trip.activities.find(x => x.id === item.refId); if (f) data = { type: 'activity', item: f, isAdded: true, isPaid: item.isPaid }; break; }
      case 'attraction': { const f = trip.attractions.find(x => x.id === item.refId); if (f) data = { type: 'attraction', item: f, isAdded: true, isPaid: item.isPaid }; break; }
    }
    if (!data) return;
    const ref = this.dialog.open(ItemDetailDialogComponent, { width: '600px', maxWidth: '95vw', maxHeight: '90vh', data });
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
    if (allItems.length === 0) { this.notify.info(this.i18n.t('notify.noItemsToSync')); return; }
    this.syncing.set(true);
    this.calendarApi.checkStatus().subscribe({
      next: (status) => {
        if (status.connected) { this.doSync(trip.name, allItems); }
        else { this.syncing.set(false); this.authorizeCalendar(); }
      },
      error: () => { this.syncing.set(false); this.authorizeCalendar(); },
    });
  }

  private authorizeCalendar(): void {
    if (this.calendarJustConnected) { this.syncing.set(false); this.notify.error(this.i18n.t('notify.calendarSyncError')); this.calendarJustConnected = false; return; }
    const returnPath = window.location.pathname;
    this.calendarApi.getAuthorizeUrl(returnPath).subscribe({
      next: ({ url }) => { this.notify.info(this.i18n.t('notify.authorizingCalendar')); window.location.href = url; },
      error: () => { this.notify.error(this.i18n.t('notify.calendarAuthError')); },
    });
  }

  private doSync(tripName: string, allItems: ItineraryItem[]): void {
    const events = allItems.map(item => ({
      id: item.id, type: item.type, label: item.label, date: item.date,
      timeSlot: item.timeSlot, durationMinutes: item.durationMinutes,
      notes: item.notes, location: this.getItemLocation(item) || undefined,
    }));
    this.calendarApi.syncToCalendar({ tripName: tripName || 'Viagem', events }).subscribe({
      next: (result) => {
        this.syncing.set(false);
        if (result.errors.length > 0) { this.notify.info(`${result.created} ${this.i18n.t('notify.eventsCreated')} ${result.errors.length} ${this.i18n.t('notify.errors')}`); }
        else { this.notify.success(`${result.created} ${this.i18n.t('notify.eventsAddedToCalendar')}`); }
      },
      error: (err) => {
        this.syncing.set(false);
        if (err?.status === 500 && err?.error?.message?.includes('Autorize')) { this.authorizeCalendar(); }
        else { this.notify.error(err?.error?.message || this.i18n.t('notify.calendarSyncError')); }
      },
    });
  }

  async exportPdf(): Promise<void> {
    if (!this.planService.isPro()) { this.planService.showPaywall('budget'); return; }
    this.exporting.set(true);
    try { await this.exportService.exportToPdf(); this.notify.success(this.i18n.t('export.pdfSuccess')); }
    catch { this.notify.error(this.i18n.t('export.pdfError')); }
    finally { this.exporting.set(false); }
  }

  optimizeRoute(): void {
    if (!this.planService.hasFeature('routeOptimization')) { this.planService.showPaywall('routeOptimization'); return; }
    const trip = this.tripState.trip();
    const itemsWithCoords: { id: string; lat: number; lng: number }[] = [];
    for (const item of trip.itineraryItems) {
      const coords = this.getItemCoords(item, trip);
      if (coords) itemsWithCoords.push({ id: item.id, ...coords });
    }
    if (itemsWithCoords.length < 3) { this.notify.warning(this.i18n.t('timeline.optimizeMinItems')); return; }
    this.optimizing.set(true);
    this.tripState.optimizeRoute(itemsWithCoords).subscribe({
      next: (result) => {
        const orderMap = new Map(result.optimized.map((item, idx) => [item.id, idx]));
        for (const item of trip.itineraryItems) {
          const newOrder = orderMap.get(item.id);
          if (newOrder !== undefined) this.tripState.updateItineraryItem({ ...item, order: newOrder });
        }
        this.notify.success(this.i18n.t('timeline.optimizeSuccess'));
        this.optimizing.set(false);
      },
      error: () => { this.notify.error(this.i18n.t('timeline.optimizeError')); this.optimizing.set(false); },
    });
  }

  async exportBeautifulPdf(): Promise<void> {
    if (!this.planService.hasFeature('pdfExport')) { this.planService.showPaywall('pdfExport'); return; }
    this.exporting.set(true);
    try { await this.exportService.exportToBeautifulPdf(); this.notify.success(this.i18n.t('export.pdfSuccess')); }
    catch { this.notify.error(this.i18n.t('export.pdfError')); }
    finally { this.exporting.set(false); }
  }

  async exportExcel(): Promise<void> {
    if (!this.planService.isPro()) { this.planService.showPaywall('budget'); return; }
    this.exporting.set(true);
    try { await this.exportService.exportToExcel(); this.notify.success(this.i18n.t('export.excelSuccess')); }
    catch { this.notify.error(this.i18n.t('export.excelError')); }
    finally { this.exporting.set(false); }
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
