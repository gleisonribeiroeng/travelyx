import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MATERIAL_IMPORTS } from '../../../core/material.exports';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import { Collaborator } from '../../../core/models/collaboration.models';

export interface ExpenseSplitDialogData {
  tripId: string;
  collaborators: Collaborator[];
  currency: string;
}

export interface ExpenseSplitDialogResult {
  label: string;
  totalAmount: number;
  currency: string;
  splitMode: 'EQUAL' | 'PROPORTIONAL' | 'SINGLE_PAYER';
  date: string;
  entries: { userId: string; amount: number }[];
}

@Component({
  selector: 'app-expense-split-dialog',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="expense-dialog">
      <!-- Header -->
      <div class="dialog-header">
        <mat-icon class="header-icon">receipt_long</mat-icon>
        <h2>{{ 'collab.addExpense' | translate }}</h2>
      </div>

      <!-- Form -->
      <div class="expense-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'collab.expenseLabel' | translate }}</mat-label>
          <input matInput [(ngModel)]="label" [placeholder]="i18n.t('collab.expenseLabelPlaceholder')" />
          <mat-icon matPrefix>label</mat-icon>
        </mat-form-field>

        <div class="amount-row">
          <mat-form-field appearance="outline" class="amount-field">
            <mat-label>{{ 'collab.expenseAmount' | translate }}</mat-label>
            <input matInput type="number" [(ngModel)]="totalAmount" min="0" step="0.01" />
            <mat-icon matPrefix>payments</mat-icon>
          </mat-form-field>
          <span class="currency-label">{{ data.currency }}</span>
        </div>

        <!-- Split Mode -->
        <div class="split-mode-section">
          <span class="section-label">{{ 'collab.expenseSplitMode' | translate }}</span>
          <mat-chip-listbox [(ngModel)]="splitMode" (change)="onModeChange()">
            <mat-chip-option value="EQUAL">{{ 'collab.splitEqual' | translate }}</mat-chip-option>
            <mat-chip-option value="PROPORTIONAL">{{ 'collab.splitProportional' | translate }}</mat-chip-option>
            <mat-chip-option value="SINGLE_PAYER">{{ 'collab.splitSinglePayer' | translate }}</mat-chip-option>
          </mat-chip-listbox>
        </div>

        <!-- EQUAL mode: checkboxes -->
        @if (splitMode === 'EQUAL') {
          <div class="participants-section">
            <span class="section-label">{{ 'collab.expenseParticipants' | translate }}</span>
            <div class="participants-list">
              @for (collab of data.collaborators; track collab.id) {
                <label class="participant-row">
                  <mat-checkbox [checked]="isParticipant(collab.userId)"
                                (change)="toggleParticipant(collab.userId)" color="primary">
                  </mat-checkbox>
                  <div class="participant-avatar">
                    @if (collab.picture) {
                      <img [src]="collab.picture" [alt]="collab.name" />
                    } @else {
                      <span class="avatar-initial">{{ collab.name?.charAt(0)?.toUpperCase() }}</span>
                    }
                  </div>
                  <span class="participant-name">{{ collab.name }}</span>
                  <span class="participant-amount">{{ perPersonAmount() | number:'1.2-2' }} {{ data.currency }}</span>
                </label>
              }
            </div>
          </div>
        }

        <!-- PROPORTIONAL mode: individual inputs -->
        @if (splitMode === 'PROPORTIONAL') {
          <div class="participants-section">
            <span class="section-label">{{ 'collab.expenseAmountsPerPerson' | translate }}</span>
            <div class="participants-list">
              @for (collab of data.collaborators; track collab.id) {
                <div class="participant-row proportional">
                  <div class="participant-avatar">
                    @if (collab.picture) {
                      <img [src]="collab.picture" [alt]="collab.name" />
                    } @else {
                      <span class="avatar-initial">{{ collab.name?.charAt(0)?.toUpperCase() }}</span>
                    }
                  </div>
                  <span class="participant-name">{{ collab.name }}</span>
                  <mat-form-field appearance="outline" class="individual-amount">
                    <input matInput type="number" [ngModel]="getIndividualAmount(collab.userId)"
                           (ngModelChange)="setIndividualAmount(collab.userId, $event)" min="0" step="0.01" />
                  </mat-form-field>
                </div>
              }
            </div>
          </div>
        }

        <!-- SINGLE_PAYER mode: select payer -->
        @if (splitMode === 'SINGLE_PAYER') {
          <div class="participants-section">
            <span class="section-label">{{ 'collab.expenseWhoPays' | translate }}</span>
            <mat-form-field appearance="outline" class="full-width">
              <mat-select [(ngModel)]="singlePayerId">
                @for (collab of data.collaborators; track collab.id) {
                  <mat-option [value]="collab.userId">{{ collab.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
        }

        <!-- Date -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'collab.expenseDate' | translate }}</mat-label>
          <input matInput type="date" [(ngModel)]="date" />
          <mat-icon matPrefix>event</mat-icon>
        </mat-form-field>
      </div>

      <!-- Actions -->
      <div class="dialog-actions">
        <button mat-button (click)="dialogRef.close()">{{ 'collab.cancel' | translate }}</button>
        <button mat-raised-button color="primary" [disabled]="!canSubmit()"
                (click)="submit()">
          <mat-icon>add</mat-icon>
          {{ 'collab.addExpense' | translate }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .expense-dialog {
      max-width: 520px;
      width: 100%;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;

      .header-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
        color: var(--triply-primary, #f97316);
      }

      h2 {
        margin: 0;
        font-size: 1.2rem;
        font-weight: 700;
        color: var(--triply-text-primary, #1a1a2e);
      }
    }

    .expense-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 16px;
    }

    .full-width { width: 100%; }

    .amount-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .amount-field { flex: 1; }

    .currency-label {
      font-size: 0.88rem;
      font-weight: 700;
      color: var(--triply-text-secondary, #666);
      padding-bottom: 22px;
    }

    .split-mode-section, .participants-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .section-label {
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--triply-text-secondary, #666);
    }

    .participants-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .participant-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: var(--triply-radius-sm, 8px);
      transition: background 0.15s ease;
      cursor: pointer;

      &:hover { background: var(--triply-surface-2, #f5f5f5); }

      &.proportional { cursor: default; }
    }

    .participant-avatar {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #f97316, #fb923c);
      flex-shrink: 0;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .avatar-initial {
        color: #fff;
        font-size: 0.7rem;
        font-weight: 700;
      }
    }

    .participant-name {
      font-size: 0.88rem;
      font-weight: 500;
      color: var(--triply-text-primary, #1a1a2e);
      flex: 1;
    }

    .participant-amount {
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--triply-primary, #f97316);
      flex-shrink: 0;
    }

    .individual-amount {
      width: 100px;
      flex-shrink: 0;

      ::ng-deep .mat-mdc-form-field-subscript-wrapper {
        display: none;
      }
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    @media (max-width: 480px) {
      .amount-row {
        flex-direction: column;
        align-items: stretch;
      }
      .currency-label { padding-bottom: 0; }
    }
  `],
})
export class ExpenseSplitDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ExpenseSplitDialogComponent>);
  readonly data: ExpenseSplitDialogData = inject(MAT_DIALOG_DATA);
  readonly i18n = inject(TranslationService);

  label = '';
  totalAmount = 0;
  splitMode: 'EQUAL' | 'PROPORTIONAL' | 'SINGLE_PAYER' = 'EQUAL';
  date = new Date().toISOString().split('T')[0];
  singlePayerId = '';

  // For EQUAL mode: which users participate
  private readonly _participants = signal<Set<string>>(
    new Set(this.data.collaborators.map((c) => c.userId)),
  );

  // For PROPORTIONAL mode: individual amounts
  private readonly _individualAmounts = signal<Record<string, number>>({});

  readonly perPersonAmount = computed(() => {
    const participants = this._participants();
    const count = participants.size;
    return count > 0 ? this.totalAmount / count : 0;
  });

  onModeChange(): void {
    if (this.splitMode === 'SINGLE_PAYER' && !this.singlePayerId && this.data.collaborators.length > 0) {
      this.singlePayerId = this.data.collaborators[0].userId;
    }
  }

  isParticipant(userId: string): boolean {
    return this._participants().has(userId);
  }

  toggleParticipant(userId: string): void {
    this._participants.update((set) => {
      const next = new Set(set);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

  getIndividualAmount(userId: string): number {
    return this._individualAmounts()?.[userId] ?? 0;
  }

  setIndividualAmount(userId: string, amount: number): void {
    this._individualAmounts.update((map) => ({ ...map, [userId]: amount }));
  }

  canSubmit(): boolean {
    if (!this.label.trim() || this.totalAmount <= 0) return false;
    if (this.splitMode === 'EQUAL' && this._participants().size === 0) return false;
    if (this.splitMode === 'SINGLE_PAYER' && !this.singlePayerId) return false;
    return true;
  }

  submit(): void {
    if (!this.canSubmit()) return;

    let entries: { userId: string; amount: number }[] = [];

    if (this.splitMode === 'EQUAL') {
      const perPerson = this.perPersonAmount();
      entries = [...this._participants()].map((userId) => ({ userId, amount: perPerson }));
    } else if (this.splitMode === 'PROPORTIONAL') {
      const amounts = this._individualAmounts();
      entries = this.data.collaborators
        .filter((c) => (amounts[c.userId] ?? 0) > 0)
        .map((c) => ({ userId: c.userId, amount: amounts[c.userId] }));
    } else if (this.splitMode === 'SINGLE_PAYER') {
      entries = [{ userId: this.singlePayerId, amount: this.totalAmount }];
    }

    const result: ExpenseSplitDialogResult = {
      label: this.label.trim(),
      totalAmount: this.totalAmount,
      currency: this.data.currency,
      splitMode: this.splitMode,
      date: this.date,
      entries,
    };

    this.dialogRef.close(result);
  }
}
