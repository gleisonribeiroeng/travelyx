import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { BudgetService } from '../../core/services/budget.service';
import { TripStateService } from '../../core/services/trip-state.service';
import { TripScoreService } from '../../core/services/trip-score.service';
import { ManualExpense, ExpenseCategory } from '../../core/models/trip.models';

@Component({
  selector: 'app-budget',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CommonModule, CurrencyPipe, FormsModule],
  templateUrl: './budget.component.html',
  styleUrl: './budget.component.scss',
})
export class BudgetComponent {
  protected readonly budget = inject(BudgetService);
  protected readonly tripState = inject(TripStateService);
  protected readonly scoreService = inject(TripScoreService);

  readonly viewMode = signal<'category' | 'day'>('category');
  readonly showExpenseForm = signal(false);

  // Form fields
  expenseLabel = '';
  expenseAmount: number | null = null;
  expenseCategory: ExpenseCategory = 'food';
  expenseDate = '';
  expenseNotes = '';

  readonly categories: { value: ExpenseCategory; label: string }[] = [
    { value: 'food', label: 'Alimentacao' },
    { value: 'shopping', label: 'Compras' },
    { value: 'transport', label: 'Transporte' },
    { value: 'activity', label: 'Passeio' },
    { value: 'insurance', label: 'Seguro' },
    { value: 'visa', label: 'Visto' },
    { value: 'other', label: 'Outros' },
  ];

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

  addExpense(): void {
    if (!this.expenseLabel || !this.expenseAmount || this.expenseAmount <= 0) return;
    const expense: ManualExpense = {
      id: crypto.randomUUID(),
      tripId: this.tripState.trip().id,
      category: this.expenseCategory,
      label: this.expenseLabel,
      amount: this.expenseAmount,
      currency: 'BRL',
      date: this.expenseDate || new Date().toISOString().split('T')[0],
      isPaid: false,
      notes: this.expenseNotes,
    };
    this.tripState.addManualExpense(expense);
    this.resetForm();
  }

  removeExpense(id: string): void {
    this.tripState.removeManualExpense(id);
  }

  toggleExpensePaid(expense: ManualExpense): void {
    this.tripState.updateManualExpense({ ...expense, isPaid: !expense.isPaid });
  }

  private resetForm(): void {
    this.expenseLabel = '';
    this.expenseAmount = null;
    this.expenseCategory = 'food';
    this.expenseDate = '';
    this.expenseNotes = '';
    this.showExpenseForm.set(false);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }
}
