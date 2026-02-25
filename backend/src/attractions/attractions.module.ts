import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AttractionsController } from './attractions.controller';
import { AttractionsService } from './attractions.service';

@Module({
  imports: [HttpModule],
  controllers: [AttractionsController],
  providers: [AttractionsService],
})
export class AttractionsModule {}
