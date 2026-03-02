import { Component, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MATERIAL_IMPORTS } from '../../../core/material.exports';

export interface TripCreateDialogResult {
  name: string;
  destination: string;
  dates: { start: string; end: string };
}

export interface TripEditData {
  name: string;
  destination: string;
  dates: { start: string; end: string };
}

@Component({
  selector: 'app-trip-create-dialog',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule],
  template: `
    <h2 mat-dialog-title>{{ isEditMode ? 'Editar Viagem' : 'Nova Viagem' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="create-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nome da viagem</mat-label>
          <input matInput formControlName="name">
          <mat-error>Nome é obrigatório</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Destino</mat-label>
          <input matInput formControlName="destination">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width" (click)="picker.open()">
          <mat-label>Período da viagem</mat-label>
          <mat-date-range-input [rangePicker]="picker">
            <input matStartDate formControlName="dateStart" placeholder="Ida">
            <input matEndDate formControlName="dateEnd" placeholder="Volta">
          </mat-date-range-input>
          <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-date-range-picker #picker></mat-date-range-picker>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancelar</button>
      <button mat-flat-button color="primary" (click)="submit()" [disabled]="form.invalid">
        {{ isEditMode ? 'Salvar' : 'Criar Viagem' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .create-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 320px;
      padding-top: 8px;
    }
    .full-width { width: 100%; }
  `],
})
export class TripCreateDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<TripCreateDialogComponent>);
  private readonly data = inject<TripEditData | null>(MAT_DIALOG_DATA, { optional: true });

  get isEditMode(): boolean {
    return !!this.data;
  }

  form = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    destination: new FormControl(''),
    dateStart: new FormControl<Date | null>(null),
    dateEnd: new FormControl<Date | null>(null),
  });

  ngOnInit(): void {
    if (this.data) {
      this.form.patchValue({
        name: this.data.name,
        destination: this.data.destination,
        dateStart: this.data.dates.start ? new Date(this.data.dates.start + 'T00:00:00') : null,
        dateEnd: this.data.dates.end ? new Date(this.data.dates.end + 'T00:00:00') : null,
      });
    }
  }

  submit(): void {
    if (this.form.invalid) return;
    const v = this.form.value;
    const result: TripCreateDialogResult = {
      name: v.name!,
      destination: v.destination ?? '',
      dates: {
        start: v.dateStart ? v.dateStart.toISOString().split('T')[0] : '',
        end: v.dateEnd ? v.dateEnd.toISOString().split('T')[0] : '',
      },
    };
    this.dialogRef.close(result);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
