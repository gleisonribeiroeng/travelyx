import { Pipe, PipeTransform, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { CurrencyService } from './currency.service';

/**
 * DynamicCurrencyPipe wraps Angular's CurrencyPipe but reads the
 * currency code from CurrencyService (which syncs with localStorage).
 *
 * Usage: {{ amount | dynamicCurrency }}
 *        {{ amount | dynamicCurrency:'symbol':'1.0-0' }}
 */
@Pipe({
  name: 'dynamicCurrency',
  standalone: true,
  pure: false,
})
export class DynamicCurrencyPipe implements PipeTransform {
  private readonly currencyService = inject(CurrencyService);
  private readonly currencyPipe = new CurrencyPipe('pt-BR');

  transform(
    value: number | string | null | undefined,
    display: 'code' | 'symbol' | 'symbol-narrow' | string = 'symbol',
    digitsInfo?: string,
  ): string | null {
    if (value == null) return null;
    const code = this.currencyService.currency();
    const locale = code === 'BRL' ? 'pt-BR' : code === 'EUR' ? 'pt-PT' : 'en-US';
    try {
      return new CurrencyPipe(locale).transform(value, code, display, digitsInfo);
    } catch {
      return String(value);
    }
  }
}
