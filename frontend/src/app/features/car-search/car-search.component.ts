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
import { CarApiService, CarLocationOption, CarSearchParams } from '../../core/api/car-api.service';
import { TripStateService } from '../../core/services/trip-state.service';
import { CarRental } from '../../core/models/trip.models';
import { ErrorBannerComponent } from '../../shared/components/error-banner/error-banner.component';

@Component({
  selector: 'app-car-search',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule, ErrorBannerComponent],
  templateUrl: './car-search.component.html',
  styleUrl: './car-search.component.scss',
})
export class CarSearchComponent {
  private readonly carApi = inject(CarApiService);
  private readonly tripState = inject(TripStateService);
  private readonly snackBar = inject(MatSnackBar);

  // Autocomplete form controls (separate to enable object values)
  pickupLocationControl = new FormControl<CarLocationOption | null>(null, [
    Validators.required,
    this.locationValidator(),
  ]);
  dropoffLocationControl = new FormControl<CarLocationOption | null>(null, [
    Validators.required,
    this.locationValidator(),
  ]);

  // Form controls
  carSearchForm = new FormGroup({
    pickupLocation: this.pickupLocationControl,
    dropoffLocation: this.dropoffLocationControl,
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

  // Autocomplete observables
  filteredPickupLocations$: Observable<CarLocationOption[]> =
    this.pickupLocationControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter((v) => typeof v === 'string' && (v as string).length >= 2),
      switchMap((keyword) => this.carApi.searchLocations(keyword as string)),
    );

  filteredDropoffLocations$: Observable<CarLocationOption[]> =
    this.dropoffLocationControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter((v) => typeof v === 'string' && (v as string).length >= 2),
      switchMap((keyword) => this.carApi.searchLocations(keyword as string)),
    );

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
  formCollapsed = signal(false);
  searchResults = signal<CarRental[]>([]);
  isSearching = signal(false);
  hasSearched = signal(false);
  errorMessage = signal<string | null>(null);
  errorSource = signal<string | null>(null);

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

  // Location validator - ensures a CarLocationOption was selected from autocomplete
  private locationValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null; // Let required handle empty
      }
      if (
        typeof control.value === 'string' ||
        !(control.value as CarLocationOption).cityId
      ) {
        return { invalidLocation: true };
      }
      return null;
    };
  }

  // Display function for autocomplete
  displayLocation(loc: CarLocationOption | null): string {
    return loc ? loc.label || loc.name : '';
  }

  // Copy pickup to dropoff when "Same as pick-up" is checked
  copyPickupToDropoff(): void {
    this.dropoffLocationControl.setValue(this.pickupLocationControl.value);
  }

  // Dismiss error banner
  dismissError(): void {
    this.errorMessage.set(null);
    this.errorSource.set(null);
  }

  // Search cars
  searchCars(): void {
    if (this.carSearchForm.invalid) {
      return;
    }

    const formValue = this.carSearchForm.value;
    const pickupLoc = formValue.pickupLocation as CarLocationOption;
    const dropoffLoc = formValue.dropoffLocation as CarLocationOption;
    const pickupDate = formValue.pickupDate;
    const pickupTime = formValue.pickupTime ?? '10:00';
    const dropoffDate = formValue.dropoffDate;
    const dropoffTime = formValue.dropoffTime ?? '10:00';
    const driverAge = formValue.driverAge ?? 30;

    if (!pickupLoc || !dropoffLoc || !pickupDate || !dropoffDate) {
      return;
    }

    // Priceline API requires MM/DD/YYYY date format
    const pickupDateStr = this.formatDate(pickupDate);
    const dropoffDateStr = this.formatDate(dropoffDate);

    this.errorMessage.set(null);
    this.isSearching.set(true);
    this.hasSearched.set(true);
    this.formCollapsed.set(true);

    this.carApi
      .searchCars({
        pickupLocationName: pickupLoc.label || pickupLoc.name,
        dropoffLocationName: dropoffLoc.label || dropoffLoc.name,
        pickupCityId: pickupLoc.cityId,
        dropoffCityId: dropoffLoc.cityId,
        pickupDate: pickupDateStr,
        pickupTime: pickupTime,
        dropoffDate: dropoffDateStr,
        dropoffTime: dropoffTime,
        driverAge,
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

  // Add to itinerary
  addToItinerary(car: CarRental): void {
    this.tripState.addCarRental({ ...car, addedToItinerary: true });
    this.tripState.addItineraryItem({
      id: crypto.randomUUID(),
      type: 'car-rental',
      refId: car.id,
      date: car.pickUpAt.split('T')[0],
      timeSlot: car.pickUpAt.split('T')[1]?.substring(0, 5) || null,
      durationMinutes: null,
      label: `Carro: ${car.vehicleType}`,
      notes: `Retirada: ${car.pickUpLocation}`,
      order: 0,
    });
    this.snackBar.open('Aluguel de carro adicionado ao roteiro', 'Fechar', {
      duration: 3000,
    });
  }

  // Format Date to MM/DD/YYYY for Priceline API
  private formatDate(date: Date): string {
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const y = date.getFullYear();
    return `${m}/${d}/${y}`;
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
