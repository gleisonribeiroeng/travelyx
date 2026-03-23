import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService, ActivityAction } from '../activity/activity.service';
import { CollaborationGateway } from '../collaboration/collaboration.gateway';

@Injectable()
export class PollsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly collaborationGateway: CollaborationGateway,
  ) {}

  async create(tripId: string, userId: string, question: string, options: string[]) {
    const poll = await this.prisma.tripPoll.create({
      data: {
        tripId,
        createdByUserId: userId,
        question,
        options: {
          create: options.map((label) => ({ label })),
        },
      },
      include: {
        createdBy: { select: { id: true, name: true, picture: true } },
        options: {
          include: {
            votes: {
              include: {
                user: { select: { id: true, name: true, picture: true } },
              },
            },
          },
        },
      },
    });

    await this.activityService.log(
      tripId,
      userId,
      ActivityAction.POLL_CREATED,
      'poll',
      poll.id,
      { question },
    );

    this.collaborationGateway.emitToTrip(tripId, 'trip:poll:created', { poll });

    return this.formatPoll(poll, userId);
  }

  async getByTrip(tripId: string, userId: string) {
    const polls = await this.prisma.tripPoll.findMany({
      where: { tripId },
      include: {
        createdBy: { select: { id: true, name: true, picture: true } },
        options: {
          include: {
            votes: {
              include: {
                user: { select: { id: true, name: true, picture: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return polls.map((poll) => this.formatPoll(poll, userId));
  }

  async vote(pollId: string, optionId: string, userId: string) {
    const poll = await this.prisma.tripPoll.findUnique({
      where: { id: pollId },
      include: { options: true },
    });
    if (!poll) throw new NotFoundException('Enquete nao encontrada.');

    if (poll.closedAt) {
      throw new BadRequestException('Esta enquete ja foi encerrada.');
    }

    const option = poll.options.find((o) => o.id === optionId);
    if (!option) throw new NotFoundException('Opcao nao encontrada.');

    // Check if user already voted for this option
    const existingVote = await this.prisma.tripPollVote.findUnique({
      where: { optionId_userId: { optionId, userId } },
    });

    if (existingVote) {
      // Toggle off: remove the vote
      await this.prisma.tripPollVote.delete({ where: { id: existingVote.id } });
    } else {
      // Remove any existing vote for other options in this poll
      const otherOptionIds = poll.options.filter((o) => o.id !== optionId).map((o) => o.id);
      if (otherOptionIds.length > 0) {
        await this.prisma.tripPollVote.deleteMany({
          where: { optionId: { in: otherOptionIds }, userId },
        });
      }

      // Create the new vote
      await this.prisma.tripPollVote.create({
        data: { optionId, userId },
      });
    }

    await this.activityService.log(
      poll.tripId,
      userId,
      ActivityAction.POLL_VOTED,
      'poll',
      pollId,
      { optionId },
    );

    // Return updated poll
    const updatedPoll = await this.prisma.tripPoll.findUnique({
      where: { id: pollId },
      include: {
        createdBy: { select: { id: true, name: true, picture: true } },
        options: {
          include: {
            votes: {
              include: {
                user: { select: { id: true, name: true, picture: true } },
              },
            },
          },
        },
      },
    });

    this.collaborationGateway.emitToTrip(poll.tripId, 'trip:poll:voted', {
      pollId,
      userId,
    });

    return this.formatPoll(updatedPoll!, userId);
  }

  async close(pollId: string, userId: string) {
    const poll = await this.prisma.tripPoll.findUnique({ where: { id: pollId } });
    if (!poll) throw new NotFoundException('Enquete nao encontrada.');

    if (poll.createdByUserId !== userId) {
      throw new ForbiddenException('Apenas o criador pode encerrar a enquete.');
    }

    if (poll.closedAt) {
      throw new BadRequestException('Esta enquete ja foi encerrada.');
    }

    const updated = await this.prisma.tripPoll.update({
      where: { id: pollId },
      data: { closedAt: new Date() },
      include: {
        createdBy: { select: { id: true, name: true, picture: true } },
        options: {
          include: {
            votes: {
              include: {
                user: { select: { id: true, name: true, picture: true } },
              },
            },
          },
        },
      },
    });

    this.collaborationGateway.emitToTrip(poll.tripId, 'trip:poll:closed', { pollId });

    return this.formatPoll(updated, userId);
  }

  private formatPoll(poll: any, currentUserId: string) {
    return {
      id: poll.id,
      tripId: poll.tripId,
      question: poll.question,
      closedAt: poll.closedAt,
      createdAt: poll.createdAt,
      createdBy: poll.createdBy,
      options: poll.options.map((opt: any) => ({
        id: opt.id,
        label: opt.label,
        voteCount: opt.votes.length,
        votedByMe: opt.votes.some((v: any) => v.userId === currentUserId),
        voters: opt.votes.map((v: any) => v.user),
      })),
    };
  }
}
