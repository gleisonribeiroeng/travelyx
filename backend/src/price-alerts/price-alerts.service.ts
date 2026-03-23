import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PriceAlertsService {
  private readonly logger = new Logger(PriceAlertsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByUser(userId: string) {
    return this.prisma.priceAlert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, data: {
    type: string;
    label: string;
    searchParams: Record<string, any>;
    currentPrice: number;
    targetPrice: number;
    currency: string;
  }) {
    const alert = await this.prisma.priceAlert.create({
      data: {
        userId,
        type: data.type,
        label: data.label,
        searchParams: JSON.stringify(data.searchParams),
        currentPrice: data.currentPrice,
        targetPrice: data.targetPrice,
        lowestPrice: data.currentPrice,
        currency: data.currency,
      },
    });

    // Record initial price in history
    await this.prisma.priceHistory.create({
      data: { alertId: alert.id, price: data.currentPrice },
    });

    return alert;
  }

  async remove(id: string, userId: string) {
    const alert = await this.prisma.priceAlert.findFirst({ where: { id, userId } });
    if (!alert) return { deleted: false };
    await this.prisma.priceAlert.delete({ where: { id } });
    return { deleted: true };
  }

  async toggleActive(id: string, userId: string) {
    const alert = await this.prisma.priceAlert.findFirst({ where: { id, userId } });
    if (!alert) return null;
    return this.prisma.priceAlert.update({
      where: { id },
      data: { active: !alert.active },
    });
  }

  async getActiveAlerts() {
    return this.prisma.priceAlert.findMany({
      where: { active: true },
      include: { user: { select: { id: true, plan: true, role: true } } },
    });
  }

  async updateAlertPrice(id: string, currentPrice: number, lowestPrice: number) {
    // Record in history
    await this.prisma.priceHistory.create({
      data: { alertId: id, price: currentPrice },
    });

    return this.prisma.priceAlert.update({
      where: { id },
      data: {
        currentPrice,
        lowestPrice,
        lastCheckedAt: new Date(),
      },
    });
  }

  async markTriggered(id: string) {
    return this.prisma.priceAlert.update({
      where: { id },
      data: { triggeredAt: new Date(), lastCheckedAt: new Date() },
    });
  }

  /**
   * Get price history for a specific alert (for chart display).
   */
  async getHistory(alertId: string, userId: string) {
    const alert = await this.prisma.priceAlert.findFirst({
      where: { id: alertId, userId },
    });
    if (!alert) return null;

    const history = await this.prisma.priceHistory.findMany({
      where: { alertId },
      orderBy: { recordedAt: 'asc' },
      select: { price: true, recordedAt: true },
    });

    return {
      alert: {
        id: alert.id,
        label: alert.label,
        type: alert.type,
        currentPrice: alert.currentPrice,
        lowestPrice: alert.lowestPrice,
        targetPrice: alert.targetPrice,
        currency: alert.currency,
        createdAt: alert.createdAt,
      },
      history,
    };
  }
}
