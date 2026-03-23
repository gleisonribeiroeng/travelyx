import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PriceAlertsService } from './price-alerts.service';
import { PriceAlertsController } from './price-alerts.controller';
import { PriceCheckCron } from './price-check.cron';
import { NotificationsModule } from '../notifications/notifications.module';
import { FlightsService } from '../flights/flights.service';
import { HotelsService } from '../hotels/hotels.service';
import { CollaborationGateway } from '../collaboration/collaboration.gateway';

@Module({
  imports: [NotificationsModule, HttpModule],
  controllers: [PriceAlertsController],
  providers: [
    PriceAlertsService,
    PriceCheckCron,
    FlightsService,
    HotelsService,
    CollaborationGateway,
  ],
})
export class PriceAlertsModule {}
