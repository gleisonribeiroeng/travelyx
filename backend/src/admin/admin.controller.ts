import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
// Role and Plan are now String types in Prisma schema
import { PresenceGateway } from '../presence/presence.gateway';
import { SubscriptionService } from '../subscription/subscription.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly presenceGateway: PresenceGateway,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @Get('users')
  findAllUsers() {
    return this.adminService.findAllUsers();
  }

  @Get('online-users')
  getOnlineUsers() {
    return this.presenceGateway.getOnlineUserIds();
  }

  @Patch('users/:id/role')
  updateRole(@Param('id') id: string, @Body() body: { role: string }) {
    return this.adminService.updateRole(id, body.role);
  }

  @Patch('users/:id/activate')
  toggleActive(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.adminService.toggleActive(id, body.isActive);
  }

  @Patch('users/:id/plan')
  updatePlan(@Param('id') id: string, @Body() body: { plan: string; daysValid?: number }) {
    return this.subscriptionService.setPlan(id, body.plan, body.daysValid);
  }
}
