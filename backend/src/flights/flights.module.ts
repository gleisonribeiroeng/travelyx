import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FlightsController } from './flights.controller';
import { FlightsShowcaseController } from './flights-showcase.controller';
import { FlightsService } from './flights.service';

@Module({
  imports: [HttpModule],
  controllers: [FlightsController, FlightsShowcaseController],
  providers: [FlightsService],
})
export class FlightsModule {}
