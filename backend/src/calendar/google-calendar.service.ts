import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { google, calendar_v3 } from 'googleapis';

export interface CalendarEvent {
  id: string;
  type: string;
  label: string;
  date: string;
  timeSlot: string | null;
  durationMinutes: number | null;
  notes: string;
  location?: string;
}

export interface SyncResult {
  created: number;
  errors: string[];
}

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  getFrontendUrl(): string {
    return this.config.get<string>('FRONTEND_URL') || 'http://localhost:4200';
  }

  private getOAuth2Client() {
    return new google.auth.OAuth2(
      this.config.get('GOOGLE_CLIENT_ID'),
      this.config.get('GOOGLE_CLIENT_SECRET'),
    );
  }

  /**
   * Generate a Google OAuth URL that requests only the Calendar scope.
   * Uses `state` param to carry the userId through the redirect.
   */
  getCalendarAuthUrl(userId: string): string {
    const oauth2 = new google.auth.OAuth2(
      this.config.get('GOOGLE_CLIENT_ID'),
      this.config.get('GOOGLE_CLIENT_SECRET'),
      `${this.config.get('GOOGLE_CALLBACK_URL')?.replace('/auth/google/callback', '')}/api/calendar/callback`,
    );

    return oauth2.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/calendar.events'],
      state: userId,
    });
  }

  /**
   * Handle the OAuth callback: exchange code for tokens and save them.
   */
  async handleCalendarCallback(userId: string, code: string): Promise<void> {
    const oauth2 = new google.auth.OAuth2(
      this.config.get('GOOGLE_CLIENT_ID'),
      this.config.get('GOOGLE_CLIENT_SECRET'),
      `${this.config.get('GOOGLE_CALLBACK_URL')?.replace('/auth/google/callback', '')}/api/calendar/callback`,
    );

    const { tokens } = await oauth2.getToken(code);
    this.logger.log(`Calendar tokens received for user ${userId}`);

    const updateData: Record<string, string> = {};
    if (tokens.access_token) updateData.googleAccessToken = tokens.access_token;
    if (tokens.refresh_token) updateData.googleRefreshToken = tokens.refresh_token;

    await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
  }

  private async getCalendarClient(userId: string): Promise<calendar_v3.Calendar> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { googleAccessToken: true, googleRefreshToken: true },
    });

    if (!user?.googleRefreshToken) {
      throw new Error('Autorize o Google Calendar antes de sincronizar.');
    }

    const oauth2 = this.getOAuth2Client();
    oauth2.setCredentials({
      access_token: user.googleAccessToken,
      refresh_token: user.googleRefreshToken,
    });

    // Auto-refresh: when token refreshes, save new access token
    oauth2.on('tokens', async (tokens) => {
      if (tokens.access_token) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { googleAccessToken: tokens.access_token },
        });
      }
    });

    return google.calendar({ version: 'v3', auth: oauth2 });
  }

  async syncEvents(userId: string, tripName: string, events: CalendarEvent[]): Promise<SyncResult> {
    const calendar = await this.getCalendarClient(userId);
    let created = 0;
    const errors: string[] = [];

    for (const event of events) {
      try {
        const calEvent = this.buildCalendarEvent(tripName, event);
        await calendar.events.insert({
          calendarId: 'primary',
          requestBody: calEvent,
        });
        created++;
      } catch (err: any) {
        this.logger.warn(`Failed to create event "${event.label}": ${err.message}`);
        errors.push(`${event.label}: ${err.message}`);
      }
    }

    this.logger.log(`Synced ${created}/${events.length} events for user ${userId}`);
    return { created, errors };
  }

  private buildCalendarEvent(tripName: string, event: CalendarEvent): calendar_v3.Schema$Event {
    const typeEmoji: Record<string, string> = {
      flight: '✈️', stay: '🏨', 'car-rental': '🚗',
      transport: '🚌', activity: '🎯', attraction: '📍', custom: '📝',
    };
    const emoji = typeEmoji[event.type] || '📌';
    const summary = `${emoji} ${event.label}`;
    const description = [
      `Viagem: ${tripName}`,
      event.notes ? `\nNotas: ${event.notes}` : '',
      `\n— Criado por Triply`,
    ].join('');

    // If has time + duration → timed event; otherwise → all-day
    if (event.timeSlot && event.durationMinutes) {
      const startDT = `${event.date}T${event.timeSlot}:00`;
      const endMinutes = this.addMinutes(event.timeSlot, event.durationMinutes);
      const endDT = `${event.date}T${endMinutes}:00`;

      return {
        summary,
        description,
        location: event.location || undefined,
        start: { dateTime: startDT, timeZone: 'America/Sao_Paulo' },
        end: { dateTime: endDT, timeZone: 'America/Sao_Paulo' },
        colorId: this.getColorId(event.type),
      };
    }

    // All-day event
    return {
      summary,
      description,
      location: event.location || undefined,
      start: { date: event.date },
      end: { date: event.date },
      colorId: this.getColorId(event.type),
    };
  }

  private addMinutes(time: string, minutes: number): string {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + minutes;
    const newH = Math.floor(total / 60) % 24;
    const newM = total % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  }

  /** Google Calendar color IDs (1-11) */
  private getColorId(type: string): string {
    const map: Record<string, string> = {
      flight: '9',     // Blueberry
      stay: '3',       // Grape
      'car-rental': '8', // Graphite
      transport: '8',  // Graphite
      activity: '10',  // Basil (green)
      attraction: '6', // Tangerine
      custom: '8',     // Graphite
    };
    return map[type] || '8';
  }

  async checkConnection(userId: string): Promise<boolean> {
    try {
      const calendar = await this.getCalendarClient(userId);
      await calendar.calendarList.get({ calendarId: 'primary' });
      return true;
    } catch {
      return false;
    }
  }
}
