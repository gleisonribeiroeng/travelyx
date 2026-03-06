import { Injectable, computed, inject } from '@angular/core';
import { TripStateService } from './trip-state.service';
import {
  BudgetSummary,
  ExpenseCategory,
  ItineraryItem,
  Trip,
} from '../models/trip.models';

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private readonly tripState = inject(TripStateService);

  readonly summary = computed<BudgetSummary>(() => {
    const trip = this.tripState.trip();
    const items = trip.itineraryItems;
    const expenses = this.tripState.manualExpenses();

    const byCategory: Record<string, { planned: number; paid: number }> = {};
    const byDay: Record<string, { planned: number; paid: number }> = {};

    for (const item of items) {
      const price = this.resolvePrice(item, trip);
      if (price === null || price === 0) continue;

      const cat = item.type as string;
      if (!byCategory[cat]) byCategory[cat] = { planned: 0, paid: 0 };
      byCategory[cat].planned += price;
      if (item.isPaid) byCategory[cat].paid += price;

      if (item.date) {
        if (!byDay[item.date]) byDay[item.date] = { planned: 0, paid: 0 };
        byDay[item.date].planned += price;
        if (item.isPaid) byDay[item.date].paid += price;
      }
    }

    for (const exp of expenses) {
      const cat = exp.category as string;
      if (!byCategory[cat]) byCategory[cat] = { planned: 0, paid: 0 };
      byCategory[cat].planned += exp.amount;
      if (exp.isPaid) byCategory[cat].paid += exp.amount;

      if (exp.date) {
        if (!byDay[exp.date]) byDay[exp.date] = { planned: 0, paid: 0 };
        byDay[exp.date].planned += exp.amount;
        if (exp.isPaid) byDay[exp.date].paid += exp.amount;
      }
    }

    const totalPlanned = Object.values(byCategory).reduce((s, c) => s + c.planned, 0);
    const totalPaid = Object.values(byCategory).reduce((s, c) => s + c.paid, 0);

    return {
      totalPlanned,
      totalPaid,
      totalPending: totalPlanned - totalPaid,
      currency: 'BRL',
      byCategory: byCategory as any,
      byDay,
    };
  });

  readonly categoryBreakdown = computed(() => {
    const summary = this.summary();
    const entries = Object.entries(summary.byCategory)
      .map(([key, val]) => ({
        category: key as ExpenseCategory,
        ...val!,
        percentage: summary.totalPlanned > 0 ? ((val!.planned / summary.totalPlanned) * 100) : 0,
      }))
      .sort((a, b) => b.planned - a.planned);
    return entries;
  });

  private resolvePrice(item: ItineraryItem, trip: Trip): number | null {
    if (!item.refId) return null;
    switch (item.type) {
      case 'flight':
        return trip.flights.find(f => f.id === item.refId)?.price.total ?? null;
      case 'stay': {
        const stay = trip.stays.find(s => s.id === item.refId);
        if (!stay) return null;
        const ci = new Date(stay.checkIn);
        const co = new Date(stay.checkOut);
        const nights = Math.max(1, Math.round((co.getTime() - ci.getTime()) / 86400000));
        return stay.pricePerNight.total * nights;
      }
      case 'car-rental':
        return trip.carRentals.find(c => c.id === item.refId)?.price.total ?? null;
      case 'transport':
        return trip.transports.find(t => t.id === item.refId)?.price.total ?? null;
      case 'activity':
        return trip.activities.find(a => a.id === item.refId)?.price.total ?? null;
      default:
        return null;
    }
  }

  getCategoryIcon(cat: string): string {
    const map: Record<string, string> = {
      flight: 'flight', stay: 'hotel', 'car-rental': 'directions_car',
      transport: 'directions_bus', activity: 'local_activity',
      attraction: 'museum', food: 'restaurant', shopping: 'shopping_bag',
      insurance: 'health_and_safety', visa: 'badge', other: 'receipt_long',
    };
    return map[cat] || 'receipt_long';
  }

  getCategoryLabel(cat: string): string {
    const map: Record<string, string> = {
      flight: 'Voos', stay: 'Hospedagem', 'car-rental': 'Aluguel de Carro',
      transport: 'Transporte', activity: 'Passeios',
      attraction: 'Atrações', food: 'Alimentação', shopping: 'Compras',
      insurance: 'Seguro', visa: 'Visto', other: 'Outros',
    };
    return map[cat] || cat;
  }
}
