import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { TripStateService } from '../../core/services/trip-state.service';
import { NotificationService } from '../../core/services/notification.service';
import { CollaborationService } from '../../core/services/collaboration.service';
import { StreakService } from '../../core/services/streak.service';
import { BadgeService } from '../../core/services/badge.service';
import { Trip } from '../../core/models/trip.models';
import { TripCreateDialogComponent, TripCreateDialogResult, TripEditData } from '../../shared/components/trip-create-dialog/trip-create-dialog.component';
import { PendingInvitesComponent } from '../../shared/components/pending-invites/pending-invites.component';
import { CollaboratorAvatarsComponent } from '../../shared/components/collaborator-avatars/collaborator-avatars.component';
import { PlanService } from '../../core/services/plan.service';
import { AuthService } from '../../core/services/auth.service';
import { getDestinationPhoto } from '../../core/data/destination-photos.data';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';

export interface TrendingDestination {
  name: string;
  price: number;
  gradient: string;
}

@Component({
  selector: 'app-trip-list',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CommonModule, TranslatePipe, PendingInvitesComponent, CollaboratorAvatarsComponent],
  templateUrl: './trip-list.component.html',
  styleUrl: './trip-list.component.scss',
})
export class TripListComponent implements OnInit {
  protected readonly tripState = inject(TripStateService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  protected readonly planService = inject(PlanService);
  private readonly i18n = inject(TranslationService);
  protected readonly collabService = inject(CollaborationService);
  protected readonly streak = inject(StreakService);
  protected readonly badgeService = inject(BadgeService);
  private readonly auth = inject(AuthService);

  readonly statusFilter = signal<string>('');

  /** Time-based greeting with user's first name */
  readonly greeting = computed(() => {
    const user = this.auth.user();
    const firstName = user?.name?.split(' ')[0] || '';
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return firstName ? `Bom dia, ${firstName}! ☀️` : 'Bom dia! ☀️';
    if (hour >= 12 && hour < 18) return firstName ? `Boa tarde, ${firstName}! ✈️` : 'Boa tarde! ✈️';
    return firstName ? `Boa noite, ${firstName}! 🌙` : 'Boa noite! 🌙';
  });

  readonly trendingDestinations: TrendingDestination[] = [
    { name: 'Santiago', price: 890, gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { name: 'Jericoacoara', price: 450, gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    { name: 'Montevideu', price: 720, gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
    { name: 'Bonito', price: 380, gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
    { name: 'Lisboa', price: 2890, gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
    { name: 'Buenos Aires', price: 650, gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' },
  ];

  ngOnInit(): void {
    this.collabService.loadPendingInvites();
    this.streak.recordActivity();
  }

  readonly filteredTrips = computed(() => {
    const filter = this.statusFilter();
    const trips = this.tripState.trips();
    if (!filter) return trips;
    return trips.filter(t => t.status === filter);
  });

  /** The next upcoming trip (soonest future trip) */
  readonly heroTrip = computed<Trip | null>(() => {
    const trips = this.tripState.trips();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureTrips = trips.filter(t => {
      if (!t.dates.start) return false;
      const end = t.dates.end ? new Date(t.dates.end + 'T00:00:00') : new Date(t.dates.start + 'T00:00:00');
      return end.getTime() >= today.getTime();
    });

    if (futureTrips.length === 0) return null;

    // Sort by nearest start date
    futureTrips.sort((a, b) => {
      const aStart = new Date(a.dates.start + 'T00:00:00').getTime();
      const bStart = new Date(b.dates.start + 'T00:00:00').getTime();
      return aStart - bStart;
    });

    return futureTrips[0];
  });

  /** Non-hero trips for the grid */
  readonly nonHeroTrips = computed(() => {
    const hero = this.heroTrip();
    const trips = this.filteredTrips();
    if (!hero) return trips;
    return trips.filter(t => t.id !== hero.id);
  });

  // ── Helpers ──

  getTripCompletion(trip: Trip): number {
    let score = 0;
    if (trip.flights?.length) score += 20;
    if (trip.stays?.length) score += 20;
    const acts = (trip.activities?.length ?? 0) + (trip.attractions?.length ?? 0);
    if (acts > 0) score += 20;
    if (trip.itineraryItems?.length) score += 20;
    if (trip.dates.start && trip.dates.end) score += 20;
    return score;
  }

  getCompletionColor(pct: number): string {
    if (pct > 80) return '#4caf50';
    if (pct >= 40) return '#ff9800';
    return '#bdbdbd';
  }

  getNextStep(trip: Trip): string {
    if (!trip.dates.start || !trip.dates.end) return 'Definir datas';
    if (!trip.flights?.length) return 'Buscar voos';
    if (!trip.stays?.length) return 'Reservar hospedagem';
    const acts = (trip.activities?.length ?? 0) + (trip.attractions?.length ?? 0);
    if (!acts) return 'Adicionar atividades';
    if (!trip.itineraryItems?.length) return 'Montar roteiro';
    return 'Revisar planejamento';
  }

  /** Get trip image: cover image or destination photo fallback */
  getHeroImage(trip: Trip): string | null {
    if (trip.coverImage) return trip.coverImage;
    if (trip.destination) return getDestinationPhoto(trip.destination);
    return null;
  }

  isNextTrip(trip: Trip): boolean {
    const days = this.getDaysUntil(trip);
    return trip.status === 'ativa' || (days !== null && days >= 0 && days <= 14);
  }

  getDaysUntil(trip: Trip): number | null {
    if (!trip.dates.start) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(trip.dates.start + 'T00:00:00');
    return Math.ceil((start.getTime() - today.getTime()) / 86400000);
  }

  calcDays(start: string, end: string): number {
    if (!start || !end) return 0;
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
  }

  formatDateShort(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }

  getTripStats(trip: Trip): { icon: string; count: number }[] {
    const stats: { icon: string; count: number }[] = [];
    if (trip.flights?.length) stats.push({ icon: 'flight', count: trip.flights.length });
    if (trip.stays?.length) stats.push({ icon: 'hotel', count: trip.stays.length });
    const acts = (trip.activities?.length ?? 0) + (trip.attractions?.length ?? 0);
    if (acts) stats.push({ icon: 'local_activity', count: acts });
    if (trip.carRentals?.length) stats.push({ icon: 'directions_car', count: trip.carRentals.length });
    if (trip.transports?.length) stats.push({ icon: 'directions_bus', count: trip.transports.length });
    return stats;
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      planejamento: this.i18n.t('trips.statusPlanning'),
      ativa: this.i18n.t('trips.statusActive'),
      concluida: this.i18n.t('trips.statusCompleted'),
    };
    return map[status] || status;
  }

  // ── Actions ──

  openCreateDialog(): void {
    if (!this.planService.canCreateTrip(this.tripState.trips().length)) {
      this.planService.showLimitPaywall('trip');
      return;
    }
    const ref = this.dialog.open(TripCreateDialogComponent, {
      width: '440px',
      panelClass: 'mobile-fullscreen-dialog',
    });

    ref.afterClosed().subscribe((result: TripCreateDialogResult | undefined) => {
      if (!result) return;
      this.tripState.createTrip(result).subscribe({
        next: (trip) => {
          this.notify.celebrate(this.i18n.t('trips.createdSuccess'));
          this.router.navigate(['/viagem', trip.id, 'planner']);
        },
        error: () => this.notify.error(this.i18n.t('trips.createError')),
      });
    });
  }

  openTrip(id: string): void {
    this.tripState.selectTrip(id);
    this.router.navigate(['/viagem', id, 'home']);
  }

  deleteTrip(id: string): void {
    if (!confirm(this.i18n.t('trips.deleteConfirm'))) return;
    this.tripState.deleteTrip(id).subscribe({
      next: () => this.notify.success(this.i18n.t('trips.deletedSuccess')),
      error: () => this.notify.error(this.i18n.t('trips.deleteError')),
    });
  }

  editTrip(id: string): void {
    const trip = this.tripState.trips().find(t => t.id === id);
    if (!trip) return;
    const ref = this.dialog.open(TripCreateDialogComponent, {
      width: '440px',
      panelClass: 'mobile-fullscreen-dialog',
      data: { name: trip.name, destination: trip.destination, dates: trip.dates, currency: trip.currency } as TripEditData,
    });
    ref.afterClosed().subscribe((result: TripCreateDialogResult | undefined) => {
      if (!result) return;
      const prevActive = this.tripState.activeTripId();
      this.tripState.selectTrip(id);
      this.tripState.setTripMeta(result.name, result.destination, result.dates, result.currency);
      if (prevActive && prevActive !== id) this.tripState.selectTrip(prevActive);
      this.notify.success(this.i18n.t('trips.updatedSuccess'));
    });
  }

  cloneTrip(id: string, name: string): void {
    this.tripState.cloneTrip(id, `${name} (copia)`).subscribe({
      next: (trip) => {
        this.notify.success(this.i18n.t('trips.clonedSuccess'));
        this.router.navigate(['/viagem', trip.id, 'home']);
      },
      error: () => this.notify.error(this.i18n.t('trips.cloneError')),
    });
  }
}
