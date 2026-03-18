import { Injectable, signal } from '@angular/core';

export type CurrencyCode = 'BRL' | 'USD' | 'EUR';

const STORAGE_KEY = 'triply_currency';
const SUPPORTED: CurrencyCode[] = ['BRL', 'USD', 'EUR'];

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  private readonly _currency = signal<CurrencyCode>(this.detect());

  readonly currency = this._currency.asReadonly();

  setCurrency(code: CurrencyCode): void {
    this._currency.set(code);
    localStorage.setItem(STORAGE_KEY, code);
  }

  private detect(): CurrencyCode {
    const saved = localStorage.getItem(STORAGE_KEY) as CurrencyCode | null;
    if (saved && SUPPORTED.includes(saved)) return saved;
    return 'BRL';
  }
}
