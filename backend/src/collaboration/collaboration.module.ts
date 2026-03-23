import { Module } from '@nestjs/common';
import { CollaborationService } from './collaboration.service';
import { CollaborationGateway } from './collaboration.gateway';
import { CollaborationTripController, CollaborationInviteController } from './collaboration.controller';
import { TripAccessGuard } from './collaboration.guard';
import { SubscriptionModule } from '../subscription/subscription.module';
import { EmailService } from '../common/email.service';

@Module({
  imports: [SubscriptionModule],
  controllers: [CollaborationTripController, CollaborationInviteController],
  providers: [CollaborationService, CollaborationGateway, TripAccessGuard, EmailService],
  exports: [CollaborationService, CollaborationGateway, TripAccessGuard],
})
export class CollaborationModule {}
