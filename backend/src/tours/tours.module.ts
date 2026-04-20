import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ToursController } from './tours.controller';
import { ToursService } from './tours.service';

@Module({
  imports: [HttpModule],
  controllers: [ToursController],
  providers: [ToursService],
})
export class ToursModule {}
