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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TripsService } from './trips.service';
import { SubscriptionService } from '../subscription/subscription.service';

@Controller('trips')
@UseGuards(JwtAuthGuard)
export class TripsController {
  constructor(
    private readonly tripsService: TripsService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @Get()
  findAll(@Req() req: any) {
    return this.tripsService.findAllByUser(req.user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.tripsService.findOne(id, req.user.sub);
  }

  @Post()
  async create(@Body() body: any, @Req() req: any) {
    const check = await this.subscriptionService.canCreateTrip(req.user.sub);
    if (!check.allowed) {
      throw new BadRequestException({ message: check.reason, code: 'PLAN_LIMIT' });
    }
    return this.tripsService.create(req.user.sub, body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.tripsService.update(id, req.user.sub, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.tripsService.remove(id, req.user.sub);
  }

  // --- Itinerary Items ---

  @Post(':tripId/items')
  async addItem(@Param('tripId') tripId: string, @Body() body: any, @Req() req: any) {
    const check = await this.subscriptionService.canAddItem(req.user.sub);
    if (!check.allowed) {
      throw new BadRequestException({ message: check.reason, code: 'PLAN_LIMIT' });
    }
    return this.tripsService.addItineraryItem(tripId, req.user.sub, body);
  }

  @Put(':tripId/items/:itemId')
  updateItem(
    @Param('tripId') tripId: string,
    @Param('itemId') itemId: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.tripsService.updateItineraryItem(tripId, itemId, req.user.sub, body);
  }

  @Delete(':tripId/items/:itemId')
  removeItem(
    @Param('tripId') tripId: string,
    @Param('itemId') itemId: string,
    @Req() req: any,
  ) {
    return this.tripsService.removeItineraryItem(tripId, itemId, req.user.sub);
  }

  // --- Attachments ---

  @Post(':tripId/items/:itemId/attachment')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req: any, file: any, cb: any) => {
      const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
      if (!allowed.includes(file.mimetype)) {
        cb(new BadRequestException('Tipo de arquivo não suportado. Use PDF, JPG, PNG ou WEBP.'), false);
      } else {
        cb(null, true);
      }
    },
  }))
  uploadAttachment(
    @Param('tripId') tripId: string,
    @Param('itemId') itemId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado');
    return this.tripsService.uploadAttachment(tripId, itemId, req.user.sub, file);
  }

  @Get(':tripId/items/:itemId/attachment')
  getAttachment(
    @Param('tripId') tripId: string,
    @Param('itemId') itemId: string,
    @Req() req: any,
  ) {
    return this.tripsService.getAttachment(tripId, itemId, req.user.sub);
  }

  @Delete(':tripId/items/:itemId/attachment')
  removeAttachment(
    @Param('tripId') tripId: string,
    @Param('itemId') itemId: string,
    @Req() req: any,
  ) {
    return this.tripsService.removeAttachment(tripId, itemId, req.user.sub);
  }
}
