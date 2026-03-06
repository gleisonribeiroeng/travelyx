import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MATERIAL_IMPORTS } from '../../../core/material.exports';
import { Flight } from '../../../core/models/trip.models';

// ─── Public API ──────────────────────────────────────────────────────────────

export interface ManualFlightDialogData {
  flight: Flight | null;
  tripCurrency: string;
}

export interface ManualFlightDialogResult {
  action: 'save';
  flight: Flight;
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

@Component({
  selector: 'app-manual-flight-dialog',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule],
  template: `
    <div class="dialog-header">
      <div class="header-left">
        <mat-icon class="type-icon">flight</mat-icon>
        <div>
          <span class="type-label">{{ isEdit() ? 'Editar' : 'Novo' }} Voo Manual</span>
          <h2>{{ isEdit() ? 'Editar dados do voo' : 'Adicionar voo manualmente' }}</h2>
        </div>
      </div>
      <button mat-icon-button (click)="onClose()">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content>
      <form [formGroup]="form" class="manual-form">

        <!-- Flight details -->
        <div class="section-label">
          <mat-icon>airlines</mat-icon>
          <span>Detalhes do voo</span>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Companhia aerea</mat-label>
            <input matInput formControlName="airline">
            <mat-icon matPrefix>airlines</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Numero do voo</mat-label>
            <input matInput formControlName="flightNumber">
            <mat-icon matPrefix>confirmation_number</mat-icon>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Origem (IATA)</mat-label>
            <input matInput formControlName="origin"
                   maxlength="3" style="text-transform: uppercase">
            <mat-icon matPrefix>flight_takeoff</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Destino (IATA)</mat-label>
            <input matInput formControlName="destination"
                   maxlength="3" style="text-transform: uppercase">
            <mat-icon matPrefix>flight_land</mat-icon>
          </mat-form-field>
        </div>

        <!-- Dates & times -->
        <div class="section-label">
          <mat-icon>schedule</mat-icon>
          <span>Datas e horarios</span>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Data partida</mat-label>
            <input matInput [matDatepicker]="dpDep" formControlName="departureDate" (focus)="dpDep.open()">
            <mat-datepicker-toggle matIconSuffix [for]="dpDep"></mat-datepicker-toggle>
            <mat-datepicker #dpDep></mat-datepicker>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Hora partida</mat-label>
            <input matInput type="time" formControlName="departureTime">
            <mat-icon matPrefix>schedule</mat-icon>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Data chegada</mat-label>
            <input matInput [matDatepicker]="dpArr" formControlName="arrivalDate" (focus)="dpArr.open()">
            <mat-datepicker-toggle matIconSuffix [for]="dpArr"></mat-datepicker-toggle>
            <mat-datepicker #dpArr></mat-datepicker>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Hora chegada</mat-label>
            <input matInput type="time" formControlName="arrivalTime">
            <mat-icon matPrefix>schedule</mat-icon>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Paradas</mat-label>
            <input matInput type="number" formControlName="stops" min="0">
            <mat-icon matPrefix>connecting_airports</mat-icon>
          </mat-form-field>
        </div>

        @if (computedDuration() !== null) {
          <div class="computed-info">
            <mat-icon>timer</mat-icon>
            <span>Duracao calculada: {{ formatDuration(computedDuration()!) }}</span>
          </div>
        }

        <!-- Price -->
        <div class="section-label">
          <mat-icon>payments</mat-icon>
          <span>Preco</span>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Valor</mat-label>
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
            <mat-label>Terminal</mat-label>
            <input matInput formControlName="terminal">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Portao</mat-label>
            <input matInput formControlName="gate">
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Assento</mat-label>
            <input matInput formControlName="seat">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Codigo da reserva</mat-label>
            <input matInput formControlName="reservationNumber">
          </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions class="dialog-actions">
      <button mat-button (click)="onClose()">Cancelar</button>
      <button mat-flat-button color="primary" (click)="onSave()"
              [disabled]="form.invalid">
        <mat-icon>{{ isEdit() ? 'save' : 'add' }}</mat-icon>
        {{ isEdit() ? 'Salvar alteracoes' : 'Adicionar voo' }}
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
      color: var(--triply-cat-flight);
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .type-label {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--triply-cat-flight);
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
      background: rgba(124, 77, 255, 0.06);
      border-radius: 8px;
      font-size: 0.85rem;
      color: var(--triply-primary);
      font-weight: 500;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
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
export class ManualFlightDialogComponent {
  readonly data = inject<ManualFlightDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ManualFlightDialogComponent>);

  readonly isEdit = signal(this.data.flight !== null);

  form = new FormGroup({
    airline: new FormControl(this.data.flight?.airline ?? '', Validators.required),
    flightNumber: new FormControl(this.data.flight?.flightNumber ?? '', Validators.required),
    origin: new FormControl(this.data.flight?.origin ?? '', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(3),
    ]),
    destination: new FormControl(this.data.flight?.destination ?? '', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(3),
    ]),
    departureDate: new FormControl<Date | null>(
      this.data.flight ? parseDateFromISO(this.data.flight.departureAt) : null,
      Validators.required,
    ),
    departureTime: new FormControl<string | null>(
      this.data.flight ? parseTimeFromISO(this.data.flight.departureAt) : null,
    ),
    arrivalDate: new FormControl<Date | null>(
      this.data.flight ? parseDateFromISO(this.data.flight.arrivalAt) : null,
      Validators.required,
    ),
    arrivalTime: new FormControl<string | null>(
      this.data.flight ? parseTimeFromISO(this.data.flight.arrivalAt) : null,
    ),
    stops: new FormControl(this.data.flight?.stops ?? 0),
    price: new FormControl(this.data.flight?.price.total ?? 0),
    currency: new FormControl(this.data.flight?.price.currency ?? this.data.tripCurrency),
    isPaid: new FormControl(false),
    terminal: new FormControl(this.data.flight?.terminal ?? ''),
    gate: new FormControl(this.data.flight?.gate ?? ''),
    seat: new FormControl(this.data.flight?.seat ?? ''),
    reservationNumber: new FormControl(this.data.flight?.reservationNumber ?? ''),
  });

  readonly computedDuration = computed<number | null>(() => {
    const depDate = this.form.value.departureDate;
    const depTime = this.form.value.departureTime;
    const arrDate = this.form.value.arrivalDate;
    const arrTime = this.form.value.arrivalTime;
    if (!depDate || !arrDate || !depTime || !arrTime) return null;

    const dep = new Date(toISODatetime(depDate, depTime));
    const arr = new Date(toISODatetime(arrDate, arrTime));
    const diff = (arr.getTime() - dep.getTime()) / 60000;
    return diff > 0 ? Math.round(diff) : null;
  });

  formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  }

  onClose(): void {
    this.dialogRef.close(undefined);
  }

  onSave(): void {
    if (this.form.invalid) return;
    const v = this.form.value;

    const flight: Flight = {
      id: this.data.flight?.id ?? crypto.randomUUID(),
      source: 'manual',
      addedToItinerary: true,
      origin: (v.origin ?? '').toUpperCase(),
      destination: (v.destination ?? '').toUpperCase(),
      departureAt: toISODatetime(v.departureDate!, v.departureTime ?? null),
      arrivalAt: toISODatetime(v.arrivalDate!, v.arrivalTime ?? null),
      airline: v.airline ?? '',
      flightNumber: v.flightNumber ?? '',
      durationMinutes: this.computedDuration() ?? 0,
      stops: v.stops ?? 0,
      price: { total: v.price ?? 0, currency: v.currency ?? 'BRL' },
      link: { url: '', provider: 'manual' },
      terminal: v.terminal || undefined,
      gate: v.gate || undefined,
      seat: v.seat || undefined,
      reservationNumber: v.reservationNumber || undefined,
    };

    this.dialogRef.close({
      action: 'save',
      flight,
      isPaid: v.isPaid ?? false,
    } as ManualFlightDialogResult);
  }
}
