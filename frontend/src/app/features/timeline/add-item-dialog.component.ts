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
    <!-- Header with type icon -->
    <div class="dialog-header">
      <div class="header-icon" [style.background]="selectedTypeColor() + '12'" [style.color]="selectedTypeColor()">
        <mat-icon>{{ selectedTypeIcon() }}</mat-icon>
      </div>
      <div>
        <h2>Novo Item</h2>
        <span class="header-type">{{ selectedTypeLabel() }}</span>
      </div>
      <button mat-icon-button mat-dialog-close class="close-btn"><mat-icon>close</mat-icon></button>
    </div>

    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <!-- Visual type selector -->
        <div class="type-selector">
          @for (t of itemTypes; track t.value) {
            <button type="button" class="type-btn"
                    [class.active]="form.value.type === t.value"
                    [style.--tc]="t.color"
                    (click)="selectType(t.value)">
              <mat-icon>{{ t.icon }}</mat-icon>
              <span>{{ t.label }}</span>
            </button>
          }
        </div>

        <!-- Name -->
        <mat-form-field appearance="outline" class="compact-field" subscriptSizing="dynamic">
          <mat-label>Nome</mat-label>
          <input matInput formControlName="label" />
        </mat-form-field>

        <!-- Date + Time row -->
        <div class="row-2">
          <mat-form-field appearance="outline" class="compact-field" subscriptSizing="dynamic">
            <mat-label>Data</mat-label>
            <input matInput type="date" formControlName="date" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="compact-field" subscriptSizing="dynamic">
            <mat-label>Hora</mat-label>
            <input matInput type="time" formControlName="timeSlot" />
          </mat-form-field>
        </div>

        <!-- Duration: presets + always-visible custom -->
        <div class="duration-section">
          <span class="section-label">Duração</span>
          <div class="duration-presets">
            @for (p of durationPresets; track p.label) {
              <button type="button" class="preset-chip"
                      [class.active]="isPresetActive(p)"
                      (click)="applyPreset(p)">
                {{ p.label }}
              </button>
            }
          </div>
          <div class="duration-custom">
            <mat-form-field appearance="outline" class="compact-field duration-field" subscriptSizing="dynamic">
              <mat-label>Horas</mat-label>
              <mat-select formControlName="durationHours">
                @for (h of hourOptions; track h) {
                  <mat-option [value]="h">{{ h }}h</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="compact-field duration-field" subscriptSizing="dynamic">
              <mat-label>Minutos</mat-label>
              <mat-select formControlName="durationMins">
                @for (m of minuteOptions; track m) {
                  <mat-option [value]="m">{{ m }}min</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
        </div>

        <!-- Notes (compact) -->
        <mat-form-field appearance="outline" class="compact-field" subscriptSizing="dynamic">
          <mat-label>Notas</mat-label>
          <input matInput formControlName="notes" />
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions>
      <button mat-button mat-dialog-close class="cancel-btn">Cancelar</button>
      <button mat-flat-button color="primary" class="submit-btn" [disabled]="form.invalid" (click)="submit()">
        <mat-icon>add</mat-icon> Adicionar
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    /* ─── Header ─── */
    .dialog-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px 8px;

      h2 {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 700;
        color: var(--triply-text-primary, #1a1a2e);
        line-height: 1.2;
      }
    }

    .header-icon {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .header-type {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--triply-text-tertiary, #999);
    }

    .close-btn {
      margin-left: auto;
      width: 32px !important;
      height: 32px !important;
      line-height: 32px !important;
      color: var(--triply-text-tertiary, #999);
    }

    /* ─── Form ─── */
    mat-dialog-content {
      padding: 4px 20px 0 !important;
    }

    .dialog-form {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 360px;
      max-width: 420px;
    }

    .compact-field {
      font-size: 0.85rem;

      .mat-mdc-form-field-infix {
        min-height: 40px !important;
        padding-top: 10px !important;
        padding-bottom: 6px !important;
      }
    }

    /* ─── Type selector ─── */
    .type-selector {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 5px;
      margin-bottom: 8px;
    }

    .type-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 8px 2px 6px;
      border: 1.5px solid var(--triply-border-subtle, #e5e5e5);
      border-radius: 10px;
      background: var(--triply-surface-1, #fff);
      cursor: pointer;
      transition: all 0.18s ease;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: var(--triply-text-tertiary, #aaa);
        transition: color 0.18s;
      }

      span {
        font-size: 0.58rem;
        font-weight: 600;
        color: var(--triply-text-tertiary, #aaa);
        text-transform: uppercase;
        letter-spacing: 0.02em;
        transition: color 0.18s;
        white-space: nowrap;
      }

      &:hover {
        border-color: var(--tc, #f97316);
        background: color-mix(in srgb, var(--tc, #f97316) 4%, white);
        mat-icon { color: var(--tc, #f97316); }
        span { color: var(--tc, #f97316); }
      }

      &.active {
        border-color: var(--tc, #f97316);
        background: color-mix(in srgb, var(--tc, #f97316) 8%, white);
        box-shadow: 0 0 0 1px color-mix(in srgb, var(--tc, #f97316) 20%, transparent);

        mat-icon { color: var(--tc, #f97316); }
        span { color: var(--tc, #f97316); font-weight: 700; }
      }
    }

    /* ─── Row layout ─── */
    .row-2 {
      display: flex;
      gap: 10px;
      mat-form-field { flex: 1; }
    }

    /* ─── Duration ─── */
    .duration-section {
      margin-bottom: 4px;
    }

    .section-label {
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--triply-text-tertiary, #888);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      display: block;
      margin-bottom: 6px;
    }

    .duration-presets {
      display: flex;
      flex-wrap: nowrap;
      gap: 5px;
      margin-bottom: 6px;
      overflow-x: auto;

      &::-webkit-scrollbar { display: none; }
    }

    .preset-chip {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      border: 1px solid var(--triply-border-subtle, #e0e0e0);
      border-radius: 8px;
      padding: 5px 10px;
      font-size: 0.72rem;
      font-weight: 500;
      white-space: nowrap;
      flex-shrink: 0;
      background: var(--triply-surface-1, #fff);
      color: var(--triply-text-secondary, #666);
      cursor: pointer;
      transition: all 0.15s ease;

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }

      &:hover {
        border-color: var(--triply-primary, #f97316);
        color: var(--triply-primary, #f97316);
      }

      &.active {
        background: var(--triply-primary, #f97316);
        color: #fff;
        border-color: var(--triply-primary, #f97316);
        box-shadow: 0 2px 6px rgba(249, 115, 22, 0.25);
      }

    }

    .duration-custom {
      display: flex;
      gap: 10px;

      .duration-field { flex: 1; }
    }

    /* ─── Actions ─── */
    mat-dialog-actions {
      padding: 8px 20px 16px !important;
      gap: 8px;
      justify-content: flex-end;
    }

    .cancel-btn {
      color: var(--triply-text-secondary, #888) !important;
      font-size: 0.82rem !important;
    }

    .submit-btn {
      font-size: 0.82rem !important;
      min-height: 34px !important;
      padding: 0 18px !important;
      border-radius: 8px !important;

      mat-icon {
        font-size: 17px;
        width: 17px;
        height: 17px;
        margin-right: 2px;
      }
    }
  `],
})
export class AddItemDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<AddItemDialogComponent>);
  private readonly dialogData = inject<AddItemDialogData>(MAT_DIALOG_DATA, { optional: true });

  readonly itemTypes = [
    { value: 'flight', label: 'Voo', icon: 'flight', color: '#2196F3' },
    { value: 'stay', label: 'Hotel', icon: 'hotel', color: '#f97316' },
    { value: 'car-rental', label: 'Carro', icon: 'directions_car', color: '#607D8B' },
    { value: 'activity', label: 'Ativ.', icon: 'local_activity', color: '#43A047' },
    { value: 'transport', label: 'Transp.', icon: 'directions_bus', color: '#78909C' },
    { value: 'trajectory', label: 'Trajeto', icon: 'moving', color: '#8B5CF6' },
    { value: 'custom', label: 'Outro', icon: 'edit_note', color: '#9E9E9E' },
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

  selectedTypeIcon(): string {
    const t = this.itemTypes.find(t => t.value === this.form.value.type);
    return t?.icon || 'event';
  }

  selectedTypeLabel(): string {
    const t = this.itemTypes.find(t => t.value === this.form.value.type);
    return t?.label || 'Item';
  }

  selectedTypeColor(): string {
    const t = this.itemTypes.find(t => t.value === this.form.value.type);
    return t?.color || '#9E9E9E';
  }

  selectType(value: string): void {
    this.form.patchValue({ type: value });
  }

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
