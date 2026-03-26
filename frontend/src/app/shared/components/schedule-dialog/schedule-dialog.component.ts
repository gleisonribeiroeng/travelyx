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
      } @else {
        Agendar Atividade
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

        <div class="duration-section">
          <span class="duration-label">Duração estimada</span>
          <div class="duration-row">
            <mat-form-field appearance="outline" class="duration-field">
              <mat-label>Horas</mat-label>
              <input matInput type="number" formControlName="durationHours" min="0" max="12" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="duration-field">
              <mat-label>Minutos</mat-label>
              <input matInput type="number" formControlName="durationMins" min="0" max="59" />
            </mat-form-field>
          </div>
          <div class="duration-presets">
            @for (p of durationPresets; track p.label) {
              <button type="button" class="preset-chip" [class.active]="isPresetActive(p)" (click)="applyPreset(p)">
                {{ p.label }}
              </button>
            }
          </div>
        </div>
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
      color: var(--triply-text-primary);
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

    .duration-section { margin-bottom: 8px; }

    .duration-label {
      font-size: 13px;
      color: #666;
      margin-bottom: 6px;
      display: block;
    }

    .duration-row {
      display: flex;
      gap: 12px;

      .duration-field { flex: 1; }
    }

    .duration-presets {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: -4px;
      margin-bottom: 8px;
    }

    .preset-chip {
      border: 1px solid #ddd;
      border-radius: 16px;
      padding: 4px 12px;
      font-size: 12px;
      background: #fafafa;
      cursor: pointer;
      transition: all 0.15s;
      font-family: inherit;

      &:hover { border-color: #999; }
      &.active { background: var(--triply-primary, #f97316); color: #fff; border-color: var(--triply-primary, #f97316); }
    }

    .conflict-warning {
      display: flex;
      gap: 12px;
      padding: 12px 16px;
      background: color-mix(in srgb, var(--triply-warning) 10%, #fff);
      border-left: 4px solid var(--triply-warning);
      border-radius: var(--triply-radius-sm);
      box-shadow: var(--triply-shadow-xs);
      margin-top: 8px;

      mat-icon {
        color: var(--triply-warning);
        flex-shrink: 0;
        margin-top: 2px;
      }

      strong {
        display: block;
        font-size: 0.85rem;
        color: color-mix(in srgb, var(--triply-warning) 70%, #000);
        margin-bottom: 4px;
      }

      p {
        font-size: 0.8rem;
        color: color-mix(in srgb, var(--triply-warning) 70%, #000);
        margin: 2px 0;
      }
    }

    .spacer { flex: 1; }

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

  readonly durationPresets = [
    { label: '30min', hours: 0, mins: 30 },
    { label: '1h', hours: 1, mins: 0 },
    { label: '2h', hours: 2, mins: 0 },
    { label: '3h', hours: 3, mins: 0 },
    { label: 'Meio dia', hours: 6, mins: 0 },
    { label: 'Dia inteiro', hours: 10, mins: 0 },
  ];

  private initialHours = Math.floor((this.data.durationMinutes ?? 60) / 60);
  private initialMins = (this.data.durationMinutes ?? 60) % 60;

  readonly form = this.fb.group({
    date: [this.data.defaultDate, Validators.required],
    timeSlot: [this.data.currentTimeSlot ?? '10:00', Validators.required],
    durationHours: [this.initialHours],
    durationMins: [this.initialMins],
  });

  readonly conflictResult = signal<ConflictResult | null>(null);

  constructor() {
    this.form.valueChanges.subscribe(() => this.checkConflicts());
    this.checkConflicts();
  }

  isPresetActive(p: { hours: number; mins: number }): boolean {
    return this.form.value.durationHours === p.hours && this.form.value.durationMins === p.mins;
  }

  applyPreset(p: { hours: number; mins: number }): void {
    this.form.patchValue({ durationHours: p.hours, durationMins: p.mins });
  }

  private getTotalMinutes(): number {
    return ((this.form.value.durationHours || 0) * 60) + (this.form.value.durationMins || 0);
  }

  private checkConflicts(): void {
    const { date, timeSlot } = this.form.value;
    if (!date || !timeSlot) {
      this.conflictResult.set(null);
      return;
    }

    const durationMinutes = this.getTotalMinutes() || 60;
    const trip = this.tripState.trip();
    const blocks = buildTimeBlocks(
      trip.flights,
      trip.carRentals,
      trip.transports,
      trip.itineraryItems,
      this.data.itemId
    );

    const result = detectConflicts(date, timeSlot, durationMinutes, blocks);
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
    const { date, timeSlot } = this.form.value;
    const durationMinutes = this.getTotalMinutes() || 60;
    this.dialogRef.close({ date, timeSlot, durationMinutes } as ScheduleDialogResult);
  }
}
