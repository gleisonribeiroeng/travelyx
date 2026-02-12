import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { TourApiService } from '../../core/api/tour-api.service';
import { TripStateService } from '../../core/services/trip-state.service';
import { Activity } from '../../core/models/trip.models';

@Component({
  selector: 'app-tour-search',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule],
  templateUrl: './tour-search.component.html',
  styleUrl: './tour-search.component.scss',
})
export class TourSearchComponent {
  private readonly tourApi = inject(TourApiService);
  private readonly tripState = inject(TripStateService);
  private readonly snackBar = inject(MatSnackBar);

  // Form controls
  tourSearchForm = new FormGroup({
    destination: new FormControl('', Validators.required),
  });

  // Search state signals
  searchResults = signal<Activity[]>([]);
  isSearching = signal(false);
  hasSearched = signal(false);

  // Computed signal for sorted results (price ascending)
  sortedResults = computed(() =>
    [...this.searchResults()].sort((a, b) => a.price.total - b.price.total)
  );

  // Search tours
  searchTours(): void {
    if (this.tourSearchForm.invalid) {
      return;
    }

    const destination = this.tourSearchForm.value.destination ?? '';

    this.isSearching.set(true);
    this.hasSearched.set(true);

    this.tourApi
      .searchTours({ destination })
      .pipe(finalize(() => this.isSearching.set(false)))
      .subscribe({
        next: (result) => {
          if (result.error) {
            this.snackBar.open(
              'Failed to search tours. Please try again.',
              'Close',
              { duration: 3000 }
            );
            this.searchResults.set([]);
          } else {
            this.searchResults.set(result.data);
          }
        },
      });
  }

  // Add to itinerary
  addToItinerary(tour: Activity): void {
    this.tripState.addActivity({ ...tour, addedToItinerary: true });
    this.snackBar.open('Tour added to itinerary', 'Close', {
      duration: 3000,
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
}
