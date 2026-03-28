import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MATERIAL_IMPORTS } from '../../../core/material.exports';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ItineraryItem, ItineraryItemType } from '../../../core/models/trip.models';

export interface QuickAddDialogData {
  type: ItineraryItemType;
  date: string;
  insertIndex: number;
  inheritTime?: string | null;
}

interface TypeOption {
  value: ItineraryItemType;
  label: string;
  icon: string;
  color: string;
}

const TYPE_OPTIONS: TypeOption[] = [
  { value: 'flight', label: 'Voo', icon: 'flight', color: '#2196F3' },
  { value: 'stay', label: 'Hotel', icon: 'hotel', color: '#f97316' },
  { value: 'activity', label: 'Atividade', icon: 'local_activity', color: '#43A047' },
  { value: 'transport', label: 'Transporte', icon: 'directions_bus', color: '#78909C' },
  { value: 'car-rental', label: 'Carro', icon: 'directions_car', color: '#607D8B' },
  { value: 'trajectory', label: 'Trajeto', icon: 'moving', color: '#8B5CF6' },
  { value: 'custom', label: 'Outro', icon: 'edit_note', color: '#9E9E9E' },
];

const DURATION_PRESETS = [
  { label: '15min', value: 15 },
  { label: '30min', value: 30 },
  { label: '1h', value: 60 },
  { label: '2h', value: 120 },
  { label: '3h', value: 180 },
];

const TRAJECTORY_MODES = [
  { value: 'walking', icon: 'directions_walk', label: 'A pé' },
  { value: 'uber', icon: 'local_taxi', label: 'Uber/Taxi' },
  { value: 'metro', icon: 'subway', label: 'Metrô' },
  { value: 'bus', icon: 'directions_bus', label: 'Ônibus' },
  { value: 'car', icon: 'directions_car', label: 'Carro' },
];

