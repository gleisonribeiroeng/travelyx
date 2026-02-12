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
  FlightApiService,
  AirportOption,
} from '../../core/api/flight-api.service';
import { TripStateService } from '../../core/services/trip-state.service';
import { Flight } from '../../core/models/trip.models';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
})
export class SearchComponent {
  private readonly flightApi = inject(FlightApiService);
  private readonly tripState = inject(TripStateService);
  private readonly snackBar = inject(MatSnackBar);

  // Form controls with custom airport validator
  originControl = new FormControl<AirportOption | null>(null, [
    Validators.required,
    this.airportValidator(),
  ]);
  destinationControl = new FormControl<AirportOption | null>(null, [
    Validators.required,
    this.airportValidator(),
  ]);

  flightSearchForm = new FormGroup({
    origin: this.originControl,
    destination: this.destinationControl,
    dateRange: new FormGroup({
      departure: new FormControl<Date | null>(null, Validators.required),
      return: new FormControl<Date | null>(null),
    }),
    passengers: new FormControl(1, [
      Validators.required,
      Validators.min(1),
      Validators.max(9),
    ]),
  });

  // Autocomplete observables
  filteredOrigins$: Observable<AirportOption[]> =
    this.originControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter((v) => typeof v === 'string' && (v as string).length >= 2),
      switchMap((keyword) => this.flightApi.searchAirports(keyword as string))
    );

  filteredDestinations$: Observable<AirportOption[]> =
    this.destinationControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter((v) => typeof v === 'string' && (v as string).length >= 2),
      switchMap((keyword) => this.flightApi.searchAirports(keyword as string))
    );

  // Search state signals
  searchResults = signal<Flight[]>([]);
  isSearching = signal(false);
  hasSearched = signal(false);
  filterType = signal<'all' | 'direct' | 'stopovers'>('all');
  sortBy = signal<'price' | 'duration' | 'stops'>('price');

  // Computed signals
  filteredFlights = computed(() => {
    const results = this.searchResults();
    const filter = this.filterType();
    const sort = this.sortBy();

    // Filter by stop type
    let filtered = results;
    if (filter === 'direct') {
      filtered = results.filter((f) => f.stops === 0);
    } else if (filter === 'stopovers') {
      filtered = results.filter((f) => f.stops > 0);
    }

    // Sort by selected criteria
    return [...filtered].sort((a, b) => {
      if (sort === 'price') {
        return a.price.total - b.price.total;
      } else if (sort === 'duration') {
        return a.durationMinutes - b.durationMinutes;
      } else if (sort === 'stops') {
        return a.stops - b.stops;
      }
      return 0;
    });
  });

  // Date getters for date picker validation
  get minDepartureDate(): Date {
    return new Date();
  }

  get minReturnDate(): Date {
    return (
      this.flightSearchForm.value.dateRange?.departure || new Date()
    );
  }

  // Airport validator
  private airportValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null; // Let required handle empty
      }
      if (
        typeof control.value === 'string' ||
        !(control.value as AirportOption).iataCode
      ) {
        return { invalidAirport: true };
      }
      return null;
    };
  }

  // Display function for autocomplete
  displayAirport(airport: AirportOption | null): string {
    return airport ? `${airport.iataCode} - ${airport.cityName}` : '';
  }

  // Format duration
  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  // Search flights
  searchFlights(): void {
    if (this.flightSearchForm.invalid) {
      return;
    }

    const formValue = this.flightSearchForm.value;
    const origin = formValue.origin as AirportOption;
    const destination = formValue.destination as AirportOption;
    const departure = formValue.dateRange?.departure;
    const returnDate = formValue.dateRange?.return;
    const passengers = formValue.passengers ?? 1;

    if (!origin || !destination || !departure) {
      return;
    }

    this.isSearching.set(true);
    this.hasSearched.set(true);

    this.flightApi
      .searchFlights({
        origin: origin.iataCode,
        destination: destination.iataCode,
        departureDate: departure.toISOString().split('T')[0],
        returnDate: returnDate
          ? returnDate.toISOString().split('T')[0]
          : undefined,
        adults: passengers,
      })
      .pipe(finalize(() => this.isSearching.set(false)))
      .subscribe({
        next: (result) => {
          if (result.error) {
            this.snackBar.open(
              'Failed to search flights. Please try again.',
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

  // Add flight to itinerary
  addToItinerary(flight: Flight): void {
    this.tripState.addFlight(flight);
    this.snackBar.open('Flight added to itinerary', 'Close', { duration: 3000 });
  }

  // Set filter type
  setFilter(value: string): void {
    this.filterType.set(value as 'all' | 'direct' | 'stopovers');
  }

  // Set sort by
  setSortBy(value: string): void {
    this.sortBy.set(value as 'price' | 'duration' | 'stops');
  }

  // Count flights by filter type (for template)
  countDirectFlights(): number {
    return this.searchResults().filter((f) => f.stops === 0).length;
  }

  countStopoverFlights(): number {
    return this.searchResults().filter((f) => f.stops > 0).length;
  }
}
