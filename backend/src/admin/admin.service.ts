import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        picture: true,
        role: true,
        plan: true,
        isActive: true,
        createdAt: true,
        _count: { select: { trips: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        picture: true,
        role: true,
        plan: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        trips: {
          select: {
            id: true,
            name: true,
            destination: true,
            dateStart: true,
            dateEnd: true,
            status: true,
            currency: true,
            travelers: true,
            flights: true,
            stays: true,
            carRentals: true,
            activities: true,
            attractions: true,
            coverImage: true,
            _count: { select: { itineraryItems: true } },
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) return null;

    // Parse JSON fields and count items per trip
    const trips = user.trips.map(trip => {
      const parseLen = (json: string) => { try { return JSON.parse(json).length; } catch { return 0; } };
      return {
        id: trip.id,
        name: trip.name || 'Sem nome',
        destination: trip.destination,
        dateStart: trip.dateStart,
        dateEnd: trip.dateEnd,
        status: trip.status,
        currency: trip.currency,
        travelers: trip.travelers,
        coverImage: trip.coverImage,
        createdAt: trip.createdAt,
        updatedAt: trip.updatedAt,
        counts: {
          flights: parseLen(trip.flights),
          stays: parseLen(trip.stays),
          carRentals: parseLen(trip.carRentals),
          activities: parseLen(trip.activities),
          attractions: parseLen(trip.attractions),
          itineraryItems: trip._count.itineraryItems,
        },
      };
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      picture: user.picture,
      role: user.role,
      plan: user.plan,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      totalTrips: trips.length,
      trips,
    };
  }

  async updateRole(userId: string, role: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role: role as any },
      select: { id: true, role: true },
    });
  }

  async toggleActive(userId: string, isActive: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: { id: true, isActive: true },
    });
  }
}
