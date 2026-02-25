import { Injectable, computed, inject } from '@angular/core';
import { TripStateService } from './trip-state.service';
import { TripScore } from '../models/trip.models';
import { computeAllConflicts } from '../utils/conflict-engine.util';

@Injectable({ providedIn: 'root' })
export class TripScoreService {
  private readonly tripState = inject(TripStateService);

  readonly score = computed<TripScore>(() => {
    const trip = this.tripState.trip();
    const items = trip.itineraryItems;

    // Flights (0-20)
    const hasOutbound = trip.flights.length > 0;
    const hasReturn = trip.flights.length >= 2;
    const flightScore = hasReturn ? 20 : hasOutbound ? 10 : 0;

    // Accommodation (0-20)
    let accommodationScore = 0;
    if (trip.dates.start && trip.dates.end) {
      const start = new Date(trip.dates.start);
      const end = new Date(trip.dates.end);
      const totalNights = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
      if (totalNights <= 0) {
        accommodationScore = trip.stays.length > 0 ? 20 : 0;
      } else {
        let coveredNights = 0;
        for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
          const dayStr = d.toISOString().split('T')[0];
          if (trip.stays.some(s => s.checkIn <= dayStr && s.checkOut > dayStr)) {
            coveredNights++;
          }
        }
        accommodationScore = Math.round((coveredNights / totalNights) * 20);
      }
    }

    // Budget (0-15)
    const itemsWithPrice = items.filter(i => i.refId);
    const paidItems = itemsWithPrice.filter(i => i.isPaid);
    const budgetScore = itemsWithPrice.length > 0
      ? Math.round((paidItems.length / itemsWithPrice.length) * 15) : 0;

    // Schedule (0-15)
    let scheduleScore = 15;
    try {
      const conflicts = computeAllConflicts(trip);
      const errors = conflicts.filter(c => c.severity === 'error').length;
      const warnings = conflicts.filter(c => c.severity === 'warning').length;
      scheduleScore = Math.max(0, 15 - (errors * 5) - (warnings * 2));
    } catch {
      scheduleScore = 15;
    }

    // Documents (0-15)
    const docsUploaded = items.filter(i => i.attachment).length;
    const docScore = Math.min(15, docsUploaded * 5);

    // Completeness (0-15)
    let completeness = 0;
    if (trip.dates.start && trip.dates.end) completeness += 5;
    if (trip.destination) completeness += 5;
    if (items.length > 0) completeness += 5;

    const total = flightScore + accommodationScore + budgetScore + scheduleScore + docScore + completeness;

    return {
      total: Math.min(100, total),
      breakdown: {
        flights: flightScore,
        accommodation: accommodationScore,
        budget: budgetScore,
        schedule: scheduleScore,
        documents: docScore,
        completeness,
      },
    };
  });

  readonly scoreLabel = computed(() => {
    const s = this.score().total;
    if (s >= 86) return 'Viagem organizada!';
    if (s >= 61) return 'Quase pronto';
    if (s >= 31) return 'Em progresso';
    return 'Iniciando';
  });

  readonly scoreColor = computed(() => {
    const s = this.score().total;
    if (s >= 86) return '#4CAF50';
    if (s >= 61) return '#FF9800';
    if (s >= 31) return '#2196F3';
    return '#9E9E9E';
  });
}
