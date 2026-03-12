import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SubscriptionService } from './subscription.service';

@Controller('subscription')
@UseGuards(JwtAuthGuard)
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  /**
   * GET /api/subscription/me — current user's plan, limits, and usage.
   */
  @Get('me')
  async getMyPlan(@Request() req: any) {
    const userId = req.user.sub;
    const [planInfo, usage] = await Promise.all([
      this.subscriptionService.getUserPlan(userId),
      this.subscriptionService.getUserUsage(userId),
    ]);
    return { ...planInfo, usage };
  }
}
