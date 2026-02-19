import { Component, signal, inject } from '@angular/core';
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
import { NotificationService } from '../../../core/services/notification.service';
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

@Component({
  selector: 'app-wizard-car-step',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule],
  template: `
    <div class="wizard-step">
      <div class="step-header">
        <h2>Aluguel de carro</h2>
        <p>Encontre o carro ideal para se locomover no destino</p>
      </div>

      @if (selectedCars().length > 0) {
        <div class="current-selection">
          <h3>Carros selecionados</h3>
          @for (car of selectedCars(); track car.id) {
            <mat-card class="selected-card">
              <mat-card-content>
                <div class="selected-info">
                  <mat-icon>directions_car</mat-icon>
                  <div class="selected-details">
                    <strong>{{ car.vehicleType }}</strong>
                    <span>{{ car.pickUpLocation }} &middot; {{ car.pickUpAt.split('T')[0] }} a {{ car.dropOffAt.split('T')[0] }}</span>
                  </div>
                  <span class="selected-price">{{ car.price.currency }} {{ car.price.total | number:'1.2-2' }}</span>
                  <button mat-icon-button color="warn" (click)="remove(car.id)">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              </mat-card-content>
            </mat-card>
          }
        </div>
      }

      <mat-card class="search-form-card">
        <mat-card-content>
          <form [formGroup]="searchForm" (ngSubmit)="search()">
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Local de retirada</mat-label>
                <input matInput [formControl]="pickupControl"
                       [matAutocomplete]="autoPickup">
                <mat-icon matPrefix>location_on</mat-icon>
                <mat-autocomplete #autoPickup="matAutocomplete" [displayWith]="displayLocation">
                  @for (option of filteredPickup$ | async; track option.cityId) {
                    <mat-option [value]="option">{{ option.label || option.name }}</mat-option>
                  }
                </mat-autocomplete>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Local de devolução</mat-label>
                <input matInput [formControl]="dropoffControl"
                       [matAutocomplete]="autoDropoff">
                <mat-icon matPrefix>location_on</mat-icon>
                <mat-autocomplete #autoDropoff="matAutocomplete" [displayWith]="displayLocation">
                  @for (option of filteredDropoff$ | async; track option.cityId) {
                    <mat-option [value]="option">{{ option.label || option.name }}</mat-option>
                  }
                </mat-autocomplete>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Data retirada</mat-label>
                <input matInput [matDatepicker]="dpPickup" formControlName="pickupDate" [min]="minDate">
                <mat-datepicker-toggle matSuffix [for]="dpPickup"></mat-datepicker-toggle>
                <mat-datepicker #dpPickup></mat-datepicker>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Hora retirada</mat-label>
                <input matInput type="time" formControlName="pickupTime">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Data devolução</mat-label>
                <input matInput [matDatepicker]="dpDropoff" formControlName="dropoffDate" [min]="minDropoff">
                <mat-datepicker-toggle matSuffix [for]="dpDropoff"></mat-datepicker-toggle>
                <mat-datepicker #dpDropoff></mat-datepicker>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Hora devolução</mat-label>
                <input matInput type="time" formControlName="dropoffTime">
              </mat-form-field>
            </div>

            <button mat-flat-button color="primary" type="submit"
                    [disabled]="searchForm.invalid || isSearching()">
              @if (isSearching()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                <mat-icon>search</mat-icon>
                Buscar carros
              }
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      @if (isSearching()) {
        <div class="loading-state">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Buscando carros...</p>
        </div>
      }

      @if (!isSearching() && hasSearched() && results().length === 0) {
        <div class="empty-results">
          <mat-icon>search_off</mat-icon>
          <p>Nenhum carro encontrado. Tente ajustar as datas ou local.</p>
        </div>
      }

      @if (results().length > 0) {
        <div class="results-grid">
          <h3>{{ results().length }} carros encontrados</h3>
          <div class="car-grid">
            @for (car of results(); track car.id) {
              <mat-card class="car-card" [class.added]="isAdded(car.id)">
                @if (car.images.length > 0) {
                  <img [src]="car.images[0]" class="car-photo" alt="">
                }
                <mat-card-content>
                  <h4>{{ car.vehicleType }}</h4>
                  <p class="car-location">{{ car.pickUpLocation }}</p>
                  <div class="car-price">
                    <span class="price-value">{{ car.price.currency }} {{ car.price.total | number:'1.2-2' }}</span>
                    <span class="price-label">/total</span>
                  </div>
                  @if (isAdded(car.id)) {
                    <button mat-stroked-button color="warn" class="full-width" (click)="remove(car.id)">
                      <mat-icon>check</mat-icon> Adicionado
                    </button>
                  } @else {
                    <button mat-flat-button color="primary" class="full-width" (click)="select(car)">
                      Selecionar
                    </button>
                  }
                </mat-card-content>
              </mat-card>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .wizard-step { display: flex; flex-direction: column; gap: var(--triply-spacing-md); }
    .step-header h2 { margin: 0 0 4px; font-size: 1.3rem; font-weight: 700; color: #0D0B30; }
    .step-header p { margin: 0; font-size: 0.9rem; color: var(--mat-sys-on-surface-variant); }

    .current-selection { display: flex; flex-direction: column; gap: 8px; }
    .current-selection h3 { margin: 0; font-size: 0.95rem; font-weight: 600; color: #0D0B30; }
    .selected-card { border-left: 3px solid #10b981 !important; }
    .selected-info { display: flex; align-items: center; gap: 12px; }
    .selected-info mat-icon { color: #10b981; }
    .selected-details { flex: 1; display: flex; flex-direction: column; }
    .selected-details strong { font-size: 0.9rem; color: #0D0B30; }
    .selected-details span { font-size: 0.8rem; color: var(--mat-sys-on-surface-variant); }
    .selected-price { font-weight: 700; color: #7C4DFF; font-size: 0.95rem; }

    .search-form-card { margin-top: 8px; }
    .form-row { display: flex; gap: var(--triply-spacing-md); margin-bottom: var(--triply-spacing-sm); }
    .form-row mat-form-field { flex: 1; }
    form button[type="submit"] { width: 100%; height: 44px; }

    .loading-state, .empty-results { text-align: center; padding: var(--triply-spacing-xl); }
    .loading-state p, .empty-results p { margin-top: 12px; color: var(--mat-sys-on-surface-variant); }
    .empty-results mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--mat-sys-on-surface-variant); opacity: 0.5; }

    .results-grid h3 { margin: 0 0 var(--triply-spacing-md); font-size: 0.95rem; font-weight: 600; color: #0D0B30; }
    .car-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: var(--triply-spacing-md); }
    .car-card { overflow: hidden; transition: all 0.2s ease; }
    .car-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .car-card.added { border: 2px solid #10b981 !important; opacity: 0.7; }
    .car-photo { width: 100%; height: 140px; object-fit: cover; }
    .car-card h4 { margin: 8px 0 4px; font-size: 0.95rem; font-weight: 700; color: #0D0B30; }
    .car-location { font-size: 0.8rem; color: var(--mat-sys-on-surface-variant); margin: 0 0 8px; }
    .car-price { margin-bottom: 12px; }
    .price-value { font-size: 1.1rem; font-weight: 700; color: #7C4DFF; }
    .price-label { font-size: 0.8rem; color: var(--mat-sys-on-surface-variant); }
    .full-width { width: 100%; }

    @media (max-width: 600px) {
      .form-row { flex-direction: column; gap: 0; }
      .car-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class WizardCarStepComponent {
  private readonly api = inject(CarApiService);
  private readonly tripState = inject(TripStateService);
  private readonly notify = inject(NotificationService);

  readonly selectedCars = this.tripState.carRentals;
  readonly results = signal<CarRental[]>([]);
  readonly isSearching = signal(false);
  readonly hasSearched = signal(false);
  readonly minDate = new Date();

  get minDropoff(): Date {
    return this.searchForm.value.pickupDate || new Date();
  }

  pickupControl = new FormControl<CarLocationOption | null>(null, [
    Validators.required,
    this.locationValidator(),
  ]);
  dropoffControl = new FormControl<CarLocationOption | null>(null, [
    Validators.required,
    this.locationValidator(),
  ]);

  searchForm = new FormGroup({
    pickup: this.pickupControl,
    dropoff: this.dropoffControl,
    pickupDate: new FormControl<Date | null>(null, Validators.required),
    pickupTime: new FormControl('10:00', Validators.required),
    dropoffDate: new FormControl<Date | null>(null, Validators.required),
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

  displayLocation(loc: CarLocationOption | null): string {
    return loc ? loc.label || loc.name : '';
  }

  isAdded(id: string): boolean {
    return this.selectedCars().some((c) => c.id === id);
  }

  search(): void {
    if (this.searchForm.invalid) return;
    const pickup = this.searchForm.value.pickup as CarLocationOption;
    const dropoff = this.searchForm.value.dropoff as CarLocationOption;
    const pickupDate = this.searchForm.value.pickupDate;
    const dropoffDate = this.searchForm.value.dropoffDate;
    if (!pickup || !dropoff || !pickupDate || !dropoffDate) return;

    this.isSearching.set(true);
    this.hasSearched.set(true);

    const fmt = (d: Date) => {
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${m}/${dd}/${d.getFullYear()}`;
    };

    this.api.searchCars({
      pickupLocationName: pickup.label || pickup.name,
      dropoffLocationName: dropoff.label || dropoff.name,
      pickupCityId: pickup.cityId,
      dropoffCityId: dropoff.cityId,
      pickupDate: fmt(pickupDate),
      pickupTime: this.searchForm.value.pickupTime ?? '10:00',
      dropoffDate: fmt(dropoffDate),
      dropoffTime: this.searchForm.value.dropoffTime ?? '10:00',
      driverAge: 30,
    }).pipe(finalize(() => this.isSearching.set(false)))
      .subscribe({
        next: (result) => {
          this.results.set(result.data);
        },
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
      durationMinutes: null,
      label: `Carro: ${car.vehicleType}`,
      notes: `Retirada: ${car.pickUpLocation}`,
      order: 0,
    });
    this.notify.success('Carro adicionado!');
  }

  remove(id: string): void {
    this.tripState.removeCarRental(id);
    this.tripState.removeItineraryItem(
      this.tripState.itineraryItems().find((i) => i.refId === id)?.id ?? ''
    );
  }
}
