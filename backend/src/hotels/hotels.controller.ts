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

  @Get('api/v1/hotels/getHotelPhotos')
  getHotelPhotos(@Query('hotel_id') hotelId: string) {
    return this.hotelsService.getHotelPhotos(hotelId);
  }

  @Get('api/v1/hotels/getRoomList')
  getRoomList(
    @Query('hotel_id') hotelId: string,
    @Query('arrival_date') arrivalDate: string,
    @Query('departure_date') departureDate: string,
    @Query('adults') adults: string,
    @Query('currency_code') currency: string,
    @Query('locale') locale: string,
  ) {
    return this.hotelsService.getRoomList(hotelId, arrivalDate, departureDate, parseInt(adults) || 2, currency, locale);
  }

  @Get('api/v1/hotels/getHotelDetails')
  getHotelDetails(
    @Query('hotel_id') hotelId: string,
    @Query('arrival_date') arrivalDate: string,
    @Query('departure_date') departureDate: string,
    @Query('locale') locale: string,
  ) {
    return this.hotelsService.getHotelDetails(hotelId, arrivalDate, departureDate, locale);
  }
}
