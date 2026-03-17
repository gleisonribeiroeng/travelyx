import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PresenceGateway } from '../presence/presence.gateway';
import { SubscriptionService } from '../subscription/subscription.service';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { ToggleActiveDto } from './dto/toggle-active.dto';

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
  updateRole(@Param('id') id: string, @Body() body: UpdateRoleDto) {
    return this.adminService.updateRole(id, body.role);
  }

  @Patch('users/:id/activate')
  toggleActive(@Param('id') id: string, @Body() body: ToggleActiveDto) {
    return this.adminService.toggleActive(id, body.isActive);
  }

  @Patch('users/:id/plan')
  updatePlan(@Param('id') id: string, @Body() body: UpdatePlanDto) {
    return this.subscriptionService.setPlan(id, body.plan, body.daysValid);
  }
}
