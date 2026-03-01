import { Component, inject, signal } from '@angular/core';
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
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MATERIAL_IMPORTS } from '../../../core/material.exports';
import { CarRental } from '../../../core/models/trip.models';

// ─── Public API ──────────────────────────────────────────────────────────────

export interface ManualCarDialogData {
  car: CarRental | null;
  tripCurrency: string;
}

export interface ManualCarDialogResult {
  action: 'save';
  car: CarRental;
  isPaid: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toISODatetime(date: Date, time: string | null): string {
  const d = date.toISOString().split('T')[0];
  return time ? `${d}T${time}:00` : `${d}T00:00:00`;
}

function parseDateFromISO(iso: string): Date {
  return new Date(iso.split('T')[0] + 'T12:00:00');
}

function parseTimeFromISO(iso: string): string | null {
  const match = iso.match(/T(\d{2}:\d{2})/);
  if (!match) return null;
  return match[1] === '00:00' ? null : match[1];
}

function dropOffAfterPickUp(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const pickUp = group.get('pickUpDate')?.value;
    const dropOff = group.get('dropOffDate')?.value;
    if (!pickUp || !dropOff) return null;
    return dropOff >= pickUp ? null : { dropOffBeforePickUp: true };
  };
}

@Component({
  selector: 'app-manual-car-dialog',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule],
  template: `
    <div class="dialog-header">
      <div class="header-left">
        <mat-icon class="type-icon">directions_car</mat-icon>
        <div>
          <span class="type-label">{{ isEdit() ? 'Editar' : 'Novo' }} Carro Manual</span>
          <h2>{{ isEdit() ? 'Editar dados do carro' : 'Adicionar carro manualmente' }}</h2>
        </div>
      </div>
      <button mat-icon-button (click)="onClose()">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content>
      <form [formGroup]="form" class="manual-form">

        <!-- Vehicle details -->
        <div class="section-label">
          <mat-icon>directions_car</mat-icon>
          <span>Detalhes do veiculo</span>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Tipo de veiculo</mat-label>
            <mat-select formControlName="vehicleType">
              <mat-option value="Economy">Economy</mat-option>
              <mat-option value="Compact">Compact</mat-option>
              <mat-option value="Intermediate">Intermediate</mat-option>
              <mat-option value="Full Size">Full Size</mat-option>
              <mat-option value="SUV">SUV</mat-option>
              <mat-option value="Premium">Premium</mat-option>
              <mat-option value="Minivan">Minivan</mat-option>
            </mat-select>
            <mat-icon matPrefix>commute</mat-icon>
          </mat-form-field>
        </div>

        <!-- Locations -->
        <div class="section-label">
          <mat-icon>location_on</mat-icon>
          <span>Locais</span>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Local de retirada</mat-label>
            <input matInput formControlName="pickUpLocation">
            <mat-icon matPrefix>place</mat-icon>
          </mat-form-field>
        </div>

        <mat-checkbox [checked]="sameDropOff()" (change)="toggleSameDropOff($event.checked)" class="same-location-checkbox">
          Devolver no mesmo local
        </mat-checkbox>

        @if (!sameDropOff()) {
          <div class="form-row dropoff-field">
            <mat-form-field appearance="outline">
              <mat-label>Local de devolucao</mat-label>
              <input matInput formControlName="dropOffLocation">
              <mat-icon matPrefix>place</mat-icon>
            </mat-form-field>
          </div>
        }

        <!-- Dates & times -->
        <div class="section-label">
          <mat-icon>schedule</mat-icon>
          <span>Datas e horarios</span>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Data retirada</mat-label>
            <input matInput [matDatepicker]="dpPickUp" formControlName="pickUpDate" (focus)="dpPickUp.open()">
            <mat-datepicker-toggle matIconSuffix [for]="dpPickUp"></mat-datepicker-toggle>
            <mat-datepicker #dpPickUp></mat-datepicker>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Hora retirada</mat-label>
            <input matInput type="time" formControlName="pickUpTime">
            <mat-icon matPrefix>schedule</mat-icon>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Data devolucao</mat-label>
            <input matInput [matDatepicker]="dpDropOff" formControlName="dropOffDate" (focus)="dpDropOff.open()">
            <mat-datepicker-toggle matIconSuffix [for]="dpDropOff"></mat-datepicker-toggle>
            <mat-datepicker #dpDropOff></mat-datepicker>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Hora devolucao</mat-label>
            <input matInput type="time" formControlName="dropOffTime">
            <mat-icon matPrefix>schedule</mat-icon>
          </mat-form-field>
        </div>

        @if (form.hasError('dropOffBeforePickUp')) {
          <div class="validation-error">
            <mat-icon>warning</mat-icon>
            <span>Devolucao deve ser posterior a retirada</span>
          </div>
        }

        @if (daysCount() > 0) {
          <div class="computed-info">
            <mat-icon>timer</mat-icon>
            <span>{{ daysCount() }} dia(s) de aluguel</span>
          </div>
        }

        <!-- Price -->
        <div class="section-label">
          <mat-icon>payments</mat-icon>
          <span>Preco</span>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Valor total</mat-label>
            <input matInput type="number" formControlName="price" min="0" step="0.01">
            <mat-icon matPrefix>attach_money</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Moeda</mat-label>
            <mat-select formControlName="currency">
              <mat-option value="BRL">BRL</mat-option>
              <mat-option value="USD">USD</mat-option>
              <mat-option value="EUR">EUR</mat-option>
              <mat-option value="GBP">GBP</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <mat-checkbox formControlName="isPaid" class="paid-checkbox">
          Ja foi pago
        </mat-checkbox>

        <!-- Additional info -->
        <div class="section-label optional">
          <mat-icon>info_outline</mat-icon>
          <span>Informacoes adicionais (opcional)</span>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Numero da reserva</mat-label>
            <input matInput formControlName="reservationNumber">
            <mat-icon matPrefix>confirmation_number</mat-icon>
          </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions class="dialog-actions">
      <button mat-button (click)="onClose()">Cancelar</button>
      <button mat-flat-button color="primary" (click)="onSave()"
              [disabled]="form.invalid">
        <mat-icon>{{ isEdit() ? 'save' : 'add' }}</mat-icon>
        {{ isEdit() ? 'Salvar alteracoes' : 'Adicionar carro' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: var(--triply-spacing-sm) var(--triply-spacing-md);
      border-bottom: 1px solid var(--triply-border-subtle);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .type-icon {
      color: var(--triply-cat-car, #f59e0b);
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .type-label {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--triply-cat-car, #f59e0b);
    }

    h2 {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: var(--triply-text-primary);
    }

    .manual-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding-top: var(--triply-spacing-sm);
    }

    .section-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--triply-text-primary);
      margin-top: 8px;
      margin-bottom: 4px;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--triply-primary);
      }

      &.optional {
        color: var(--triply-text-secondary);
        mat-icon { color: var(--triply-text-secondary); }
      }
    }

    .form-row {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .form-row mat-form-field { flex: 1; }

    .same-location-checkbox {
      margin-bottom: 8px;
      margin-top: -4px;
    }

    .dropoff-field {
      animation: slideDown 0.2s ease-out;
    }

    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .computed-info {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: rgba(245, 158, 11, 0.08);
      border-radius: 8px;
      font-size: 0.85rem;
      color: var(--triply-cat-car, #f59e0b);
      font-weight: 500;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .validation-error {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: rgba(239, 68, 68, 0.08);
      border-radius: 8px;
      font-size: 0.8rem;
      color: #dc2626;
      margin-bottom: 4px;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }

    .paid-checkbox {
      margin-bottom: 8px;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: var(--triply-spacing-sm) var(--triply-spacing-md) !important;
      border-top: 1px solid var(--triply-border);

      button mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        margin-right: 4px;
      }
    }

    @media (min-width: 600px) {
      .form-row {
        flex-direction: row;
        gap: var(--triply-spacing-sm);
      }
    }
  `],
})
export class ManualCarDialogComponent {
  readonly data = inject<ManualCarDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ManualCarDialogComponent>);

  readonly isEdit = signal(this.data.car !== null);
  readonly sameDropOff = signal(
    this.data.car ? this.data.car.pickUpLocation === this.data.car.dropOffLocation : true
  );

  form = new FormGroup({
    vehicleType: new FormControl(this.data.car?.vehicleType ?? 'Economy', Validators.required),
    pickUpLocation: new FormControl(this.data.car?.pickUpLocation ?? '', Validators.required),
    dropOffLocation: new FormControl(this.data.car?.dropOffLocation ?? ''),
    pickUpDate: new FormControl<Date | null>(
      this.data.car ? parseDateFromISO(this.data.car.pickUpAt) : null,
      Validators.required,
    ),
    pickUpTime: new FormControl<string | null>(
      this.data.car ? parseTimeFromISO(this.data.car.pickUpAt) : '10:00',
    ),
    dropOffDate: new FormControl<Date | null>(
      this.data.car ? parseDateFromISO(this.data.car.dropOffAt) : null,
      Validators.required,
    ),
    dropOffTime: new FormControl<string | null>(
      this.data.car ? parseTimeFromISO(this.data.car.dropOffAt) : '10:00',
    ),
    price: new FormControl(this.data.car?.price.total ?? 0),
    currency: new FormControl(this.data.car?.price.currency ?? this.data.tripCurrency),
    isPaid: new FormControl(false),
    reservationNumber: new FormControl(this.data.car?.reservationNumber ?? ''),
  }, { validators: dropOffAfterPickUp() });

  toggleSameDropOff(checked: boolean): void {
    this.sameDropOff.set(checked);
  }

  daysCount(): number {
    const pickUp = this.form.value.pickUpDate;
    const dropOff = this.form.value.dropOffDate;
    if (!pickUp || !dropOff) return 0;
    const diff = (dropOff.getTime() - pickUp.getTime()) / 86400000;
    return Math.max(0, Math.round(diff));
  }

  onClose(): void {
    this.dialogRef.close(undefined);
  }

  onSave(): void {
    if (this.form.invalid) return;
    const v = this.form.value;

    const pickUpLocation = v.pickUpLocation ?? '';
    const dropOffLocation = this.sameDropOff() ? pickUpLocation : (v.dropOffLocation || pickUpLocation);

    const car: CarRental = {
      id: this.data.car?.id ?? crypto.randomUUID(),
      source: 'manual',
      addedToItinerary: true,
      vehicleType: v.vehicleType ?? 'Economy',
      pickUpLocation,
      dropOffLocation,
      pickUpAt: toISODatetime(v.pickUpDate!, v.pickUpTime ?? null),
      dropOffAt: toISODatetime(v.dropOffDate!, v.dropOffTime ?? null),
      price: { total: v.price ?? 0, currency: v.currency ?? 'BRL' },
      images: [],
      link: { url: '', provider: 'manual' },
      reservationNumber: v.reservationNumber || undefined,
    };

    this.dialogRef.close({
      action: 'save',
      car,
      isPaid: v.isPaid ?? false,
    } as ManualCarDialogResult);
  }
}
