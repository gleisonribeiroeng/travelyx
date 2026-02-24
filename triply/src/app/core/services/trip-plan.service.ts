import { Injectable, signal, computed } from '@angular/core';
import {
  TripPlan,
  TravelerProfile,
  TripObjective,
  TransportPreference,
  FlightPaymentMethod,
  BreakfastPreference,
  SeasonInfo,
  LegalRequirements,
} from '../models/trip-plan.model';
import { DESTINATION_DB } from '../data/destinations.data';

@Injectable({ providedIn: 'root' })
export class TripPlanService {
  private readonly _tripPlan = signal<TripPlan | null>(null);

  readonly tripPlan = this._tripPlan.asReadonly();
  readonly hasPlan = computed(() => this._tripPlan() !== null);

  savePlan(plan: TripPlan): void {
    this._tripPlan.set(plan);
  }

  clearPlan(): void {
    this._tripPlan.set(null);
  }

  /**
   * Look up destination metadata from static DB.
   */
  getDestinationMetadata(country: string) {
    return DESTINATION_DB[country] ?? null;
  }

  /**
   * Check if given month is high season for the country.
   */
  isHighSeason(country: string, month: number): boolean {
    const meta = DESTINATION_DB[country];
    if (!meta) return false;
    return meta.highSeasonMonths.includes(month);
  }

  /**
   * Get season info for a country and departure month.
   */
  getSeasonInfo(country: string, departureMonth: number): SeasonInfo | null {
    const meta = DESTINATION_DB[country];
    if (!meta) return null;

    const isHigh = meta.highSeasonMonths.includes(departureMonth);
    const temp = meta.avgTempByMonth[departureMonth];

    // Find nearby low-season months
    const lowSeasonMonths = Array.from({ length: 12 }, (_, i) => i + 1)
      .filter(m => !meta.highSeasonMonths.includes(m));
    const monthNames = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const altMonths = lowSeasonMonths.slice(0, 3).map(m => monthNames[m]).join(', ');

    return {
      isHighSeason: isHigh,
      priceIncrease: isHigh ? '20-40% acima da média' : 'Preços normais ou abaixo da média',
      crowdLevel: isHigh ? 'Alto — espere filas e lotação' : 'Moderado a baixo',
      alternativeDates: isHigh ? `Considere viajar em: ${altMonths}` : 'Você já está em baixa temporada!',
      avgTemperature: temp !== undefined ? `${temp}°C em média` : 'Dados indisponíveis',
      climate: meta.climate,
    };
  }

  /**
   * Get legal requirements for a country (from Brazilian traveler perspective).
   */
  getLegalRequirements(country: string): LegalRequirements | null {
    const meta = DESTINATION_DB[country];
    return meta?.legal ?? null;
  }

  /**
   * Infer traveler profile from counts.
   */
  inferProfile(adults: number, children: number): TravelerProfile {
    if (adults === 1 && children === 0) return 'solo';
    if (adults === 2 && children === 0) return 'couple';
    if (children > 0) return 'family';
    if (adults >= 3) return 'friends';
    return 'couple';
  }
}
