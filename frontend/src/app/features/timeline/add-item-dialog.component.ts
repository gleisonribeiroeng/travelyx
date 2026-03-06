import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { ItineraryItem, ItineraryItemType } from '../../core/models/trip.models';

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

        <div class="row-2">
          <mat-form-field appearance="outline">
            <mat-label>Duração (min)</mat-label>
            <input matInput type="number" formControlName="durationMinutes" min="15" step="15" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Notas</mat-label>
            <input matInput formControlName="notes" />
          </mat-form-field>
        </div>
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
  `],
})
export class AddItemDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<AddItemDialogComponent>);

  readonly itemTypes = [
    { value: 'flight', label: 'Voo', icon: 'flight' },
    { value: 'stay', label: 'Hotel', icon: 'hotel' },
    { value: 'car-rental', label: 'Carro', icon: 'directions_car' },
    { value: 'activity', label: 'Passeio', icon: 'local_activity' },
    { value: 'attraction', label: 'Atração', icon: 'museum' },
    { value: 'transport', label: 'Transporte', icon: 'directions_bus' },
    { value: 'custom', label: 'Outro', icon: 'event' },
  ];

  readonly form = this.fb.group({
    type: ['custom', Validators.required],
    label: ['', Validators.required],
    date: ['', Validators.required],
    timeSlot: [''],
    durationMinutes: [null as number | null],
    notes: [''],
  });

  submit(): void {
    if (this.form.invalid) return;
    const v = this.form.value;
    const item: ItineraryItem = {
      id: crypto.randomUUID(),
      type: (v.type || 'custom') as ItineraryItemType,
      refId: null,
      date: v.date!,
      timeSlot: v.timeSlot || null,
      durationMinutes: v.durationMinutes || null,
      label: v.label!,
      notes: v.notes || '',
      order: 0,
      isPaid: false,
      attachment: null,
    };
    this.dialogRef.close(item);
  }
}
