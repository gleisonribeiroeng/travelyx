import { Controller, Get, Post, Delete, Patch, Param, Body, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PriceAlertsService } from './price-alerts.service';

@Controller('price-alerts')
@UseGuards(AuthGuard('jwt'))
export class PriceAlertsController {
  constructor(private readonly service: PriceAlertsService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.service.findByUser(req.user.sub);
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
    return this.service.create(req.user.sub, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, req.user.sub);
  }

  @Patch(':id/toggle')
  toggle(@Param('id') id: string, @Req() req: any) {
    return this.service.toggleActive(id, req.user.sub);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string, @Req() req: any) {
    return this.service.getHistory(id, req.user.sub);
  }
}
