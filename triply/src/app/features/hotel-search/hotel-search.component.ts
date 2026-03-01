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
import { NotificationService } from '../../core/services/notification.service';
import { MatDialog } from '@angular/material/dialog';
import { ItemDetailDialogComponent, ItemDetailData, ItemDetailResult } from '../../shared/components/item-detail-dialog/item-detail-dialog.component';
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
import { ErrorBannerComponent } from '../../shared/components/error-banner/error-banner.component';
import { ListItemBaseComponent } from '../../shared/components/list-item-base/list-item-base.component';
import { stayToListItem, HotelTagType } from '../../shared/components/list-item-base/list-item-mappers';
import {
  categorizeHotels,
  CategorizedHotels,
} from '../../core/utils/hotel-categorizer.util';
@Component({
  selector: 'app-hotel-search',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule, ErrorBannerComponent, ListItemBaseComponent],
  templateUrl: './hotel-search.component.html',
  styleUrl: './hotel-search.component.scss',
})
export class HotelSearchComponent {
  private readonly hotelApi = inject(HotelApiService);
  private readonly tripState = inject(TripStateService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  // Form controls with custom destination validator
  destinationControl = new FormControl<DestinationOption | null>(null, [
    Validators.required,
    this.destinationValidator(),
  ]);

  hotelSearchForm = new FormGroup({
    destination: this.destinationControl,
    dateRange: new FormGroup({
      start: new FormControl<Date | null>(null, Validators.required),
      end: new FormControl<Date | null>(null, Validators.required),
    }),
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
    return this.hotelSearchForm.value.dateRange?.start || new Date();
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

  // Get category tag for a hotel
  getHotelTag(hotel: Stay): 'cheapest' | 'bestRated' | 'bestValue' | null {
    const cat = this.categorized();
    if (cat.bestValue?.id === hotel.id) return 'bestValue';
    if (cat.cheapest?.id === hotel.id) return 'cheapest';
    if (cat.bestRated?.id === hotel.id) return 'bestRated';
    return null;
  }

  // Check if hotel is already added to trip
  isHotelAdded(hotel: Stay): boolean {
    return this.tripState.stays().some(s => s.id === hotel.id);
  }

  // Open hotel detail on Booking.com
  onViewDetail(hotel: Stay): void {
    if (hotel.link?.url) {
      window.open(hotel.link.url, '_blank', 'noopener,noreferrer');
    }
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
    const checkIn = formValue.dateRange?.start;
    const checkOut = formValue.dateRange?.end;
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
      isPaid: false,
      attachment: null,
    });
    this.notify.success('Hotel adicionado ao roteiro');
  }

  // Set sort by
  setSortBy(value: string): void {
    this.sortBy.set(value as 'price' | 'rating');
  }

  // Map hotel to ListItemConfig
  toListItem(hotel: Stay) {
    return stayToListItem(hotel, {
      isAdded: this.isHotelAdded(hotel),
      tag: this.getHotelTag(hotel),
    });
  }

  // Select hotel by id (primary action)
  selectById(id: string): void {
    const hotel = this.searchResults().find(h => h.id === id);
    if (hotel) this.addToItinerary(hotel);
  }

  // Open detail by id (secondary / card click)
  openDetailById(id: string): void {
    const hotel = this.searchResults().find(h => h.id === id);
    if (!hotel) return;
    const ref = this.dialog.open(ItemDetailDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { type: 'stay', item: hotel, isAdded: this.isHotelAdded(hotel) } as ItemDetailData,
    });
    ref.afterClosed().subscribe((result: ItemDetailResult) => {
      if (!result) return;
      if (result.action === 'add') this.addToItinerary(hotel);
    });
  }
}
