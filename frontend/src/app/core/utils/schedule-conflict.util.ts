import { Flight, CarRental, Transport, ItineraryItem } from '../models/trip.models';

export interface TimeBlock {
  date: string;
  startTime: string;
  endTime: string;
  label: string;
  type: string;
}

export interface ConflictResult {
  hasConflict: boolean;
  conflicts: TimeBlock[];
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function extractTime(isoDatetime: string): string {
  const d = new Date(isoDatetime);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function extractDate(isoDatetime: string): string {
  return new Date(isoDatetime).toISOString().split('T')[0];
}

function addMinutesToTime(time: string, minutes: number): string {
  const total = Math.min(timeToMinutes(time) + minutes, 23 * 60 + 59);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Build time blocks from flights, car rentals, transports,
 * and existing timed itinerary items.
 */
export function buildTimeBlocks(
  flights: Flight[],
  carRentals: CarRental[],
  transports: Transport[],
  itineraryItems: ItineraryItem[],
  excludeItemId?: string
): TimeBlock[] {
  const blocks: TimeBlock[] = [];

  for (const f of flights) {
    const depDate = extractDate(f.departureAt);
    const arrDate = extractDate(f.arrivalAt);

    blocks.push({
      date: depDate,
      startTime: extractTime(f.departureAt),
      endTime: depDate === arrDate ? extractTime(f.arrivalAt) : '23:59',
      label: `Voo ${f.origin}→${f.destination} (${f.airline} ${f.flightNumber})`,
      type: 'flight',
    });

    if (depDate !== arrDate) {
      blocks.push({
        date: arrDate,
        startTime: '00:00',
        endTime: extractTime(f.arrivalAt),
        label: `Voo ${f.origin}→${f.destination} (chegada)`,
        type: 'flight',
      });
    }
  }

  for (const c of carRentals) {
    const pickDate = extractDate(c.pickUpAt);
    const pickTime = extractTime(c.pickUpAt);
    blocks.push({
      date: pickDate,
      startTime: pickTime,
      endTime: addMinutesToTime(pickTime, 30),
      label: `Retirada do carro em ${c.pickUpLocation}`,
      type: 'car-rental',
    });

    const dropDate = extractDate(c.dropOffAt);
    const dropTime = extractTime(c.dropOffAt);
    blocks.push({
      date: dropDate,
      startTime: dropTime,
      endTime: addMinutesToTime(dropTime, 30),
      label: `Devolução do carro em ${c.dropOffLocation}`,
      type: 'car-rental',
    });
  }

  for (const t of transports) {
    const depDate = extractDate(t.departureAt);
    const arrDate = extractDate(t.arrivalAt);
    blocks.push({
      date: depDate,
      startTime: extractTime(t.departureAt),
      endTime: depDate === arrDate ? extractTime(t.arrivalAt) : '23:59',
      label: `Transporte ${t.origin}→${t.destination}`,
      type: 'transport',
    });
  }

  for (const item of itineraryItems) {
    if (excludeItemId && item.id === excludeItemId) continue;
    if (!item.timeSlot) continue;
    if (item.type === 'flight' || item.type === 'car-rental' || item.type === 'transport') continue;

    blocks.push({
      date: item.date,
      startTime: item.timeSlot,
      endTime: addMinutesToTime(item.timeSlot, 60),
      label: item.label,
      type: item.type,
    });
  }

  return blocks;
}

/**
 * Detect if a new item at `date`/`timeSlot` with given duration
 * would conflict with any existing time blocks on the same date.
 */
export function detectConflicts(
  date: string,
  timeSlot: string,
  durationMinutes: number | null,
  existingBlocks: TimeBlock[]
): ConflictResult {
  const duration = durationMinutes ?? 60;
  const newStart = timeToMinutes(timeSlot);
  const newEnd = newStart + duration;

  const sameDayBlocks = existingBlocks.filter(b => b.date === date);
  const conflicts: TimeBlock[] = [];

  for (const block of sameDayBlocks) {
    const blockStart = timeToMinutes(block.startTime);
    const blockEnd = timeToMinutes(block.endTime);

    if (newStart < blockEnd && newEnd > blockStart) {
      conflicts.push(block);
    }
  }

  return { hasConflict: conflicts.length > 0, conflicts };
}
