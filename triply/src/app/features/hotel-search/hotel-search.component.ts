import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  Validators,
  ValidatorFn,
  AbstractControl,
  ValidationErrors,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  switchMap,
  finalize,
} from 'rxjs/operators';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import {
  HotelApiService,
  DestinationOption,
} from '../../core/api/hotel-api.service';
import { TripStateService } from '../../core/services/trip-state.service';
import { Stay } from '../../core/models/trip.models';

@Component({
  selector: 'app-hotel-search',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule],
  templateUrl: './hotel-search.component.html',
  styleUrl: './hotel-search.component.scss',
})
export class HotelSearchComponent {
  private readonly hotelApi = inject(HotelApiService);
  private readonly tripState = inject(TripStateService);
  private readonly snackBar = inject(MatSnackBar);

  // Form controls with custom destination validator
  destinationControl = new FormControl<DestinationOption | null>(null, [
    Validators.required,
    this.destinationValidator(),
  ]);

  hotelSearchForm = new FormGroup({
    destination: this.destinationControl,
    checkIn: new FormControl<Date | null>(null, Validators.required),
    checkOut: new FormControl<Date | null>(null, Validators.required),
    guests: new FormControl(2, [
      Validators.required,
      Validators.min(1),
      Validators.max(30),
    ]),
    rooms: new FormControl(1, [
      Validators.required,
      Validators.min(1),
      Validators.max(10),
    ]),
  });

  // Autocomplete observable
  filteredDestinations$: Observable<DestinationOption[]> =
    this.destinationControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter((v) => typeof v === 'string' && (v as string).length >= 2),
      switchMap((keyword) => this.hotelApi.searchDestinations(keyword as string))
    );

  // Search state signals
  searchResults = signal<Stay[]>([]);
  isSearching = signal(false);
  hasSearched = signal(false);
  sortBy = signal<'price' | 'rating'>('price');

  // Computed signal for sorted hotels
  sortedHotels = computed(() => {
    const results = this.searchResults();
    const sort = this.sortBy();

    return [...results].sort((a, b) => {
      if (sort === 'price') {
        return a.pricePerNight.total - b.pricePerNight.total;
      } else if (sort === 'rating') {
        // Sort by rating descending (highest first), nulls last
        if (a.rating === null && b.rating === null) return 0;
        if (a.rating === null) return 1;
        if (b.rating === null) return -1;
        return b.rating - a.rating;
      }
      return 0;
    });
  });

  // Date getters for date picker validation
  get minCheckInDate(): Date {
    return new Date();
  }

  get minCheckOutDate(): Date {
    return this.hotelSearchForm.value.checkIn || new Date();
  }

  // Destination validator
  private destinationValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null; // Let required handle empty
      }
      if (
        typeof control.value === 'string' ||
        !(control.value as DestinationOption).destId
      ) {
        return { invalidDestination: true };
      }
      return null;
    };
  }

  // Display function for autocomplete
  displayDestination(dest: DestinationOption | null): string {
    return dest ? dest.label || dest.name : '';
  }

  // Format rating
  formatRating(rating: number | null): string {
    return rating != null ? rating.toFixed(1) + ' / 5' : 'No rating';
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

  // Search hotels
  searchHotels(): void {
    if (this.hotelSearchForm.invalid) {
      return;
    }

    const formValue = this.hotelSearchForm.value;
    const destination = formValue.destination as DestinationOption;
    const checkIn = formValue.checkIn;
    const checkOut = formValue.checkOut;
    const guests = formValue.guests ?? 2;
    const rooms = formValue.rooms ?? 1;

    if (!destination || !checkIn || !checkOut) {
      return;
    }

    // Convert Date objects to YYYY-MM-DD strings
    const checkInStr = checkIn.toISOString().split('T')[0];
    const checkOutStr = checkOut.toISOString().split('T')[0];

    this.isSearching.set(true);
    this.hasSearched.set(true);

    this.hotelApi
      .searchHotels({
        destId: destination.destId,
        searchType: destination.searchType,
        checkIn: checkInStr,
        checkOut: checkOutStr,
        adults: guests,
        rooms: rooms,
      })
      .pipe(finalize(() => this.isSearching.set(false)))
      .subscribe({
        next: (result) => {
          if (result.error) {
            this.snackBar.open(
              'Failed to search hotels. Please try again.',
              'Close',
              { duration: 3000 }
            );
            this.searchResults.set([]);
          } else {
            this.searchResults.set(result.data);
          }
        },
        error: () => {
          this.snackBar.open('An error occurred. Please try again.', 'Close', {
            duration: 3000,
          });
          this.searchResults.set([]);
        },
      });
  }

  // Add hotel to itinerary
  addToItinerary(hotel: Stay): void {
    this.tripState.addStay({ ...hotel, addedToItinerary: true });
    this.snackBar.open('Hotel added to itinerary', 'Close', { duration: 3000 });
  }

  // Set sort by
  setSortBy(value: string): void {
    this.sortBy.set(value as 'price' | 'rating');
  }
}
