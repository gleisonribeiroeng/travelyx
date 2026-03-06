import { Controller, Post, Body } from '@nestjs/common';
import { AttractionsService } from './attractions.service';

@Controller('attractions')
export class AttractionsController {
  constructor(private readonly attractionsService: AttractionsService) {}

  @Post('search')
  search(@Body() body: any) {
    return this.attractionsService.searchAttractions(body);
  }
}
