import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { FlightsModule } from './flights/flights.module';
import { HotelsModule } from './hotels/hotels.module';
import { CarsModule } from './cars/cars.module';
import { ToursModule } from './tours/tours.module';
import { AttractionsModule } from './attractions/attractions.module';
import { TransportModule } from './transport/transport.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { TripsModule } from './trips/trips.module';
import { HomeShowcaseController } from './common/home-showcase.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    TripsModule,
    FlightsModule,
    HotelsModule,
    CarsModule,
    ToursModule,
    AttractionsModule,
    TransportModule,
  ],
  controllers: [HomeShowcaseController],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
