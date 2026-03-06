import { Trip, ItineraryItem } from '../models/trip.models';
import { ConflictAlert } from './conflict-engine.util';

// ---------------------------------------------------------------------------
// Timeline day model
// ---------------------------------------------------------------------------

export interface TimelineDay {
  date: string;
  dayNumber: number;
  dayLabel: string; // "Dia 1 — Seg, 10 Mar"
  allDayItems: ItineraryItem[];
  timedItems: ItineraryItem[];
  conflicts: ConflictAlert[];
  isEmpty: boolean;
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

/** Parse a YYYY-MM-DD string into a Date at midnight UTC-safe. */
function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

/** Get an array of YYYY-MM-DD dates from start to end inclusive. */
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

/** Format a day label like "Dia 3 — Qua, 12 Mar". */
function formatDayLabel(dayNumber: number, dateStr: string): string {
  const d = parseDate(dateStr);
  const weekday = WEEKDAYS_PT[d.getDay()];
  const dayOfMonth = d.getDate();
  const month = MONTHS_PT[d.getMonth()];
  return `Dia ${dayNumber} \u2014 ${weekday}, ${dayOfMonth} ${month}`;
}

/** Compare two ItineraryItems for sorting: by timeSlot then order. */
function compareTimedItems(a: ItineraryItem, b: ItineraryItem): number {
  const aTime = a.timeSlot ?? '';
  const bTime = b.timeSlot ?? '';
  const timeComp = aTime.localeCompare(bTime);
  if (timeComp !== 0) return timeComp;
  return a.order - b.order;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Build a day-by-day timeline for a trip, splitting items into all-day and
 * timed buckets, and attaching conflict alerts per day.
 */
export function buildTimeline(
  trip: Trip,
  items: ItineraryItem[],
  conflicts: ConflictAlert[],
): TimelineDay[] {
  const days = getDays(trip.dates.start, trip.dates.end);

  return days.map((date, index) => {
    const dayNumber = index + 1;

    // Filter items for this day
    const dayItems = items.filter((item) => item.date === date);

    const allDayItems = dayItems
      .filter((item) => item.timeSlot === null || item.timeSlot === undefined)
      .sort((a, b) => a.order - b.order);

    const timedItems = dayItems
      .filter((item) => item.timeSlot !== null && item.timeSlot !== undefined)
      .sort(compareTimedItems);

    // Filter conflicts for this day
    const dayConflicts = conflicts.filter((c) => c.date === date);

    return {
      date,
      dayNumber,
      dayLabel: formatDayLabel(dayNumber, date),
      allDayItems,
      timedItems,
      conflicts: dayConflicts,
      isEmpty: dayItems.length === 0,
    };
  });
}
