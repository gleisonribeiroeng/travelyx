import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { NotificationService } from '../../core/services/notification.service';
import { MatDialog } from '@angular/material/dialog';
import { finalize } from 'rxjs/operators';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { ScheduleDialogComponent, ScheduleDialogData } from '../../shared/components/schedule-dialog/schedule-dialog.component';
import { ItemDetailDialogComponent, ItemDetailData, ItemDetailResult } from '../../shared/components/item-detail-dialog/item-detail-dialog.component';
import { TourApiService } from '../../core/api/tour-api.service';
import { TripStateService } from '../../core/services/trip-state.service';
import { Activity } from '../../core/models/trip.models';
import { ErrorBannerComponent } from '../../shared/components/error-banner/error-banner.component';
import { categorizeTours, CategorizedTours } from '../../core/utils/tour-categorizer.util';
import { ListItemBaseComponent } from '../../shared/components/list-item-base/list-item-base.component';
import { activityToListItem, TourTagType } from '../../shared/components/list-item-base/list-item-mappers';

@Component({
  selector: 'app-tour-search',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule, ErrorBannerComponent, ListItemBaseComponent],
  templateUrl: './tour-search.component.html',
  styleUrl: './tour-search.component.scss',
})
export class TourSearchComponent {
  private readonly tourApi = inject(TourApiService);
  private readonly tripState = inject(TripStateService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  // Form controls
  tourSearchForm = new FormGroup({
    destination: new FormControl('', Validators.required),
  });

  // Search state signals
  formCollapsed = signal(false);
  searchResults = signal<Activity[]>([]);
  isSearching = signal(false);
  hasSearched = signal(false);
  sortBy = signal<'price' | 'rating'>('price');
  errorMessage = signal<string | null>(null);
  errorSource = signal<string | null>(null);

  // Categorization
  readonly categorized = computed((): CategorizedTours<Activity> =>
    categorizeTours(this.searchResults())
  );

  // Computed signal for sorted results
  sortedResults = computed(() => {
    const results = this.searchResults();
    const sort = this.sortBy();
    return [...results].sort((a, b) => {
      if (sort === 'price') return a.price.total - b.price.total;
      if (sort === 'rating') {
        if (a.rating === null && b.rating === null) return 0;
        if (a.rating === null) return 1;
        if (b.rating === null) return -1;
        return b.rating - a.rating;
      }
      return 0;
    });
  });

  // Search tours
  searchTours(): void {
    if (this.tourSearchForm.invalid) {
      return;
    }

    const destination = this.tourSearchForm.value.destination ?? '';

    this.isSearching.set(true);
    this.hasSearched.set(true);
    this.errorMessage.set(null);
    this.formCollapsed.set(true);

    this.tourApi
      .searchTours({ destination })
      .pipe(finalize(() => this.isSearching.set(false)))
      .subscribe({
        next: (result) => {
          if (result.error) {
            this.errorMessage.set(result.error.message);
            this.errorSource.set(result.error.source);
            this.searchResults.set([]);
          } else {
            this.searchResults.set(result.data);
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
        label: `Passeio: ${tour.name}`,
        notes: tour.city || '',
        order: 0,
        isPaid: false,
        attachment: null,
      });
      this.notify.success('Passeio adicionado ao roteiro');
    });
  }

  // Set sort by
  setSortBy(value: string): void {
    this.sortBy.set(value as 'price' | 'rating');
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
    });
  }
}
