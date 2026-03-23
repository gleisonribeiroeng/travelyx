import { Module } from '@nestjs/common';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { SubscriptionModule } from '../subscription/subscription.module';
import { CollaborationModule } from '../collaboration/collaboration.module';

@Module({
  imports: [SubscriptionModule, CollaborationModule],
  controllers: [TripsController],
  providers: [TripsService],
})
export class TripsModule {}
