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
  template: `
    <div class="wizard-step">
      <div class="step-header">
        <h2>Aluguel de carro</h2>
        <p>Encontre o carro ideal para se locomover no destino</p>
      </div>

      <!-- Manual entry -->
      <div class="manual-entry-section">
        <button mat-stroked-button (click)="openManualCarDialog()">
          <mat-icon>edit_note</mat-icon>
          Adicionar carro manualmente
        </button>
        <span class="manual-hint">Ja tem uma reserva? Insira os dados do aluguel.</span>
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
                  @if (car.source === 'manual') {
                    <button mat-icon-button (click)="openManualCarDialog(car); $event.stopPropagation()">
                      <mat-icon>edit</mat-icon>
                    </button>
                  }
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
            </div>

            <div class="same-location-row">
              <mat-checkbox [checked]="sameDropOff()" (change)="toggleSameDropOff($event.checked)">
                Devolver no mesmo local
              </mat-checkbox>
            </div>

            @if (!sameDropOff()) {
              <div class="form-row dropoff-field">
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
            }

            <div class="form-row" formGroupName="dateRange">
              <mat-form-field appearance="outline">
                <mat-label>Retirada — Devolução</mat-label>
                <mat-date-range-input [rangePicker]="rangePicker" [min]="minDate" (click)="rangePicker.open()">
                  <input matStartDate formControlName="start" placeholder="Retirada">
                  <input matEndDate formControlName="end" placeholder="Devolução">
                </mat-date-range-input>
                <mat-datepicker-toggle matIconSuffix [for]="rangePicker"></mat-datepicker-toggle>
                <mat-date-range-picker #rangePicker></mat-date-range-picker>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Hora retirada</mat-label>
                <input matInput type="time" formControlName="pickupTime">
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
        <div class="results-list">
          <h3>{{ results().length }} carros encontrados</h3>
          @for (car of results(); track car.id) {
            <app-list-item-base
              [config]="toListItem(car)"
              (primaryClick)="selectById($event)"
              (secondaryClick)="openDetailById($event)"
              (cardClick)="openDetailById($event)"
            />
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .wizard-step { display: flex; flex-direction: column; gap: var(--triply-spacing-md); }
    .step-header h2 { margin: 0 0 4px; font-size: 1.3rem; font-weight: 700; color: var(--triply-text-primary); letter-spacing: -0.02em; }
    .step-header p { margin: 0; font-size: 0.9rem; color: var(--triply-text-secondary); }

    .current-selection { display: flex; flex-direction: column; gap: 8px; }
    .current-selection h3 { margin: 0; font-size: 0.95rem; font-weight: 600; color: var(--triply-text-primary); }
    .selected-card { border-left: 3px solid var(--triply-success) !important; }
    .selected-info { display: flex; align-items: center; gap: 12px; }
    .selected-info mat-icon { color: var(--triply-success); }
    .selected-details { flex: 1; display: flex; flex-direction: column; }
    .selected-details strong { font-size: 0.9rem; color: var(--triply-text-primary); }
    .selected-details span { font-size: 0.8rem; color: var(--triply-text-secondary); }
    .selected-price { font-weight: 700; color: var(--triply-primary); font-size: 0.95rem; }

    .manual-entry-section {
      display: flex;
      align-items: center;
      gap: 12px;

      button mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        margin-right: 4px;
      }
    }

    .manual-hint {
      font-size: 0.8rem;
      color: var(--triply-text-secondary);
    }

    .search-form-card { margin-top: 8px; }
    .form-row { display: flex; flex-direction: column; gap: 0; margin-bottom: var(--triply-spacing-sm); }
    .form-row mat-form-field { flex: 1; }
    .same-location-row { margin-bottom: var(--triply-spacing-md); margin-top: -8px; }
    .dropoff-field { animation: slideDown 0.2s ease-out; }
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    form button[type="submit"] { width: 100%; height: 44px; }

    .loading-state, .empty-results { text-align: center; padding: var(--triply-spacing-xl); }
    .loading-state p, .empty-results p { margin-top: 12px; color: var(--triply-text-secondary); }
    .empty-results mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--triply-text-secondary); opacity: 0.5; }

    .results-list { display: flex; flex-direction: column; gap: var(--triply-spacing-sm); }
    .results-list h3 { margin: 0 0 var(--triply-spacing-sm); font-size: 0.95rem; font-weight: 600; color: var(--triply-text-primary); }

    @media (min-width: 600px) {
      .form-row { flex-direction: row; gap: var(--triply-spacing-md); }
    }
  `],
})
export class WizardCarStepComponent {
  private readonly api = inject(CarApiService);
  private readonly tripState = inject(TripStateService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  readonly selectedCars = this.tripState.carRentals;
  readonly results = signal<CarRental[]>([]);
  readonly isSearching = signal(false);
  readonly hasSearched = signal(false);
  readonly sameDropOff = signal(true);
  readonly minDate = new Date();

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
      durationMinutes: null,
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
          durationMinutes: null,
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
