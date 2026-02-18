import { Controller, Get, Query } from '@nestjs/common';
import { TransportService } from './transport.service';

@Controller('transport')
export class TransportController {
  constructor(private readonly transportService: TransportService) {}

  @Get('api/v1/transport/search')
  searchTransport(@Query() query: Record<string, string>) {
    return this.transportService.searchTransport(query);
  }
}
