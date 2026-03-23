import { Controller, Get, Patch, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';

@Controller('api/notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.service.findByUser(req.user.id);
  }

  @Get('unread-count')
  async unreadCount(@Req() req: any) {
    const count = await this.service.unreadCount(req.user.id);
    return { count };
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @Req() req: any) {
    return this.service.markAsRead(id, req.user.id);
  }

  @Patch('read-all')
  markAllAsRead(@Req() req: any) {
    return this.service.markAllAsRead(req.user.id);
  }
}
