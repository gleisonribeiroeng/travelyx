import { Component, inject } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { ExpenseCategory } from '../../core/models/trip.models';

export interface AddExpenseResult {
  label: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
}

@Component({
  selector: 'app-add-expense-dialog',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule],
  template: `
    <h2 mat-dialog-title>Adicionar gasto manual</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline">
          <mat-label>Descrição</mat-label>
          <input matInput formControlName="label">
        </mat-form-field>

        <div class="row-2">
          <mat-form-field appearance="outline">
            <mat-label>Valor (R$)</mat-label>
            <input matInput type="number" formControlName="amount" min="0">
            <mat-icon matPrefix>attach_money</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Categoria</mat-label>
            <mat-select formControlName="category">
              @for (cat of categories; track cat.value) {
                <mat-option [value]="cat.value">{{ cat.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Data</mat-label>
          <input matInput type="date" formControlName="date">
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
      min-width: 320px;
      padding-top: 8px;
    }

    .row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    mat-form-field { width: 100%; }
  `],
})
export class AddExpenseDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<AddExpenseDialogComponent>);

  readonly categories: { value: ExpenseCategory; label: string }[] = [
    { value: 'food', label: 'Alimentação' },
    { value: 'shopping', label: 'Compras' },
    { value: 'transport', label: 'Transporte' },
    { value: 'activity', label: 'Passeio' },
    { value: 'insurance', label: 'Seguro' },
    { value: 'visa', label: 'Visto' },
    { value: 'other', label: 'Outros' },
  ];

  readonly form = new FormGroup({
    label: new FormControl('', Validators.required),
    amount: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    category: new FormControl<ExpenseCategory>('food', Validators.required),
    date: new FormControl(new Date().toISOString().split('T')[0]),
  });

  submit(): void {
    if (this.form.invalid) return;
    const v = this.form.value;
    this.dialogRef.close({
      label: v.label!,
      amount: v.amount!,
      category: v.category!,
      date: v.date || new Date().toISOString().split('T')[0],
    } as AddExpenseResult);
  }
}
