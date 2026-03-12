import { Controller, Post, Get, Body, UseGuards, Req, Res, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GoogleCalendarService, CalendarEvent } from './google-calendar.service';
import type { Response } from 'express';

class SyncCalendarDto {
  tripName: string;
  events: CalendarEvent[];
}

@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: GoogleCalendarService) {}

  /**
   * Step 1: Frontend calls this to get the Google OAuth URL for Calendar scope.
   * Returns { url: string } that the frontend opens in a new window/redirect.
   */
  @Get('authorize')
  @UseGuards(JwtAuthGuard)
  getAuthorizeUrl(@Req() req: any) {
    const userId = req.user.sub;
    const url = this.calendarService.getCalendarAuthUrl(userId);
    return { url };
  }

  /**
   * Step 2: Google redirects here after user grants Calendar permission.
   * Saves tokens and redirects back to frontend.
   */
  @Get('callback')
  async calendarCallback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    try {
      const userId = state;
      await this.calendarService.handleCalendarCallback(userId, code);
      const frontendUrl = this.calendarService.getFrontendUrl();
      res.redirect(`${frontendUrl}/viagem?calendar_connected=true`);
    } catch (error) {
      console.error('[CALENDAR] Callback error:', error);
      const frontendUrl = this.calendarService.getFrontendUrl();
      res.redirect(`${frontendUrl}/viagem?calendar_error=true`);
    }
  }

  @Post('sync')
  @UseGuards(JwtAuthGuard)
  async syncToCalendar(@Body() dto: SyncCalendarDto, @Req() req: any) {
    return this.calendarService.syncEvents(req.user.sub, dto.tripName, dto.events);
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  async checkStatus(@Req() req: any) {
    const connected = await this.calendarService.checkConnection(req.user.sub);
    return { connected };
  }
}
