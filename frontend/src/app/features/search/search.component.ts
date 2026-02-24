import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  FormArray,
  Validators,
  ValidatorFn,
  AbstractControl,
  ValidationErrors,
  ReactiveFormsModule,
} from '@angular/forms';
import { NotificationService } from '../../core/services/notification.service';
import { Observable, forkJoin, Subscription } from 'rxjs';
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

type TripType = 'roundTrip' | 'oneWay' | 'returnOnly' | 'multi';

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
    dateRange: new FormGroup({
      start: new FormControl<Date | null>(null),
      end: new FormControl<Date | null>(null),
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

  // Multi-city segment state
  readonly MIN_SEGMENTS = 2;
  readonly MAX_SEGMENTS = 6;
  segmentsArray = new FormArray<FormGroup>([]);
  segmentOriginStreams = signal<Observable<AirportOption[]>[]>([]);
  segmentDestinationStreams = signal<Observable<AirportOption[]>[]>([]);
  multiCityResults = signal<Flight[][]>([]);
  private smartFillSubs: Subscription[] = [];

  multiCityHasResults = computed(() =>
    this.multiCityResults().some(segment => segment.length > 0)
  );

  multiCityTotalPrice = computed(() => {
    const results = this.multiCityResults();
    if (results.length === 0) return null;
    let total = 0;
    for (const segResults of results) {
      if (segResults.length === 0) return null;
      const cheapest = segResults.reduce((a, b) =>
        a.price.total < b.price.total ? a : b
      );
      total += cheapest.price.total;
    }
    return total;
  });

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
    return this.flightSearchForm.value.dateRange?.start || new Date();
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

  // ── Multi-city segment management ──

  private createSegmentGroup(): FormGroup {
    return new FormGroup({
      origin: new FormControl<AirportOption | null>(null, [
        Validators.required,
        this.airportValidator(),
      ]),
      destination: new FormControl<AirportOption | null>(null, [
        Validators.required,
        this.airportValidator(),
      ]),
      date: new FormControl<Date | null>(null, Validators.required),
    });
  }

  initMultiSegments(): void {
    this.segmentsArray.clear();
    for (let i = 0; i < this.MIN_SEGMENTS; i++) {
      this.segmentsArray.push(this.createSegmentGroup());
    }
    this.rebuildSegmentAutocomplete();
    this.multiCityResults.set([]);
  }

  addSegment(): void {
    if (this.segmentsArray.length >= this.MAX_SEGMENTS) return;
    const newGroup = this.createSegmentGroup();
    const prevIndex = this.segmentsArray.length - 1;
    if (prevIndex >= 0) {
      const prevDest = this.segmentsArray.at(prevIndex).get('destination')?.value;
      if (prevDest && typeof prevDest === 'object' && prevDest.iataCode) {
        newGroup.get('origin')?.setValue(prevDest);
      }
    }
    this.segmentsArray.push(newGroup);
    this.rebuildSegmentAutocomplete();
  }

  removeSegment(index: number): void {
    if (this.segmentsArray.length <= this.MIN_SEGMENTS) return;
    this.segmentsArray.removeAt(index);
    this.rebuildSegmentAutocomplete();
  }

  private rebuildSegmentAutocomplete(): void {
    this.smartFillSubs.forEach(s => s.unsubscribe());
    this.smartFillSubs = [];

    const originStreams: Observable<AirportOption[]>[] = [];
    const destStreams: Observable<AirportOption[]>[] = [];

    for (let i = 0; i < this.segmentsArray.length; i++) {
      const group = this.segmentsArray.at(i);
      const originCtrl = group.get('origin') as FormControl;
      const destCtrl = group.get('destination') as FormControl;

      originStreams.push(
        originCtrl.valueChanges.pipe(
          debounceTime(300),
          distinctUntilChanged(),
          filter((v) => typeof v === 'string' && (v as string).length >= 2),
          switchMap((keyword) => this.flightApi.searchAirports(keyword as string))
        )
      );

      destStreams.push(
        destCtrl.valueChanges.pipe(
          debounceTime(300),
          distinctUntilChanged(),
          filter((v) => typeof v === 'string' && (v as string).length >= 2),
          switchMap((keyword) => this.flightApi.searchAirports(keyword as string))
        )
      );

      // Smart-fill: destination of segment N → origin of segment N+1
      if (i < this.segmentsArray.length - 1) {
        const nextOriginCtrl = this.segmentsArray.at(i + 1).get('origin') as FormControl;
        this.smartFillSubs.push(
          destCtrl.valueChanges.pipe(
            filter(val => val && typeof val === 'object' && val.iataCode),
          ).subscribe(val => {
            if (!nextOriginCtrl.value || !nextOriginCtrl.value.iataCode) {
              nextOriginCtrl.setValue(val);
            }
          })
        );
      }
    }

    this.segmentOriginStreams.set(originStreams);
    this.segmentDestinationStreams.set(destStreams);
  }

  getMinDateForSegment(index: number): Date {
    if (index === 0) return new Date();
    const prevDate = this.segmentsArray.at(index - 1)?.get('date')?.value;
    return prevDate instanceof Date ? prevDate : new Date();
  }

  segmentHasSameAirports(index: number): boolean {
    const group = this.segmentsArray.at(index);
    const origin = group.get('origin')?.value;
    const dest = group.get('destination')?.value;
    if (!origin || !dest) return false;
    if (typeof origin === 'string' || typeof dest === 'string') return false;
    return origin.iataCode === dest.iataCode;
  }

  onTripTypeChange(value: string): void {
    this.tripType.set(value as TripType);
    if (value === 'multi') {
      this.initMultiSegments();
      this.flexibleDates.set(false);
    } else {
      this.segmentsArray.clear();
      this.multiCityResults.set([]);
      this.smartFillSubs.forEach(s => s.unsubscribe());
      this.smartFillSubs = [];
    }
  }

  private canSearchMulti(): boolean {
    const passengersValid = this.flightSearchForm.get('passengers')?.valid ?? false;
    if (!passengersValid) return false;
    if (this.segmentsArray.length < this.MIN_SEGMENTS) return false;

    for (let i = 0; i < this.segmentsArray.length; i++) {
      const group = this.segmentsArray.at(i);
      if (!group.valid) return false;
      if (this.segmentHasSameAirports(i)) return false;
      if (i > 0) {
        const prevDate = this.segmentsArray.at(i - 1).get('date')?.value;
        const currDate = group.get('date')?.value;
        if (prevDate && currDate && currDate < prevDate) return false;
      }
    }
    return true;
  }

  canSearch(): boolean {
    if (this.tripType() === 'multi') {
      return this.canSearchMulti();
    }
    const hasAirports = this.originControl.valid && this.destinationControl.valid;
    const passengersValid = this.flightSearchForm.get('passengers')?.valid ?? false;
    if (this.flexibleDates()) {
      return hasAirports && passengersValid && this.selectedMonths().length > 0;
    }
    return hasAirports && passengersValid && !!this.flightSearchForm.get('dateRange')?.get('start')?.value;
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

    if (this.tripType() === 'multi') {
      this.searchMultiCity();
      return;
    }

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
      const departure = this.flightSearchForm.value.dateRange?.start;
      if (!departure) return;

      const params: any = {
        origin: effectiveOrigin,
        destination: effectiveDest,
        departureDate: departure.toISOString().split('T')[0],
        adults: passengers,
      };

      if (this.tripType() === 'roundTrip' && this.flightSearchForm.value.dateRange?.end) {
        params.returnDate = this.flightSearchForm.value.dateRange.end.toISOString().split('T')[0];
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

  private searchMultiCity(): void {
    const passengers = this.flightSearchForm.value.passengers ?? 1;

    this.errorMessage.set(null);
    this.isSearching.set(true);
    this.hasSearched.set(true);
    this.formCollapsed.set(true);
    this.searchResults.set([]);
    this.multiCityResults.set([]);

    const segmentSearches = [];

    for (let i = 0; i < this.segmentsArray.length; i++) {
      const group = this.segmentsArray.at(i);
      const origin = group.get('origin')?.value as AirportOption;
      const dest = group.get('destination')?.value as AirportOption;
      const date = group.get('date')?.value as Date;

      segmentSearches.push(
        this.flightApi.searchFlights({
          origin: origin.iataCode,
          destination: dest.iataCode,
          departureDate: date.toISOString().split('T')[0],
          adults: passengers,
        })
      );
    }

    forkJoin(segmentSearches)
      .pipe(finalize(() => this.isSearching.set(false)))
      .subscribe({
        next: (results) => {
          const segmentResults: Flight[][] = [];
          const errors: string[] = [];

          results.forEach((result, index) => {
            if (result.error) {
              const seg = this.segmentsArray.at(index);
              const orig = (seg.get('origin')?.value as AirportOption)?.iataCode ?? '?';
              const dest = (seg.get('destination')?.value as AirportOption)?.iataCode ?? '?';
              errors.push(`Trecho ${index + 1} (${orig} → ${dest}): ${result.error.message}`);
              segmentResults.push([]);
            } else {
              segmentResults.push(result.data);
            }
          });

          this.multiCityResults.set(segmentResults);

          if (errors.length > 0) {
            this.errorMessage.set(errors.join('\n'));
            this.errorSource.set('Voos Multi-Cidade');
          }
        },
        error: (err) => {
          this.errorMessage.set(err.message || 'Erro ao buscar voos multi-cidade');
          this.errorSource.set('Voos Multi-Cidade');
        },
      });
  }

  addSegmentFlightToItinerary(flight: Flight, segmentIndex: number): void {
    this.tripState.addFlight(flight);
    this.tripState.addItineraryItem({
      id: crypto.randomUUID(),
      type: 'flight',
      refId: flight.id,
      date: flight.departureAt.split('T')[0],
      timeSlot: flight.departureAt.split('T')[1]?.substring(0, 5) || null,
      durationMinutes: null,
      label: `Voo Trecho ${segmentIndex + 1}: ${flight.origin} → ${flight.destination}`,
      notes: `${flight.airline} ${flight.flightNumber}`,
      order: segmentIndex,
      isPaid: false,
      attachment: null,
    });
    this.notify.success(`Trecho ${segmentIndex + 1} adicionado ao roteiro`);
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
      isPaid: false,
      attachment: null,
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
