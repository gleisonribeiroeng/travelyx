import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MATERIAL_IMPORTS } from '../../../core/material.exports';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { ChecklistItem } from '../../../core/models/trip.models';
import { ChecklistService } from '../../../core/services/checklist.service';

export interface ChecklistAddDialogResult {
  label: string;
  category: ChecklistItem['category'];
  priority: ChecklistItem['priority'];
  dueDate: string | null;
}

@Component({
  selector: 'app-checklist-add-dialog',
  standalone: true,
  imports: [MATERIAL_IMPORTS, FormsModule, TranslatePipe],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="title-icon">add_task</mat-icon>
      {{ 'checklist.addManualItem' | translate }}
    </h2>

    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ 'checklist.description' | translate }}</mat-label>
        <input matInput [(ngModel)]="label" (keydown.enter)="submit()" cdkFocusInitial />
        <mat-icon matPrefix>edit_note</mat-icon>
      </mat-form-field>

      <div class="form-row">
        <mat-form-field appearance="outline">
          <mat-label>{{ 'checklist.category' | translate }}</mat-label>
          <mat-select [(ngModel)]="category">
            @for (cat of categoryOrder; track cat) {
              <mat-option [value]="cat">
                <mat-icon>{{ getCategoryIcon(cat) }}</mat-icon>
                {{ getCategoryLabel(cat) }}
              </mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'checklist.priority' | translate }}</mat-label>
          <mat-select [(ngModel)]="priority">
            <mat-option value="high">
              <span class="priority-dot high"></span>
              {{ 'checklist.priorityHigh' | translate }}
            </mat-option>
            <mat-option value="medium">
              <span class="priority-dot medium"></span>
              {{ 'checklist.priorityMedium' | translate }}
            </mat-option>
            <mat-option value="low">
              <span class="priority-dot low"></span>
              {{ 'checklist.priorityLow' | translate }}
            </mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ 'checklist.dueDate' | translate }}</mat-label>
        <input matInput type="date" [(ngModel)]="dueDate" />
        <mat-icon matPrefix>event</mat-icon>
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">{{ 'checklist.cancel' | translate }}</button>
      <button mat-flat-button color="primary" (click)="submit()" [disabled]="!label.trim()">
        <mat-icon>add</mat-icon>
        {{ 'checklist.addItem' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host { display: block; }

    h2 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font-size: 1.15rem;
      font-weight: 600;
    }

    .title-icon {
      color: var(--triply-primary, #6c5ce7);
    }

    mat-dialog-content {
      padding-top: 16px !important;
      min-width: 340px;
    }

    .full-width { width: 100%; }

    .form-row {
      display: flex;
      gap: 12px;

      mat-form-field { flex: 1; }
    }

    .priority-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 6px;

      &.high { background: #e74c3c; }
      &.medium { background: #f39c12; }
      &.low { background: #95a5a6; }
    }

    @media (max-width: 480px) {
      mat-dialog-content { min-width: unset; }
      .form-row { flex-direction: column; gap: 0; }
    }
  `],
})
export class ChecklistAddDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ChecklistAddDialogComponent>);
  private readonly checklistService = inject(ChecklistService);

  label = '';
  category: ChecklistItem['category'] = 'logistics';
  priority: ChecklistItem['priority'] = 'medium';
  dueDate = '';

  readonly categoryOrder: ChecklistItem['category'][] = ['documents', 'finance', 'logistics', 'packing', 'health'];

  getCategoryIcon(cat: string): string {
    return this.checklistService.getCategoryIcon(cat);
  }

  getCategoryLabel(cat: string): string {
    return this.checklistService.getCategoryLabel(cat);
  }

  submit(): void {
    if (!this.label.trim()) return;
    this.dialogRef.close({
      label: this.label.trim(),
      category: this.category,
      priority: this.priority,
      dueDate: this.dueDate || null,
    } as ChecklistAddDialogResult);
  }
}
