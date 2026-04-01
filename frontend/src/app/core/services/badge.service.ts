import { Injectable, inject, computed } from '@angular/core';
import { TripStateService } from './trip-state.service';
import { AuthService } from './auth.service';
import { TranslationService } from '../i18n/translation.service';

export interface Badge {
  id: string;
  icon: string;
  name: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: string;
}

const STORAGE_KEY = 'travelyx_badges';

@Injectable({ providedIn: 'root' })
export class BadgeService {
  private readonly tripState = inject(TripStateService);
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(TranslationService);

  /** All available badges computed from current data */
  readonly badges = computed<Badge[]>(() => {
    const trips = this.tripState.trips();
    const activeTrip = this.tripState.trip();
    const savedBadges = this.getSavedBadges();

    const completedTrips = trips.filter(t => t.status === 'concluida');
    const uniqueDestinations = new Set(trips.map(t => t.destination).filter(Boolean));
    const hasCollaborators = activeTrip.collaborators && activeTrip.collaborators.length > 0;
    const totalItems = trips.reduce((sum, t) => sum + (t.itineraryItems?.length || 0), 0);

    const defs: { id: string; icon: string; nameKey: string; descKey: string; condition: boolean }[] = [
      {
        id: 'first_trip',
        icon: '✈️',
        nameKey: 'badges.firstTrip',
        descKey: 'badges.firstTripDesc',
        condition: trips.length >= 1,
      },
      {
        id: 'itinerary_built',
        icon: '📋',
        nameKey: 'badges.itineraryBuilt',
        descKey: 'badges.itineraryBuiltDesc',
        condition: totalItems >= 5,
      },
      {
        id: 'budget_master',
        icon: '💰',
        nameKey: 'badges.budgetMaster',
        descKey: 'badges.budgetMasterDesc',
        condition: trips.some(t => {
          const items = t.itineraryItems || [];
          return items.length > 0 && items.every(i => i.isPaid);
        }),
      },
      {
        id: 'explorer',
        icon: '🧭',
        nameKey: 'badges.explorer',
        descKey: 'badges.explorerDesc',
        condition: uniqueDestinations.size >= 3,
      },
      {
        id: 'social_traveler',
        icon: '👥',
        nameKey: 'badges.socialTraveler',
        descKey: 'badges.socialTravelerDesc',
        condition: !!hasCollaborators,
      },
      {
        id: 'deal_hunter',
        icon: '🏷️',
        nameKey: 'badges.dealHunter',
        descKey: 'badges.dealHunterDesc',
        condition: false, // Will be true when user has 3+ price alerts — checked externally
      },
      {
        id: 'globetrotter',
        icon: '🌍',
        nameKey: 'badges.globetrotter',
        descKey: 'badges.globetrotterDesc',
        condition: trips.some(t => {
          const dest = (t.destination || '').toLowerCase();
          const brCities = ['rio', 'são paulo', 'salvador', 'florianópolis', 'gramado', 'fortaleza', 'recife', 'natal', 'foz', 'bonito', 'búzios', 'paraty', 'jericoacoara', 'campos do jordão', 'fernando de noronha', 'brasil'];
          return dest.length > 0 && !brCities.some(c => dest.includes(c));
        }),
      },
      {
        id: 'perfect_trip',
        icon: '🚀',
        nameKey: 'badges.perfectTrip',
        descKey: 'badges.perfectTripDesc',
        condition: false, // Checked via readiness score externally
      },
      {
        id: 'veteran',
        icon: '🏆',
        nameKey: 'badges.veteran',
        descKey: 'badges.veteranDesc',
        condition: completedTrips.length >= 5,
      },
      {
        id: 'planner_pro',
        icon: '⭐',
        nameKey: 'badges.plannerPro',
        descKey: 'badges.plannerProDesc',
        condition: totalItems >= 20,
      },
    ];

    return defs.map(d => {
      const wasSaved = savedBadges[d.id];
      const unlocked = d.condition || !!wasSaved;

      // Save newly unlocked badges
      if (d.condition && !wasSaved) {
        this.saveBadge(d.id);
      }

      return {
        id: d.id,
        icon: d.icon,
        name: this.i18n.t(d.nameKey) || d.nameKey,
        description: this.i18n.t(d.descKey) || d.descKey,
        unlocked,
        unlockedAt: wasSaved || (d.condition ? new Date().toISOString() : undefined),
      };
    });
  });

  readonly unlockedCount = computed(() => this.badges().filter(b => b.unlocked).length);
  readonly totalCount = computed(() => this.badges().length);
  readonly nextBadge = computed(() => this.badges().find(b => !b.unlocked));

  /** Mark a badge as unlocked externally (e.g., price alerts, readiness 100%) */
  unlockBadge(badgeId: string): void {
    this.saveBadge(badgeId);
  }

  private getSavedBadges(): Record<string, string> {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }

  private saveBadge(badgeId: string): void {
    const saved = this.getSavedBadges();
    if (!saved[badgeId]) {
      saved[badgeId] = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    }
  }
}
