import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService, ActivityAction } from '../activity/activity.service';
import { CollaborationGateway } from '../collaboration/collaboration.gateway';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly collaborationGateway: CollaborationGateway,
  ) {}

  async create(
    tripId: string,
    userId: string,
    targetType: string,
    targetId: string,
    content: string,
    parentId?: string,
  ) {
    const comment = await this.prisma.tripComment.create({
      data: {
        tripId,
        userId,
        targetType,
        targetId,
        content,
        parentId: parentId ?? null,
      },
      include: {
        user: { select: { id: true, name: true, picture: true } },
        replies: {
          include: {
            user: { select: { id: true, name: true, picture: true } },
          },
        },
      },
    });

    await this.activityService.log(
      tripId,
      userId,
      ActivityAction.COMMENT_ADDED,
      targetType,
      targetId,
      { commentId: comment.id },
    );

    this.collaborationGateway.emitCommentAdded(tripId, {
      ...comment,
      reactions: JSON.parse(comment.reactions),
    });

    return {
      ...comment,
      reactions: JSON.parse(comment.reactions),
    };
  }

  async getByTarget(tripId: string, targetType: string, targetId: string) {
    const comments = await this.prisma.tripComment.findMany({
      where: {
        tripId,
        targetType,
        targetId,
        parentId: null, // Only top-level comments
      },
      include: {
        user: { select: { id: true, name: true, picture: true } },
        replies: {
          include: {
            user: { select: { id: true, name: true, picture: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return comments.map((c) => ({
      ...c,
      reactions: JSON.parse(c.reactions),
      replies: c.replies.map((r) => ({
        ...r,
        reactions: JSON.parse(r.reactions),
      })),
    }));
  }

  async getByTrip(tripId: string, limit?: number, offset?: number) {
    const comments = await this.prisma.tripComment.findMany({
      where: { tripId, parentId: null },
      include: {
        user: { select: { id: true, name: true, picture: true } },
        replies: {
          include: {
            user: { select: { id: true, name: true, picture: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit ?? 50,
      skip: offset ?? 0,
    });

    return comments.map((c) => ({
      ...c,
      reactions: JSON.parse(c.reactions),
      replies: c.replies.map((r) => ({
        ...r,
        reactions: JSON.parse(r.reactions),
      })),
    }));
  }

  async toggleReaction(commentId: string, userId: string, emoji: string) {
    const comment = await this.prisma.tripComment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('Comentario nao encontrado.');

    const reactions: Record<string, string[]> = JSON.parse(comment.reactions);

    if (!reactions[emoji]) {
      reactions[emoji] = [];
    }

    const index = reactions[emoji].indexOf(userId);
    if (index >= 0) {
      reactions[emoji].splice(index, 1);
      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }
    } else {
      reactions[emoji].push(userId);
    }

    const updated = await this.prisma.tripComment.update({
      where: { id: commentId },
      data: { reactions: JSON.stringify(reactions) },
      include: {
        user: { select: { id: true, name: true, picture: true } },
      },
    });

    this.collaborationGateway.emitToTrip(comment.tripId, 'trip:comment:reacted', {
      commentId,
      reactions,
      userId,
    });

    return {
      ...updated,
      reactions,
    };
  }

  async remove(commentId: string, userId: string) {
    const comment = await this.prisma.tripComment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('Comentario nao encontrado.');

    if (comment.userId !== userId) {
      throw new ForbiddenException('Apenas o autor pode excluir este comentario.');
    }

    await this.prisma.tripComment.delete({ where: { id: commentId } });

    this.collaborationGateway.emitToTrip(comment.tripId, 'trip:comment:removed', {
      commentId,
      userId,
    });

    return { deleted: true };
  }
}
