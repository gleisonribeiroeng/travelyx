import { Controller, Get, Query } from '@nestjs/common';
import { HotelsService } from './hotels.service';

@Controller('hotels')
export class HotelsController {
  constructor(private readonly hotelsService: HotelsService) {}

  @Get('api/v1/hotels/searchDestination')
  searchDestination(@Query() query: Record<string, string>) {
    return this.hotelsService.searchDestination(query);
  }

  @Get('api/v1/hotels/searchHotels')
  searchHotels(@Query() query: Record<string, string>) {
    return this.hotelsService.searchHotels(query);
  }
}
