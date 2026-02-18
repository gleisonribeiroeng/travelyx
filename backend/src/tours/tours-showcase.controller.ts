import { Controller, Get } from '@nestjs/common';
import { ToursService } from './tours.service';

@Controller('tours-showcase')
export class ToursShowcaseController {
  constructor(private readonly toursService: ToursService) {}

  @Get('showcase')
  getShowcase() {
    return this.toursService.getShowcase();
  }
}
