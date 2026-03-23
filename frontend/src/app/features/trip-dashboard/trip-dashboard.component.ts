import { Component, inject, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { DynamicCurrencyPipe } from '../../core/i18n/dynamic-currency.pipe';
import { MatDialog } from '@angular/material/dialog';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { TripStateService } from '../../core/services/trip-state.service';
import { TripRouterService } from '../../core/services/trip-router.service';
import { NotificationService } from '../../core/services/notification.service';
import { BudgetService } from '../../core/services/budget.service';
import { TripScoreService } from '../../core/services/trip-score.service';
import { ChecklistService } from '../../core/services/checklist.service';
import { CollaborationService } from '../../core/services/collaboration.service';
import { PlanService } from '../../core/services/plan.service';
import { computeAllConflicts } from '../../core/utils/conflict-engine.util';
import { ConflictAlert, TripStatus } from '../../core/models/trip.models';
import { TripCreateDialogComponent, TripCreateDialogResult, TripEditData } from '../../shared/components/trip-create-dialog/trip-create-dialog.component';
import { CollaboratorAvatarsComponent } from '../../shared/components/collaborator-avatars/collaborator-avatars.component';
import { ViewerBannerComponent } from '../../shared/components/viewer-banner/viewer-banner.component';
import { ShareDialogComponent, ShareDialogData } from '../../shared/components/share-dialog/share-dialog.component';
import { InviteDialogComponent, InviteDialogData } from '../../shared/components/invite-dialog/invite-dialog.component';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';

@Component({
  selector: 'app-trip-dashboard',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CommonModule, DynamicCurrencyPipe, DatePipe, TranslatePipe, CollaboratorAvatarsComponent, ViewerBannerComponent],
  templateUrl: './trip-dashboard.component.html',
  styleUrl: './trip-dashboard.component.scss',
})
export class TripDashboardComponent implements OnInit {
  private readonly tripRouter = inject(TripRouterService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly i18n = inject(TranslationService);
  protected readonly tripState = inject(TripStateService);
  protected readonly budget = inject(BudgetService);
  protected readonly score = inject(TripScoreService);
  protected readonly checklist = inject(ChecklistService);
  protected readonly collabService = inject(CollaborationService);
  protected readonly planService = inject(PlanService);

  readonly trip = this.tripState.trip;

  readonly hasCollaborators = computed(() => this.collabService.collaborators().length > 1);
  readonly canCollab = computed(() => this.planService.hasFeature('collaboration'));

  ngOnInit(): void {
    const tripId = this.tripState.activeTripId();
    if (tripId) {
      this.collabService.loadCollaborators(tripId);
    }
  }

  readonly hasTrip = computed(() =>
    !!this.trip().destination || this.tripState.flights().length > 0 ||
    this.tripState.stays().length > 0 || this.tripState.itineraryItems().length > 0
  );

  /** Trip has meaningful content (items added, not just created) */
  readonly hasContent = computed(() =>
    this.tripState.flights().length > 0 ||
    this.tripState.stays().length > 0 ||
    this.tripState.carRentals().length > 0 ||
    this.tripState.activities().length > 0 ||
    this.tripState.attractions().length > 0 ||
    this.tripState.itineraryItems().length > 0
  );

  /** Guided steps for new/empty trips */
  readonly guidedSteps = computed(() => {
    const hasFlights = this.tripState.flights().length > 0;
    const hasStays = this.tripState.stays().length > 0;
    const hasActivities = this.tripState.activities().length > 0 || this.tripState.attractions().length > 0;
    const hasTimeline = this.tripState.itineraryItems().length > 0;

    return [
      { icon: 'flight', label: this.i18n.t('dash.searchFlights'), desc: this.i18n.t('dash.searchFlightsDesc'), route: 'search', done: hasFlights },
      { icon: 'hotel', label: this.i18n.t('dash.bookHotel'), desc: this.i18n.t('dash.bookHotelDesc'), route: 'hotels', done: hasStays },
      { icon: 'local_activity', label: this.i18n.t('dash.addActivities'), desc: this.i18n.t('dash.addActivitiesDesc'), route: 'tours', done: hasActivities },
      { icon: 'event_note', label: this.i18n.t('dash.buildItinerary'), desc: this.i18n.t('dash.buildItineraryDesc'), route: 'itinerary', done: hasTimeline },
    ];
  });

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

  readonly paidProgress = computed(() => {
    const items = this.tripState.itineraryItems();
    const total = items.length;
    const paid = items.filter(i => i.isPaid).length;
    const percentage = total > 0 ? Math.round((paid / total) * 100) : 0;
    return { paid, total, percentage };
  });

  readonly nextItems = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.tripState.itineraryItems()
      .filter(i => i.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.timeSlot ?? '').localeCompare(b.timeSlot ?? ''))
      .slice(0, 4);
  });

  readonly stats = computed(() => [
    { icon: 'flight', label: this.i18n.t('dash.quickFlights'), count: this.tripState.flights().length, route: 'search', color: 'var(--triply-cat-flight)' },
    { icon: 'hotel', label: this.i18n.t('dash.quickHotels'), count: this.tripState.stays().length, route: 'hotels', color: 'var(--triply-cat-stay)' },
    { icon: 'directions_car', label: this.i18n.t('dash.quickCars'), count: this.tripState.carRentals().length, route: 'cars', color: 'var(--triply-cat-car)' },
    { icon: 'local_activity', label: this.i18n.t('dash.quickActivities'), count: this.tripState.activities().length + this.tripState.attractions().length, route: 'tours', color: 'var(--triply-cat-activity)' },
    { icon: 'directions_bus', label: this.i18n.t('dash.quickTransports'), count: this.tripState.transports().length, route: 'transport', color: 'var(--triply-cat-transport)' },
  ].filter(s => s.count > 0));

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
      flight: this.i18n.t('dash.typeFlight'),
      stay: this.i18n.t('dash.typeHotel'),
      'car-rental': this.i18n.t('dash.typeCar'),
      transport: this.i18n.t('dash.typeTransport'),
      activity: this.i18n.t('dash.typeActivity'),
      attraction: this.i18n.t('dash.typeActivity'),
      custom: this.i18n.t('dash.typeEvent'),
    };
    return map[type] || 'Item';
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

  formatDateRange(start: string, end: string): string {
    const fmt = (d: string) => {
      const date = new Date(d + 'T00:00:00');
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    };
    return `${fmt(start)} — ${fmt(end)}`;
  }

  formatShortDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }

  editTrip(): void {
    const t = this.trip();
    const ref = this.dialog.open(TripCreateDialogComponent, {
      width: '440px',
      panelClass: 'mobile-fullscreen-dialog',
      data: { name: t.name, destination: t.destination, dates: t.dates } as TripEditData,
    });
    ref.afterClosed().subscribe((result: TripCreateDialogResult | undefined) => {
      if (!result) return;
      this.tripState.setTripMeta(result.name, result.destination, result.dates);
      this.notify.success(this.i18n.t('dash.tripUpdated'));
    });
  }

  setStatus(status: TripStatus): void {
    this.tripState.setTripStatus(status);
  }

  navigateTo(route: string): void {
    this.tripRouter.navigate(route);
  }

  openShareDialog(): void {
    const t = this.trip();
    this.dialog.open(ShareDialogComponent, {
      width: '480px',
      panelClass: 'mobile-fullscreen-dialog',
      data: {
        tripId: this.tripState.activeTripId(),
        tripName: t.name,
        destination: t.destination,
        publicSlug: t.publicSlug ?? null,
      } as ShareDialogData,
    });
  }

  openInviteDialog(): void {
    if (!this.canCollab()) {
      this.planService.showLimitPaywall('item');
      return;
    }
    this.dialog.open(InviteDialogComponent, {
      width: '480px',
      panelClass: 'mobile-fullscreen-dialog',
      data: { tripId: this.tripState.activeTripId() } as InviteDialogData,
    });
  }
}
