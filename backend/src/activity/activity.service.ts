import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export enum ActivityAction {
  ITEM_ADDED = 'ITEM_ADDED',
  ITEM_REMOVED = 'ITEM_REMOVED',
  ITEM_UPDATED = 'ITEM_UPDATED',
  COLLABORATOR_JOINED = 'COLLABORATOR_JOINED',
  COLLABORATOR_LEFT = 'COLLABORATOR_LEFT',
  COMMENT_ADDED = 'COMMENT_ADDED',
  POLL_CREATED = 'POLL_CREATED',
  POLL_VOTED = 'POLL_VOTED',
  EXPENSE_ADDED = 'EXPENSE_ADDED',
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_COMPLETED = 'TASK_COMPLETED',
}

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    tripId: string,
    userId: string,
    action: string,
    targetType?: string,
    targetId?: string,
    metadata?: Record<string, any>,
  ) {
    return this.prisma.tripActivity.create({
      data: {
        tripId,
        userId,
        action,
        targetType: targetType ?? null,
        targetId: targetId ?? null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
      include: {
        user: { select: { id: true, name: true, picture: true } },
      },
    });
  }

  async getByTrip(
    tripId: string,
    options?: { userId?: string; action?: string; limit?: number; offset?: number },
  ) {
    const where: any = { tripId };
    if (options?.userId) where.userId = options.userId;
    if (options?.action) where.action = options.action;

    const [data, total] = await Promise.all([
      this.prisma.tripActivity.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, picture: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit ?? 50,
        skip: options?.offset ?? 0,
      }),
      this.prisma.tripActivity.count({ where }),
    ]);

    return {
      data: data.map((a) => ({
        ...a,
        metadata: a.metadata ? JSON.parse(a.metadata) : null,
      })),
      total,
    };
  }
}