@Component({
  selector: 'app-quick-add-dialog',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CommonModule, FormsModule],
  template: `
    <div class="quick-add">
      <div class="qa-header">
        <mat-icon [style.color]="selectedType().color">{{ selectedType().icon }}</mat-icon>
        <h3>Adicionar {{ selectedType().label }}</h3>
        <button mat-icon-button class="qa-close" (click)="cancel()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Type selector chips -->
      <div class="qa-types">
        @for (t of typeOptions; track t.value) {
          <button class="qa-type-chip" [class.active]="type() === t.value"
                  (click)="type.set(t.value)" [style.--chip-color]="t.color">
            <mat-icon>{{ t.icon }}</mat-icon>
          </button>
        }
      </div>

      <!-- Trajectory-specific fields -->
      @if (type() === 'trajectory') {
        <div class="qa-trajectory">
          <mat-form-field appearance="outline" class="qa-field">
            <mat-label>De</mat-label>
            <input matInput [(ngModel)]="trajectoryFrom" placeholder="Ex: Hotel">
            <mat-icon matPrefix>trip_origin</mat-icon>
          </mat-form-field>
          <mat-icon class="qa-arrow">arrow_downward</mat-icon>
          <mat-form-field appearance="outline" class="qa-field">
            <mat-label>Para</mat-label>
            <input matInput [(ngModel)]="trajectoryTo" placeholder="Ex: Aeroporto">
            <mat-icon matPrefix>place</mat-icon>
          </mat-form-field>
          <div class="qa-modes">
            @for (mode of trajectoryModes; track mode.value) {
              <button class="qa-mode-chip" [class.active]="selectedMode() === mode.value"
                      (click)="selectedMode.set(mode.value)">
                <mat-icon>{{ mode.icon }}</mat-icon>
                <span>{{ mode.label }}</span>
              </button>
            }
          </div>
        </div>
      } @else {
        <!-- Regular item label -->
        <mat-form-field appearance="outline" class="qa-field">
          <mat-label>Nome</mat-label>
          <input matInput [(ngModel)]="label" placeholder="Ex: Passeio no centro" cdkFocusInitial>
        </mat-form-field>
      }

      <!-- Time -->
      <div class="qa-time-row">
        <mat-form-field appearance="outline" class="qa-time-field">
          <mat-label>Horário</mat-label>
          <input matInput type="time" [(ngModel)]="timeSlot">
          <mat-icon matPrefix>schedule</mat-icon>
        </mat-form-field>

        <div class="qa-duration-presets">
          @for (d of durationPresets; track d.value) {
            <button class="qa-dur-chip" [class.active]="duration() === d.value"
                    (click)="duration.set(d.value)">
              {{ d.label }}
            </button>
          }
        </div>
      </div>

      <!-- Actions -->
      <div class="qa-actions">
        <button mat-button (click)="cancel()">Cancelar</button>
        <button mat-flat-button color="primary" (click)="submit()" [disabled]="!canSubmit()">
          <mat-icon>add</mat-icon> Adicionar
        </button>
      </div>
    </div>
  `,
  styles: [`
    .quick-add {
      padding: 20px;
      max-width: 420px;
    }

    .qa-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;

      mat-icon { font-size: 24px; width: 24px; height: 24px; }
      h3 { margin: 0; font-size: 1.05rem; font-weight: 700; flex: 1; }
      .qa-close { margin: -8px -8px -8px 0; }
    }

    .qa-types {
      display: flex;
      gap: 6px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .qa-type-chip {
      width: 36px;
      height: 36px;
      border: 2px solid transparent;
      border-radius: 10px;
      background: rgba(0, 0, 0, 0.04);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;

      mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--chip-color); }

      &.active {
        border-color: var(--chip-color);
        background: color-mix(in srgb, var(--chip-color) 10%, transparent);
      }

      &:hover:not(.active) { background: rgba(0, 0, 0, 0.08); }
    }

    .qa-field {
      width: 100%;
    }

    .qa-trajectory {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0;

      .qa-arrow {
        color: #8B5CF6;
        font-size: 20px;
        margin: -8px 0;
        z-index: 1;
      }
    }

    .qa-modes {
      display: flex;
      gap: 6px;
      margin-top: 8px;
      flex-wrap: wrap;
      justify-content: center;
      width: 100%;
    }

    .qa-mode-chip {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 5px 12px;
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 20px;
      background: transparent;
      font-size: 0.72rem;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      transition: all 0.2s;

      mat-icon { font-size: 15px; width: 15px; height: 15px; }

      &.active {
        background: rgba(139, 92, 246, 0.1);
        border-color: #8B5CF6;
        color: #8B5CF6;
      }
    }

    .qa-time-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-top: 4px;
    }

    .qa-time-field {
      width: 130px;
      flex-shrink: 0;
    }

    .qa-duration-presets {
      display: flex;
      gap: 5px;
      flex-wrap: wrap;
      padding-top: 8px;
    }

    .qa-dur-chip {
      padding: 4px 10px;
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 16px;
      background: transparent;
      font-size: 0.72rem;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      transition: all 0.15s;

      &.active {
        background: var(--triply-primary, #f97316);
        border-color: var(--triply-primary, #f97316);
        color: #fff;
      }

      &:hover:not(.active) { background: rgba(0, 0, 0, 0.04); }
    }

    .qa-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid rgba(0, 0, 0, 0.06);
    }
  `],
})
export class QuickAddDialogComponent {
  readonly data: QuickAddDialogData = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<QuickAddDialogComponent>);

  readonly typeOptions = TYPE_OPTIONS;
  readonly durationPresets = DURATION_PRESETS;
  readonly trajectoryModes = TRAJECTORY_MODES;

  readonly type = signal<ItineraryItemType>(this.data.type);
  readonly duration = signal(30);
  readonly selectedMode = signal('uber');

  label = '';
  timeSlot = this.data.inheritTime ?? '';
  trajectoryFrom = '';
  trajectoryTo = '';

  readonly selectedType = computed(() =>
    this.typeOptions.find(t => t.value === this.type()) ?? this.typeOptions[0]
  );

  readonly canSubmit = computed(() => {
    if (this.type() === 'trajectory') {
      return this.trajectoryFrom.trim().length > 0 && this.trajectoryTo.trim().length > 0;
    }
    return this.label.trim().length > 0;
  });

  cancel(): void {
    this.dialogRef.close();
  }

  submit(): void {
    const itemLabel = this.type() === 'trajectory'
      ? `${this.trajectoryFrom.trim()} → ${this.trajectoryTo.trim()}`
      : this.label.trim();

    const notes = this.type() === 'trajectory'
      ? this.trajectoryModes.find(m => m.value === this.selectedMode())?.label ?? ''
      : '';

    const item: ItineraryItem = {
      id: crypto.randomUUID(),
      type: this.type(),
      refId: null,
      date: this.data.date,
      timeSlot: this.timeSlot || null,
      durationMinutes: this.duration(),
      label: itemLabel,
      notes,
      order: this.data.insertIndex,
      isPaid: false,
      attachment: null,
    };

    this.dialogRef.close(item);
  }
}
