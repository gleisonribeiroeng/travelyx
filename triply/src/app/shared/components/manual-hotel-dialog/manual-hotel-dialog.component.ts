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
import { Stay } from '../../../core/models/trip.models';

// ─── Public API ──────────────────────────────────────────────────────────────

export interface ManualHotelDialogData {
  stay: Stay | null;
  tripCurrency: string;
}

export interface ManualHotelDialogResult {
  action: 'save';
  stay: Stay;
  isPaid: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateStr(date: Date): string {
  return date.toISOString().split('T')[0];
}

function parseDateFromStr(str: string): Date {
  return new Date(str + 'T12:00:00');
}

function checkOutAfterCheckIn(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const checkIn = group.get('checkIn')?.value;
    const checkOut = group.get('checkOut')?.value;
    if (!checkIn || !checkOut) return null;
    return checkOut > checkIn ? null : { checkOutBeforeCheckIn: true };
  };
}

@Component({
  selector: 'app-manual-hotel-dialog',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule],
  template: `
    <div class="dialog-header">
      <div class="header-left">
        <mat-icon class="type-icon">hotel</mat-icon>
        <div>
          <span class="type-label">{{ isEdit() ? 'Editar' : 'Novo' }} Hotel Manual</span>
          <h2>{{ isEdit() ? 'Editar dados do hotel' : 'Adicionar hotel manualmente' }}</h2>
        </div>
      </div>
      <button mat-icon-button (click)="onClose()">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content>
      <form [formGroup]="form" class="manual-form">

        <!-- Hotel details -->
        <div class="section-label">
          <mat-icon>hotel</mat-icon>
          <span>Detalhes do hotel</span>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Nome do hotel</mat-label>
            <input matInput formControlName="name">
            <mat-icon matPrefix>hotel</mat-icon>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Cidade</mat-label>
            <input matInput formControlName="city">
            <mat-icon matPrefix>location_city</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Endereco</mat-label>
            <input matInput formControlName="address">
            <mat-icon matPrefix>location_on</mat-icon>
          </mat-form-field>
        </div>

        <!-- Dates -->
        <div class="section-label">
          <mat-icon>date_range</mat-icon>
          <span>Datas</span>
        </div>

        <div class="form-row" formGroupName="dates">
          <mat-form-field appearance="outline">
            <mat-label>Check-in</mat-label>
            <input matInput [matDatepicker]="dpCheckIn" formControlName="checkIn" (focus)="dpCheckIn.open()">
            <mat-datepicker-toggle matIconSuffix [for]="dpCheckIn"></mat-datepicker-toggle>
            <mat-datepicker #dpCheckIn></mat-datepicker>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Check-out</mat-label>
            <input matInput [matDatepicker]="dpCheckOut" formControlName="checkOut" (focus)="dpCheckOut.open()">
            <mat-datepicker-toggle matIconSuffix [for]="dpCheckOut"></mat-datepicker-toggle>
            <mat-datepicker #dpCheckOut></mat-datepicker>
          </mat-form-field>
        </div>

        @if (form.get('dates')?.hasError('checkOutBeforeCheckIn')) {
          <div class="validation-error">
            <mat-icon>warning</mat-icon>
            <span>Check-out deve ser posterior ao check-in</span>
          </div>
        }

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Hora check-in</mat-label>
            <input matInput type="time" formControlName="checkInTime">
            <mat-icon matPrefix>schedule</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Hora check-out</mat-label>
            <input matInput type="time" formControlName="checkOutTime">
            <mat-icon matPrefix>schedule</mat-icon>
          </mat-form-field>
        </div>

        <!-- Price -->
        <div class="section-label">
          <mat-icon>payments</mat-icon>
          <span>Preco</span>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Valor por noite</mat-label>
            <input matInput type="number" formControlName="pricePerNight" min="0" step="0.01">
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

        @if (nightsCount() > 0 && (form.value.pricePerNight ?? 0) > 0) {
          <div class="computed-info">
            <mat-icon>calculate</mat-icon>
            <span>{{ nightsCount() }} noite(s) &times; {{ form.value.currency }} {{ form.value.pricePerNight | number:'1.2-2' }} = {{ form.value.currency }} {{ (nightsCount() * (form.value.pricePerNight ?? 0)) | number:'1.2-2' }} total</span>
          </div>
        }

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
        {{ isEdit() ? 'Salvar alteracoes' : 'Adicionar hotel' }}
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
      color: var(--triply-cat-stay);
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .type-label {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--triply-cat-stay);
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

    .computed-info {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: rgba(74, 175, 114, 0.08);
      border-radius: 8px;
      font-size: 0.85rem;
      color: var(--triply-cat-stay);
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
export class ManualHotelDialogComponent {
  readonly data = inject<ManualHotelDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ManualHotelDialogComponent>);

  readonly isEdit = signal(this.data.stay !== null);

  form = new FormGroup({
    name: new FormControl(this.data.stay?.name ?? '', Validators.required),
    city: new FormControl(this.data.stay?.address ? '' : ''),
    address: new FormControl(this.data.stay?.address ?? ''),
    dates: new FormGroup({
      checkIn: new FormControl<Date | null>(
        this.data.stay ? parseDateFromStr(this.data.stay.checkIn) : null,
        Validators.required,
      ),
      checkOut: new FormControl<Date | null>(
        this.data.stay ? parseDateFromStr(this.data.stay.checkOut) : null,
        Validators.required,
      ),
    }, { validators: checkOutAfterCheckIn() }),
    checkInTime: new FormControl<string | null>(this.data.stay?.checkInTime ?? null),
    checkOutTime: new FormControl<string | null>(this.data.stay?.checkOutTime ?? null),
    pricePerNight: new FormControl(this.data.stay?.pricePerNight.total ?? 0),
    currency: new FormControl(this.data.stay?.pricePerNight.currency ?? this.data.tripCurrency),
    isPaid: new FormControl(false),
    reservationNumber: new FormControl(this.data.stay?.reservationNumber ?? ''),
  });

  nightsCount(): number {
    const checkIn = this.form.value.dates?.checkIn;
    const checkOut = this.form.value.dates?.checkOut;
    if (!checkIn || !checkOut) return 0;
    const diff = (checkOut.getTime() - checkIn.getTime()) / 86400000;
    return Math.max(0, Math.round(diff));
  }

  onClose(): void {
    this.dialogRef.close(undefined);
  }

  onSave(): void {
    if (this.form.invalid) return;
    const v = this.form.value;

    const stay: Stay = {
      id: this.data.stay?.id ?? crypto.randomUUID(),
      source: 'manual',
      addedToItinerary: true,
      name: v.name ?? '',
      location: { latitude: 0, longitude: 0 },
      address: v.address || v.city || '',
      checkIn: formatDateStr(v.dates!.checkIn!),
      checkOut: formatDateStr(v.dates!.checkOut!),
      pricePerNight: { total: v.pricePerNight ?? 0, currency: v.currency ?? 'BRL' },
      rating: null,
      reviewCount: 0,
      photoUrl: null,
      images: [],
      link: { url: '', provider: 'manual' },
      checkInTime: v.checkInTime || undefined,
      checkOutTime: v.checkOutTime || undefined,
      reservationNumber: v.reservationNumber || undefined,
    };

    this.dialogRef.close({
      action: 'save',
      stay,
      isPaid: v.isPaid ?? false,
    } as ManualHotelDialogResult);
  }
}
