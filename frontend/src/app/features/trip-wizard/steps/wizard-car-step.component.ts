import { Component, signal, computed, inject, OnInit } from '@angular/core';
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
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from '../../../core/services/notification.service';
import { ItemDetailDialogComponent, ItemDetailData, ItemDetailResult } from '../../../shared/components/item-detail-dialog/item-detail-dialog.component';
import { Observable } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  switchMap,
  finalize,
} from 'rxjs/operators';
import { MATERIAL_IMPORTS } from '../../../core/material.exports';
import { CarApiService, CarLocationOption } from '../../../core/api/car-api.service';
import { TripStateService } from '../../../core/services/trip-state.service';
import { CarRental } from '../../../core/models/trip.models';
import { ListItemBaseComponent } from '../../../shared/components/list-item-base/list-item-base.component';
import { carToListItem } from '../../../shared/components/list-item-base/list-item-mappers';
import {
  ManualCarDialogComponent,
  ManualCarDialogData,
  ManualCarDialogResult,
} from '../../../shared/components/manual-car-dialog/manual-car-dialog.component';

@Component({
  selector: 'app-wizard-car-step',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule, ListItemBaseComponent],
  templateUrl: './wizard-car-step.component.html',
  styleUrl: './wizard-car-step.component.scss',
})
export class WizardCarStepComponent implements OnInit {
  private readonly api = inject(CarApiService);
  private readonly tripState = inject(TripStateService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  readonly selectedCars = this.tripState.carRentals;
  readonly results = signal<CarRental[]>([]);

  // Trip context for header
  readonly tripDestination = computed(() => this.tripState.trip().destination || '');
  readonly tripDates = computed(() => {
    const t = this.tripState.trip();
    if (!t.dates.start) return '';
    const fmt = (d: string) => {
      const date = new Date(d + 'T00:00:00');
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    };
    return `${fmt(t.dates.start)} a ${fmt(t.dates.end || t.dates.start)}`;
  });
  readonly isSearching = signal(false);
  readonly hasSearched = signal(false);
  readonly formCollapsed = signal(false);
  readonly sameDropOff = signal(true);
  readonly currentSort = signal<string>('price');
  readonly minDate = new Date();

  private readonly IATA_TO_CITY: Record<string, string> = {
    POA: 'Porto Alegre', GRU: 'São Paulo', GIG: 'Rio de Janeiro',
    CNF: 'Belo Horizonte', BSB: 'Brasília', SSA: 'Salvador',
    REC: 'Recife', CWB: 'Curitiba', FLN: 'Florianópolis',
    FOR: 'Fortaleza', VCP: 'Campinas', SDU: 'Rio de Janeiro',
    CGH: 'São Paulo', MAO: 'Manaus', BEL: 'Belém',
    NAT: 'Natal', MCZ: 'Maceió', AJU: 'Aracaju',
    VIX: 'Vitória', JOI: 'Joinville', IGU: 'Foz do Iguaçu',
    LIS: 'Lisboa', CDG: 'Paris', FCO: 'Roma', MAD: 'Madrid',
    MIA: 'Miami', JFK: 'New York', LAX: 'Los Angeles', MCO: 'Orlando',
    EZE: 'Buenos Aires', SCL: 'Santiago', BOG: 'Bogotá', LIM: 'Lima',
  };

  constructor() {
    const trip = this.tripState.trip();
    const dates = trip.dates;

    // Auto-fill dates from trip
    if (dates.start && dates.end) {
      this.searchForm.get('dateRange')!.patchValue({
        start: new Date(dates.start + 'T00:00:00'),
        end: new Date(dates.end + 'T00:00:00'),
      });
    }
  }

  ngOnInit(): void {
    if (this.hasSearched()) return;

    const trip = this.tripState.trip();
    const searchTerms: string[] = [];

    // 1. Best bet: city name from flight destination IATA
    const flights = this.tripState.flights();
    const destFlight = flights.find(f => f.destination);
    if (destFlight?.destination) {
      const cityName = this.IATA_TO_CITY[destFlight.destination];
      if (cityName) searchTerms.push(cityName);
    }

    // 2. Trip destination itself
    if (trip.destination) searchTerms.push(trip.destination);

    // 3. IATA code raw
    if (destFlight?.destination && !this.IATA_TO_CITY[destFlight.destination]) {
      searchTerms.push(destFlight.destination);
    }

    console.log('[CarStep] Auto-fill search terms:', searchTerms, 'flights:', flights.length);

    if (searchTerms.length > 0) {
      this.tryFallbackLocations(searchTerms, 0);
    }
  }

  get minDropoff(): Date {
    return this.searchForm.value.dateRange?.start || new Date();
  }

  pickupControl = new FormControl<CarLocationOption | null>(null, [
    Validators.required,
    this.locationValidator(),
  ]);
  dropoffControl = new FormControl<CarLocationOption | null>(null);

  searchForm = new FormGroup({
    pickup: this.pickupControl,
    dropoff: this.dropoffControl,
    dateRange: new FormGroup({
      start: new FormControl<Date | null>(null, Validators.required),
      end: new FormControl<Date | null>(null, Validators.required),
    }),
    pickupTime: new FormControl('10:00', Validators.required),
    dropoffTime: new FormControl('10:00', Validators.required),
  });

  filteredPickup$: Observable<CarLocationOption[]> = this.pickupControl.valueChanges.pipe(
    debounceTime(300), distinctUntilChanged(),
    filter((v) => typeof v === 'string' && (v as string).length >= 2),
    switchMap((keyword) => this.api.searchLocations(keyword as string)),
  );

  filteredDropoff$: Observable<CarLocationOption[]> = this.dropoffControl.valueChanges.pipe(
    debounceTime(300), distinctUntilChanged(),
    filter((v) => typeof v === 'string' && (v as string).length >= 2),
    switchMap((keyword) => this.api.searchLocations(keyword as string)),
  );

  private locationValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      if (typeof control.value === 'string' || !(control.value as CarLocationOption).cityId) {
        return { invalidLocation: true };
      }
      return null;
    };
  }

  toggleSameDropOff(checked: boolean): void {
    this.sameDropOff.set(checked);
    if (checked) {
      this.dropoffControl.setValue(this.pickupControl.value);
      this.dropoffControl.clearValidators();
    } else {
      this.dropoffControl.setValidators([Validators.required, this.locationValidator()]);
    }
    this.dropoffControl.updateValueAndValidity();
  }

  displayLocation(loc: CarLocationOption | null): string {
    return loc ? loc.label || loc.name : '';
  }

  isAdded(id: string): boolean {
    return this.selectedCars().some((c) => c.id === id);
  }

  toListItem(car: CarRental) {
    return carToListItem(car, { isAdded: this.isAdded(car.id) });
  }

  selectById(id: string): void {
    const car = this.results().find(c => c.id === id);
    if (car) this.select(car);
  }

  openDetailById(id: string): void {
    const car = this.results().find(c => c.id === id) ?? this.selectedCars().find(c => c.id === id);
    if (car) this.openDetail(car);
  }

  private tryFallbackLocations(terms: string[], index: number): void {
    if (index >= terms.length) {
      console.log('[CarStep] All fallbacks exhausted, no location found');
      return;
    }
    const term = terms[index];
    console.log(`[CarStep] Trying location search: "${term}" (${index + 1}/${terms.length})`);
    this.api.searchLocations(term).subscribe({
      next: (results) => {
        console.log(`[CarStep] "${term}" returned ${results.length} results`);
        if (results.length > 0) {
          this.pickupControl.setValue(results[0]);
          setTimeout(() => {
            if (this.searchForm.valid) this.search();
          }, 300);
        } else {
          this.tryFallbackLocations(terms, index + 1);
        }
      },
      error: (err) => {
        console.error(`[CarStep] "${term}" error:`, err);
        this.tryFallbackLocations(terms, index + 1);
      },
    });
  }

  private lastSearchParams: import('../../../core/api/car.mapper').CarSearchParams | null = null;

  onSortChange(sortBy: string): void {
    this.currentSort.set(sortBy);
    if (this.lastSearchParams) {
      this.lastSearchParams.sortBy = sortBy;
      this.isSearching.set(true);
      this.api.searchCars(this.lastSearchParams)
        .pipe(finalize(() => this.isSearching.set(false)))
        .subscribe({
          next: (result) => this.results.set(result.data),
        });
    }
  }

  search(): void {
    if (this.searchForm.invalid) return;
    const pickup = this.searchForm.value.pickup as CarLocationOption;
    if (this.sameDropOff()) {
      this.dropoffControl.setValue(this.pickupControl.value);
    }
    const dropoff = this.sameDropOff() ? pickup : (this.searchForm.value.dropoff as CarLocationOption);
    const pickupDate = this.searchForm.value.dateRange?.start;
    const dropoffDate = this.searchForm.value.dateRange?.end;
    if (!pickup || !dropoff || !pickupDate || !dropoffDate) return;

    this.isSearching.set(true);
    this.hasSearched.set(true);
    this.formCollapsed.set(true);

    const fmt = (d: Date) => {
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${m}/${dd}/${d.getFullYear()}`;
    };

    this.lastSearchParams = {
      pickupLocationName: pickup.label || pickup.name,
      dropoffLocationName: dropoff.label || dropoff.name,
      pickupCityId: pickup.cityId,
      dropoffCityId: dropoff.cityId,
      pickupDate: fmt(pickupDate),
      pickupTime: this.searchForm.value.pickupTime ?? '10:00',
      dropoffDate: fmt(dropoffDate),
      dropoffTime: this.searchForm.value.dropoffTime ?? '10:00',
      driverAge: 30,
      currency: this.tripState.trip().currency || 'BRL',
      sortBy: this.currentSort(),
    };
    this.api.searchCars(this.lastSearchParams).pipe(finalize(() => this.isSearching.set(false)))
      .subscribe({
        next: (result) => {
          this.results.set(result.data);
        },
      });
  }

  openDetail(car: CarRental): void {
    const ref = this.dialog.open(ItemDetailDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { type: 'car-rental', item: car, isAdded: this.isAdded(car.id) } as ItemDetailData,
    });
    ref.afterClosed().subscribe((result: ItemDetailResult) => {
      if (!result) return;
      if (result.action === 'add') this.select(car);
      else if (result.action === 'remove') this.remove(car.id);
    });
  }

  select(car: CarRental): void {
    this.tripState.addCarRental(car);
    this.tripState.addItineraryItem({
      id: crypto.randomUUID(),
      type: 'car-rental',
      refId: car.id,
      date: car.pickUpAt.split('T')[0],
      timeSlot: car.pickUpAt.split('T')[1]?.substring(0, 5) || null,
      durationMinutes: 30,
      label: `Carro: ${car.vehicleType}`,
      notes: `Retirada: ${car.pickUpLocation}`,
      order: 0,
      isPaid: false,
      attachment: null,
    });
    this.notify.success('Carro adicionado!');
  }

  openManualCarDialog(existingCar?: CarRental): void {
    const ref = this.dialog.open(ManualCarDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: {
        car: existingCar ?? null,
        tripCurrency: this.tripState.trip().currency,
      } as ManualCarDialogData,
    });
    ref.afterClosed().subscribe((result: ManualCarDialogResult | undefined) => {
      if (!result || result.action !== 'save') return;

      if (existingCar) {
        this.tripState.updateCarRental(result.car);
        const itinItem = this.tripState.itineraryItems().find(i => i.refId === existingCar.id);
        if (itinItem) {
          this.tripState.updateItineraryItem({
            ...itinItem,
            date: result.car.pickUpAt.split('T')[0],
            timeSlot: result.car.pickUpAt.split('T')[1]?.substring(0, 5) || null,
            label: `Carro: ${result.car.vehicleType}`,
            notes: `Retirada: ${result.car.pickUpLocation}`,
            isPaid: result.isPaid,
          });
        }
        this.notify.success('Carro atualizado!');
      } else {
        this.tripState.addCarRental(result.car);
        this.tripState.addItineraryItem({
          id: crypto.randomUUID(),
          type: 'car-rental',
          refId: result.car.id,
          date: result.car.pickUpAt.split('T')[0],
          timeSlot: result.car.pickUpAt.split('T')[1]?.substring(0, 5) || null,
          durationMinutes: 30,
          label: `Carro: ${result.car.vehicleType}`,
          notes: `Retirada: ${result.car.pickUpLocation}`,
          order: 0,
          isPaid: result.isPaid,
          attachment: null,
        });
        this.notify.success('Carro manual adicionado!');
      }
    });
  }

  remove(id: string): void {
    this.tripState.removeCarRental(id);
    this.tripState.removeItineraryItem(
      this.tripState.itineraryItems().find((i) => i.refId === id)?.id ?? ''
    );
  }
}
