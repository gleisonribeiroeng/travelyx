import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';
import * as crypto from 'crypto';

const ROLE_HIERARCHY: Record<string, number> = {
  VIEWER: 0,
  EDITOR: 1,
  OWNER: 2,
};

@Injectable()
export class CollaborationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  // ─── Invites ────────────────────────────────────────────────────────────────

  async invite(tripId: string, invitedByUserId: string, email: string, role: string) {
    // Verify the trip belongs to the user (owner)
    const trip = await this.prisma.trip.findFirst({ where: { id: tripId, userId: invitedByUserId } });
    if (!trip) throw new NotFoundException('Trip not found');

    // Check PRO plan
    const { plan } = await this.subscriptionService.getUserPlan(invitedByUserId);
    if (plan === 'FREE') {
      throw new BadRequestException({
        message: 'Colaboracao requer plano PRO. Faca upgrade para convidar pessoas.',
        code: 'PLAN_LIMIT',
      });
    }

    // Check max 10 collaborators for PRO
    const collaboratorCount = await this.prisma.tripCollaborator.count({ where: { tripId } });
    if (collaboratorCount >= 10) {
      throw new BadRequestException({
        message: 'Limite de 10 colaboradores atingido para este plano.',
        code: 'PLAN_LIMIT',
      });
    }

    // Check if already a collaborator
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const existingCollab = await this.prisma.tripCollaborator.findUnique({
        where: { tripId_userId: { tripId, userId: existingUser.id } },
      });
      if (existingCollab) {
        throw new BadRequestException('Este usuario ja e um colaborador desta viagem.');
      }
      // Also check if it's the owner
      if (trip.userId === existingUser.id) {
        throw new BadRequestException('Voce nao pode convidar o proprietario da viagem.');
      }
    }

    // Check if already invited (PENDING)
    const existingInvite = await this.prisma.tripInvite.findFirst({
      where: { tripId, email, status: 'PENDING' },
    });
    if (existingInvite) {
      throw new BadRequestException('Ja existe um convite pendente para este email.');
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await this.prisma.tripInvite.create({
      data: {
        tripId,
        invitedByUserId,
        email,
        role,
        token,
        status: 'PENDING',
        expiresAt,
      },
      include: {
        trip: { select: { name: true, destination: true } },
        invitedBy: { select: { name: true, email: true } },
      },
    });

    return invite;
  }

  async acceptInvite(token: string, userId: string) {
    const invite = await this.prisma.tripInvite.findUnique({
      where: { token },
      include: { trip: { select: { name: true } } },
    });
    if (!invite) throw new NotFoundException('Convite nao encontrado.');

    if (invite.status !== 'PENDING') {
      throw new BadRequestException('Este convite ja foi respondido.');
    }

    if (new Date() > invite.expiresAt) {
      throw new BadRequestException('Este convite expirou.');
    }

    // Create collaborator
    await this.prisma.tripCollaborator.create({
      data: {
        tripId: invite.tripId,
        userId,
        role: invite.role,
      },
    });

    // Update invite status
    await this.prisma.tripInvite.update({
      where: { id: invite.id },
      data: { status: 'ACCEPTED' },
    });

    return { accepted: true, tripId: invite.tripId, tripName: invite.trip.name };
  }

  async rejectInvite(token: string, userId: string) {
    const invite = await this.prisma.tripInvite.findUnique({ where: { token } });
    if (!invite) throw new NotFoundException('Convite nao encontrado.');

    if (invite.status !== 'PENDING') {
      throw new BadRequestException('Este convite ja foi respondido.');
    }

    await this.prisma.tripInvite.update({
      where: { id: invite.id },
      data: { status: 'REJECTED' },
    });

    return { rejected: true };
  }

  async getPendingInvitesForUser(email: string) {
    return this.prisma.tripInvite.findMany({
      where: {
        email,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      include: {
        trip: { select: { id: true, name: true, destination: true } },
        invitedBy: { select: { name: true, email: true, picture: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Collaborators ──────────────────────────────────────────────────────────

  async getCollaborators(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: { userId: true, user: { select: { id: true, name: true, email: true, picture: true } } },
    });
    if (!trip) throw new NotFoundException('Trip not found');

    const collaborators = await this.prisma.tripCollaborator.findMany({
      where: { tripId },
      include: {
        user: { select: { id: true, name: true, email: true, picture: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });

    // Include the owner as first entry
    return [
      {
        id: 'owner',
        userId: trip.user.id,
        role: 'OWNER',
        joinedAt: null,
        user: trip.user,
      },
      ...collaborators.map((c) => ({
        id: c.id,
        userId: c.userId,
        role: c.role,
        joinedAt: c.joinedAt.toISOString(),
        user: c.user,
      })),
    ];
  }

  async removeCollaborator(tripId: string, collaboratorId: string, requestingUserId: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');

    if (trip.userId !== requestingUserId) {
      throw new ForbiddenException('Apenas o proprietario pode remover colaboradores.');
    }

    const collab = await this.prisma.tripCollaborator.findUnique({ where: { id: collaboratorId } });
    if (!collab || collab.tripId !== tripId) {
      throw new NotFoundException('Colaborador nao encontrado.');
    }

    // Can't remove the owner
    if (collab.userId === trip.userId) {
      throw new BadRequestException('Nao e possivel remover o proprietario da viagem.');
    }

    await this.prisma.tripCollaborator.delete({ where: { id: collaboratorId } });
    return { deleted: true };
  }

  async changeRole(tripId: string, collaboratorId: string, newRole: string, requestingUserId: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');

    if (trip.userId !== requestingUserId) {
      throw new ForbiddenException('Apenas o proprietario pode alterar funcoes.');
    }

    const collab = await this.prisma.tripCollaborator.findUnique({ where: { id: collaboratorId } });
    if (!collab || collab.tripId !== tripId) {
      throw new NotFoundException('Colaborador nao encontrado.');
    }

    // Can't change the owner's role
    if (collab.userId === trip.userId) {
      throw new BadRequestException('Nao e possivel alterar a funcao do proprietario.');
    }

    const updated = await this.prisma.tripCollaborator.update({
      where: { id: collaboratorId },
      data: { role: newRole },
      include: { user: { select: { id: true, name: true, email: true, picture: true } } },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      role: updated.role,
      user: updated.user,
    };
  }

  // ─── Share Link ─────────────────────────────────────────────────────────────

  async generateShareLink(tripId: string, userId: string) {
    const trip = await this.prisma.trip.findFirst({ where: { id: tripId, userId } });
    if (!trip) throw new NotFoundException('Trip not found');

    if (trip.publicSlug) {
      // Toggle off: remove slug
      await this.prisma.trip.update({
        where: { id: tripId },
        data: { publicSlug: null },
      });
      return { publicSlug: null, enabled: false };
    }

    // Generate slug
    const slug = crypto.randomUUID().slice(0, 8);
    await this.prisma.trip.update({
      where: { id: tripId },
      data: { publicSlug: slug },
    });

    return { publicSlug: slug, enabled: true };
  }

  async getPublicTrip(slug: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { publicSlug: slug },
      include: {
        user: { select: { name: true, picture: true } },
        itineraryItems: {
          orderBy: [{ date: 'asc' }, { order: 'asc' }],
          select: {
            id: true,
            type: true,
            date: true,
            timeSlot: true,
            label: true,
            durationMinutes: true,
            notes: true,
            order: true,
          },
        },
      },
    });
    if (!trip) throw new NotFoundException('Viagem nao encontrada.');

    // Sanitized data: no user emails, no expense amounts
    return {
      id: trip.id,
      name: trip.name,
      destination: trip.destination,
      dates: { start: trip.dateStart, end: trip.dateEnd },
      status: trip.status,
      coverImage: trip.coverImage,
      travelers: trip.travelers,
      owner: { name: trip.user.name, picture: trip.user.picture },
      itineraryItems: trip.itineraryItems,
    };
  }

  // ─── Access Control ─────────────────────────────────────────────────────────

  async getTripRole(tripId: string, userId: string): Promise<string | null> {
    // Check if owner
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId }, select: { userId: true } });
    if (!trip) return null;
    if (trip.userId === userId) return 'OWNER';

    // Check collaborator
    const collab = await this.prisma.tripCollaborator.findUnique({
      where: { tripId_userId: { tripId, userId } },
    });
    return collab ? collab.role : null;
  }

  async canAccessTrip(tripId: string, userId: string): Promise<boolean> {
    const role = await this.getTripRole(tripId, userId);
    return role !== null;
  }

  /**
   * Check role hierarchy: VIEWER(0) < EDITOR(1) < OWNER(2)
   */
  static meetsMinRole(userRole: string, requiredRole: string): boolean {
    return (ROLE_HIERARCHY[userRole] ?? -1) >= (ROLE_HIERARCHY[requiredRole] ?? 99);
  }
}
