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
import { Observable, forkJoin } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  switchMap,
  finalize,
  map,
} from 'rxjs/operators';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import {
  FlightApiService,
  AirportOption,
} from '../../core/api/flight-api.service';
import { TripStateService } from '../../core/services/trip-state.service';
import { Flight } from '../../core/models/trip.models';
import { ErrorBannerComponent } from '../../shared/components/error-banner/error-banner.component';
import {
  categorizeFlights,
  CategorizedFlights,
} from '../../core/utils/flight-categorizer.util';

type TripType = 'roundTrip' | 'oneWay' | 'returnOnly';

interface MonthOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule, ErrorBannerComponent],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
})
export class SearchComponent {
  private readonly flightApi = inject(FlightApiService);
  private readonly tripState = inject(TripStateService);
  private readonly notify = inject(NotificationService);

  // Trip type & flexible dates
  readonly tripType = signal<TripType>('roundTrip');
  readonly flexibleDates = signal(false);
  readonly selectedMonths = signal<string[]>([]);
  readonly availableMonths: MonthOption[] = this.buildAvailableMonths();

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
    departure: new FormControl<Date | null>(null),
    returnDate: new FormControl<Date | null>(null),
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
  formCollapsed = signal(false);
  searchResults = signal<Flight[]>([]);
  isSearching = signal(false);
  hasSearched = signal(false);
  filterType = signal<'all' | 'direct' | 'stopovers'>('all');
  sortBy = signal<'price' | 'duration' | 'stops'>('price');
  errorMessage = signal<string | null>(null);
  errorSource = signal<string | null>(null);

  // Categorization
  readonly categorized = computed((): CategorizedFlights<Flight> =>
    categorizeFlights(this.searchResults())
  );

  // Computed signals
  filteredFlights = computed(() => {
    const results = this.searchResults();
    const ft = this.filterType();
    const sort = this.sortBy();

    let filtered = results;
    if (ft === 'direct') {
      filtered = results.filter((f) => f.stops === 0);
    } else if (ft === 'stopovers') {
      filtered = results.filter((f) => f.stops > 0);
    }

    return [...filtered].sort((a, b) => {
      if (sort === 'price') return a.price.total - b.price.total;
      if (sort === 'duration') return a.durationMinutes - b.durationMinutes;
      if (sort === 'stops') return a.stops - b.stops;
      return 0;
    });
  });

  // Date getters for date picker validation
  get minDepartureDate(): Date {
    return new Date();
  }

  get minReturnDate(): Date {
    return this.flightSearchForm.value.departure || new Date();
  }

  // Airport validator
  private airportValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
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

  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins.toString().padStart(2, '0')}m`;
  }

  formatTime(isoDate: string): string {
    const d = new Date(isoDate);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  isNextDay(departure: string, arrival: string): boolean {
    const dep = new Date(departure);
    const arr = new Date(arrival);
    return arr.getDate() !== dep.getDate();
  }

  dismissError(): void {
    this.errorMessage.set(null);
    this.errorSource.set(null);
  }

  canSearch(): boolean {
    const hasAirports = this.originControl.valid && this.destinationControl.valid;
    const passengersValid = this.flightSearchForm.get('passengers')?.valid ?? false;
    if (this.flexibleDates()) {
      return hasAirports && passengersValid && this.selectedMonths().length > 0;
    }
    return hasAirports && passengersValid && !!this.flightSearchForm.get('departure')?.value;
  }

  isMonthSelected(value: string): boolean {
    return this.selectedMonths().includes(value);
  }

  toggleMonth(value: string): void {
    this.selectedMonths.update(months => {
      if (months.includes(value)) return months.filter(m => m !== value);
      return [...months, value];
    });
  }

  searchFlights(): void {
    if (!this.canSearch()) return;

    const origin = this.originControl.value as AirportOption;
    const destination = this.destinationControl.value as AirportOption;
    const passengers = this.flightSearchForm.value.passengers ?? 1;

    const effectiveOrigin = this.tripType() === 'returnOnly' ? destination.iataCode : origin.iataCode;
    const effectiveDest = this.tripType() === 'returnOnly' ? origin.iataCode : destination.iataCode;

    this.errorMessage.set(null);
    this.isSearching.set(true);
    this.hasSearched.set(true);
    this.formCollapsed.set(true);

    if (this.flexibleDates()) {
      const searches = this.selectedMonths().map(monthStr => {
        const departureDate = `${monthStr}-01`;
        return this.flightApi.searchFlights({
          origin: effectiveOrigin,
          destination: effectiveDest,
          departureDate,
          adults: passengers,
        }).pipe(map(result => {
          if (result.error) throw result.error;
          return result.data;
        }));
      });

      forkJoin(searches)
        .pipe(finalize(() => this.isSearching.set(false)))
        .subscribe({
          next: (arrays) => {
            const allFlights = arrays.flat();
            const seen = new Set<string>();
            const unique = allFlights.filter(f => {
              if (seen.has(f.id)) return false;
              seen.add(f.id);
              return true;
            });
            this.searchResults.set(unique);
          },
          error: (err) => {
            this.errorMessage.set(err.message || 'Erro ao buscar voos');
            this.errorSource.set(err.source || 'Voos');
            this.searchResults.set([]);
          },
        });
    } else {
      const departure = this.flightSearchForm.value.departure;
      if (!departure) return;

      const params: any = {
        origin: effectiveOrigin,
        destination: effectiveDest,
        departureDate: departure.toISOString().split('T')[0],
        adults: passengers,
      };

      if (this.tripType() === 'roundTrip' && this.flightSearchForm.value.returnDate) {
        params.returnDate = this.flightSearchForm.value.returnDate.toISOString().split('T')[0];
      }

      this.flightApi
        .searchFlights(params)
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
  }

  addToItinerary(flight: Flight): void {
    this.tripState.addFlight(flight);
    this.tripState.addItineraryItem({
      id: crypto.randomUUID(),
      type: 'flight',
      refId: flight.id,
      date: flight.departureAt.split('T')[0],
      timeSlot: flight.departureAt.split('T')[1]?.substring(0, 5) || null,
      durationMinutes: null,
      label: `Voo: ${flight.origin} \u2192 ${flight.destination}`,
      notes: `${flight.airline} ${flight.flightNumber}`,
      order: 0,
    });
    this.notify.success('Voo adicionado ao roteiro');
  }

  setFilter(value: string): void {
    this.filterType.set(value as 'all' | 'direct' | 'stopovers');
  }

  setSortBy(value: string): void {
    this.sortBy.set(value as 'price' | 'duration' | 'stops');
  }

  countDirectFlights(): number {
    return this.searchResults().filter((f) => f.stops === 0).length;
  }

  countStopoverFlights(): number {
    return this.searchResults().filter((f) => f.stops > 0).length;
  }

  private buildAvailableMonths(): MonthOption[] {
    const months: MonthOption[] = [];
    const now = new Date();
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      months.push({ value, label });
    }
    return months;
  }
}
