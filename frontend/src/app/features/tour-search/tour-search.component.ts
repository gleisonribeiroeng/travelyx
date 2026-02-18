import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { finalize } from 'rxjs/operators';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { ScheduleDialogComponent, ScheduleDialogData } from '../../shared/components/schedule-dialog/schedule-dialog.component';
import { TourApiService } from '../../core/api/tour-api.service';
import { TripStateService } from '../../core/services/trip-state.service';
import { Activity, ItineraryItem } from '../../core/models/trip.models';
import { ErrorBannerComponent } from '../../shared/components/error-banner/error-banner.component';
import { categorizeTours, CategorizedTours } from '../../core/utils/tour-categorizer.util';

@Component({
  selector: 'app-tour-search',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule, ErrorBannerComponent],
  templateUrl: './tour-search.component.html',
  styleUrl: './tour-search.component.scss',
})
export class TourSearchComponent {
  private readonly tourApi = inject(TourApiService);
  private readonly tripState = inject(TripStateService);
  private readonly snackBar = inject(MatSnackBar);
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
      });
      this.snackBar.open('Passeio adicionado ao roteiro', 'Fechar', { duration: 3000 });
    });
  }

  // Duration format helper
  formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  // Set sort by
  setSortBy(value: string): void {
    this.sortBy.set(value as 'price' | 'rating');
  }

  // Format rating
  formatRating(rating: number | null): string {
    return rating != null ? rating.toFixed(1) + ' / 5' : 'Sem avaliação';
  }

  // Render star icons based on rating
  renderStars(rating: number | null): string[] {
    const stars: string[] = [];
    const ratingValue = rating ?? 0;

    for (let i = 1; i <= 5; i++) {
      if (ratingValue >= i) {
        stars.push('star');
      } else if (ratingValue >= i - 0.5) {
        stars.push('star_half');
      } else {
        stars.push('star_border');
      }
    }

    return stars;
  }
}
