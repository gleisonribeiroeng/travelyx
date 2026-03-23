import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ExpenseSplit, UserBalance, Settlement } from '../models/collaboration.models';

@Injectable({ providedIn: 'root' })
export class ExpensesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api`;

  // ── Core state ──
  private readonly _expenses = signal<ExpenseSplit[]>([]);
  private readonly _balances = signal<UserBalance[]>([]);
  private readonly _settlements = signal<Settlement[]>([]);

  // ── Public readonly ──
  readonly expenses = this._expenses.asReadonly();
  readonly balances = this._balances.asReadonly();
  readonly settlements = this._settlements.asReadonly();

  // ---------------------------------------------------------------------------
  // Load expenses
  // ---------------------------------------------------------------------------

  loadExpenses(tripId: string): void {
    this.http
      .get<ExpenseSplit[]>(`${this.baseUrl}/trips/${tripId}/expenses`)
      .subscribe({
        next: (data) => this._expenses.set(data),
      });
  }

  // ---------------------------------------------------------------------------
  // Load balance
  // ---------------------------------------------------------------------------

  loadBalance(tripId: string): void {
    this.http
      .get<{ balances: UserBalance[]; settlements: Settlement[] }>(
        `${this.baseUrl}/trips/${tripId}/expenses/balance`,
      )
      .subscribe({
        next: (data) => {
          this._balances.set(data.balances);
          this._settlements.set(data.settlements);
        },
      });
  }

  // ---------------------------------------------------------------------------
  // Create expense
  // ---------------------------------------------------------------------------

  createExpense(
    tripId: string,
    data: {
      label: string;
      totalAmount: number;
      currency: string;
      splitMode: string;
      date: string;
      entries: { userId: string; amount: number }[];
    },
  ): Observable<ExpenseSplit> {
    return this.http
      .post<ExpenseSplit>(`${this.baseUrl}/trips/${tripId}/expenses`, data)
      .pipe(
        tap((expense) => {
          this._expenses.update((list) => [expense, ...list]);
        }),
      );
  }

  // ---------------------------------------------------------------------------
  // Toggle paid status on an entry
  // ---------------------------------------------------------------------------

  togglePaid(
    tripId: string,
    expenseId: string,
    entryId: string,
  ): Observable<ExpenseSplit> {
    return this.http
      .put<ExpenseSplit>(
        `${this.baseUrl}/trips/${tripId}/expenses/${expenseId}/entries/${entryId}/toggle-paid`,
        {},
      )
      .pipe(
        tap((updated) => {
          this._expenses.update((list) =>
            list.map((e) => (e.id === updated.id ? updated : e)),
          );
        }),
      );
  }

  // ---------------------------------------------------------------------------
  // Remove expense
  // ---------------------------------------------------------------------------

  removeExpense(tripId: string, expenseId: string): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/trips/${tripId}/expenses/${expenseId}`)
      .pipe(
        tap(() => {
          this._expenses.update((list) => list.filter((e) => e.id !== expenseId));
        }),
      );
  }

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  reset(): void {
    this._expenses.set([]);
    this._balances.set([]);
    this._settlements.set([]);
  }
}
