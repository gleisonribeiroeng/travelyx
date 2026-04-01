import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PriceAlertsService } from './price-alerts.service';
import { NotificationsService } from '../notifications/notifications.service';
import { FlightsService } from '../flights/flights.service';
import { HotelsService } from '../hotels/hotels.service';
import { CollaborationGateway } from '../collaboration/collaboration.gateway';
import { EmailService } from '../common/email.service';

@Injectable()
export class PriceCheckCron {
  private readonly logger = new Logger(PriceCheckCron.name);
  private running = false;

  constructor(
    private readonly alertsService: PriceAlertsService,
    private readonly notificationsService: NotificationsService,
    private readonly flightsService: FlightsService,
    private readonly hotelsService: HotelsService,
    private readonly collabGateway: CollaborationGateway,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Check prices every 6 hours.
   * This is conservative to avoid hitting RapidAPI rate limits.
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async checkPrices() {
    if (this.running) return;
    this.running = true;

    try {
      const alerts = await this.alertsService.getActiveAlerts();
      this.logger.log(`Checking ${alerts.length} active price alerts`);

      for (const alert of alerts) {
        // Only check PRO/BUSINESS/ADMIN users
        const user = alert.user as any;
        if (user.plan === 'FREE' && user.role !== 'ADMIN') {
          continue;
        }

        try {
          await this.checkSingleAlert(alert);
          // Small delay between checks to respect API rate limits
          await this.delay(2000);
        } catch (err: any) {
          this.logger.warn(`Alert ${alert.id} check failed: ${err.message}`);
        }
      }
    } finally {
      this.running = false;
    }
  }

  private async checkSingleAlert(alert: any) {
    const params = JSON.parse(alert.searchParams);
    let bestPrice: number | null = null;

    if (alert.type === 'flight') {
      bestPrice = await this.getFlightBestPrice(params);
    } else if (alert.type === 'hotel') {
      bestPrice = await this.getHotelBestPrice(params);
    }

    if (bestPrice === null) return;

    const newLowest = Math.min(bestPrice, alert.lowestPrice ?? bestPrice);
    await this.alertsService.updateAlertPrice(alert.id, bestPrice, newLowest);

    // Check if price dropped below target
    if (bestPrice <= alert.targetPrice && !alert.triggeredAt) {
      await this.triggerAlert(alert, bestPrice);
    }
  }

  private async getFlightBestPrice(params: Record<string, string>): Promise<number | null> {
    try {
      const result = await this.flightsService.searchFlights(params);
      const flights = result?.data || [];
      if (flights.length === 0) return null;
      return Math.min(...flights.map((f: any) => f.price?.total ?? Infinity));
    } catch {
      return null;
    }
  }

  private async getHotelBestPrice(params: Record<string, string>): Promise<number | null> {
    try {
      const result = await this.hotelsService.searchHotels(params);
      const hotels = result?.data?.result || result?.data?.hotels || [];
      if (!Array.isArray(hotels) || hotels.length === 0) return null;

      const prices = hotels
        .map((h: any) => h.property?.priceBreakdown?.grossPrice?.value)
        .filter((p: any) => typeof p === 'number' && p > 0);

      return prices.length > 0 ? Math.min(...prices) : null;
    } catch {
      return null;
    }
  }

  private async triggerAlert(alert: any, newPrice: number) {
    await this.alertsService.markTriggered(alert.id);

    const drop = alert.currentPrice - newPrice;
    const dropPercent = Math.round((drop / alert.currentPrice) * 100);
    const typeLabel = alert.type === 'flight' ? 'Voo' : 'Hotel';
    const currency = alert.currency || 'BRL';

    const title = `${typeLabel} mais barato!`;
    const body = `${alert.label} caiu para R$${newPrice.toFixed(2)} (${dropPercent}% mais barato que quando você criou o alerta).`;

    const notification = await this.notificationsService.create({
      userId: alert.userId,
      type: 'price_alert',
      title,
      body,
      link: `/viagem`,
    });

    // Push real-time via WebSocket
    try {
      this.collabGateway.emitNotification(alert.userId, notification);
    } catch {
      // User might not be online
    }

    // Send email notification
    const userEmail = (alert.user as any)?.email;
    if (userEmail) {
      try {
        await this.emailService.sendPriceAlertEmail(
          userEmail, typeLabel, alert.label,
          alert.currentPrice, newPrice, dropPercent, currency,
        );
      } catch (err: any) {
        this.logger.warn(`Failed to send price alert email: ${err.message}`);
      }
    }

    this.logger.log(`ALERT TRIGGERED: ${alert.label} — ${currency} ${alert.currentPrice} → ${newPrice} (-${dropPercent}%)`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
