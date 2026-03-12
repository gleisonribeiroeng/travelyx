import { Module } from '@nestjs/common';
import { CalendarController } from './calendar.controller';
import { GoogleCalendarService } from './google-calendar.service';

@Module({
  controllers: [CalendarController],
  providers: [GoogleCalendarService],
})
export class CalendarModule {}
