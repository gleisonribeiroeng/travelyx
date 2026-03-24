import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { join } from 'path';
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
import { AdminModule } from './admin/admin.module';
import { PresenceModule } from './presence/presence.module';
import { SupportModule } from './support/support.module';
import { CalendarModule } from './calendar/calendar.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { StripeModule } from './stripe/stripe.module';
import { CollaborationModule } from './collaboration/collaboration.module';
import { ActivityModule } from './activity/activity.module';
import { CommentsModule } from './comments/comments.module';
import { PollsModule } from './polls/polls.module';
import { ExpensesModule } from './expenses/expenses.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PriceAlertsModule } from './price-alerts/price-alerts.module';
import { UnsplashModule } from './unsplash/unsplash.module';
import { ScheduleModule } from '@nestjs/schedule';
import { HomeShowcaseController } from './common/home-showcase.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    // Security: Rate limiting — 100 requests per minute per IP
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'frontend', 'dist', 'triply', 'browser'),
      exclude: ['/api/{*path}'],
    }),
    PrismaModule,
    AuthModule,
    TripsModule,
    FlightsModule,
    HotelsModule,
    CarsModule,
    ToursModule,
    AttractionsModule,
    TransportModule,
    AdminModule,
    PresenceModule,
    SupportModule,
    CalendarModule,
    SubscriptionModule,
    StripeModule,
    CollaborationModule,
    ActivityModule,
    CommentsModule,
    PollsModule,
    ExpensesModule,
    NotificationsModule,
    PriceAlertsModule,
    UnsplashModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [HomeShowcaseController],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
