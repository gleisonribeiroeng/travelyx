import { Module } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { CollaborationModule } from '../collaboration/collaboration.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [CollaborationModule, ActivityModule],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
