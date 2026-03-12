import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { ItineraryItem, ItineraryItemType } from '../../core/models/trip.models';

export interface AddItemDialogData {
  presetType?: string;
  presetDate?: string;
}

@Component({
  selector: 'app-add-item-dialog',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule],
  template: `
    <h2 mat-dialog-title>Novo Item</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline">
          <mat-label>Tipo</mat-label>
          <mat-select formControlName="type">
            @for (t of itemTypes; track t.value) {
              <mat-option [value]="t.value">
                <mat-icon>{{ t.icon }}</mat-icon> {{ t.label }}
              </mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Nome</mat-label>
          <input matInput formControlName="label" />
        </mat-form-field>

        <div class="row-2">
          <mat-form-field appearance="outline">
            <mat-label>Data</mat-label>
            <input matInput type="date" formControlName="date" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Hora</mat-label>
            <input matInput type="time" formControlName="timeSlot" />
          </mat-form-field>
        </div>

        <div class="duration-section">
          <span class="duration-label">Duração</span>
          <div class="duration-row">
            <mat-form-field appearance="outline" class="duration-field">
              <mat-label>Horas</mat-label>
              <mat-select formControlName="durationHours">
                @for (h of hourOptions; track h) {
                  <mat-option [value]="h">{{ h }}h</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="duration-field">
              <mat-label>Minutos</mat-label>
              <mat-select formControlName="durationMins">
                @for (m of minuteOptions; track m) {
                  <mat-option [value]="m">{{ m }}min</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
          <div class="duration-presets">
            @for (p of durationPresets; track p.label) {
              <button type="button" class="preset-chip"
                      [class.active]="isPresetActive(p)"
                      (click)="applyPreset(p)">
                {{ p.label }}
              </button>
            }
          </div>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Notas</mat-label>
          <input matInput formControlName="notes" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="submit()">
        <mat-icon>add</mat-icon> Adicionar
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 340px;
    }
    .row-2 {
      display: flex;
      gap: 12px;
      mat-form-field { flex: 1; }
    }
    mat-dialog-content { padding-top: 8px !important; }
    .duration-section { margin-bottom: 8px; }
    .duration-label { font-size: 13px; color: #666; margin-bottom: 4px; display: block; }
    .duration-row { display: flex; gap: 12px; .duration-field { flex: 1; } }
    .duration-presets { display: flex; flex-wrap: wrap; gap: 6px; margin-top: -4px; margin-bottom: 8px; }
    .preset-chip {
      border: 1px solid #ddd; border-radius: 16px; padding: 4px 12px;
      font-size: 12px; background: #fafafa; cursor: pointer; transition: all .15s;
      &:hover { border-color: #999; }
      &.active { background: #1976d2; color: #fff; border-color: #1976d2; }
    }
  `],
})
export class AddItemDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<AddItemDialogComponent>);
  private readonly dialogData = inject<AddItemDialogData>(MAT_DIALOG_DATA, { optional: true });

  readonly itemTypes = [
    { value: 'flight', label: 'Voo', icon: 'flight' },
    { value: 'stay', label: 'Hotel', icon: 'hotel' },
    { value: 'car-rental', label: 'Carro', icon: 'directions_car' },
    { value: 'activity', label: 'Passeio', icon: 'local_activity' },
    { value: 'attraction', label: 'Atração', icon: 'museum' },
    { value: 'transport', label: 'Transporte', icon: 'directions_bus' },
    { value: 'custom', label: 'Outro', icon: 'event' },
  ];

  readonly hourOptions = Array.from({ length: 13 }, (_, i) => i);      // 0–12
  readonly minuteOptions = [0, 15, 30, 45];
  readonly durationPresets = [
    { label: '30min', hours: 0, mins: 30 },
    { label: '1h', hours: 1, mins: 0 },
    { label: '2h', hours: 2, mins: 0 },
    { label: '3h', hours: 3, mins: 0 },
    { label: 'Meio dia', hours: 6, mins: 0 },
    { label: 'Dia inteiro', hours: 10, mins: 0 },
  ];

  readonly form = this.fb.group({
    type: [this.dialogData?.presetType || 'custom', Validators.required],
    label: ['', Validators.required],
    date: [this.dialogData?.presetDate || '', Validators.required],
    timeSlot: [''],
    durationHours: [0],
    durationMins: [0],
    notes: [''],
  });

  isPresetActive(p: { hours: number; mins: number }): boolean {
    return this.form.value.durationHours === p.hours && this.form.value.durationMins === p.mins;
  }

  applyPreset(p: { hours: number; mins: number }): void {
    this.form.patchValue({ durationHours: p.hours, durationMins: p.mins });
  }

  submit(): void {
    if (this.form.invalid) return;
    const v = this.form.value;
    const totalMinutes = ((v.durationHours || 0) * 60) + (v.durationMins || 0);
    const item: ItineraryItem = {
      id: crypto.randomUUID(),
      type: (v.type || 'custom') as ItineraryItemType,
      refId: null,
      date: v.date!,
      timeSlot: v.timeSlot || null,
      durationMinutes: totalMinutes || null,
      label: v.label!,
      notes: v.notes || '',
      order: 0,
      isPaid: false,
      attachment: null,
    };
    this.dialogRef.close(item);
  }
}
