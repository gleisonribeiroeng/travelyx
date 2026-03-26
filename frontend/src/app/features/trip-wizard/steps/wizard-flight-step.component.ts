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
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from '../../../core/services/notification.service';
import { ItemDetailDialogComponent, ItemDetailData, ItemDetailResult } from '../../../shared/components/item-detail-dialog/item-detail-dialog.component';
import { Observable, of, forkJoin, Subscription } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  switchMap,
  finalize,
  map,
} from 'rxjs/operators';
import { MATERIAL_IMPORTS } from '../../../core/material.exports';
import {
  FlightApiService,
  AirportOption,
} from '../../../core/api/flight-api.service';
import { TripStateService } from '../../../core/services/trip-state.service';
import { PriceAlertApiService, CreatePriceAlertDto } from '../../../core/api/price-alert-api.service';
import { PlanService } from '../../../core/services/plan.service';
import { Flight } from '../../../core/models/trip.models';
import {
  categorizeFlights,
  CategorizedFlights,
} from '../../../core/utils/flight-categorizer.util';
import { ListItemBaseComponent } from '../../../shared/components/list-item-base/list-item-base.component';
import { flightToListItem, FlightTagType } from '../../../shared/components/list-item-base/list-item-mappers';
import {
  ManualFlightDialogComponent,
  ManualFlightDialogData,
  ManualFlightDialogResult,
} from '../../../shared/components/manual-flight-dialog/manual-flight-dialog.component';

type TripType = 'roundTrip' | 'oneWay' | 'multi';

interface MonthOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-wizard-flight-step',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule, ListItemBaseComponent],
  templateUrl: './wizard-flight-step.component.html',
  styleUrl: './wizard-flight-step.component.scss',
})
export class WizardFlightStepComponent {
  private readonly api = inject(FlightApiService);
  private readonly tripState = inject(TripStateService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly priceAlertApi = inject(PriceAlertApiService);
  private readonly planService = inject(PlanService);

  readonly selectedFlights = this.tripState.flights;
  readonly results = signal<Flight[]>([]);
  readonly isSearching = signal(false);
  readonly hasSearched = signal(false);
  readonly formCollapsed = signal(false);
  readonly minDate = new Date();

  // Trip context for header
  readonly tripDestination = computed(() => this.tripState.trip().destination || '');
  readonly hasTripDates = computed(() => !!this.tripState.trip().dates.start);
  readonly tripDates = computed(() => {
    const t = this.tripState.trip();
    if (!t.dates.start) return '';
    const fmt = (d: string) => {
      const date = new Date(d + 'T00:00:00');
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    };
    return `${fmt(t.dates.start)} a ${fmt(t.dates.end || t.dates.start)}`;
  });

  readonly tripType = signal<TripType>('roundTrip');
  readonly flexibleDates = signal(false);
  readonly selectedMonths = signal<string[]>([]);

  // Segment tracking for round-trip flights
  readonly currentSegment = signal<'outbound' | 'return'>('outbound');
  readonly outboundFlightId = signal<string | null>(null);
  readonly returnFlightId = signal<string | null>(null);

  readonly segmentLabel = computed(() =>
    this.currentSegment() === 'outbound' ? 'Voo de IDA' : 'Voo de VOLTA'
  );
  readonly isRoundTrip = computed(() => this.tripType() === 'roundTrip');
  readonly hasOutbound = computed(() => this.outboundFlightId() !== null);
  readonly hasReturn = computed(() => this.returnFlightId() !== null);

  readonly categorized = computed((): CategorizedFlights<Flight> => categorizeFlights(this.results()));
  readonly sortedResults = computed(() => {
    const cat = this.categorized();
    const all = cat.all;
    if (!cat.bestValue) return all;
    return [cat.bestValue, ...all.filter(f => f.id !== cat.bestValue!.id)];
  });

  readonly availableMonths: MonthOption[] = this.buildAvailableMonths();

  // ── Multi-city state ──
  readonly MIN_SEGMENTS = 2;
  readonly MAX_SEGMENTS = 6;
  segmentsArray = new FormArray<FormGroup>([]);
  segmentOriginStreams = signal<Observable<AirportOption[]>[]>([]);
  segmentDestinationStreams = signal<Observable<AirportOption[]>[]>([]);
  multiCityResults = signal<Flight[][]>([]);
  private smartFillSubs: Subscription[] = [];

  multiCityHasResults = computed(() => this.multiCityResults().some(s => s.length > 0));

  originControl = new FormControl<AirportOption | null>(null, [
    Validators.required,
    this.airportValidator(),
  ]);
  destinationControl = new FormControl<AirportOption | null>(null, [
    Validators.required,
    this.airportValidator(),
  ]);

  searchForm = new FormGroup({
    origin: this.originControl,
    destination: this.destinationControl,
    dateRange: new FormGroup({
      start: new FormControl<Date | null>(null),
      end: new FormControl<Date | null>(null),
    }),
    passengers: new FormControl(1, [Validators.required, Validators.min(1), Validators.max(9)]),
  });

  filteredOrigins$: Observable<AirportOption[]> = this.originControl.valueChanges.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    filter((v) => typeof v === 'string' && (v as string).length >= 2),
    switchMap((keyword) => this.api.searchAirports(keyword as string)),
  );

