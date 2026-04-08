import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, switchMap, finalize } from 'rxjs/operators';
import { NotificationService } from '../../core/services/notification.service';
import { MatDialog } from '@angular/material/dialog';
import { HotelApiService, DestinationOption } from '../../core/api/hotel-api.service';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { ScheduleDialogComponent, ScheduleDialogData } from '../../shared/components/schedule-dialog/schedule-dialog.component';
import { ItemDetailDialogComponent, ItemDetailData, ItemDetailResult } from '../../shared/components/item-detail-dialog/item-detail-dialog.component';
import { TourApiService, TourSearchParams } from '../../core/api/tour-api.service';
import { TripStateService } from '../../core/services/trip-state.service';
import { Activity } from '../../core/models/trip.models';
import { ErrorBannerComponent } from '../../shared/components/error-banner/error-banner.component';
import { categorizeTours, CategorizedTours } from '../../core/utils/tour-categorizer.util';
import { ListItemBaseComponent } from '../../shared/components/list-item-base/list-item-base.component';
import { activityToListItem, TourTagType } from '../../shared/components/list-item-base/list-item-mappers';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';
import { DynamicCurrencyPipe } from '../../core/i18n/dynamic-currency.pipe';
import { DESTINATION_ACTIVITIES, DestinationActivity } from '../../core/data/destination-activities.data';

@Component({
  selector: 'app-tour-search',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule, ErrorBannerComponent, ListItemBaseComponent, TranslatePipe, DynamicCurrencyPipe],
  templateUrl: './tour-search.component.html',
  styleUrl: './tour-search.component.scss',
})
export class TourSearchComponent {
  private readonly tourApi = inject(TourApiService);
  private readonly hotelApi = inject(HotelApiService);
  private readonly tripState = inject(TripStateService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly t = inject(TranslationService);

  // Trip destination for rich empty state
  readonly tripDestination = this.tripState.trip().destination || '';
  readonly activityCategories = [
    { icon: 'restaurant', label: 'Gastronomico' },
    { icon: 'account_balance', label: 'Cultural' },
    { icon: 'park', label: 'Natureza' },
    { icon: 'terrain', label: 'Aventura' },
    { icon: 'shopping_bag', label: 'Compras' },
    { icon: 'photo_camera', label: 'Fotografico' },
  ];

  /** Curated activities for the trip's destination (fallback when API returns empty) */
  readonly curatedActivities = computed(() => {
    const dest = this.tripDestination;
    if (!dest) return [];
    return DESTINATION_ACTIVITIES[dest] ?? [];
  });

  // Autocomplete destination control
  readonly destinationControl = new FormControl<string | DestinationOption>('', Validators.required);

  constructor() {
    const trip = this.tripState.trip();
    if (trip.destination && !this.hasSearched()) {
      this.destinationControl.setValue(trip.destination);
      setTimeout(() => {
        if (this.tourSearchForm.valid) {
          this.searchTours();
        }
      }, 300);
    }
  }

  // Form controls
  tourSearchForm = new FormGroup({
    destination: this.destinationControl,
  });

  // Autocomplete observable
  filteredDestinations$: Observable<DestinationOption[]> = this.destinationControl.valueChanges.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    filter((v) => typeof v === 'string' && v.length >= 2),
    switchMap((keyword) => this.hotelApi.searchDestinations(keyword as string))
  );

  displayDestination(opt: DestinationOption | string | null): string {
    if (!opt) return '';
    if (typeof opt === 'string') return opt;
    return opt.label || opt.name;
  }

  // Search state signals
  formCollapsed = signal(false);
  searchResults = signal<Activity[]>([]);
  isSearching = signal(false);
  isLoadingMore = signal(false);
  hasSearched = signal(false);
  hasMore = signal(false);
  totalCount = signal(0);
  private currentOffset = 0;
  private readonly PAGE_SIZE = 20;
  private lastSearchParams: TourSearchParams | null = null;
  sortBy = signal<'default' | 'price' | 'rating'>('default');
  errorMessage = signal<string | null>(null);
  errorSource = signal<string | null>(null);

  // Categorization
  readonly categorized = computed((): CategorizedTours<Activity> =>
    categorizeTours(this.searchResults())
  );

  private getViatorSorting(): { sort: string; order: string } | undefined {
    const sort = this.sortBy();
    if (sort === 'price') return { sort: 'PRICE', order: 'ASC' };
    if (sort === 'rating') return { sort: 'TRAVELER_RATING', order: 'DESC' };
    return undefined;
  }

