import { SetMetadata } from '@nestjs/common';

export const PLAN_KEY = 'requiredPlan';

/**
 * @RequiresPlan('PRO') — requires at least PRO plan.
 * @RequiresPlan('BUSINESS') — requires BUSINESS plan.
 * Plan hierarchy: FREE < PRO < BUSINESS. ADMIN bypasses all plan checks.
 */
export const RequiresPlan = (plan: string) => SetMetadata(PLAN_KEY, plan);
