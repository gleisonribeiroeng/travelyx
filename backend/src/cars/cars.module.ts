import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CarsController } from './cars.controller';
import { CarsService } from './cars.service';
import { CurrencyService } from '../common/currency.service';

@Module({
  imports: [HttpModule],
  controllers: [CarsController],
  providers: [CarsService, CurrencyService],
})
export class CarsModule {}
