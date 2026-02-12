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
import { CarApiService, CarSearchParams } from '../../core/api/car-api.service';
import { TripStateService } from '../../core/services/trip-state.service';
import { CarRental, ItineraryItem } from '../../core/models/trip.models';

@Component({
  selector: 'app-car-search',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule],
  templateUrl: './car-search.component.html',
  styleUrl: './car-search.component.scss',
})
export class CarSearchComponent {
  private readonly carApi = inject(CarApiService);
  private readonly tripState = inject(TripStateService);
  private readonly snackBar = inject(MatSnackBar);

  // Form controls
  carSearchForm = new FormGroup({
    pickupLocation: new FormControl('', Validators.required),
    dropoffLocation: new FormControl('', Validators.required),
    pickupDate: new FormControl<Date | null>(null, Validators.required),
    pickupTime: new FormControl('10:00', Validators.required),
    dropoffDate: new FormControl<Date | null>(null, Validators.required),
    dropoffTime: new FormControl('10:00', Validators.required),
    driverAge: new FormControl(30, [
      Validators.required,
      Validators.min(18),
      Validators.max(99),
    ]),
  });

  // Filter signals (separate from form, for client-side filtering)
  vehicleTypeFilter = signal<string>('');
  maxPriceFilter = signal<number | null>(null);

  // Vehicle type options (for the filter dropdown)
  vehicleTypes: string[] = [
    'Economy',
    'Compact',
    'Intermediate',
    'Full Size',
    'SUV',
    'Premium',
    'Minivan',
  ];

  // Search state signals
  searchResults = signal<CarRental[]>([]);
  isSearching = signal(false);
  hasSearched = signal(false);

  // Computed signal for filtered and sorted results
  filteredCars = computed(() => {
    let results = this.searchResults();
    const typeFilter = this.vehicleTypeFilter();
    const maxPrice = this.maxPriceFilter();

    if (typeFilter) {
      results = results.filter((car) =>
        car.vehicleType.toLowerCase().includes(typeFilter.toLowerCase())
      );
    }

    if (maxPrice !== null && maxPrice > 0) {
      results = results.filter((car) => car.price.total <= maxPrice);
    }

    // Sort by price ascending (lowest first)
    return [...results].sort((a, b) => a.price.total - b.price.total);
  });

  // Date getters
  get minPickupDate(): Date {
    return new Date();
  }

  get minDropoffDate(): Date {
    return this.carSearchForm.value.pickupDate || new Date();
  }

  // Search cars
  searchCars(): void {
    if (this.carSearchForm.invalid) {
      return;
    }

    const formValue = this.carSearchForm.value;
    const pickupLocation = formValue.pickupLocation ?? '';
    const dropoffLocation = formValue.dropoffLocation ?? '';
    const pickupDate = formValue.pickupDate;
    const pickupTime = formValue.pickupTime ?? '10:00';
    const dropoffDate = formValue.dropoffDate;
    const dropoffTime = formValue.dropoffTime ?? '10:00';
    const driverAge = formValue.driverAge ?? 30;

    if (!pickupDate || !dropoffDate) {
      return;
    }

    // Build ISO 8601 datetimes by combining date + time
    const pickupDateStr = pickupDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const pickupAt = `${pickupDateStr}T${pickupTime}:00`; // YYYY-MM-DDTHH:MM:00
    const dropoffDateStr = dropoffDate.toISOString().split('T')[0];
    const dropoffAt = `${dropoffDateStr}T${dropoffTime}:00`;

    this.isSearching.set(true);
    this.hasSearched.set(true);

    this.carApi
      .searchCars({
        pickupLocation,
        dropoffLocation,
        pickupAt,
        dropoffAt,
        driverAge,
      })
      .pipe(finalize(() => this.isSearching.set(false)))
      .subscribe({
        next: (result) => {
          if (result.error) {
            this.snackBar.open(
              'Failed to search car rentals. Please try again.',
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

  // Add to itinerary
  addToItinerary(car: CarRental): void {
    this.tripState.addCarRental({ ...car, addedToItinerary: true });
    this.tripState.addItineraryItem({
      id: crypto.randomUUID(),
      type: 'car-rental',
      refId: car.id,
      date: car.pickUpAt.split('T')[0],
      timeSlot: car.pickUpAt.split('T')[1]?.substring(0, 5) || null,
      label: `Car Rental: ${car.vehicleType}`,
      notes: `Pick-up: ${car.pickUpLocation}`,
      order: 0,
    });
    this.snackBar.open('Car rental added to itinerary', 'Close', {
      duration: 3000,
    });
  }

  // Set vehicle type filter
  setVehicleTypeFilter(value: string): void {
    this.vehicleTypeFilter.set(value);
  }

  // Set max price filter
  setMaxPriceFilter(value: string): void {
    const num = parseFloat(value);
    this.maxPriceFilter.set(isNaN(num) || num <= 0 ? null : num);
  }
}
