import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TripAccessGuard, MinRole } from '../collaboration/collaboration.guard';
import { ActivityService } from './activity.service';

@Controller('trips/:tripId/activity')
@UseGuards(JwtAuthGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  @UseGuards(TripAccessGuard)
  @MinRole('VIEWER')
  getActivityFeed(
    @Param('tripId') tripId: string,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.activityService.getByTrip(tripId, {
      userId,
      action,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }
}
