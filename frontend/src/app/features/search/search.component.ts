import { Component, signal, computed, inject, effect, untracked } from '@angular/core';
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
  ItemDetailDialogComponent,
  ItemDetailData,
  ItemDetailResult,
} from '../../shared/components/item-detail-dialog/item-detail-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import {
  categorizeFlights,
  CategorizedFlights,
} from '../../core/utils/flight-categorizer.util';
import {
  ManualFlightDialogComponent,
  ManualFlightDialogData,
  ManualFlightDialogResult,
} from '../../shared/components/manual-flight-dialog/manual-flight-dialog.component';
import { ListItemBaseComponent } from '../../shared/components/list-item-base/list-item-base.component';
import { flightToListItem, FlightTagType } from '../../shared/components/list-item-base/list-item-mappers';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';
import { DynamicCurrencyPipe } from '../../core/i18n/dynamic-currency.pipe';
import { PriceAlertApiService, CreatePriceAlertDto } from '../../core/api/price-alert-api.service';
import { PlanService } from '../../core/services/plan.service';

type TripType = 'roundTrip' | 'oneWay' | 'multi';

interface MonthOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule, ErrorBannerComponent, ListItemBaseComponent, TranslatePipe, DynamicCurrencyPipe],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
})
export class SearchComponent {
  private readonly flightApi = inject(FlightApiService);
  private readonly tripState = inject(TripStateService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly t = inject(TranslationService);
  private readonly priceAlertApi = inject(PriceAlertApiService);
  private readonly planService = inject(PlanService);

  // Trip type & flexible dates
  readonly tripType = signal<TripType>('roundTrip');
  readonly flexibleDates = signal(false);
  readonly selectedMonths = signal<string[]>([]);
  readonly availableMonths: MonthOption[] = this.buildAvailableMonths();

  // Segment tracking for round-trip flights
  readonly currentSegment = signal<'outbound' | 'return'>('outbound');
  readonly outboundFlightId = signal<string | null>(null);
  readonly returnFlightId = signal<string | null>(null);

  readonly segmentLabel = computed(() =>
    this.currentSegment() === 'outbound' ? this.t.t('flights.outboundFlight') : this.t.t('flights.returnFlightLabel')
  );
  readonly isRoundTrip = computed(() => this.tripType() === 'roundTrip');
  readonly hasOutbound = computed(() => this.outboundFlightId() !== null);
  readonly hasReturn = computed(() => this.returnFlightId() !== null);

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

  private readonly FORM_STORAGE_KEY = 'travelyx_flight_search_form';

  constructor() {
    const dates = this.tripState.trip().dates;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Try to restore saved form state
    const saved = this.loadFormState();
    if (saved) {
      if (saved['origin']) this.originControl.setValue(saved['origin']);
      if (saved['destination']) this.destinationControl.setValue(saved['destination']);
      if (saved['passengers']) this.flightSearchForm.get('passengers')!.setValue(saved['passengers']);
      if (saved['tripType']) this.tripType.set(saved['tripType']);
      if (saved['dateStart']) {
        const start = new Date(saved['dateStart']);
        if (start >= today) this.flightSearchForm.get('dateRange.start')!.setValue(start);
      }
      if (saved['dateEnd']) {
        const end = new Date(saved['dateEnd']);
        if (end >= today) this.flightSearchForm.get('dateRange.end')!.setValue(end);
      }
    } else if (dates.start && dates.end) {
      const start = new Date(dates.start + 'T00:00:00');
      const end = new Date(dates.end + 'T00:00:00');
      this.flightSearchForm.get('dateRange')!.patchValue({
        start: start >= today ? start : null,
        end: end >= today ? end : null,
      });
    }

    // Auto-fill destination from trip if not restored from saved state
    const trip = this.tripState.trip();
    if (!this.destinationControl.value && trip.destination) {
      this.flightApi.searchAirports(trip.destination).subscribe({
        next: (airports) => {
          if (airports.length > 0) {
            this.destinationControl.setValue(airports[0]);
          }
        },
      });
    }

    // Reset segment state when tripType changes
    effect(() => {
      this.tripType();
      untracked(() => {
        this.currentSegment.set('outbound');
        this.outboundFlightId.set(null);
        this.returnFlightId.set(null);
      });
    });

    // Save form state on changes
    effect(() => {
      const origin = this.originControl.value;
      const dest = this.destinationControl.value;
      const passengers = this.flightSearchForm.get('passengers')!.value;
      const dateStart = this.flightSearchForm.get('dateRange.start')!.value;
      const dateEnd = this.flightSearchForm.get('dateRange.end')!.value;
      const tripType = this.tripType();

      untracked(() => {
        this.saveFormState({
          origin: typeof origin === 'object' ? origin : null,
          destination: typeof dest === 'object' ? dest : null,
          passengers,
          tripType,
          dateStart: dateStart?.toISOString() ?? null,
          dateEnd: dateEnd?.toISOString() ?? null,
        });
      });
    });
  }

  private saveFormState(state: Record<string, unknown>): void {
    try {
      localStorage.setItem(this.FORM_STORAGE_KEY, JSON.stringify(state));
    } catch { /* quota exceeded - ignore */ }
  }

  private loadFormState(): Record<string, any> | null {
    try {
      const raw = localStorage.getItem(this.FORM_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

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

    // Filter only (sorting is done server-side)
    if (ft === 'direct') return results.filter((f) => f.stops === 0);
    if (ft === 'stopovers') return results.filter((f) => f.stops > 0);
    return results;
  });

  // Date getters for date picker validation
  get minDepartureDate(): Date {
    return new Date();
  }

  get minReturnDate(): Date {
    return this.flightSearchForm.value.dateRange?.start || new Date();
  }

  // Airport validator — accepts airports (with iataCode) and cities (with id)
  private airportValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      if (typeof control.value === 'string') {
        return { invalidAirport: true };
      }
      const option = control.value as AirportOption;
      if (!option.iataCode && !option.id) {
        return { invalidAirport: true };
      }
      return null;
    };
  }

