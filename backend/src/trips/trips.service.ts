import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByUser(userId: string) {
    const trips = await this.prisma.trip.findMany({
      where: { userId },
      include: {
        itineraryItems: {
          orderBy: [{ date: 'asc' }, { order: 'asc' }],
          include: {
            attachment: {
              select: { id: true, fileName: true, mimeType: true, sizeBytes: true, createdAt: true },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return trips.map((t) => this.serialize(t));
  }

  async findOne(id: string, userId: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id, userId },
      include: {
        itineraryItems: {
          orderBy: [{ date: 'asc' }, { order: 'asc' }],
          include: {
            attachment: {
              select: { id: true, fileName: true, mimeType: true, sizeBytes: true, createdAt: true },
            },
          },
        },
      },
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
        status: data.status ?? 'planejamento',
        currency: data.currency ?? 'BRL',
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
                  isPaid: item.isPaid ?? false,
                })),
              },
            }
          : undefined,
      },
      include: {
        itineraryItems: {
          orderBy: [{ date: 'asc' }, { order: 'asc' }],
          include: {
            attachment: {
              select: { id: true, fileName: true, mimeType: true, sizeBytes: true, createdAt: true },
            },
          },
        },
      },
    });
    return this.serialize(trip);
  }

  async update(id: string, userId: string, data: any) {
    const existing = await this.prisma.trip.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Trip not found');

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.destination !== undefined) updateData.destination = data.destination;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.currency !== undefined) updateData.currency = data.currency;
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

    if (data.itineraryItems !== undefined) {
      const existingItems = await this.prisma.itineraryItem.findMany({
        where: { tripId: id },
      });
      const incomingIds = new Set(data.itineraryItems.map((i: any) => i.id));

      // Delete items that are no longer present
      for (const existing of existingItems) {
        if (!incomingIds.has(existing.id)) {
          await this.prisma.itineraryItem.delete({ where: { id: existing.id } });
        }
      }

      // Upsert remaining items
      for (const item of data.itineraryItems) {
        await this.prisma.itineraryItem.upsert({
          where: { id: item.id },
          update: {
            type: item.type,
            refId: item.refId ?? null,
            date: item.date,
            timeSlot: item.timeSlot ?? null,
            durationMinutes: item.durationMinutes ?? null,
            label: item.label,
            notes: item.notes ?? '',
            order: item.order ?? 0,
            isPaid: item.isPaid ?? false,
          },
          create: {
            id: item.id,
            type: item.type,
            refId: item.refId ?? null,
            date: item.date,
            timeSlot: item.timeSlot ?? null,
            durationMinutes: item.durationMinutes ?? null,
            label: item.label,
            notes: item.notes ?? '',
            order: item.order ?? 0,
            isPaid: item.isPaid ?? false,
            tripId: id,
          },
        });
      }
    }

    const trip = await this.prisma.trip.findFirst({
      where: { id },
      include: {
        itineraryItems: {
          orderBy: [{ date: 'asc' }, { order: 'asc' }],
          include: {
            attachment: {
              select: { id: true, fileName: true, mimeType: true, sizeBytes: true, createdAt: true },
            },
          },
        },
      },
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
        isPaid: data.isPaid ?? false,
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
        isPaid: data.isPaid !== undefined ? data.isPaid : existing.isPaid,
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

  // --- Attachments ---

  async uploadAttachment(tripId: string, itemId: string, userId: string, file: Express.Multer.File) {
    const trip = await this.prisma.trip.findFirst({ where: { id: tripId, userId } });
    if (!trip) throw new NotFoundException('Trip not found');

    const item = await this.prisma.itineraryItem.findFirst({ where: { id: itemId, tripId } });
    if (!item) throw new NotFoundException('Itinerary item not found');

    // Delete existing attachment if any (replace)
    await this.prisma.attachment.deleteMany({ where: { itineraryItemId: itemId } });

    const attachment = await this.prisma.attachment.create({
      data: {
        fileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        data: file.buffer.toString('base64'),
        itineraryItemId: itemId,
      },
    });

    return {
      id: attachment.id,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      createdAt: attachment.createdAt.toISOString(),
    };
  }

  async getAttachment(tripId: string, itemId: string, userId: string) {
    const trip = await this.prisma.trip.findFirst({ where: { id: tripId, userId } });
    if (!trip) throw new NotFoundException('Trip not found');

    const attachment = await this.prisma.attachment.findFirst({
      where: { itineraryItemId: itemId },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');

    return {
      id: attachment.id,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      data: attachment.data,
      createdAt: attachment.createdAt.toISOString(),
    };
  }

  async removeAttachment(tripId: string, itemId: string, userId: string) {
    const trip = await this.prisma.trip.findFirst({ where: { id: tripId, userId } });
    if (!trip) throw new NotFoundException('Trip not found');

    const attachment = await this.prisma.attachment.findFirst({
      where: { itineraryItemId: itemId },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');

    await this.prisma.attachment.delete({ where: { id: attachment.id } });
    return { deleted: true };
  }

  private serialize(trip: any) {
    return {
      id: trip.id,
      name: trip.name,
      destination: trip.destination,
      status: trip.status,
      currency: trip.currency,
      dates: { start: trip.dateStart, end: trip.dateEnd },
      flights: JSON.parse(trip.flights),
      stays: JSON.parse(trip.stays),
      carRentals: JSON.parse(trip.carRentals),
      transports: JSON.parse(trip.transports),
      activities: JSON.parse(trip.activities),
      attractions: JSON.parse(trip.attractions),
      itineraryItems: (trip.itineraryItems ?? []).map((item: any) => ({
        id: item.id,
        type: item.type,
        refId: item.refId,
        date: item.date,
        timeSlot: item.timeSlot,
        label: item.label,
        durationMinutes: item.durationMinutes,
        notes: item.notes,
        order: item.order,
        isPaid: item.isPaid,
        attachment: item.attachment
          ? {
              id: item.attachment.id,
              fileName: item.attachment.fileName,
              mimeType: item.attachment.mimeType,
              sizeBytes: item.attachment.sizeBytes,
              createdAt: item.attachment.createdAt?.toISOString?.() ?? item.attachment.createdAt,
            }
          : null,
      })),
      createdAt: trip.createdAt.toISOString(),
      updatedAt: trip.updatedAt.toISOString(),
    };
  }
}
