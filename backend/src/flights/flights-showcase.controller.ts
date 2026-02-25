import { Controller, Get } from '@nestjs/common';
import { FlightsService } from './flights.service';

@Controller('flights')
export class FlightsShowcaseController {
  constructor(private readonly flightsService: FlightsService) {}

  @Get('showcase')
  getShowcase() {
    return this.flightsService.getShowcase();
  }
}
