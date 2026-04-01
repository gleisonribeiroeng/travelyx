import { Component, inject, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { TripStateService } from '../../core/services/trip-state.service';
import { TripRouterService } from '../../core/services/trip-router.service';
import { ItineraryItem, Stay } from '../../core/models/trip.models';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';
import { DESTINATION_DB } from '../../core/data/destinations.data';

const EMERGENCY_NUMBERS: Record<string, string> = {
  'Brasil': '190',
  'Argentina': '911',
  'Chile': '131',
  'Uruguai': '911',
  'Colombia': '123',
  'Peru': '105',
  'Estados Unidos': '911',
  'Canada': '911',
  'Mexico': '911',
  'Portugal': '112',
  'Espanha': '112',
  'Franca': '112',
  'Italia': '112',
  'Inglaterra': '999',
  'Alemanha': '112',
  'Japao': '110',
  'Emirados Arabes': '999',
  'Africa do Sul': '10111',
  'Australia': '000',
};

// Normalized lookup for emergency numbers (strips accents for matching)
function normalizeStr(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function findEmergencyNumber(destination: string): string {
  const norm = normalizeStr(destination);
  for (const [key, val] of Object.entries(EMERGENCY_NUMBERS)) {
    if (normalizeStr(key) === norm) return val;
  }
  // Try partial match
  for (const [key, val] of Object.entries(EMERGENCY_NUMBERS)) {
    if (norm.includes(normalizeStr(key)) || normalizeStr(key).includes(norm)) return val;
  }
  return '112'; // Default international
}

function findDestinationMeta(destination: string) {
  // Direct match
  if (DESTINATION_DB[destination]) return DESTINATION_DB[destination];
  // Normalized match
  const norm = normalizeStr(destination);
  for (const [key, val] of Object.entries(DESTINATION_DB)) {
    if (normalizeStr(key) === norm) return val;
  }
  // Partial match
  for (const [key, val] of Object.entries(DESTINATION_DB)) {
    if (norm.includes(normalizeStr(key)) || normalizeStr(key).includes(norm)) return val;
  }
  return null;
}

@Component({
  selector: 'app-active-trip',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CommonModule, TranslatePipe],
  templateUrl: './active-trip.component.html',
  styleUrl: './active-trip.component.scss',
})
export class ActiveTripComponent implements OnInit, OnDestroy {
  private readonly tripRouter = inject(TripRouterService);
  protected readonly tripState = inject(TripStateService);
  protected readonly i18n = inject(TranslationService);
  private refreshTimer: any;

  readonly now = signal(new Date());
  readonly showHotelPanel = signal(false);
  readonly showEmergencyPanel = signal(false);

  readonly trip = this.tripState.trip;

  readonly today = computed(() => this.now().toISOString().split('T')[0]);
  readonly currentTime = computed(() => {
    const n = this.now();
    return `${n.getHours().toString().padStart(2, '0')}:${n.getMinutes().toString().padStart(2, '0')}`;
  });

  readonly dayNumber = computed(() => {
    const start = this.trip().dates.start;
    if (!start) return 1;
    const s = new Date(start + 'T00:00:00');
    const t = new Date(this.today() + 'T00:00:00');
    return Math.max(1, Math.floor((t.getTime() - s.getTime()) / 86400000) + 1);
  });

  readonly totalDays = computed(() => {
    const t = this.trip();
    if (!t.dates.start || !t.dates.end) return 1;
    const s = new Date(t.dates.start + 'T00:00:00');
    const e = new Date(t.dates.end + 'T00:00:00');
    return Math.max(1, Math.floor((e.getTime() - s.getTime()) / 86400000) + 1);
  });

  readonly progressPercent = computed(() => Math.round((this.dayNumber() / this.totalDays()) * 100));

  readonly destinationMeta = computed(() => findDestinationMeta(this.trip().destination));

  readonly estimatedTemp = computed(() => {
    const meta = this.destinationMeta();
    if (!meta?.avgTempByMonth) return null;
    const month = (this.now().getMonth() + 1) as keyof typeof meta.avgTempByMonth;
    return meta.avgTempByMonth[month] ?? null;
  });

  readonly emergencyNumber = computed(() => findEmergencyNumber(this.trip().destination));

  readonly dayOfWeek = computed(() => {
    const dateStr = this.today();
    const d = new Date(dateStr + 'T12:00:00');
    const isPt = this.i18n.isPt();
    return d.toLocaleDateString(isPt ? 'pt-BR' : 'en-US', { weekday: 'long' });
  });

  readonly formattedDate = computed(() => {
    const dateStr = this.today();
    const d = new Date(dateStr + 'T12:00:00');
    const isPt = this.i18n.isPt();
    return d.toLocaleDateString(isPt ? 'pt-BR' : 'en-US', { day: 'numeric', month: 'long' });
  });

  readonly todayItems = computed(() =>
    this.tripState.itineraryItems()
      .filter(i => i.date === this.today())
      .sort((a, b) => (a.timeSlot ?? '').localeCompare(b.timeSlot ?? ''))
  );

  readonly currentItem = computed<ItineraryItem | null>(() => {
    const time = this.currentTime();
    const nowMin = this.timeToMin(time);
    // Find item currently happening
    const current = this.todayItems().find(i => {
      if (!i.timeSlot) return false;
      const dur = i.durationMinutes ?? 60;
      const startMin = this.timeToMin(i.timeSlot);
      const endMin = startMin + dur;
      return nowMin >= startMin && nowMin < endMin;
    });
    if (current) return current;
    // If nothing currently happening, return next upcoming
    return this.todayItems().find(i => i.timeSlot && i.timeSlot > time) ?? null;
  });

  readonly nextItem = computed<ItineraryItem | null>(() => {
    const current = this.currentItem();
    if (!current) return null;
    const items = this.todayItems();
    const idx = items.findIndex(i => i.id === current.id);
    return idx >= 0 && idx < items.length - 1 ? items[idx + 1] : null;
  });

  readonly laterItems = computed<ItineraryItem[]>(() => {
    const current = this.currentItem();
    const next = this.nextItem();
    if (!current) return [];
    const items = this.todayItems();
    const nextId = next?.id;
    const currentId = current.id;
    return items.filter(i => i.id !== currentId && i.id !== nextId && (i.timeSlot ?? '') > (current.timeSlot ?? ''));
  });

  readonly minutesUntilCurrent = computed(() => {
    const item = this.currentItem();
    if (!item?.timeSlot) return null;
    const diff = this.timeToMin(item.timeSlot) - this.timeToMin(this.currentTime());
    return diff > 0 ? diff : null; // Only show if it's upcoming, not already started
  });

  readonly currentStay = computed<Stay | null>(() => {
    const todayStr = this.today();
    return this.tripState.stays().find(s =>
      s.checkIn <= todayStr && s.checkOut > todayStr
    ) ?? null;
  });

  readonly isCurrentItemActive = computed(() => {
    const item = this.currentItem();
    if (!item?.timeSlot) return false;
    const nowMin = this.timeToMin(this.currentTime());
    const startMin = this.timeToMin(item.timeSlot);
    const endMin = startMin + (item.durationMinutes ?? 60);
    return nowMin >= startMin && nowMin < endMin;
  });

  ngOnInit(): void {
    this.refreshTimer = setInterval(() => this.now.set(new Date()), 60000);
  }

  ngOnDestroy(): void {
    clearInterval(this.refreshTimer);
  }

  private timeToMin(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  getTypeIcon(type: string): string {
    const map: Record<string, string> = {
      flight: 'flight', stay: 'hotel', 'car-rental': 'directions_car',
      transport: 'directions_bus', activity: 'local_activity',
      attraction: 'museum', trajectory: 'route', custom: 'event',
    };
    return map[type] || 'event';
  }

  getTypeColor(type: string): string {
    const map: Record<string, string> = {
      flight: 'var(--triply-cat-flight)',
      stay: 'var(--triply-cat-stay)',
      'car-rental': 'var(--triply-cat-car)',
      transport: 'var(--triply-cat-transport)',
      activity: 'var(--triply-cat-activity)',
      attraction: 'var(--triply-cat-attraction)',
      custom: 'var(--triply-cat-custom)',
    };
    return map[type] || 'var(--triply-text-secondary)';
  }

  openInMaps(label: string): void {
    const q = encodeURIComponent(label + ' ' + this.trip().destination);
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank');
  }

  navigateTo(route: string): void {
    this.tripRouter.navigate(route);
  }

  toggleHotel(): void {
    this.showEmergencyPanel.set(false);
    this.showHotelPanel.update(v => !v);
  }

  toggleEmergency(): void {
    this.showHotelPanel.set(false);
    this.showEmergencyPanel.update(v => !v);
  }
}