  // Display function for autocomplete
  displayAirport(airport: AirportOption | null): string {
    if (!airport) return '';
    if (airport.iataCode) {
      return `${airport.cityName} (${airport.iataCode})`;
    }
    return airport.cityName || airport.name || '';
  }

  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins.toString().padStart(2, '0')}m`;
  }

  dismissError(): void {
    this.errorMessage.set(null);
    this.errorSource.set(null);
  }

  private getFlightTag(flight: Flight): FlightTagType | null {
    const cat = this.categorized();
    if (cat.bestValue?.id === flight.id) return 'bestValue';
    if (cat.cheapest?.id === flight.id) return 'cheapest';
    if (cat.fastest?.id === flight.id) return 'fastest';
    return null;
  }

  toListItem(flight: Flight) {
    return flightToListItem(flight, {
      isAdded: this.isAdded(flight.id),
      tag: this.getFlightTag(flight),
    });
  }

  toListItemForSegment(flight: Flight, _segmentIndex: number) {
    return flightToListItem(flight, {
      isAdded: this.isAdded(flight.id),
    });
  }

  onPrimaryClick(id: string): void {
    const flight = this.findFlightById(id);
    if (!flight) return;
    if (this.isAdded(flight.id)) return;
    this.addToItinerary(flight);
  }

  onSecondaryClick(id: string): void {
    const flight = this.findFlightById(id);
    if (flight) this.openDetail(flight);
  }

  onCardItemClick(id: string): void {
    const flight = this.findFlightById(id);
    if (flight) this.openDetail(flight);
  }

  onIconAction(event: { itemId: string; actionId: string }): void {
    if (event.actionId !== 'price-alert') return;

    if (!this.planService.hasFeature('priceAlerts')) {
      this.planService.showPaywall('priceAlerts');
      return;
    }

    const flight = this.findFlightById(event.itemId);
    if (!flight) return;

    const origin = this.originControl.value;
    const destination = this.destinationControl.value;
    const dateRange = this.flightSearchForm.get('dateRange');
    const departDate = dateRange?.get('start')?.value;

    const dto: CreatePriceAlertDto = {
      type: 'flight',
      label: `${flight.origin} → ${flight.destination}`,
      searchParams: {
        fromId: origin && typeof origin === 'object' ? (origin as any).id || `${flight.origin}.AIRPORT` : `${flight.origin}.AIRPORT`,
        toId: destination && typeof destination === 'object' ? (destination as any).id || `${flight.destination}.AIRPORT` : `${flight.destination}.AIRPORT`,
        departureDate: departDate instanceof Date ? departDate.toISOString().split('T')[0] : flight.departureAt?.split('T')[0] || '',
        adults: String(this.flightSearchForm.get('passengers')?.value || 1),
      },
      currentPrice: flight.price.total,
      targetPrice: Math.round(flight.price.total * 0.9 * 100) / 100, // alert at 10% drop
      currency: flight.price.currency,
    };

    this.priceAlertApi.createAlert(dto).subscribe({
      next: () => this.notify.success('Alerta de preço criado! Avisaremos quando o preço cair.'),
      error: () => this.notify.error('Erro ao criar alerta de preço.'),
    });
  }

  onSegmentPrimaryClick(id: string, segmentIndex: number): void {
    const flight = this.findFlightInSegment(id, segmentIndex);
    if (flight) this.addSegmentFlightToItinerary(flight, segmentIndex);
  }

  private findFlightById(id: string): Flight | undefined {
    return this.filteredFlights().find(f => f.id === id)
      ?? this.searchResults().find(f => f.id === id);
  }

  private findFlightInSegment(id: string, segmentIndex: number): Flight | undefined {
    return this.multiCityResults()[segmentIndex]?.find(f => f.id === id);
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

    const effectiveOrigin = origin.iataCode || origin.id;
    const effectiveDest = destination.iataCode || destination.id;
    const fromId = origin.id || `${origin.iataCode}.AIRPORT`;
    const toId = destination.id || `${destination.iataCode}.AIRPORT`;

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
          fromId,
          toId,
          departureDate,
          adults: passengers,
          sort: this.getApiSort(),
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
            const detail = err.status === 0
              ? this.t.t('flights.errorNoConnection')
              : err.status === 429
              ? this.t.t('flights.errorTooManyRequests')
              : err.message || this.t.t('flights.errorGeneric');
            this.errorMessage.set(detail);
            this.errorSource.set(err.source || this.t.t('flights.title'));
            this.searchResults.set([]);
          },
        });
    } else {
      const departure = this.flightSearchForm.value.dateRange?.start;
      if (!departure) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (departure < today) {
        this.notify.error(this.t.t('flights.errorPastDate'));
        return;
      }

      const params: any = {
        origin: effectiveOrigin,
        destination: effectiveDest,
        fromId,
        toId,
        departureDate: departure.toISOString().split('T')[0],
        adults: passengers,
        sort: this.getApiSort(),
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
          fromId: origin.id || `${origin.iataCode}.AIRPORT`,
          toId: dest.id || `${dest.iataCode}.AIRPORT`,
          departureDate: date.toISOString().split('T')[0],
          adults: passengers,
          sort: this.getApiSort(),
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
              errors.push(`${this.t.t('flights.segment')} ${index + 1} (${orig} → ${dest}): ${result.error.message}`);
              segmentResults.push([]);
            } else {
              segmentResults.push(result.data);
            }
          });

          this.multiCityResults.set(segmentResults);

          if (errors.length > 0) {
            this.errorMessage.set(errors.join('\n'));
            this.errorSource.set(this.t.t('flights.multiCitySource'));
          }
        },
        error: (err) => {
          const detail = err.status === 0
            ? this.t.t('flights.errorNoConnection')
            : err.message || this.t.t('flights.errorMultiCity');
          this.errorMessage.set(detail);
          this.errorSource.set(this.t.t('flights.multiCitySource'));
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
      durationMinutes: flight.durationMinutes,
      label: `${this.t.t('flights.flightSegmentLabel')} ${segmentIndex + 1}: ${flight.origin} → ${flight.destination}`,
      notes: `${flight.airline} ${flight.flightNumber}`,
      order: segmentIndex,
      isPaid: false,
      attachment: null,
    });
    this.notify.success(this.t.t('flights.segmentAdded', { index: segmentIndex + 1 }));
  }

  isAdded(id: string): boolean {
    return this.tripState.flights().some((f) => f.id === id);
  }

  openDetail(flight: Flight): void {
    const ref = this.dialog.open(ItemDetailDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { type: 'flight', item: flight, isAdded: this.isAdded(flight.id) } as ItemDetailData,
    });
    ref.afterClosed().subscribe((result: ItemDetailResult) => {
      if (!result) return;
      if (result.action === 'add') this.addToItinerary(flight);
      else if (result.action === 'remove') {
        this.tripState.removeFlight(flight.id);
        this.tripState.removeItineraryItem(
          this.tripState.itineraryItems().find(i => i.refId === flight.id)?.id ?? ''
        );
      }
    });
  }

  switchSegment(segment: 'outbound' | 'return'): void {
    this.currentSegment.set(segment);
  }

  addToItinerary(flight: Flight): void {
    this.tripState.addFlight(flight);

    const isOutbound = this.isRoundTrip() && this.currentSegment() === 'outbound';
    const isReturn = this.isRoundTrip() && this.currentSegment() === 'return';
    const legLabel = isOutbound ? this.t.t('flights.outbound') : isReturn ? this.t.t('flights.returnFlight') : '';
    const label = legLabel
      ? `${this.t.t('flights.flightLabel')} ${legLabel}: ${flight.origin} \u2192 ${flight.destination}`
      : `${this.t.t('flights.flightLabel')}: ${flight.origin} \u2192 ${flight.destination}`;

    this.tripState.addItineraryItem({
      id: crypto.randomUUID(),
      type: 'flight',
      refId: flight.id,
      date: flight.departureAt.split('T')[0],
      timeSlot: flight.departureAt.split('T')[1]?.substring(0, 5) || null,
      durationMinutes: flight.durationMinutes,
      label,
      notes: `${flight.airline} ${flight.flightNumber}`,
      order: 0,
      isPaid: false,
      attachment: null,
    });

    // Track segment for round-trip
    if (this.isRoundTrip()) {
      if (this.currentSegment() === 'outbound') {
        this.outboundFlightId.set(flight.id);
        this.currentSegment.set('return');
      } else {
        this.returnFlightId.set(flight.id);
      }
    }

    this.notify.success(legLabel ? this.t.t('flights.flightLegAdded', { leg: legLabel }) : this.t.t('flights.flightAdded'));
  }

  setFilter(value: string): void {
    this.filterType.set(value as 'all' | 'direct' | 'stopovers');
  }

  setSortBy(value: string): void {
    this.sortBy.set(value as 'price' | 'duration' | 'stops');
    // Re-search with new sort if we already have results
    if (this.hasSearched() && this.searchResults().length > 0) {
      this.searchFlights();
    }
  }

  private getApiSort(): 'price_asc' | 'duration_asc' | 'stops_asc' {
    const map: Record<string, 'price_asc' | 'duration_asc' | 'stops_asc'> = {
      price: 'price_asc',
      duration: 'duration_asc',
      stops: 'stops_asc',
    };
    return map[this.sortBy()] || 'price_asc';
  }

  countDirectFlights(): number {
    return this.searchResults().filter((f) => f.stops === 0).length;
  }

  countStopoverFlights(): number {
    return this.searchResults().filter((f) => f.stops > 0).length;
  }

  openManualFlightDialog(): void {
    const ref = this.dialog.open(ManualFlightDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: {
        flight: null,
        tripCurrency: this.tripState.trip().currency,
      } as ManualFlightDialogData,
    });
    ref.afterClosed().subscribe((result: ManualFlightDialogResult | undefined) => {
      if (!result || result.action !== 'save') return;
      this.tripState.addFlight(result.flight);
      this.tripState.addItineraryItem({
        id: crypto.randomUUID(),
        type: 'flight',
        refId: result.flight.id,
        date: result.flight.departureAt.split('T')[0],
        timeSlot: result.flight.departureAt.split('T')[1]?.substring(0, 5) || null,
        durationMinutes: result.flight.durationMinutes,
        label: `${this.t.t('flights.flightLabel')}: ${result.flight.origin} → ${result.flight.destination}`,
        notes: `${result.flight.airline} ${result.flight.flightNumber}`,
        order: 0,
        isPaid: result.isPaid,
        attachment: null,
      });
      this.notify.success(this.t.t('flights.manualFlightAdded'));
    });
  }

  private buildAvailableMonths(): MonthOption[] {
    const months: MonthOption[] = [];
    const now = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      months.push({ value, label });
    }
    return months;
  }
}
