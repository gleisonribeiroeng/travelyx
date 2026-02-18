import { Controller, Post, Body } from '@nestjs/common';
import { ToursService } from './tours.service';

@Controller('tours')
export class ToursController {
  constructor(private readonly toursService: ToursService) {}

  @Post('partner/products/search')
  searchTours(@Body() body: any) {
    return this.toursService.searchTours(body);
  }
}
