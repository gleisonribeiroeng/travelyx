import { Trip, ItineraryItem } from '../models/trip.models';
import { ConflictAlert } from './conflict-engine.util';

// ---------------------------------------------------------------------------
// Timeline day model
// ---------------------------------------------------------------------------

export interface FreeSlot {
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  durationMinutes: number;
}

export interface DayStats {
  itemCount: number;
  totalCost: number;
  currency: string;
  totalDurationMinutes: number;
}

export interface TimelineDay {
  date: string;
  dayNumber: number;
  dayLabel: string; // "Dia 1 — Seg, 10 Mar"
  allDayItems: ItineraryItem[];
  timedItems: ItineraryItem[];
  conflicts: ConflictAlert[];
  isEmpty: boolean;
  stats: DayStats;
  freeSlots: FreeSlot[];
}

// ---------------------------------------------------------------------------
// Portuguese locale constants
// ---------------------------------------------------------------------------

const WEEKDAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

const MONTHS_PT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

function getDays(start: string, end: string): string[] {
  const days: string[] = [];
  const current = parseDate(start);
  const last = parseDate(end);

  while (current <= last) {
    days.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function formatDayLabel(dayNumber: number, dateStr: string): string {
  const d = parseDate(dateStr);
  const weekday = WEEKDAYS_PT[d.getDay()];
  const dayOfMonth = d.getDate();
  const month = MONTHS_PT[d.getMonth()];
  return `Dia ${dayNumber} \u2014 ${weekday}, ${dayOfMonth} ${month}`;
}

function compareTimedItems(a: ItineraryItem, b: ItineraryItem): number {
  const aTime = a.timeSlot ?? '';
  const bTime = b.timeSlot ?? '';
  const timeComp = aTime.localeCompare(bTime);
  if (timeComp !== 0) return timeComp;
  return a.order - b.order;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Compute free slots between timed items (8:00–22:00 window). */
function computeFreeSlots(timedItems: ItineraryItem[]): FreeSlot[] {
  if (timedItems.length === 0) return [];

  const DAY_START = 8 * 60;  // 08:00
  const DAY_END = 22 * 60;   // 22:00
  const MIN_FREE = 30;        // Only show gaps >= 30 min

  // Build occupied blocks
  const blocks: { start: number; end: number }[] = [];
  for (const item of timedItems) {
    if (!item.timeSlot) continue;
    const start = timeToMinutes(item.timeSlot);
    const dur = item.durationMinutes || 60;
    blocks.push({ start, end: start + dur });
  }
  blocks.sort((a, b) => a.start - b.start);

  const slots: FreeSlot[] = [];
  let cursor = DAY_START;

  for (const block of blocks) {
    if (block.start > cursor) {
      const gap = block.start - cursor;
      if (gap >= MIN_FREE) {
        slots.push({
          startTime: minutesToTime(cursor),
          endTime: minutesToTime(block.start),
          durationMinutes: gap,
        });
      }
    }
    cursor = Math.max(cursor, block.end);
  }

  // Trailing free time
  if (cursor < DAY_END) {
    const gap = DAY_END - cursor;
    if (gap >= MIN_FREE) {
      slots.push({
        startTime: minutesToTime(cursor),
        endTime: minutesToTime(DAY_END),
        durationMinutes: gap,
      });
    }
  }

  return slots;
}

/** Get item price by looking up domain item in trip. */
function getItemPrice(item: ItineraryItem, trip: Trip): number {
  if (!item.refId) return 0;
  switch (item.type) {
    case 'flight': return trip.flights.find(f => f.id === item.refId)?.price?.total ?? 0;
    case 'stay': return trip.stays.find(s => s.id === item.refId)?.pricePerNight?.total ?? 0;
    case 'car-rental': return trip.carRentals.find(c => c.id === item.refId)?.price?.total ?? 0;
    case 'transport': return trip.transports.find(t => t.id === item.refId)?.price?.total ?? 0;
    case 'activity': return trip.activities.find(a => a.id === item.refId)?.price?.total ?? 0;
    case 'attraction': return 0;
    default: return 0;
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function buildTimeline(
  trip: Trip,
  items: ItineraryItem[],
  conflicts: ConflictAlert[],
): TimelineDay[] {
  const days = getDays(trip.dates.start, trip.dates.end);

  return days.map((date, index) => {
    const dayNumber = index + 1;
    const dayItems = items.filter((item) => item.date === date);

    const allDayItems = dayItems
      .filter((item) => item.timeSlot === null || item.timeSlot === undefined)
      .sort((a, b) => a.order - b.order);

    const timedItems = dayItems
      .filter((item) => item.timeSlot !== null && item.timeSlot !== undefined)
      .sort(compareTimedItems);

    const dayConflicts = conflicts.filter((c) => c.date === date);

    // Compute stats
    const totalCost = dayItems.reduce((sum, item) => sum + getItemPrice(item, trip), 0);
    const totalDuration = dayItems.reduce((sum, item) => sum + (item.durationMinutes || 0), 0);

    const stats: DayStats = {
      itemCount: dayItems.length,
      totalCost,
      currency: trip.currency || 'BRL',
      totalDurationMinutes: totalDuration,
    };

    const freeSlots = computeFreeSlots(timedItems);

    return {
      date,
      dayNumber,
      dayLabel: formatDayLabel(dayNumber, date),
      allDayItems,
      timedItems,
      conflicts: dayConflicts,
      isEmpty: dayItems.length === 0,
      stats,
      freeSlots,
    };
  });
}
