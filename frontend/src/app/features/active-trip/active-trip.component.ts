import { Component, inject, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { TripStateService } from '../../core/services/trip-state.service';
import { TripRouterService } from '../../core/services/trip-router.service';
import { ItineraryItem } from '../../core/models/trip.models';

@Component({
  selector: 'app-active-trip',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CommonModule],
  templateUrl: './active-trip.component.html',
  styleUrl: './active-trip.component.scss',
})
export class ActiveTripComponent implements OnInit, OnDestroy {
  private readonly tripRouter = inject(TripRouterService);
  protected readonly tripState = inject(TripStateService);
  private refreshTimer: any;

  readonly now = signal(new Date());

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

  readonly todayItems = computed(() =>
    this.tripState.itineraryItems()
      .filter(i => i.date === this.today())
      .sort((a, b) => (a.timeSlot ?? '').localeCompare(b.timeSlot ?? ''))
  );

  readonly currentItem = computed<ItineraryItem | null>(() => {
    const time = this.currentTime();
    return this.todayItems().find(i => {
      if (!i.timeSlot) return false;
      const dur = i.durationMinutes ?? 60;
      const startMin = this.timeToMin(i.timeSlot);
      const endMin = startMin + dur;
      const nowMin = this.timeToMin(time);
      return nowMin >= startMin && nowMin < endMin;
    }) ?? null;
  });

  readonly nextItem = computed<ItineraryItem | null>(() => {
    const time = this.currentTime();
    return this.todayItems().find(i => i.timeSlot && i.timeSlot > time) ?? null;
  });

  readonly minutesUntilNext = computed(() => {
    const next = this.nextItem();
    if (!next?.timeSlot) return null;
    return this.timeToMin(next.timeSlot) - this.timeToMin(this.currentTime());
  });

  readonly tomorrowDate = computed(() => {
    const d = new Date(this.today() + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });

  readonly tomorrowItems = computed(() =>
    this.tripState.itineraryItems()
      .filter(i => i.date === this.tomorrowDate())
      .sort((a, b) => (a.timeSlot ?? '').localeCompare(b.timeSlot ?? ''))
  );

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
      attraction: 'museum', custom: 'event',
    };
    return map[type] || 'event';
  }

  navigateTo(route: string): void {
    this.tripRouter.navigate(route);
  }
}
