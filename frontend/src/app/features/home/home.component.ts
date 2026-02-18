import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { TripStateService } from '../../core/services/trip-state.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CurrencyPipe, DatePipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private readonly router = inject(Router);
  protected readonly tripState = inject(TripStateService);

  // ── Trip meta ──
  readonly tripName = computed(() => this.tripState.trip().name);
  readonly tripDestination = computed(() => this.tripState.trip().destination);
  readonly tripDates = computed(() => this.tripState.trip().dates);

  // ── Quick stats ──
  readonly flightCount = computed(() => this.tripState.flights().length);
  readonly hotelCount = computed(() => this.tripState.stays().length);
  readonly carCount = computed(() => this.tripState.carRentals().length);
  readonly activityCount = computed(() => this.tripState.activities().length);
  readonly transportCount = computed(() => this.tripState.transports().length);
  readonly attractionCount = computed(() => this.tripState.attractions().length);
  readonly itineraryItemCount = computed(() => this.tripState.itineraryItems().length);

  readonly tripDayCount = computed(() => {
    const items = this.tripState.itineraryItems();
    const dates = new Set(items.map(i => i.date));
    return dates.size;
  });

  readonly hasTrip = computed(() =>
    this.flightCount() > 0 ||
    this.hotelCount() > 0 ||
    this.carCount() > 0 ||
    this.activityCount() > 0 ||
    this.itineraryItemCount() > 0
  );

  // ── Cost breakdown ──
  readonly costFlights = computed(() =>
    this.tripState.flights().reduce((sum, f) => sum + f.price.total, 0)
  );
  readonly costHotels = computed(() =>
    this.tripState.stays().reduce((sum, s) => sum + s.pricePerNight.total, 0)
  );
  readonly costCars = computed(() =>
    this.tripState.carRentals().reduce((sum, c) => sum + c.price.total, 0)
  );
  readonly costActivities = computed(() =>
    this.tripState.activities().reduce((sum, a) => sum + a.price.total, 0)
  );
  readonly costTransports = computed(() =>
    this.tripState.transports().reduce((sum, t) => sum + t.price.total, 0)
  );
  readonly totalCost = computed(() =>
    this.costFlights() + this.costHotels() + this.costCars() +
    this.costActivities() + this.costTransports()
  );

  // ── Upcoming items (next 5 sorted by date+time) ──
  readonly upcomingItems = computed(() => {
    const items = this.tripState.itineraryItems();
    return [...items]
      .sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        if (a.timeSlot && b.timeSlot) return a.timeSlot.localeCompare(b.timeSlot);
        if (a.timeSlot) return -1;
        if (b.timeSlot) return 1;
        return a.order - b.order;
      })
      .slice(0, 5);
  });

  // ── Planning checklist ──
  readonly checklistSteps = computed(() => [
    { label: 'Definir destino', icon: 'place', done: !!this.tripDestination() },
    { label: 'Buscar voos', icon: 'flight', done: this.flightCount() > 0 },
    { label: 'Reservar hotel', icon: 'hotel', done: this.hotelCount() > 0 },
    { label: 'Adicionar passeios', icon: 'local_activity', done: this.activityCount() > 0 },
    { label: 'Montar roteiro', icon: 'map', done: this.itineraryItemCount() > 0 },
  ]);

  readonly completedSteps = computed(() =>
    this.checklistSteps().filter(s => s.done).length
  );

  // ── Type helpers ──

  getTypeIcon(type: string): string {
    const map: Record<string, string> = {
      flight: 'flight', stay: 'hotel', 'car-rental': 'directions_car',
      transport: 'directions_bus', activity: 'local_activity',
      attraction: 'museum', custom: 'event',
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

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}
