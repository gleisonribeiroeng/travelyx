import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { PollsService } from '../../core/services/polls.service';
import { ExpensesService } from '../../core/services/expenses.service';
import { computeAllConflicts } from '../../core/utils/conflict-engine.util';
import { ConflictAlert, TripStatus } from '../../core/models/trip.models';
import { TripCreateDialogComponent, TripCreateDialogResult, TripEditData } from '../../shared/components/trip-create-dialog/trip-create-dialog.component';
import { CollaboratorAvatarsComponent } from '../../shared/components/collaborator-avatars/collaborator-avatars.component';
import { ViewerBannerComponent } from '../../shared/components/viewer-banner/viewer-banner.component';
import { ShareDialogComponent, ShareDialogData } from '../../shared/components/share-dialog/share-dialog.component';
import { InviteDialogComponent, InviteDialogData } from '../../shared/components/invite-dialog/invite-dialog.component';
import { ActivityPanelComponent } from '../../shared/components/activity-panel/activity-panel.component';
import { CommentThreadComponent } from '../../shared/components/comment-thread/comment-thread.component';
import { PollCardComponent } from '../../shared/components/poll-card/poll-card.component';
import { ExpenseSplitDialogComponent, ExpenseSplitDialogData, ExpenseSplitDialogResult } from '../../shared/components/expense-split-dialog/expense-split-dialog.component';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';

@Component({
  selector: 'app-trip-dashboard',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CommonModule, FormsModule, DynamicCurrencyPipe, DatePipe, TranslatePipe, CollaboratorAvatarsComponent, ViewerBannerComponent, ActivityPanelComponent, CommentThreadComponent, PollCardComponent],
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
  protected readonly pollsService = inject(PollsService);
  protected readonly expensesService = inject(ExpensesService);

  readonly trip = this.tripState.trip;

  readonly hasCollaborators = computed(() => this.collabService.collaborators().length > 1);
  readonly canCollab = computed(() => this.planService.hasFeature('collaboration'));

  // Readiness score
  readonly readiness = signal<{
    score: number;
    percentage: number;
    label: string;
    missing: { category: string; message: string; icon: string; priority: string }[];
  } | null>(null);

  ngOnInit(): void {
    const tripId = this.tripState.activeTripId();
    if (tripId) {
      this.collabService.loadCollaborators(tripId);
      this.loadReadiness();
      // Auto-fetch cover image if missing
      const t = this.trip();
      if (!t.coverImage && t.destination) {
        this.tripState.fetchDestinationImage(tripId, t.destination);
      }
    }
  }

  private loadReadiness(): void {
    this.tripState.getReadiness().subscribe({
      next: (data) => this.readiness.set(data),
      error: () => {},
    });
  }

  readonly readinessColor = computed(() => {
    const r = this.readiness();
    if (!r) return '#9E9E9E';
    if (r.percentage >= 85) return '#4CAF50';
    if (r.percentage >= 60) return '#FF9800';
    if (r.percentage >= 30) return '#2196F3';
    return '#9E9E9E';
  });

  readonly readinessLabel = computed(() => {
    const r = this.readiness();
    if (!r) return '';
    if (r.label === 'ready') return this.i18n.t('dash.readinessReady');
    if (r.label === 'almost') return this.i18n.t('dash.readinessAlmost');
    if (r.label === 'progress') return this.i18n.t('dash.readinessProgress');
    return this.i18n.t('dash.readinessStarting');
  });

  getMissingRoute(category: string): string {
    const routes: Record<string, string> = {
      flights: 'search', stays: 'hotels', transport: 'transport',
      activities: 'tours', itinerary: 'itinerary', checklist: 'checklist', dates: 'home',
    };
    return routes[category] || 'home';
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

  // ═══ Collaboration Tab ═══
  readonly collabTabIndex = signal(0);
  readonly showCollabSection = computed(() => this.hasCollaborators());

  // Polls
  readonly showPollForm = signal(false);
  newPollQuestion = '';
  pollOptions: string[] = ['', ''];

  addPollOption(): void {
    this.pollOptions = [...this.pollOptions, ''];
  }

  removePollOption(index: number): void {
    this.pollOptions = this.pollOptions.filter((_, i) => i !== index);
  }

  trackByIndex(index: number): number {
    return index;
  }

  updatePollOption(index: number, value: string): void {
    this.pollOptions = this.pollOptions.map((v, i) => i === index ? value : v);
  }

  createPoll(): void {
    const question = this.newPollQuestion.trim();
    const options = this.pollOptions.map((o) => o.trim()).filter((o) => o.length > 0);
    if (!question || options.length < 2) return;
    const tripId = this.tripState.activeTripId();
    if (!tripId) return;
    this.pollsService.createPoll(tripId, question, options).subscribe({
      next: () => {
        this.newPollQuestion = '';
        this.pollOptions = ['', ''];
        this.showPollForm.set(false);
      },
    });
  }

  // Expenses
  openExpenseDialog(): void {
    const tripId = this.tripState.activeTripId();
    if (!tripId) return;
    const ref = this.dialog.open(ExpenseSplitDialogComponent, {
      width: '520px',
      panelClass: 'mobile-fullscreen-dialog',
      data: {
        tripId,
        collaborators: this.collabService.collaborators(),
        currency: this.trip().currency || 'BRL',
      } as ExpenseSplitDialogData,
    });
    ref.afterClosed().subscribe((result: ExpenseSplitDialogResult | undefined) => {
      if (!result) return;
      this.expensesService.createExpense(tripId, result).subscribe({
        next: () => {
          this.notify.success('Despesa adicionada');
          this.expensesService.loadBalance(tripId);
        },
      });
    });
  }

  toggleExpensePaid(expenseId: string, entryId: string): void {
    const tripId = this.tripState.activeTripId();
    if (!tripId) return;
    this.expensesService.togglePaid(tripId, expenseId, entryId).subscribe();
  }

  removeExpense(expenseId: string): void {
    const tripId = this.tripState.activeTripId();
    if (!tripId) return;
    this.expensesService.removeExpense(tripId, expenseId).subscribe({
      next: () => this.expensesService.loadBalance(tripId),
    });
  }

  onCollabTabChange(index: number): void {
    this.collabTabIndex.set(index);
    const tripId = this.tripState.activeTripId();
    if (!tripId) return;
    // Lazy-load data when switching tabs
    if (index === 2) {
      this.pollsService.loadPolls(tripId);
    } else if (index === 3) {
      this.expensesService.loadExpenses(tripId);
      this.expensesService.loadBalance(tripId);
    }
  }
}
