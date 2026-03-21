import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { TranslationService } from '../../core/i18n/translation.service';

export interface TimeEditorData {
  label: string;
  type: string;
  timeSlot: string | null;
  durationMinutes: number | null;
}

export interface TimeEditorResult {
  timeSlot: string;
  durationMinutes: number;
}

@Component({
  selector: 'app-time-editor-dialog',
  standalone: true,
  imports: [MATERIAL_IMPORTS, FormsModule],
  template: `
    <h2 mat-dialog-title class="editor-title">
      <mat-icon>schedule</mat-icon>
      {{ i18n.t('timeEditor.title') }}
    </h2>

    <mat-dialog-content class="editor-content">
      <div class="item-name">{{ data.label }}</div>

      <!-- Time input -->
      <div class="field-group">
        <label>{{ i18n.t('timeEditor.startTime') }}</label>
        <input type="time" class="time-input" [(ngModel)]="startTime" (ngModelChange)="updatePreview()">
      </div>

      <!-- Duration with presets -->
      <div class="field-group">
        <label>{{ i18n.t('timeEditor.duration') }}</label>
        <div class="duration-presets">
          @for (preset of durationPresets; track preset.minutes) {
            <button class="preset-chip" [class.active]="durationMinutes() === preset.minutes"
                    (click)="setDuration(preset.minutes)">
              {{ preset.label }}
            </button>
          }
        </div>
        <div class="custom-duration">
          <div class="duration-spinners">
            <div class="spinner-group">
              <label>{{ i18n.t('timeEditor.hours') }}</label>
              <div class="spinner">
                <button mat-icon-button (click)="adjustHours(-1)"><mat-icon>remove</mat-icon></button>
                <span class="spinner-value">{{ durationHours() }}</span>
                <button mat-icon-button (click)="adjustHours(1)"><mat-icon>add</mat-icon></button>
              </div>
            </div>
            <span class="spinner-sep">:</span>
            <div class="spinner-group">
              <label>{{ i18n.t('timeEditor.minutes') }}</label>
              <div class="spinner">
                <button mat-icon-button (click)="adjustMinutes(-15)"><mat-icon>remove</mat-icon></button>
                <span class="spinner-value">{{ durationMins() }}</span>
                <button mat-icon-button (click)="adjustMinutes(15)"><mat-icon>add</mat-icon></button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Preview -->
      <div class="time-preview">
        <div class="preview-block">
          <span class="preview-start">{{ startTime }}</span>
          <div class="preview-bar">
            <div class="preview-fill"></div>
          </div>
          <span class="preview-end">{{ endTimePreview() }}</span>
        </div>
        <span class="preview-duration">{{ formatDuration(durationMinutes()) }}</span>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">{{ i18n.t('common.cancel') }}</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="!startTime">
        {{ i18n.t('common.save') }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .editor-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1.1rem;
      mat-icon { color: var(--triply-primary); }
    }

    .editor-content { min-width: 320px; padding-top: 8px; }

    .item-name {
      font-weight: 600;
      font-size: 0.95rem;
      color: var(--triply-text-primary);
      margin-bottom: 16px;
      padding: 8px 12px;
      background: var(--triply-bg-subtle, #f8f8fc);
      border-radius: 8px;
      border-left: 3px solid var(--triply-primary);
    }

    .field-group {
      margin-bottom: 16px;
      > label {
        display: block;
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--triply-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 6px;
      }
    }

    .time-input {
      width: 100%;
      padding: 10px 14px;
      border: 1.5px solid var(--triply-border, #e0e0e0);
      border-radius: 8px;
      font-size: 1.2rem;
      font-weight: 600;
      font-family: inherit;
      color: var(--triply-text-primary);
      text-align: center;
      transition: border-color 0.2s;
      &:focus {
        outline: none;
        border-color: var(--triply-primary);
      }
    }

    .duration-presets {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 10px;
    }

    .preset-chip {
      padding: 6px 14px;
      border: 1.5px solid var(--triply-border, #e0e0e0);
      border-radius: 20px;
      background: white;
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
      font-family: inherit;
      &:hover { border-color: var(--triply-primary); }
      &.active {
        background: var(--triply-primary);
        color: white;
        border-color: var(--triply-primary);
      }
    }

    .duration-spinners {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .spinner-group {
      text-align: center;
      label {
        font-size: 0.65rem;
        color: var(--triply-text-tertiary);
        text-transform: uppercase;
      }
    }

    .spinner {
      display: flex;
      align-items: center;
      gap: 4px;
      .spinner-value {
        font-size: 1.3rem;
        font-weight: 700;
        min-width: 32px;
        text-align: center;
        color: var(--triply-text-primary);
      }
    }

    .spinner-sep {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--triply-text-tertiary);
      margin-top: 14px;
    }

    .time-preview {
      background: var(--triply-bg-subtle, #f8f8fc);
      border-radius: 10px;
      padding: 14px 16px;
      text-align: center;
    }

    .preview-block {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .preview-start, .preview-end {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--triply-text-primary);
      font-variant-numeric: tabular-nums;
    }

    .preview-bar {
      flex: 1;
      height: 4px;
      background: var(--triply-border, #e0e0e0);
      border-radius: 2px;
      position: relative;
      .preview-fill {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: var(--triply-primary);
        border-radius: 2px;
      }
    }

    .preview-duration {
      display: block;
      margin-top: 6px;
      font-size: 0.8rem;
      color: var(--triply-text-secondary);
    }
  `],
})
export class TimeEditorDialogComponent implements OnInit {
  readonly data = inject<TimeEditorData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<TimeEditorDialogComponent>);
  readonly i18n = inject(TranslationService);

  startTime = '';
  readonly durationMinutes = signal(60);

  readonly durationHours = computed(() => Math.floor(this.durationMinutes() / 60));
  readonly durationMins = computed(() => this.durationMinutes() % 60);

  readonly durationPresets = [
    { label: '30min', minutes: 30 },
    { label: '1h', minutes: 60 },
    { label: '1h30', minutes: 90 },
    { label: '2h', minutes: 120 },
    { label: '3h', minutes: 180 },
    { label: '4h', minutes: 240 },
    { label: '6h', minutes: 360 },
    { label: '8h', minutes: 480 },
  ];

  ngOnInit(): void {
    this.startTime = this.data.timeSlot || '09:00';
    this.durationMinutes.set(this.data.durationMinutes || 60);
  }

  readonly endTimePreview = computed(() => {
    if (!this.startTime) return '--:--';
    const [h, m] = this.startTime.split(':').map(Number);
    const total = h * 60 + m + this.durationMinutes();
    const endH = Math.floor(total / 60) % 24;
    const endM = total % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  });

  updatePreview(): void {
    // Triggers reactivity via startTime binding
  }

  setDuration(minutes: number): void {
    this.durationMinutes.set(minutes);
  }

  adjustHours(delta: number): void {
    const current = this.durationMinutes();
    const newVal = current + delta * 60;
    if (newVal >= 15 && newVal <= 1440) {
      this.durationMinutes.set(newVal);
    }
  }

  adjustMinutes(delta: number): void {
    const current = this.durationMinutes();
    const newVal = current + delta;
    if (newVal >= 15 && newVal <= 1440) {
      this.durationMinutes.set(newVal);
    }
  }

  formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}min`;
    return m > 0 ? `${h}h${m}min` : `${h}h`;
  }

  save(): void {
    this.dialogRef.close({
      timeSlot: this.startTime,
      durationMinutes: this.durationMinutes(),
    } as TimeEditorResult);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