  filteredDestinations$: Observable<AirportOption[]> = this.destinationControl.valueChanges.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    filter((v) => typeof v === 'string' && (v as string).length >= 2),
    switchMap((keyword) => this.api.searchAirports(keyword as string)),
  );

  constructor() {
    // Pre-fill dates from trip
    const trip = this.tripState.trip();
    const dates = trip.dates;
    if (dates.start && dates.end) {
      this.searchForm.get('dateRange')!.patchValue({
        start: new Date(dates.start + 'T00:00:00'),
        end: new Date(dates.end + 'T00:00:00'),
      });
    }

    // Auto-fill destination from trip (no auto-search — origin is still needed)
    if (trip.destination && !this.destinationControl.value) {
      this.api.searchAirports(trip.destination).subscribe({
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

  private createSegmentGroup(): FormGroup {
    return new FormGroup({
      origin: new FormControl<AirportOption | null>(null, [Validators.required, this.airportValidator()]),
      destination: new FormControl<AirportOption | null>(null, [Validators.required, this.airportValidator()]),
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
      originStreams.push(originCtrl.valueChanges.pipe(
        debounceTime(300), distinctUntilChanged(),
        filter((v) => typeof v === 'string' && (v as string).length >= 2),
        switchMap((keyword) => this.api.searchAirports(keyword as string))
      ));
      destStreams.push(destCtrl.valueChanges.pipe(
        debounceTime(300), distinctUntilChanged(),
        filter((v) => typeof v === 'string' && (v as string).length >= 2),
        switchMap((keyword) => this.api.searchAirports(keyword as string))
      ));
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

  getSegmentControl(index: number, field: string): FormControl {
    return this.segmentsArray.at(index).get(field) as FormControl;
  }

  private canSearchMulti(): boolean {
    const passengersValid = this.searchForm.get('passengers')?.valid ?? false;
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

  private searchMultiCity(): void {
    const passengers = this.searchForm.value.passengers ?? 1;
    this.isSearching.set(true);
    this.hasSearched.set(true);
    this.formCollapsed.set(true);
    this.results.set([]);
    this.multiCityResults.set([]);
    const segmentSearches = [];
    for (let i = 0; i < this.segmentsArray.length; i++) {
      const group = this.segmentsArray.at(i);
      const origin = group.get('origin')?.value as AirportOption;
      const dest = group.get('destination')?.value as AirportOption;
      const date = group.get('date')?.value as Date;
      segmentSearches.push(
        this.api.searchFlights({
          origin: origin.iataCode,
          destination: dest.iataCode,
          fromId: origin.id || `${origin.iataCode}.AIRPORT`,
          toId: dest.id || `${dest.iataCode}.AIRPORT`,
          departureDate: date.toISOString().split('T')[0],
          adults: passengers,
          sort: 'price_asc',
        })
      );
    }
    forkJoin(segmentSearches)
      .pipe(finalize(() => this.isSearching.set(false)))
      .subscribe({
        next: (results) => {
          this.multiCityResults.set(results.map(r => r.data ?? []));
        },
      });
  }

  addSegmentFlight(flight: Flight, segmentIndex: number): void {
    this.tripState.addFlight(flight);
    this.tripState.addItineraryItem({
      id: crypto.randomUUID(),
      type: 'flight',
      refId: flight.id,
      date: flight.departureAt.split('T')[0],
      timeSlot: flight.departureAt.split('T')[1]?.substring(0, 5) || null,
      durationMinutes: flight.durationMinutes,
      label: `Voo Trecho ${segmentIndex + 1}: ${flight.origin} \u2192 ${flight.destination}`,
      notes: `${flight.airline} ${flight.flightNumber}`,
      order: segmentIndex,
      isPaid: false,
      attachment: null,
    });
    this.notify.success(`Trecho ${segmentIndex + 1} adicionado!`);
  }

  selectSegmentById(id: string, segmentIndex: number): void {
    const flight = this.multiCityResults()[segmentIndex]?.find(f => f.id === id);
    if (flight) this.addSegmentFlight(flight, segmentIndex);
  }

  toListItemForSegment(flight: Flight, segmentIndex: number) {
    return flightToListItem(flight, { isAdded: this.isAdded(flight.id), tag: null });
  }

  private airportValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      if (typeof control.value === 'string' || !(control.value as AirportOption).iataCode) {
        return { invalidAirport: true };
      }
      return null;
    };
  }

  displayAirport(airport: AirportOption | null): string {
    if (!airport) return '';
    if (airport.iataCode) {
      return `${airport.cityName} (${airport.iataCode})`;
    }
    return airport.cityName || airport.name || '';
  }

  canSearch(): boolean {
    if (this.tripType() === 'multi') return this.canSearchMulti();
    const hasAirports = this.originControl.valid && this.destinationControl.valid;
    const passengersValid = this.searchForm.get('passengers')?.valid ?? false;
    if (this.flexibleDates()) {
      return hasAirports && passengersValid && this.selectedMonths().length > 0;
    }
    return hasAirports && passengersValid && !!this.searchForm.get('dateRange')?.get('start')?.value;
  }

  isAdded(id: string): boolean {
    return this.selectedFlights().some((f) => f.id === id);
  }

  getFlightTag(flight: Flight): FlightTagType | null {
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

  selectById(id: string): void {
    const flight = this.results().find(f => f.id === id);
    if (flight) this.select(flight);
  }

  openDetailById(id: string): void {
    const flight = this.results().find(f => f.id === id) ?? this.selectedFlights().find(f => f.id === id);
    if (flight) this.openDetail(flight);
  }

  onIconAction(event: { itemId: string; actionId: string }): void {
    if (event.actionId !== 'price-alert') return;

    if (!this.planService.hasFeature('priceAlerts')) {
      this.planService.showPaywall('priceAlerts');
      return;
    }

    const flight = this.results().find(f => f.id === event.itemId);
    if (!flight) return;

    const dto: CreatePriceAlertDto = {
      type: 'flight',
      label: `${flight.origin} → ${flight.destination} (${flight.airline})`,
      searchParams: { itemId: flight.id, origin: flight.origin, destination: flight.destination },
      currentPrice: flight.price.total,
      targetPrice: Math.round(flight.price.total * 0.9),
      currency: flight.price.currency,
    };

    this.priceAlertApi.createAlert(dto).subscribe({
      next: () => this.notify.success('Alerta de preco criado!'),
      error: () => this.notify.error('Erro ao criar alerta'),
    });
  }

  isMonthSelected(value: string): boolean {
    return this.selectedMonths().includes(value);
  }

  toggleMonth(value: string): void {
    this.selectedMonths.update(months => {
      if (months.includes(value)) {
        return months.filter(m => m !== value);
      }
      return [...months, value];
    });
  }

  search(): void {
    if (!this.canSearch()) return;
    if (this.tripType() === 'multi') { this.searchMultiCity(); return; }

    const origin = this.originControl.value as AirportOption;
    const dest = this.destinationControl.value as AirportOption;
    const passengers = this.searchForm.value.passengers ?? 1;

    const effectiveOrigin = origin.iataCode;
    const effectiveDest = dest.iataCode;
    const fromId = origin.id || `${effectiveOrigin}.AIRPORT`;
    const toId = dest.id || `${effectiveDest}.AIRPORT`;

    this.isSearching.set(true);
    this.hasSearched.set(true);
    this.formCollapsed.set(true);

    if (this.flexibleDates()) {
      const searches = this.selectedMonths().map(monthStr => {
        const departureDate = `${monthStr}-01`;
        return this.api.searchFlights({
          origin: effectiveOrigin,
          destination: effectiveDest,
          fromId,
          toId,
          departureDate,
          adults: passengers,
          sort: 'price_asc',
        }).pipe(map(result => result.data));
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
            this.results.set(unique);
          },
        });
    } else {
      const departure = this.searchForm.value.dateRange?.start;
      if (!departure) return;

      const params: any = {
        origin: effectiveOrigin,
        destination: effectiveDest,
        fromId,
        toId,
        departureDate: departure.toISOString().split('T')[0],
        adults: passengers,
        sort: 'price_asc' as const,
      };

      if (this.tripType() === 'roundTrip' && this.searchForm.value.dateRange?.end) {
        params.returnDate = this.searchForm.value.dateRange.end.toISOString().split('T')[0];
      }

      this.api.searchFlights(params)
        .pipe(finalize(() => this.isSearching.set(false)))
        .subscribe({
          next: (result) => {
            this.results.set(result.data);
          },
        });
    }
  }

  openManualFlightDialog(existingFlight?: Flight): void {
    const ref = this.dialog.open(ManualFlightDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: {
        flight: existingFlight ?? null,
        tripCurrency: this.tripState.trip().currency,
      } as ManualFlightDialogData,
    });
    ref.afterClosed().subscribe((result: ManualFlightDialogResult | undefined) => {
      if (!result || result.action !== 'save') return;

      if (existingFlight) {
        // Edit mode
        this.tripState.updateFlight(result.flight);
        const itinItem = this.tripState.itineraryItems().find(i => i.refId === existingFlight.id);
        if (itinItem) {
          this.tripState.updateItineraryItem({
            ...itinItem,
            date: result.flight.departureAt.split('T')[0],
            timeSlot: result.flight.departureAt.split('T')[1]?.substring(0, 5) || null,
            label: `Voo: ${result.flight.origin} \u2192 ${result.flight.destination}`,
            notes: `${result.flight.airline} ${result.flight.flightNumber}`,
            isPaid: result.isPaid,
          });
        }
        this.notify.success('Voo atualizado!');
      } else {
        // Create mode
        this.tripState.addFlight(result.flight);
        this.tripState.addItineraryItem({
          id: crypto.randomUUID(),
          type: 'flight',
          refId: result.flight.id,
          date: result.flight.departureAt.split('T')[0],
          timeSlot: result.flight.departureAt.split('T')[1]?.substring(0, 5) || null,
          durationMinutes: result.flight.durationMinutes,
          label: `Voo: ${result.flight.origin} \u2192 ${result.flight.destination}`,
          notes: `${result.flight.airline} ${result.flight.flightNumber}`,
          order: 0,
          isPaid: result.isPaid,
          attachment: null,
        });
        this.notify.success('Voo manual adicionado!');
      }
    });
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
      if (result.action === 'add') this.select(flight);
      else if (result.action === 'remove') this.remove(flight.id);
    });
  }

  select(flight: Flight): void {
    this.tripState.addFlight(flight);

    const isReturn = this.isRoundTrip() && this.currentSegment() === 'return';
    const label = isReturn
      ? `Voo volta: ${flight.origin} \u2192 ${flight.destination}`
      : this.isRoundTrip()
        ? `Voo ida: ${flight.origin} \u2192 ${flight.destination}`
        : `Voo: ${flight.origin} \u2192 ${flight.destination}`;

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

    if (this.isRoundTrip()) {
      if (this.currentSegment() === 'outbound') {
        this.outboundFlightId.set(flight.id);
        this.notify.success('Voo de ida selecionado!');
        this.currentSegment.set('return');
        this.searchReturnFlights();
      } else {
        this.returnFlightId.set(flight.id);
        this.notify.success('Voo de volta selecionado!');
      }
    } else {
      this.notify.success('Voo adicionado!');
    }
  }

  remove(id: string): void {
    this.tripState.removeFlight(id);
    this.tripState.removeItineraryItem(
      this.tripState.itineraryItems().find((i) => i.refId === id)?.id ?? ''
    );
    if (this.outboundFlightId() === id) this.outboundFlightId.set(null);
    if (this.returnFlightId() === id) this.returnFlightId.set(null);
  }

  switchSegment(seg: 'outbound' | 'return'): void {
    if (seg === this.currentSegment()) return;
    this.currentSegment.set(seg);
    if (seg === 'outbound') {
      this.search();
    } else {
      this.searchReturnFlights();
    }
  }

  private searchReturnFlights(): void {
    const origin = this.originControl.value as AirportOption;
    const dest = this.destinationControl.value as AirportOption;
    const returnDate = this.searchForm.value.dateRange?.end;
    if (!origin || !dest || !returnDate) return;

    this.isSearching.set(true);
    this.api.searchFlights({
      origin: dest.iataCode,
      destination: origin.iataCode,
      fromId: dest.id || `${dest.iataCode}.AIRPORT`,
      toId: origin.id || `${origin.iataCode}.AIRPORT`,
      departureDate: returnDate.toISOString().split('T')[0],
      adults: this.searchForm.value.passengers ?? 1,
      sort: 'price_asc',
    }).pipe(finalize(() => this.isSearching.set(false)))
      .subscribe({ next: (result) => this.results.set(result.data) });
  }

  formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  }

  formatTime(isoDate: string): string {
    const d = new Date(isoDate);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
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
