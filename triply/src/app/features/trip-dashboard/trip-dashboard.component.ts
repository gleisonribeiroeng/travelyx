import { Component, inject, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { TripStateService } from '../../core/services/trip-state.service';
import { TripRouterService } from '../../core/services/trip-router.service';
import { BudgetService } from '../../core/services/budget.service';
import { TripScoreService } from '../../core/services/trip-score.service';
import { ChecklistService } from '../../core/services/checklist.service';
import { computeAllConflicts } from '../../core/utils/conflict-engine.util';
import { ConflictAlert, TripStatus } from '../../core/models/trip.models';

@Component({
  selector: 'app-trip-dashboard',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CommonModule, CurrencyPipe, DatePipe],
  templateUrl: './trip-dashboard.component.html',
  styleUrl: './trip-dashboard.component.scss',
})
export class TripDashboardComponent {
  private readonly tripRouter = inject(TripRouterService);
  protected readonly tripState = inject(TripStateService);
  protected readonly budget = inject(BudgetService);
  protected readonly score = inject(TripScoreService);
  protected readonly checklist = inject(ChecklistService);

  readonly trip = this.tripState.trip;

  readonly hasTrip = computed(() =>
    !!this.trip().destination || this.tripState.flights().length > 0 ||
    this.tripState.stays().length > 0 || this.tripState.itineraryItems().length > 0
  );

  readonly daysUntilTrip = computed(() => {
    const start = this.trip().dates.start;
    if (!start) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(start + 'T00:00:00');
    const diff = Math.ceil((startDate.getTime() - today.getTime()) / 86400000);
    return diff;
  });

  readonly tripPhase = computed<'planning' | 'imminent' | 'active' | 'completed'>(() => {
    const days = this.daysUntilTrip();
    if (days === null) return 'planning';
    const end = this.trip().dates.end;
    const today = new Date().toISOString().split('T')[0];
    if (end && today > end) return 'completed';
    if (days <= 0) return 'active';
    if (days <= 7) return 'imminent';
    return 'planning';
  });

  readonly conflicts = computed<ConflictAlert[]>(() => {
    try { return computeAllConflicts(this.trip()); } catch { return []; }
  });

  readonly errorCount = computed(() => this.conflicts().filter(c => c.severity === 'error').length);
  readonly warningCount = computed(() => this.conflicts().filter(c => c.severity === 'warning').length);

  readonly nextItems = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.tripState.itineraryItems()
      .filter(i => i.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.timeSlot ?? '').localeCompare(b.timeSlot ?? ''))
      .slice(0, 4);
  });

  readonly stats = computed(() => [
    { icon: 'flight', label: 'Voos', count: this.tripState.flights().length, route: 'search', color: 'var(--triply-cat-flight)' },
    { icon: 'hotel', label: 'Hotéis', count: this.tripState.stays().length, route: 'hotels', color: 'var(--triply-cat-stay)' },
    { icon: 'directions_car', label: 'Carros', count: this.tripState.carRentals().length, route: 'cars', color: 'var(--triply-cat-car)' },
    { icon: 'local_activity', label: 'Passeios', count: this.tripState.activities().length, route: 'tours', color: 'var(--triply-cat-activity)' },
    { icon: 'directions_bus', label: 'Transportes', count: this.tripState.transports().length, route: 'transport', color: 'var(--triply-cat-transport)' },
    { icon: 'museum', label: 'Atrações', count: this.tripState.attractions().length, route: 'attractions', color: 'var(--triply-cat-attraction)' },
  ].filter(s => s.count > 0));

  getTypeIcon(type: string): string {
    const map: Record<string, string> = {
      flight: 'flight', stay: 'hotel', 'car-rental': 'directions_car',
      transport: 'directions_bus', activity: 'local_activity',
      attraction: 'museum', custom: 'event',
    };
    return map[type] || 'event';
  }

  setStatus(status: TripStatus): void {
    this.tripState.setTripStatus(status);
  }

  navigateTo(route: string): void {
    this.tripRouter.navigate(route);
  }
}
