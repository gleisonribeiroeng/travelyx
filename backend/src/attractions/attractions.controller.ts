import { Controller, Get, Query, Param } from '@nestjs/common';
import { AttractionsService } from './attractions.service';

@Controller('attractions')
export class AttractionsController {
  constructor(private readonly attractionsService: AttractionsService) {}

  @Get('0.1/en/places/geoname')
  geoname(@Query() query: Record<string, string>) {
    return this.attractionsService.geoname(query);
  }

  @Get('0.1/en/places/radius')
  radius(@Query() query: Record<string, string>) {
    return this.attractionsService.radius(query);
  }

  @Get('0.1/en/places/xid/:xid')
  placeDetails(@Param('xid') xid: string) {
    return this.attractionsService.placeDetails(xid);
  }
}
