import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TripsService } from './trips.service';

@Controller('trips')
@UseGuards(JwtAuthGuard)
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.tripsService.findAllByUser(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.tripsService.findOne(id, req.user.userId);
  }

  @Post()
  create(@Body() body: any, @Req() req: any) {
    return this.tripsService.create(req.user.userId, body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.tripsService.update(id, req.user.userId, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.tripsService.remove(id, req.user.userId);
  }

  // --- Itinerary Items ---

  @Post(':tripId/items')
  addItem(@Param('tripId') tripId: string, @Body() body: any, @Req() req: any) {
    return this.tripsService.addItineraryItem(tripId, req.user.userId, body);
  }

  @Put(':tripId/items/:itemId')
  updateItem(
    @Param('tripId') tripId: string,
    @Param('itemId') itemId: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.tripsService.updateItineraryItem(tripId, itemId, req.user.userId, body);
  }

  @Delete(':tripId/items/:itemId')
  removeItem(
    @Param('tripId') tripId: string,
    @Param('itemId') itemId: string,
    @Req() req: any,
  ) {
    return this.tripsService.removeItineraryItem(tripId, itemId, req.user.userId);
  }
}
