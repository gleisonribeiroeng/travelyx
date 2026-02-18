import { Controller, Get, Query } from '@nestjs/common';
import { CarsService } from './cars.service';

@Controller('cars')
export class CarsController {
  constructor(private readonly carsService: CarsService) {}

  @Get('v2/cars/autoComplete')
  autoComplete(@Query() query: Record<string, string>) {
    return this.carsService.autoComplete(query);
  }

  @Get('v2/cars/resultsRequest')
  searchCars(@Query() query: Record<string, string>) {
    return this.carsService.searchCars(query);
  }
}