  // Search tours
  searchTours(): void {
    if (this.tourSearchForm.invalid) return;

    const destValue = this.destinationControl.value;
    const destination = typeof destValue === 'string' ? destValue : (destValue as DestinationOption)?.label ?? '';

    this.isSearching.set(true);
    this.hasSearched.set(true);
    this.errorMessage.set(null);
    this.formCollapsed.set(true);
    this.currentOffset = 0;
    this.lastSearchParams = { destination, sorting: this.getViatorSorting() };

    this.tourApi
      .searchToursPaginated(this.lastSearchParams, 0, this.PAGE_SIZE)
      .pipe(finalize(() => this.isSearching.set(false)))
      .subscribe({
        next: (result) => {
          if (result.error) {
            this.errorMessage.set(result.error.message);
            this.errorSource.set(result.error.source);
            this.searchResults.set([]);
            this.hasMore.set(false);
          } else {
            this.searchResults.set(result.data);
            this.totalCount.set(result.totalCount);
            this.hasMore.set(result.hasMore);
            this.currentOffset = result.data.length;
          }
        },
      });
  }

  loadMore(): void {
    if (!this.lastSearchParams || this.isLoadingMore()) return;

    this.isLoadingMore.set(true);
    this.tourApi
      .searchToursPaginated(this.lastSearchParams, this.currentOffset, this.PAGE_SIZE)
      .pipe(finalize(() => this.isLoadingMore.set(false)))
      .subscribe({
        next: (result) => {
          if (!result.error) {
            this.searchResults.update(current => [...current, ...result.data]);
            this.totalCount.set(result.totalCount);
            this.hasMore.set(result.hasMore);
            this.currentOffset += result.data.length;
          }
        },
      });
  }

  // Dismiss error banner
  dismissError(): void {
    this.errorMessage.set(null);
    this.errorSource.set(null);
  }

  // Add to itinerary
  addToItinerary(tour: Activity): void {
    const dialogRef = this.dialog.open(ScheduleDialogComponent, {
      width: '400px',
      panelClass: 'mobile-fullscreen-dialog',
      data: {
        name: tour.name,
        type: 'activity',
        defaultDate: this.tripState.trip().dates.start || new Date().toISOString().split('T')[0],
        tripDates: this.tripState.trip().dates,
        durationMinutes: tour.durationMinutes,
      } as ScheduleDialogData,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;
      this.tripState.addActivity({ ...tour, addedToItinerary: true });
      this.tripState.addItineraryItem({
        id: crypto.randomUUID(),
        type: 'activity',
        refId: tour.id,
        date: result.date,
        timeSlot: result.timeSlot,
        durationMinutes: result.durationMinutes,
        label: `${this.t.t('activities.activityLabel')}: ${tour.name}`,
        notes: tour.city || '',
        order: 0,
        isPaid: false,
        attachment: null,
      });
      this.notify.success(this.t.t('activities.activityAdded'));
    });
  }

  // Set sort by — triggers new server-side search
  setSortBy(value: string): void {
    this.sortBy.set(value as 'default' | 'price' | 'rating');
    if (this.hasSearched()) {
      this.searchTours();
    }
  }

  // Get category tag for a tour
  getTourTag(tour: Activity): TourTagType | null {
    const cat = this.categorized();
    if (cat.bestValue?.id === tour.id) return 'bestValue';
    if (cat.cheapest?.id === tour.id) return 'cheapest';
    if (cat.bestRated?.id === tour.id) return 'bestRated';
    return null;
  }

  // Check if tour is already added to trip
  isTourAdded(tour: Activity): boolean {
    return this.tripState.activities().some(a => a.id === tour.id);
  }

  // Map tour to ListItemConfig
  toListItem(tour: Activity) {
    return activityToListItem(tour, {
      isAdded: this.isTourAdded(tour),
      tag: this.getTourTag(tour),
    });
  }

  // Select tour by id (primary action)
  selectById(id: string): void {
    const tour = this.searchResults().find(t => t.id === id);
    if (tour) this.addToItinerary(tour);
  }

  // Open detail by id (secondary / card click)
  openDetailById(id: string): void {
    const tour = this.searchResults().find(t => t.id === id);
    if (!tour) return;
    const ref = this.dialog.open(ItemDetailDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { type: 'activity', item: tour, isAdded: this.isTourAdded(tour) } as ItemDetailData,
    });
    ref.afterClosed().subscribe((result: ItemDetailResult) => {
      if (!result) return;
      if (result.action === 'add') this.addToItinerary(tour);
      else if (result.action === 'remove') this.removeFromItinerary(tour.id);
    });
  }

removeFromItinerary(id: string): void {
    this.tripState.removeActivity(id);
    this.tripState.removeItineraryItem(
      this.tripState.itineraryItems().find(i => i.refId === id)?.id ?? ''
    );
    this.notify.success(this.t.t('activities.activityRemoved'));
  }
}
