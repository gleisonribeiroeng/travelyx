import { Module } from '@nestjs/common';
import { PollsService } from './polls.service';
import { PollsController } from './polls.controller';
import { CollaborationModule } from '../collaboration/collaboration.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [CollaborationModule, ActivityModule],
  controllers: [PollsController],
  providers: [PollsService],
  exports: [PollsService],
})
export class PollsModule {}
