import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PLAN_KEY } from './plan.decorator';

const PLAN_HIERARCHY: Record<string, number> = {
  FREE: 0,
  PRO: 1,
  BUSINESS: 2,
};

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPlan = this.reflector.getAllAndOverride<string>(PLAN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPlan) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    const userLevel = PLAN_HIERARCHY[user?.plan || 'FREE'] ?? 0;
    const requiredLevel = PLAN_HIERARCHY[requiredPlan] ?? 0;

    if (userLevel < requiredLevel) {
      throw new ForbiddenException({
        message: 'Plano insuficiente',
        requiredPlan,
        currentPlan: user?.plan || 'FREE',
        code: 'PLAN_REQUIRED',
      });
    }

    return true;
  }
}
