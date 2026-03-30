import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { TripStateService } from '../../core/services/trip-state.service';
import { NotificationService } from '../../core/services/notification.service';
import { CollaborationService } from '../../core/services/collaboration.service';
import { Trip } from '../../core/models/trip.models';
import { TripCreateDialogComponent, TripCreateDialogResult, TripEditData } from '../../shared/components/trip-create-dialog/trip-create-dialog.component';
import { PendingInvitesComponent } from '../../shared/components/pending-invites/pending-invites.component';
import { CollaboratorAvatarsComponent } from '../../shared/components/collaborator-avatars/collaborator-avatars.component';
import { PlanService } from '../../core/services/plan.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';

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

  readonly statusFilter = signal<string>('');

  ngOnInit(): void {
    this.collabService.loadPendingInvites();
  }

  readonly filteredTrips = computed(() => {
    const filter = this.statusFilter();
    const trips = this.tripState.trips();
    if (!filter) return trips;
    return trips.filter(t => t.status === filter);
  });

  // ── Helpers ──

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
          this.notify.success(this.i18n.t('trips.createdSuccess'));
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
    // PRO check commented out — all features unlocked for now
    // if (!this.planService.hasFeature('tripClone')) {
    //   this.planService.showPaywall('tripClone');
    //   return;
    // }
    this.tripState.cloneTrip(id, `${name} (cópia)`).subscribe({
      next: (trip) => {
        this.notify.success(this.i18n.t('trips.clonedSuccess'));
        this.router.navigate(['/viagem', trip.id, 'home']);
      },
      error: () => this.notify.error(this.i18n.t('trips.cloneError')),
    });
  }
}
