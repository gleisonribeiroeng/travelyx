import { Controller, Get } from '@nestjs/common';
import { HotelsService } from './hotels.service';

@Controller('hotels-showcase')
export class HotelsShowcaseController {
  constructor(private readonly hotelsService: HotelsService) {}

  @Get('showcase')
  getShowcase() {
    return this.hotelsService.getShowcase();
  }
}
