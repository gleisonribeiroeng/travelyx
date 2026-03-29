import { Injectable, signal } from '@angular/core';

export type CurrencyCode = 'BRL' | 'USD' | 'EUR' | 'GBP';

const SUPPORTED: CurrencyCode[] = ['BRL', 'USD', 'EUR', 'GBP'];

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  private readonly _currency = signal<CurrencyCode>('BRL');

  readonly currency = this._currency.asReadonly();

  /** Sync currency from the active trip — this is the primary source */
  syncFromTrip(code: string): void {
    const valid = SUPPORTED.includes(code as CurrencyCode) ? (code as CurrencyCode) : 'BRL';
    this._currency.set(valid);
  }

  setCurrency(code: CurrencyCode): void {
    this._currency.set(code);
  }
}
