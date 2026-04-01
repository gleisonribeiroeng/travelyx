import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PriceAlertsService } from './price-alerts.service';
import { PriceAlertsController } from './price-alerts.controller';
import { PriceCheckCron } from './price-check.cron';
import { NotificationsModule } from '../notifications/notifications.module';
import { FlightsService } from '../flights/flights.service';
import { HotelsService } from '../hotels/hotels.service';
import { CollaborationModule } from '../collaboration/collaboration.module';
import { EmailService } from '../common/email.service';

@Module({
  imports: [NotificationsModule, HttpModule, CollaborationModule],
  controllers: [PriceAlertsController],
  providers: [
    PriceAlertsService,
    PriceCheckCron,
    FlightsService,
    HotelsService,
    EmailService,
  ],
})
export class PriceAlertsModule {}
