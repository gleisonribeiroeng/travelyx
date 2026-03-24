import { Controller, Get, Post, Delete, Patch, Param, Body, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PriceAlertsService } from './price-alerts.service';

@Controller('price-alerts')
@UseGuards(AuthGuard('jwt'))
export class PriceAlertsController {
  constructor(private readonly service: PriceAlertsService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.service.findByUser(req.user.id);
  }

  @Post()
  create(
    @Req() req: any,
    @Body() body: {
      type: string;
      label: string;
      searchParams: Record<string, any>;
      currentPrice: number;
      targetPrice: number;
      currency: string;
    },
  ) {
    return this.service.create(req.user.id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, req.user.id);
  }

  @Patch(':id/toggle')
  toggle(@Param('id') id: string, @Req() req: any) {
    return this.service.toggleActive(id, req.user.id);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string, @Req() req: any) {
    return this.service.getHistory(id, req.user.id);
  }
}
