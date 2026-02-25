import { Controller, Get, Query } from '@nestjs/common';
import { FlightsService } from './flights.service';

@Controller('amadeus')
export class FlightsController {
  constructor(private readonly flightsService: FlightsService) {}

  @Get('v2/shopping/flight-offers')
  searchFlights(@Query() query: Record<string, string>) {
    return this.flightsService.searchFlights(query);
  }

  @Get('v1/reference-data/locations')
  searchAirports(@Query() query: Record<string, string>) {
    return this.flightsService.searchAirports(query);
  }
}
