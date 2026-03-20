import { Controller, Post, Get, Body, UseGuards, Req, Res, Query } from '@nestjs/common';
import { IsString, IsArray, ValidateNested, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GoogleCalendarService } from './google-calendar.service';
import type { Response } from 'express';

class CalendarEventDto {
  @IsString() id: string;
  @IsString() type: string;
  @IsString() label: string;
  @IsString() date: string;
  @IsOptional() @IsString() timeSlot: string | null;
  @IsOptional() @IsNumber() durationMinutes: number | null;
  @IsString() notes: string;
  @IsOptional() @IsString() location?: string;
}

class SyncCalendarDto {
  @IsString() tripName: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => CalendarEventDto)
  events: CalendarEventDto[];
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
  getAuthorizeUrl(@Req() req: any, @Query('returnPath') returnPath?: string) {
    const userId = req.user.sub;
    const url = this.calendarService.getCalendarAuthUrl(userId, returnPath);
    return { url };
  }

  /**
   * Step 2: Google redirects here after user grants Calendar permission.
   * Saves tokens and redirects back to frontend.
   */
  @Get('callback')
  async calendarCallback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    const frontendUrl = this.calendarService.getFrontendUrl();
    try {
      const [userId, returnPath] = state.includes('|') ? state.split('|', 2) : [state, ''];
      await this.calendarService.handleCalendarCallback(userId, code);
      const redirect = returnPath || '/viagens';
      res.redirect(`${frontendUrl}${redirect}?calendar_connected=true`);
    } catch {
      res.redirect(`${frontendUrl}/viagens?calendar_error=true`);
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
