import { Module } from '@nestjs/common';
import { CollaborationService } from './collaboration.service';
import { CollaborationGateway } from './collaboration.gateway';
import { CollaborationTripController, CollaborationInviteController } from './collaboration.controller';
import { TripAccessGuard } from './collaboration.guard';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [SubscriptionModule],
  controllers: [CollaborationTripController, CollaborationInviteController],
  providers: [CollaborationService, CollaborationGateway, TripAccessGuard],
  exports: [CollaborationService, CollaborationGateway, TripAccessGuard],
})
export class CollaborationModule {}
