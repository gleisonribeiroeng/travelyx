import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByUser(userId: string) {
    const trips = await this.prisma.trip.findMany({
      where: { userId },
      include: { itineraryItems: { orderBy: [{ date: 'asc' }, { order: 'asc' }] } },
      orderBy: { updatedAt: 'desc' },
    });
    return trips.map((t) => this.serialize(t));
  }

  async findOne(id: string, userId: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id, userId },
      include: { itineraryItems: { orderBy: [{ date: 'asc' }, { order: 'asc' }] } },
    });
    if (!trip) throw new NotFoundException('Trip not found');
    return this.serialize(trip);
  }

  async create(userId: string, data: any) {
    const trip = await this.prisma.trip.create({
      data: {
        id: data.id,
        name: data.name ?? '',
        destination: data.destination ?? '',
        dateStart: data.dates?.start ?? '',
        dateEnd: data.dates?.end ?? '',
        flights: JSON.stringify(data.flights ?? []),
        stays: JSON.stringify(data.stays ?? []),
        carRentals: JSON.stringify(data.carRentals ?? []),
        transports: JSON.stringify(data.transports ?? []),
        activities: JSON.stringify(data.activities ?? []),
        attractions: JSON.stringify(data.attractions ?? []),
        userId,
        itineraryItems: data.itineraryItems?.length
          ? {
              createMany: {
                data: data.itineraryItems.map((item: any) => ({
                  id: item.id,
                  type: item.type,
                  refId: item.refId ?? null,
                  date: item.date,
                  timeSlot: item.timeSlot ?? null,
                  durationMinutes: item.durationMinutes ?? null,
                  label: item.label,
                  notes: item.notes ?? '',
                  order: item.order ?? 0,
                })),
              },
            }
          : undefined,
      },
      include: { itineraryItems: { orderBy: [{ date: 'asc' }, { order: 'asc' }] } },
    });
    return this.serialize(trip);
  }

  async update(id: string, userId: string, data: any) {
    const existing = await this.prisma.trip.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Trip not found');

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.destination !== undefined) updateData.destination = data.destination;
    if (data.dates) {
      if (data.dates.start !== undefined) updateData.dateStart = data.dates.start;
      if (data.dates.end !== undefined) updateData.dateEnd = data.dates.end;
    }
    if (data.flights !== undefined) updateData.flights = JSON.stringify(data.flights);
    if (data.stays !== undefined) updateData.stays = JSON.stringify(data.stays);
    if (data.carRentals !== undefined) updateData.carRentals = JSON.stringify(data.carRentals);
    if (data.transports !== undefined) updateData.transports = JSON.stringify(data.transports);
    if (data.activities !== undefined) updateData.activities = JSON.stringify(data.activities);
    if (data.attractions !== undefined) updateData.attractions = JSON.stringify(data.attractions);

    await this.prisma.trip.update({
      where: { id },
      data: updateData,
    });

    // Replace-all strategy for itinerary items
    if (data.itineraryItems !== undefined) {
      await this.prisma.itineraryItem.deleteMany({ where: { tripId: id } });
      if (data.itineraryItems.length > 0) {
        await this.prisma.itineraryItem.createMany({
          data: data.itineraryItems.map((item: any) => ({
            id: item.id,
            type: item.type,
            refId: item.refId ?? null,
            date: item.date,
            timeSlot: item.timeSlot ?? null,
            durationMinutes: item.durationMinutes ?? null,
            label: item.label,
            notes: item.notes ?? '',
            order: item.order ?? 0,
            tripId: id,
          })),
        });
      }
    }

    const trip = await this.prisma.trip.findFirst({
      where: { id },
      include: { itineraryItems: { orderBy: [{ date: 'asc' }, { order: 'asc' }] } },
    });
    return this.serialize(trip!);
  }

  async remove(id: string, userId: string) {
    const existing = await this.prisma.trip.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Trip not found');
    await this.prisma.trip.delete({ where: { id } });
    return { deleted: true };
  }

  // --- Itinerary Items ---

  async addItineraryItem(tripId: string, userId: string, data: any) {
    const trip = await this.prisma.trip.findFirst({ where: { id: tripId, userId } });
    if (!trip) throw new NotFoundException('Trip not found');

    const item = await this.prisma.itineraryItem.create({
      data: {
        id: data.id,
        type: data.type,
        refId: data.refId ?? null,
        date: data.date,
        timeSlot: data.timeSlot ?? null,
        durationMinutes: data.durationMinutes ?? null,
        label: data.label,
        notes: data.notes ?? '',
        order: data.order ?? 0,
        tripId,
      },
    });

    await this.prisma.trip.update({ where: { id: tripId }, data: { updatedAt: new Date() } });
    return item;
  }

  async updateItineraryItem(tripId: string, itemId: string, userId: string, data: any) {
    const trip = await this.prisma.trip.findFirst({ where: { id: tripId, userId } });
    if (!trip) throw new NotFoundException('Trip not found');

    const existing = await this.prisma.itineraryItem.findFirst({ where: { id: itemId, tripId } });
    if (!existing) throw new NotFoundException('Itinerary item not found');

    const item = await this.prisma.itineraryItem.update({
      where: { id: itemId },
      data: {
        type: data.type ?? existing.type,
        refId: data.refId !== undefined ? data.refId : existing.refId,
        date: data.date ?? existing.date,
        timeSlot: data.timeSlot !== undefined ? data.timeSlot : existing.timeSlot,
        durationMinutes: data.durationMinutes !== undefined ? data.durationMinutes : existing.durationMinutes,
        label: data.label ?? existing.label,
        notes: data.notes ?? existing.notes,
        order: data.order ?? existing.order,
      },
    });

    await this.prisma.trip.update({ where: { id: tripId }, data: { updatedAt: new Date() } });
    return item;
  }

  async removeItineraryItem(tripId: string, itemId: string, userId: string) {
    const trip = await this.prisma.trip.findFirst({ where: { id: tripId, userId } });
    if (!trip) throw new NotFoundException('Trip not found');

    const existing = await this.prisma.itineraryItem.findFirst({ where: { id: itemId, tripId } });
    if (!existing) throw new NotFoundException('Itinerary item not found');

    await this.prisma.itineraryItem.delete({ where: { id: itemId } });
    await this.prisma.trip.update({ where: { id: tripId }, data: { updatedAt: new Date() } });
    return { deleted: true };
  }

  private serialize(trip: any) {
    return {
      id: trip.id,
      name: trip.name,
      destination: trip.destination,
      dates: { start: trip.dateStart, end: trip.dateEnd },
      flights: JSON.parse(trip.flights),
      stays: JSON.parse(trip.stays),
      carRentals: JSON.parse(trip.carRentals),
      transports: JSON.parse(trip.transports),
      activities: JSON.parse(trip.activities),
      attractions: JSON.parse(trip.attractions),
      itineraryItems: trip.itineraryItems ?? [],
      createdAt: trip.createdAt.toISOString(),
      updatedAt: trip.updatedAt.toISOString(),
    };
  }
}
