import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { HotelsController } from './hotels.controller';
import { HotelsService } from './hotels.service';

@Module({
  imports: [HttpModule],
  controllers: [HotelsController],
  providers: [HotelsService],
})
export class HotelsModule {}
