import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UnsplashService } from './unsplash.service';

@Controller('unsplash')
@UseGuards(JwtAuthGuard)
export class UnsplashController {
  constructor(private readonly unsplashService: UnsplashService) {}

  @Get('destination-image')
  async getDestinationImage(@Query('query') query: string) {
    if (!query?.trim()) {
      return { image: null };
    }
    const image = await this.unsplashService.searchDestinationImage(query);
    return { image };
  }
}
