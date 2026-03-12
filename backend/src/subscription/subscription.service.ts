import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Plan limits configuration.
 * FREE: 1 active trip, 15 itinerary items, 1 manual entry per category
 * PRO: unlimited
 * BUSINESS: unlimited + sharing (future)
 */
export const PLAN_LIMITS = {
  FREE: {
    maxTrips: 1,
    maxItineraryItems: 15,
    maxManualPerCategory: 1,
    features: {
      budget: false,
      documents: false,
      checklist: false,
      conflictDetails: false,
      activeTrip: false,
      dragDrop: false,
      flexibleDates: false,
      multiCity: false,
      advancedFilters: false,
    },
  },
  PRO: {
    maxTrips: -1, // unlimited
    maxItineraryItems: -1,
    maxManualPerCategory: -1,
    features: {
      budget: true,
      documents: true,
      checklist: true,
      conflictDetails: true,
      activeTrip: true,
      dragDrop: true,
      flexibleDates: true,
      multiCity: true,
      advancedFilters: true,
    },
  },
  BUSINESS: {
    maxTrips: -1,
    maxItineraryItems: -1,
    maxManualPerCategory: -1,
    features: {
      budget: true,
      documents: true,
      checklist: true,
      conflictDetails: true,
      activeTrip: true,
      dragDrop: true,
      flexibleDates: true,
      multiCity: true,
      advancedFilters: true,
    },
  },
} as const;

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get current plan and limits for a user.
   */
  async getUserPlan(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, planExpiresAt: true, role: true },
    });

    if (!user) {
      return { plan: 'FREE', limits: PLAN_LIMITS.FREE, expired: false };
    }

    // ADMIN gets BUSINESS limits regardless of plan
    if (user.role === 'ADMIN') {
      return { plan: user.plan, limits: PLAN_LIMITS.BUSINESS, expired: false };
    }

    // Check if plan is expired
    const expired = user.planExpiresAt ? new Date() > user.planExpiresAt : false;
    const effectivePlan = expired ? 'FREE' : user.plan;
    const limits = PLAN_LIMITS[effectivePlan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.FREE;

    return { plan: effectivePlan, limits, expired };
  }

  /**
   * Get usage stats for a user (for limit enforcement).
   */
  async getUserUsage(userId: string) {
    const tripCount = await this.prisma.trip.count({
      where: { userId },
    });

    // Count itinerary items across all trips
    const itemCount = await this.prisma.itineraryItem.count({
      where: { trip: { userId } },
    });

    return { tripCount, itemCount };
  }

  /**
   * Check if user can create a new trip.
   */
  async canCreateTrip(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    const { limits } = await this.getUserPlan(userId);
    if (limits.maxTrips === -1) return { allowed: true };

    const { tripCount } = await this.getUserUsage(userId);
    if (tripCount >= limits.maxTrips) {
      return {
        allowed: false,
        reason: `Plano gratuito permite apenas ${limits.maxTrips} viagem. Faça upgrade para o Pro.`,
      };
    }
    return { allowed: true };
  }

  /**
   * Check if user can add more itinerary items.
   */
  async canAddItem(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    const { limits } = await this.getUserPlan(userId);
    if (limits.maxItineraryItems === -1) return { allowed: true };

    const { itemCount } = await this.getUserUsage(userId);
    if (itemCount >= limits.maxItineraryItems) {
      return {
        allowed: false,
        reason: `Plano gratuito permite até ${limits.maxItineraryItems} itens no roteiro. Faça upgrade para o Pro.`,
      };
    }
    return { allowed: true };
  }

  /**
   * Admin: set a user's plan.
   */
  async setPlan(userId: string, plan: string, daysValid?: number) {
    const data: any = { plan };
    if (daysValid && daysValid > 0) {
      data.planExpiresAt = new Date(Date.now() + daysValid * 24 * 60 * 60 * 1000);
    } else if (plan === 'FREE') {
      data.planExpiresAt = null;
    }
    return this.prisma.user.update({ where: { id: userId }, data });
  }
}
