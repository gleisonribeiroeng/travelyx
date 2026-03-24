import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByUser(userId: string) {
    const trips = await this.prisma.trip.findMany({
      where: {
        OR: [
          { userId },
          { collaborators: { some: { userId } } },
        ],
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
        collaborators: {
          include: {
            user: { select: { id: true, name: true, email: true, picture: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return trips.map((t) => this.serialize(t, userId));
  }

  async findOne(id: string, userId: string) {
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
        collaborators: {
          include: {
            user: { select: { id: true, name: true, email: true, picture: true } },
          },
        },
      },
    });
    if (!trip) throw new NotFoundException('Trip not found');

    // Check access: owner or collaborator
    const isOwner = trip.userId === userId;
    const isCollaborator = trip.collaborators?.some((c: any) => c.userId === userId);
    if (!isOwner && !isCollaborator) {
      throw new NotFoundException('Trip not found');
    }

    return this.serialize(trip, userId);
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
        travelers: data.travelers ?? 1,
        coverImage: data.coverImage ?? null,
        flights: JSON.stringify(data.flights ?? []),
        stays: JSON.stringify(data.stays ?? []),
        carRentals: JSON.stringify(data.carRentals ?? []),
        transports: JSON.stringify(data.transports ?? []),
        activities: JSON.stringify(data.activities ?? []),
        attractions: JSON.stringify(data.attractions ?? []),
        checklist: JSON.stringify(data.checklist ?? []),
        dayNotes: JSON.stringify(data.dayNotes ?? {}),
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
        collaborators: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
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
        collaborators: {
          include: {
            user: { select: { id: true, name: true, email: true, picture: true } },
          },
        },
      },
    });
    return this.serialize(trip, userId);
  }

  async update(id: string, userId: string, data: any) {
    const existing = await this.prisma.trip.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('Trip not found');

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.destination !== undefined) updateData.destination = data.destination;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.travelers !== undefined) updateData.travelers = data.travelers;
    if (data.coverImage !== undefined) updateData.coverImage = data.coverImage;
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
    if (data.checklist !== undefined) updateData.checklist = JSON.stringify(data.checklist);
    if (data.dayNotes !== undefined) updateData.dayNotes = JSON.stringify(data.dayNotes);

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
        collaborators: {
          include: {
            user: { select: { id: true, name: true, email: true, picture: true } },
          },
        },
      },
    });
    return this.serialize(trip!, userId);
  }

  async remove(id: string, userId: string) {
    const existing = await this.prisma.trip.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('Trip not found');

    // Only the owner can delete
    if (existing.userId !== userId) {
      throw new ForbiddenException('Only the trip owner can delete this trip.');
    }

    await this.prisma.trip.delete({ where: { id } });
    return { deleted: true };
  }

  // --- Itinerary Items ---

  async addItineraryItem(tripId: string, userId: string, data: any) {
    const trip = await this.prisma.trip.findFirst({ where: { id: tripId } });
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
    const trip = await this.prisma.trip.findFirst({ where: { id: tripId } });
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
    const trip = await this.prisma.trip.findFirst({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');

    const existing = await this.prisma.itineraryItem.findFirst({ where: { id: itemId, tripId } });
    if (!existing) throw new NotFoundException('Itinerary item not found');

    await this.prisma.itineraryItem.delete({ where: { id: itemId } });
    await this.prisma.trip.update({ where: { id: tripId }, data: { updatedAt: new Date() } });
    return { deleted: true };
  }

  // --- Attachments ---

  async uploadAttachment(tripId: string, itemId: string, userId: string, file: Express.Multer.File) {
    const trip = await this.prisma.trip.findFirst({ where: { id: tripId } });
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
    const trip = await this.prisma.trip.findFirst({ where: { id: tripId } });
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
    const trip = await this.prisma.trip.findFirst({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');

    const attachment = await this.prisma.attachment.findFirst({
      where: { itineraryItemId: itemId },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');

    await this.prisma.attachment.delete({ where: { id: attachment.id } });
    return { deleted: true };
  }

  // --- Clone Trip ---

  async cloneTrip(id: string, userId: string, newName?: string) {
    const source = await this.prisma.trip.findFirst({
      where: { id },
      include: {
        itineraryItems: true,
        collaborators: true,
      },
    });
    if (!source) throw new NotFoundException('Trip not found');

    // Check access: owner or collaborator
    const isOwner = source.userId === userId;
    const isCollaborator = source.collaborators?.some((c: any) => c.userId === userId);
    if (!isOwner && !isCollaborator) {
      throw new NotFoundException('Trip not found');
    }

    const cloned = await this.prisma.trip.create({
      data: {
        name: newName || `${source.name} (cópia)`,
        destination: source.destination,
        dateStart: '',
        dateEnd: '',
        status: 'planejamento',
        currency: source.currency,
        travelers: source.travelers,
        coverImage: source.coverImage,
        flights: source.flights,
        stays: source.stays,
        carRentals: source.carRentals,
        transports: source.transports,
        activities: source.activities,
        attractions: source.attractions,
        checklist: source.checklist,
        dayNotes: source.dayNotes,
        userId,
        itineraryItems: source.itineraryItems.length
          ? {
              createMany: {
                data: source.itineraryItems.map((item: any) => ({
                  type: item.type,
                  refId: item.refId,
                  date: item.date,
                  timeSlot: item.timeSlot,
                  durationMinutes: item.durationMinutes,
                  label: item.label,
                  notes: item.notes,
                  order: item.order,
                  isPaid: false,
                })),
              },
            }
          : undefined,
        collaborators: {
          create: { userId, role: 'OWNER' },
        },
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
        collaborators: {
          include: {
            user: { select: { id: true, name: true, email: true, picture: true } },
          },
        },
      },
    });

    return this.serialize(cloned, userId);
  }

  // --- Route Optimization (nearest-neighbor) ---

  optimizeRoute(items: { id: string; lat: number; lng: number }[]): { id: string; lat: number; lng: number }[] {
    if (items.length <= 2) return items;

    const remaining = [...items];
    const result: typeof items = [remaining.shift()!];

    while (remaining.length > 0) {
      const last = result[result.length - 1];
      let nearestIdx = 0;
      let nearestDist = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const d = this.haversine(last.lat, last.lng, remaining[i].lat, remaining[i].lng);
        if (d < nearestDist) {
          nearestDist = d;
          nearestIdx = i;
        }
      }

      result.push(remaining.splice(nearestIdx, 1)[0]);
    }

    return result;
  }

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // --- Trip Readiness Score ---

  computeReadiness(tripData: any) {
    const flights = JSON.parse(tripData.flights || '[]');
    const stays = JSON.parse(tripData.stays || '[]');
    const carRentals = JSON.parse(tripData.carRentals || '[]');
    const transports = JSON.parse(tripData.transports || '[]');
    const activities = JSON.parse(tripData.activities || '[]');
    const checklist = JSON.parse(tripData.checklist || '[]');
    const items = tripData.itineraryItems || [];

    const missing: { category: string; message: string; icon: string; priority: 'high' | 'medium' | 'low' }[] = [];
    let score = 0;
    const maxScore = 100;

    // Dates (15 pts)
    if (tripData.dateStart && tripData.dateEnd) {
      score += 15;
    } else {
      missing.push({ category: 'dates', message: 'Defina as datas da viagem', icon: 'calendar_today', priority: 'high' });
    }

    // Flights (20 pts)
    if (flights.length >= 2) {
      score += 20;
    } else if (flights.length === 1) {
      score += 10;
      missing.push({ category: 'flights', message: 'Adicione o voo de volta', icon: 'flight', priority: 'high' });
    } else {
      missing.push({ category: 'flights', message: 'Busque voos para seu destino', icon: 'flight', priority: 'high' });
    }

    // Accommodation (20 pts)
    if (tripData.dateStart && tripData.dateEnd) {
      const start = new Date(tripData.dateStart);
      const end = new Date(tripData.dateEnd);
      const totalNights = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
      if (totalNights > 0) {
        let coveredNights = 0;
        for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
          const dayStr = d.toISOString().split('T')[0];
          if (stays.some((s: any) => s.checkIn <= dayStr && s.checkOut > dayStr)) {
            coveredNights++;
          }
        }
        const coverage = coveredNights / totalNights;
        score += Math.round(coverage * 20);
        if (coverage < 1) {
          const uncovered = totalNights - coveredNights;
          missing.push({
            category: 'stays',
            message: `${uncovered} noite${uncovered > 1 ? 's' : ''} sem hospedagem`,
            icon: 'hotel',
            priority: uncovered > 2 ? 'high' : 'medium',
          });
        }
      } else if (stays.length > 0) {
        score += 20;
      }
    } else if (stays.length > 0) {
      score += 15;
    } else {
      missing.push({ category: 'stays', message: 'Busque hospedagem', icon: 'hotel', priority: 'high' });
    }

    // Transport (10 pts)
    if (transports.length > 0 || carRentals.length > 0) {
      score += 10;
    } else {
      missing.push({ category: 'transport', message: 'Planeje transporte no destino', icon: 'directions_car', priority: 'low' });
    }

    // Activities (10 pts)
    if (activities.length > 0) {
      score += 10;
    } else {
      missing.push({ category: 'activities', message: 'Adicione atividades e passeios', icon: 'local_activity', priority: 'low' });
    }

    // Itinerary (15 pts)
    if (items.length > 0) {
      score += Math.min(15, Math.round((items.length / Math.max(1, flights.length + stays.length + activities.length)) * 15));
    } else {
      missing.push({ category: 'itinerary', message: 'Monte seu roteiro dia a dia', icon: 'event_note', priority: 'medium' });
    }

    // Checklist (10 pts)
    if (checklist.length > 0) {
      const checked = checklist.filter((c: any) => c.isChecked).length;
      score += Math.round((checked / checklist.length) * 10);
      const unchecked = checklist.length - checked;
      if (unchecked > 0) {
        missing.push({ category: 'checklist', message: `${unchecked} ${unchecked > 1 ? 'itens pendentes' : 'item pendente'} no checklist`, icon: 'checklist', priority: 'low' });
      }
    }

    return {
      score: Math.min(maxScore, score),
      maxScore,
      percentage: Math.min(100, Math.round((score / maxScore) * 100)),
      missing,
      label: score >= 85 ? 'ready' : score >= 60 ? 'almost' : score >= 30 ? 'progress' : 'starting',
    };
  }

  async getReadiness(id: string, userId: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id },
      include: { itineraryItems: true },
    });
    if (!trip) throw new NotFoundException('Trip not found');
    return this.computeReadiness(trip);
  }

  private serialize(trip: any, userId?: string) {
    // Determine the current user's role
    let myRole: string | null = null;
    if (userId) {
      if (trip.userId === userId) {
        myRole = 'OWNER';
      } else {
        const collab = trip.collaborators?.find((c: any) => c.userId === userId);
        if (collab) {
          myRole = collab.role;
        }
      }
    }

    // Build collaborators array including the owner
    const collaborators: any[] = [];
    if (trip.collaborators) {
      for (const c of trip.collaborators) {
        collaborators.push({
          id: c.id,
          userId: c.user?.id ?? c.userId,
          name: c.user?.name ?? null,
          email: c.user?.email ?? null,
          picture: c.user?.picture ?? null,
          role: c.role,
          joinedAt: c.joinedAt?.toISOString?.() ?? c.joinedAt ?? null,
        });
      }
    }

    return {
      id: trip.id,
      name: trip.name,
      destination: trip.destination,
      status: trip.status,
      currency: trip.currency,
      travelers: trip.travelers ?? 1,
      coverImage: trip.coverImage ?? null,
      dates: { start: trip.dateStart, end: trip.dateEnd },
      flights: JSON.parse(trip.flights),
      stays: JSON.parse(trip.stays),
      carRentals: JSON.parse(trip.carRentals),
      transports: JSON.parse(trip.transports),
      activities: JSON.parse(trip.activities),
      attractions: JSON.parse(trip.attractions),
      checklist: JSON.parse(trip.checklist || '[]'),
      dayNotes: JSON.parse(trip.dayNotes || '{}'),
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
      collaborators,
      myRole,
      createdAt: trip.createdAt.toISOString(),
      updatedAt: trip.updatedAt.toISOString(),
    };
  }
}
