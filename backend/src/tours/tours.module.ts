import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ToursController } from './tours.controller';
import { ToursShowcaseController } from './tours-showcase.controller';
import { ToursService } from './tours.service';

@Module({
  imports: [HttpModule],
  controllers: [ToursController, ToursShowcaseController],
  providers: [ToursService],
})
export class ToursModule {}
