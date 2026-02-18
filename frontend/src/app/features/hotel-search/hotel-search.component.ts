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
import { Stay, ItineraryItem } from '../../core/models/trip.models';
import { ErrorBannerComponent } from '../../shared/components/error-banner/error-banner.component';
import {
  categorizeHotels,
  CategorizedHotels,
} from '../../core/utils/hotel-categorizer.util';

@Component({
  selector: 'app-hotel-search',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule, ErrorBannerComponent],
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
  formCollapsed = signal(false);
  searchResults = signal<Stay[]>([]);
  isSearching = signal(false);
  hasSearched = signal(false);
  sortBy = signal<'price' | 'rating'>('price');
  errorMessage = signal<string | null>(null);
  errorSource = signal<string | null>(null);

  // Categorization
  readonly categorized = computed((): CategorizedHotels<Stay> =>
    categorizeHotels(this.searchResults())
  );

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

  // Carousel state: hotel id -> current image index
  private carouselIndex = new Map<string, number>();

  getImageIndex(hotelId: string): number {
    return this.carouselIndex.get(hotelId) ?? 0;
  }

  getCurrentImage(hotel: Stay): string {
    const idx = this.getImageIndex(hotel.id);
    return hotel.images?.[idx] ?? hotel.photoUrl ?? '';
  }

  prevImage(hotel: Stay, event: Event): void {
    event.stopPropagation();
    const images = hotel.images ?? [];
    if (images.length === 0) return;
    const current = this.getImageIndex(hotel.id);
    this.carouselIndex.set(hotel.id, current === 0 ? images.length - 1 : current - 1);
  }

  nextImage(hotel: Stay, event: Event): void {
    event.stopPropagation();
    const images = hotel.images ?? [];
    if (images.length === 0) return;
    const current = this.getImageIndex(hotel.id);
    this.carouselIndex.set(hotel.id, (current + 1) % images.length);
  }

  // Dismiss error banner
  dismissError(): void {
    this.errorMessage.set(null);
    this.errorSource.set(null);
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

    this.errorMessage.set(null);
    this.isSearching.set(true);
    this.hasSearched.set(true);
    this.formCollapsed.set(true);

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
            this.errorMessage.set(result.error.message);
            this.errorSource.set(result.error.source);
            this.searchResults.set([]);
          } else {
            this.searchResults.set(result.data);
          }
        },
      });
  }

  // Add hotel to itinerary
  addToItinerary(hotel: Stay): void {
    this.tripState.addStay({ ...hotel, addedToItinerary: true });
    this.tripState.addItineraryItem({
      id: crypto.randomUUID(),
      type: 'stay',
      refId: hotel.id,
      date: hotel.checkIn,
      timeSlot: null,
      durationMinutes: null,
      label: `Hotel: ${hotel.name}`,
      notes: hotel.address || '',
      order: 0,
    });
    this.snackBar.open('Hotel adicionado ao roteiro', 'Fechar', { duration: 3000 });
  }

  // Set sort by
  setSortBy(value: string): void {
    this.sortBy.set(value as 'price' | 'rating');
  }
}
