import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface RateCache {
  rates: Record<string, number>;
  fetchedAt: number;
}

/**
 * Simple currency conversion using the free exchangerate.host API.
 * Caches rates for 1 hour per base currency.
 */
@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);
  private readonly cache = new Map<string, RateCache>();
  private readonly TTL_MS = 60 * 60 * 1000; // 1 hour

  constructor(private readonly http: HttpService) {}

  async convert(amount: number, from: string, to: string): Promise<number> {
    if (from === to || amount === 0) return amount;

    const rate = await this.getRate(from, to);
    return Math.round(amount * rate * 100) / 100;
  }

  private async getRate(from: string, to: string): Promise<number> {
    const cached = this.cache.get(from);
    if (cached && Date.now() - cached.fetchedAt < this.TTL_MS && cached.rates[to]) {
      return cached.rates[to];
    }

    try {
      // Free API, no key needed — https://open.er-api.com/v6/latest/{base}
      const { data } = await firstValueFrom(
        this.http.get(`https://open.er-api.com/v6/latest/${from}`),
      );

      if (data?.result === 'success' && data.rates) {
        this.cache.set(from, { rates: data.rates, fetchedAt: Date.now() });
        const rate = data.rates[to];
        if (rate) return rate;
      }

      this.logger.warn(`Exchange rate ${from}→${to} not found, using 1.0`);
      return 1;
    } catch (err: any) {
      this.logger.error(`Failed to fetch exchange rates: ${err.message}`);
      return 1;
    }
  }
}
