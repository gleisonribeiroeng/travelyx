import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { CollaborationModule } from '../collaboration/collaboration.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [CollaborationModule, ActivityModule],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
