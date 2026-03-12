import { inject } from '@angular/core';
import { type CanActivateFn } from '@angular/router';
import { PlanService, PlanLimits } from '../services/plan.service';

/**
 * Route guard factory that checks if the user's plan has a specific feature.
 * If not, shows the paywall dialog and blocks navigation.
 *
 * Usage in routes: canActivate: [planGuard('budget')]
 */
export function planGuard(feature: keyof PlanLimits['features']): CanActivateFn {
  return () => {
    const planService = inject(PlanService);

    if (planService.hasFeature(feature)) {
      return true;
    }

    // Show paywall and block navigation
    planService.showPaywall(feature);
    return false;
  };
}
