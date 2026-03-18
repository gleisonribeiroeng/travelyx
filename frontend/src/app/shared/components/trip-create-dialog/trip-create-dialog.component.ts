import { Component, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MATERIAL_IMPORTS } from '../../../core/material.exports';
import { TranslationService } from '../../../core/i18n/translation.service';

export interface TripCreateDialogResult {
  name: string;
  destination: string;
  dates: { start: string; end: string };
  currency: string;
  travelers: number;
}

export interface TripEditData {
  name: string;
  destination: string;
  dates: { start: string; end: string };
  currency?: string;
  travelers?: number;
}

@Component({
  selector: 'app-trip-create-dialog',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule],
  template: `
    <h2 mat-dialog-title>{{ isEditMode ? i18n.t('tripDialog.editTitle') : i18n.t('tripDialog.createTitle') }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="create-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ i18n.t('tripDialog.name') }}</mat-label>
          <input matInput formControlName="name">
          <mat-error>{{ i18n.t('tripDialog.nameRequired') }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ i18n.t('tripDialog.destination') }}</mat-label>
          <input matInput formControlName="destination">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width" (click)="picker.open()">
          <mat-label>{{ i18n.t('tripDialog.dates') }}</mat-label>
          <mat-date-range-input [rangePicker]="picker">
            <input matStartDate formControlName="dateStart" [placeholder]="i18n.t('common.departure')">
            <input matEndDate formControlName="dateEnd" [placeholder]="i18n.t('common.return')">
          </mat-date-range-input>
          <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-date-range-picker #picker></mat-date-range-picker>
        </mat-form-field>

        <div class="row-2">
          <mat-form-field appearance="outline">
            <mat-label>{{ i18n.t('tripDialog.travelers') }}</mat-label>
            <mat-select formControlName="travelers">
              @for (n of travelerOptions; track n) {
                <mat-option [value]="n">{{ n }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>{{ i18n.t('tripDialog.currency') }}</mat-label>
            <mat-select formControlName="currency">
              @for (c of currencyOptions; track c.code) {
                <mat-option [value]="c.code">{{ c.flag }} {{ c.code }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">{{ i18n.t('common.cancel') }}</button>
      <button mat-flat-button color="primary" (click)="submit()" [disabled]="form.invalid">
        {{ isEditMode ? i18n.t('common.save') : i18n.t('tripDialog.create') }}
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
    .row-2 {
      display: flex;
      gap: 12px;
      mat-form-field { flex: 1; }
    }
  `],
})
export class TripCreateDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<TripCreateDialogComponent>);
  private readonly data = inject<TripEditData | null>(MAT_DIALOG_DATA, { optional: true });
  readonly i18n = inject(TranslationService);

  get isEditMode(): boolean {
    return !!this.data;
  }

  readonly currencyOptions = [
    { code: 'BRL', flag: '🇧🇷' },
    { code: 'USD', flag: '🇺🇸' },
    { code: 'EUR', flag: '🇪🇺' },
    { code: 'GBP', flag: '🇬🇧' },
  ];

  readonly travelerOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  form = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    destination: new FormControl(''),
    dateStart: new FormControl<Date | null>(null),
    dateEnd: new FormControl<Date | null>(null),
    currency: new FormControl('BRL'),
    travelers: new FormControl(1),
  });

  ngOnInit(): void {
    // Auto-select currency based on language
    if (!this.data && this.i18n.isEn()) {
      this.form.patchValue({ currency: 'USD' });
    }

    if (this.data) {
      this.form.patchValue({
        name: this.data.name,
        destination: this.data.destination,
        dateStart: this.data.dates.start ? new Date(this.data.dates.start + 'T00:00:00') : null,
        dateEnd: this.data.dates.end ? new Date(this.data.dates.end + 'T00:00:00') : null,
        currency: this.data.currency || 'BRL',
        travelers: this.data.travelers || 1,
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
      currency: v.currency || 'BRL',
      travelers: v.travelers || 1,
    };
    this.dialogRef.close(result);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
