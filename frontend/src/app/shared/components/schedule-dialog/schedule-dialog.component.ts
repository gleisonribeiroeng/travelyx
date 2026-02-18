import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MATERIAL_IMPORTS } from '../../../core/material.exports';
import { TripStateService } from '../../../core/services/trip-state.service';
import {
  buildTimeBlocks,
  detectConflicts,
  ConflictResult,
} from '../../../core/utils/schedule-conflict.util';

export interface ScheduleDialogData {
  name: string;
  type: 'activity' | 'attraction' | 'custom';
  defaultDate: string;
  tripDates: { start: string; end: string };
  durationMinutes: number | null;
  // Edit mode fields
  editMode?: boolean;
  currentTimeSlot?: string;
  itemId?: string;
}

export interface ScheduleDialogResult {
  date: string;
  timeSlot: string;
  durationMinutes: number;
  action?: 'remove';
}

@Component({
  selector: 'app-schedule-dialog',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule],
  template: `
    <h2 mat-dialog-title>
      @if (data.editMode) {
        Editar Horário
      } @else if (data.type === 'activity') {
        Agendar Passeio
      } @else {
        Agendar Atração
      }
    </h2>

    <mat-dialog-content>
      <p class="item-name">{{ data.name }}</p>

      <form [formGroup]="form" class="schedule-form">
        <mat-form-field appearance="outline">
          <mat-label>Data</mat-label>
          <input matInput type="date" formControlName="date" required>
          <mat-error>Data é obrigatória</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Horário</mat-label>
          <input matInput type="time" formControlName="timeSlot" required>
          <mat-error>Horário é obrigatório</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Duração (minutos)</mat-label>
          <input matInput type="number" formControlName="durationMinutes" min="15" step="15">
          <mat-hint>Tempo estimado da atividade</mat-hint>
          <mat-error>Mínimo 15 minutos</mat-error>
        </mat-form-field>
      </form>

      @if (conflictResult()?.hasConflict) {
        <div class="conflict-warning">
          <mat-icon>warning</mat-icon>
          <div>
            <strong>Conflito de horário</strong>
            @for (c of conflictResult()!.conflicts; track c.label) {
              <p>{{ c.label }} ({{ c.startTime }}–{{ c.endTime }})</p>
            }
          </div>
        </div>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      @if (data.editMode) {
        <button mat-button color="warn" (click)="onRemove()" class="remove-btn">
          <mat-icon>delete</mat-icon> Remover
        </button>
      }
      <span class="spacer"></span>
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button
        mat-raised-button
        color="primary"
        [disabled]="form.invalid || conflictResult()?.hasConflict"
        (click)="onConfirm()"
      >
        Confirmar
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .item-name {
      font-size: 1.1rem;
      font-weight: 600;
      color: #0D0B30;
      margin: 0 0 16px;
    }

    .schedule-form {
      display: flex;
      flex-direction: column;
      gap: 4px;

      mat-form-field {
        width: 100%;
      }
    }

    .conflict-warning {
      display: flex;
      gap: 12px;
      padding: 12px 16px;
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 8px;
      margin-top: 8px;

      mat-icon {
        color: #f59e0b;
        flex-shrink: 0;
        margin-top: 2px;
      }

      strong {
        display: block;
        font-size: 0.85rem;
        color: #856404;
        margin-bottom: 4px;
      }

      p {
        font-size: 0.8rem;
        color: #856404;
        margin: 2px 0;
      }
    }

    .spacer {
      flex: 1;
    }

    .remove-btn {
      mat-icon {
        font-size: 18px;
        height: 18px;
        width: 18px;
        margin-right: 4px;
      }
    }
  `],
})
export class ScheduleDialogComponent {
  readonly data = inject<ScheduleDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ScheduleDialogComponent>);
  private readonly tripState = inject(TripStateService);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    date: [this.data.defaultDate, Validators.required],
    timeSlot: [this.data.currentTimeSlot ?? '10:00', Validators.required],
    durationMinutes: [this.data.durationMinutes ?? 60, [Validators.required, Validators.min(15)]],
  });

  readonly conflictResult = signal<ConflictResult | null>(null);

  constructor() {
    this.form.valueChanges.subscribe(() => this.checkConflicts());
    this.checkConflicts();
  }

  private checkConflicts(): void {
    const { date, timeSlot, durationMinutes } = this.form.value;
    if (!date || !timeSlot) {
      this.conflictResult.set(null);
      return;
    }

    const trip = this.tripState.trip();
    const blocks = buildTimeBlocks(
      trip.flights,
      trip.carRentals,
      trip.transports,
      trip.itineraryItems,
      this.data.itemId
    );

    const result = detectConflicts(date, timeSlot, durationMinutes ?? 60, blocks);
    this.conflictResult.set(result);
  }

  onCancel(): void {
    this.dialogRef.close(undefined);
  }

  onRemove(): void {
    this.dialogRef.close({ action: 'remove' } as ScheduleDialogResult);
  }

  onConfirm(): void {
    if (this.form.invalid || this.conflictResult()?.hasConflict) return;
    const { date, timeSlot, durationMinutes } = this.form.value;
    this.dialogRef.close({ date, timeSlot, durationMinutes } as ScheduleDialogResult);
  }
}
