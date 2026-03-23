import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService, ActivityAction } from '../activity/activity.service';
import { CollaborationGateway } from '../collaboration/collaboration.gateway';

export interface UserBalance {
  userId: string;
  userName: string;
  userPicture: string;
  totalPaid: number;
  totalOwed: number;
  net: number;
}

export interface Settlement {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
}

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly collaborationGateway: CollaborationGateway,
  ) {}

  async create(
    tripId: string,
    userId: string,
    data: {
      label: string;
      totalAmount: number;
      currency?: string;
      splitMode?: string;
      date: string;
      entries: { userId: string; amount: number }[];
    },
  ) {
    const expense = await this.prisma.expenseSplit.create({
      data: {
        tripId,
        createdByUserId: userId,
        label: data.label,
        totalAmount: data.totalAmount,
        currency: data.currency ?? 'BRL',
        splitMode: data.splitMode ?? 'EQUAL',
        date: data.date,
        entries: {
          create: data.entries.map((entry) => ({
            userId: entry.userId,
            amount: entry.amount,
          })),
        },
      },
      include: {
        createdBy: { select: { id: true, name: true, picture: true } },
        entries: {
          include: {
            user: { select: { id: true, name: true, picture: true } },
          },
        },
      },
    });

    await this.activityService.log(
      tripId,
      userId,
      ActivityAction.EXPENSE_ADDED,
      'expense',
      expense.id,
      { label: data.label, totalAmount: data.totalAmount },
    );

    this.collaborationGateway.emitToTrip(tripId, 'trip:expense:added', { expense });

    return expense;
  }

  async getByTrip(tripId: string) {
    return this.prisma.expenseSplit.findMany({
      where: { tripId },
      include: {
        createdBy: { select: { id: true, name: true, picture: true } },
        entries: {
          include: {
            user: { select: { id: true, name: true, picture: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markEntryPaid(entryId: string, userId: string) {
    const entry = await this.prisma.expenseSplitEntry.findUnique({
      where: { id: entryId },
      include: {
        expenseSplit: { select: { tripId: true, createdByUserId: true } },
      },
    });
    if (!entry) throw new NotFoundException('Entrada nao encontrada.');

    // Only the entry's user or the expense creator can toggle
    const trip = await this.prisma.trip.findUnique({
      where: { id: entry.expenseSplit.tripId },
      select: { userId: true },
    });

    if (entry.userId !== userId && trip?.userId !== userId && entry.expenseSplit.createdByUserId !== userId) {
      throw new ForbiddenException('Sem permissao para alterar esta entrada.');
    }

    const updated = await this.prisma.expenseSplitEntry.update({
      where: { id: entryId },
      data: { isPaid: !entry.isPaid },
      include: {
        user: { select: { id: true, name: true, picture: true } },
      },
    });

    this.collaborationGateway.emitToTrip(entry.expenseSplit.tripId, 'trip:expense:entry:toggled', {
      entryId,
      isPaid: updated.isPaid,
      userId,
    });

    return updated;
  }

  async remove(expenseId: string, userId: string) {
    const expense = await this.prisma.expenseSplit.findUnique({
      where: { id: expenseId },
    });
    if (!expense) throw new NotFoundException('Despesa nao encontrada.');

    if (expense.createdByUserId !== userId) {
      throw new ForbiddenException('Apenas o criador pode excluir esta despesa.');
    }

    await this.prisma.expenseSplit.delete({ where: { id: expenseId } });

    this.collaborationGateway.emitToTrip(expense.tripId, 'trip:expense:removed', {
      expenseId,
      userId,
    });

    return { deleted: true };
  }

  async getBalance(tripId: string) {
    const expenses = await this.prisma.expenseSplit.findMany({
      where: { tripId },
      include: {
        createdBy: { select: { id: true, name: true, picture: true } },
        entries: {
          include: {
            user: { select: { id: true, name: true, picture: true } },
          },
        },
      },
    });

    // Build balance map: userId -> { paid, owed }
    const userMap = new Map<string, { name: string; picture: string; paid: number; owed: number }>();

    const ensureUser = (id: string, name: string, picture: string) => {
      if (!userMap.has(id)) {
        userMap.set(id, { name, picture, paid: 0, owed: 0 });
      }
    };

    for (const expense of expenses) {
      // The creator paid the total amount
      ensureUser(expense.createdBy.id, expense.createdBy.name, expense.createdBy.picture);
      userMap.get(expense.createdBy.id)!.paid += expense.totalAmount;

      // Each entry user owes their share
      for (const entry of expense.entries) {
        ensureUser(entry.user.id, entry.user.name, entry.user.picture);
        userMap.get(entry.user.id)!.owed += entry.amount;
      }
    }

    const balances: UserBalance[] = [];
    for (const [userId, data] of userMap) {
      balances.push({
        userId,
        userName: data.name,
        userPicture: data.picture,
        totalPaid: Math.round(data.paid * 100) / 100,
        totalOwed: Math.round(data.owed * 100) / 100,
        net: Math.round((data.paid - data.owed) * 100) / 100,
      });
    }

    // Greedy settlement algorithm to minimize transactions
    const settlements = this.calculateSettlements(balances);

    return { balances, settlements };
  }

  private calculateSettlements(balances: UserBalance[]): Settlement[] {
    const settlements: Settlement[] = [];

    // Create working copies of net balances
    const debtors: { userId: string; userName: string; amount: number }[] = [];
    const creditors: { userId: string; userName: string; amount: number }[] = [];

    for (const b of balances) {
      if (b.net < -0.01) {
        debtors.push({ userId: b.userId, userName: b.userName, amount: Math.abs(b.net) });
      } else if (b.net > 0.01) {
        creditors.push({ userId: b.userId, userName: b.userName, amount: b.net });
      }
    }

    // Sort descending by amount for greedy approach
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
      const transfer = Math.min(debtors[i].amount, creditors[j].amount);
      if (transfer > 0.01) {
        settlements.push({
          fromUserId: debtors[i].userId,
          fromUserName: debtors[i].userName,
          toUserId: creditors[j].userId,
          toUserName: creditors[j].userName,
          amount: Math.round(transfer * 100) / 100,
        });
      }

      debtors[i].amount -= transfer;
      creditors[j].amount -= transfer;

      if (debtors[i].amount < 0.01) i++;
      if (creditors[j].amount < 0.01) j++;
    }

    return settlements;
  }
}
