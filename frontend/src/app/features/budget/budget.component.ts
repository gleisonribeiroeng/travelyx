import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { BudgetService } from '../../core/services/budget.service';
import { TripStateService } from '../../core/services/trip-state.service';
import { TripScoreService } from '../../core/services/trip-score.service';
import { ManualExpense } from '../../core/models/trip.models';
import { AddExpenseDialogComponent, AddExpenseResult } from './add-expense-dialog.component';

@Component({
  selector: 'app-budget',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CommonModule, CurrencyPipe],
  templateUrl: './budget.component.html',
  styleUrl: './budget.component.scss',
})
export class BudgetComponent {
  protected readonly budget = inject(BudgetService);
  protected readonly tripState = inject(TripStateService);
  protected readonly scoreService = inject(TripScoreService);
  private readonly dialog = inject(MatDialog);

  readonly viewMode = signal<'category' | 'day'>('category');

  readonly paidPercentage = computed(() => {
    const s = this.budget.summary();
    return s.totalPlanned > 0 ? Math.round((s.totalPaid / s.totalPlanned) * 100) : 0;
  });

  readonly dayBreakdown = computed(() => {
    const byDay = this.budget.summary().byDay;
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data }));
  });

  openAddExpense(): void {
    const ref = this.dialog.open(AddExpenseDialogComponent, {
      width: '480px',
      panelClass: 'mobile-fullscreen-dialog',
    });
    ref.afterClosed().subscribe((result: AddExpenseResult | undefined) => {
      if (!result) return;
      const expense: ManualExpense = {
        id: crypto.randomUUID(),
        tripId: this.tripState.trip().id,
        category: result.category,
        label: result.label,
        amount: result.amount,
        currency: 'BRL',
        date: result.date,
        isPaid: false,
        notes: '',
      };
      this.tripState.addManualExpense(expense);
    });
  }

  removeExpense(id: string): void {
    this.tripState.removeManualExpense(id);
  }

  toggleExpensePaid(expense: ManualExpense): void {
    this.tripState.updateManualExpense({ ...expense, isPaid: !expense.isPaid });
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }
}
