import { Component, inject, computed, signal, effect } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { BudgetService } from '../../core/services/budget.service';
import { TripStateService } from '../../core/services/trip-state.service';
import { TripScoreService } from '../../core/services/trip-score.service';
import { ManualExpense } from '../../core/models/trip.models';
import { AddExpenseDialogComponent, AddExpenseResult } from './add-expense-dialog.component';
import { DynamicCurrencyPipe } from '../../core/i18n/dynamic-currency.pipe';

@Component({
  selector: 'app-budget',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CommonModule, FormsModule, DecimalPipe, DynamicCurrencyPipe, TranslatePipe],
  templateUrl: './budget.component.html',
  styleUrl: './budget.component.scss',
})
export class BudgetComponent {
  private readonly PIE_COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#14b8a6', '#f59e0b', '#6366f1'];
  protected readonly budget = inject(BudgetService);
  protected readonly tripState = inject(TripStateService);
  protected readonly scoreService = inject(TripScoreService);
  private readonly dialog = inject(MatDialog);

  readonly viewMode = signal<'category' | 'day'>('category');
  readonly budgetGoal = signal<number | null>(null);
  readonly editingGoal = signal(false);
  readonly goalInput = signal('');

  readonly paidPercentage = computed(() => {
    const s = this.budget.summary();
    return s.totalPlanned > 0 ? Math.round((s.totalPaid / s.totalPlanned) * 100) : 0;
  });

  readonly goalPercentage = computed(() => {
    const goal = this.budgetGoal();
    if (!goal) return 0;
    return Math.round((this.budget.summary().totalPlanned / goal) * 100);
  });

  readonly pieSegments = computed(() => {
    const breakdown = this.budget.categoryBreakdown();
    const total = this.budget.summary().totalPlanned;
    if (total === 0) return [];
    let cumulative = 0;
    return breakdown.map((cat, i) => {
      const pct = (cat.planned / total) * 100;
      const start = cumulative;
      cumulative += pct;
      return { category: cat.category, label: this.budget.getCategoryLabel(cat.category), percentage: pct, start, color: this.PIE_COLORS[i % this.PIE_COLORS.length] };
    });
  });

  readonly conicGradient = computed(() => {
    const segs = this.pieSegments();
    if (segs.length === 0) return 'conic-gradient(#e5e7eb 0% 100%)';
    const stops = segs.map(s => `${s.color} ${s.start}% ${s.start + s.percentage}%`);
    return `conic-gradient(${stops.join(', ')})`;
  });

  readonly dayBreakdown = computed(() => {
    const byDay = this.budget.summary().byDay;
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data }));
  });

  constructor() {
    effect(() => {
      const tripId = this.tripState.trip().id;
      if (tripId) {
        const stored = localStorage.getItem(`travelyx_budget_goal_${tripId}`);
        if (stored) this.budgetGoal.set(Number(stored));
      }
    });
  }

  saveGoal(): void {
    const val = parseFloat(this.goalInput().replace(/\D/g, ''));
    if (val > 0) {
      const tripId = this.tripState.trip().id;
      this.budgetGoal.set(val);
      localStorage.setItem(`travelyx_budget_goal_${tripId}`, String(val));
    }
    this.editingGoal.set(false);
  }

  startEditGoal(): void {
    this.goalInput.set(this.budgetGoal()?.toString() || '');
    this.editingGoal.set(true);
  }

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
