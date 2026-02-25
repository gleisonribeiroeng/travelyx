import {
  Trip,
  Flight,
  Stay,
  ItineraryItem,
} from '../models/trip.models';
import { buildTimeBlocks, TimeBlock } from './schedule-conflict.util';

// ---------------------------------------------------------------------------
// Conflict Alert model
// ---------------------------------------------------------------------------

export interface ConflictAlert {
  id: string;
  type:
    | 'time-overlap'
    | 'no-hotel'
    | 'impossible-transfer'
    | 'booking-gap'
    | 'checkout-mismatch';
  severity: 'error' | 'warning' | 'info';
  date: string;
  message: string;
  involvedItems: string[];
  suggestion: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return an array of YYYY-MM-DD strings from `start` to `end` (inclusive). */
export function getDaysBetween(start: string, end: string): string[] {
  const days: string[] = [];
  const current = new Date(start + 'T00:00:00');
  const last = new Date(end + 'T00:00:00');

  while (current <= last) {
    days.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return days;
}

/** Format a YYYY-MM-DD string as "DD/MM". */
export function formatDateBR(dateStr: string): string {
  const [, month, day] = dateStr.split('-');
  return `${day}/${month}`;
}

/** Convert an "HH:MM" time string to total minutes since midnight. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Check whether two TimeBlocks on the same date overlap. */
export function overlaps(a: TimeBlock, b: TimeBlock): boolean {
  if (a.date !== b.date) return false;
  const aStart = timeToMinutes(a.startTime);
  const aEnd = timeToMinutes(a.endTime);
  const bStart = timeToMinutes(b.startTime);
  const bEnd = timeToMinutes(b.endTime);
  return aStart < bEnd && bStart < aEnd;
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

let _idCounter = 0;

function nextId(): string {
  _idCounter += 1;
  return `conflict-${Date.now()}-${_idCounter}`;
}

function extractTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function extractDate(iso: string): string {
  return new Date(iso).toISOString().split('T')[0];
}

// ---------------------------------------------------------------------------
// Conflict detection: time overlaps
// ---------------------------------------------------------------------------

function detectTimeOverlaps(trip: Trip): ConflictAlert[] {
  const blocks = buildTimeBlocks(
    trip.flights,
    trip.carRentals,
    trip.transports,
    trip.itineraryItems,
  );

  const alerts: ConflictAlert[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      if (overlaps(blocks[i], blocks[j])) {
        const key = [blocks[i].label, blocks[j].label].sort().join('|');
        if (seen.has(key)) continue;
        seen.add(key);

        alerts.push({
          id: nextId(),
          type: 'time-overlap',
          severity: 'error',
          date: blocks[i].date,
          message: `Conflito de horario em ${formatDateBR(blocks[i].date)}: "${blocks[i].label}" (${blocks[i].startTime}-${blocks[i].endTime}) conflita com "${blocks[j].label}" (${blocks[j].startTime}-${blocks[j].endTime})`,
          involvedItems: [blocks[i].label, blocks[j].label],
          suggestion: 'Reagende um dos itens para evitar sobreposicao de horarios.',
        });
      }
    }
  }

  return alerts;
}

// ---------------------------------------------------------------------------
// Conflict detection: nights without hotel
// ---------------------------------------------------------------------------

function detectNoHotelNights(trip: Trip): ConflictAlert[] {
  const alerts: ConflictAlert[] = [];
  const days = getDaysBetween(trip.dates.start, trip.dates.end);

  // We check every night except the last day (no need for hotel on departure day)
  for (let i = 0; i < days.length - 1; i++) {
    const day = days[i];
    const hasCoverage = trip.stays.some((stay: Stay) => {
      return stay.checkIn <= day && stay.checkOut > day;
    });

    if (!hasCoverage) {
      alerts.push({
        id: nextId(),
        type: 'no-hotel',
        severity: 'warning',
        date: day,
        message: `Sem hospedagem na noite de ${formatDateBR(day)}. Voce precisa de um hotel para essa data.`,
        involvedItems: [],
        suggestion: 'Adicione uma reserva de hotel que cubra essa noite.',
      });
    }
  }

  return alerts;
}

// ---------------------------------------------------------------------------
// Conflict detection: checkout mismatch
// ---------------------------------------------------------------------------

function detectCheckoutMismatch(trip: Trip): ConflictAlert[] {
  const alerts: ConflictAlert[] = [];
  const checkoutThreshold = timeToMinutes('11:00');

  for (const stay of trip.stays) {
    const checkoutDate = stay.checkOut;

    // Find itinerary items on checkout day that start after 11:00
    const lateItems = trip.itineraryItems.filter(
      (item: ItineraryItem) =>
        item.date === checkoutDate &&
        item.timeSlot !== null &&
        timeToMinutes(item.timeSlot) >= checkoutThreshold,
    );

    if (lateItems.length > 0) {
      alerts.push({
        id: nextId(),
        type: 'checkout-mismatch',
        severity: 'warning',
        date: checkoutDate,
        message: `Checkout de "${stay.name}" em ${formatDateBR(checkoutDate)} as 11:00, mas voce tem ${lateItems.length} item(ns) agendado(s) apos esse horario.`,
        involvedItems: [stay.name, ...lateItems.map((it) => it.label)],
        suggestion:
          'Verifique se voce tera onde guardar a bagagem ou reagende os itens para antes do checkout.',
      });
    }
  }

  return alerts;
}

// ---------------------------------------------------------------------------
// Conflict detection: booking gaps
// ---------------------------------------------------------------------------

function detectBookingGaps(trip: Trip): ConflictAlert[] {
  const alerts: ConflictAlert[] = [];
  const days = getDaysBetween(trip.dates.start, trip.dates.end);

  // Build a set of days that have at least one itinerary item, flight, transport, or car activity
  const activeDays = new Set<string>();

  for (const item of trip.itineraryItems) {
    activeDays.add(item.date);
  }
  for (const f of trip.flights) {
    activeDays.add(extractDate(f.departureAt));
    activeDays.add(extractDate(f.arrivalAt));
  }
  for (const t of trip.transports) {
    activeDays.add(extractDate(t.departureAt));
  }
  for (const c of trip.carRentals) {
    activeDays.add(extractDate(c.pickUpAt));
    activeDays.add(extractDate(c.dropOffAt));
  }

  // Find consecutive empty day stretches > 2 days
  let consecutiveEmpty = 0;
  let gapStart = '';

  for (const day of days) {
    if (!activeDays.has(day)) {
      if (consecutiveEmpty === 0) {
        gapStart = day;
      }
      consecutiveEmpty++;
    } else {
      if (consecutiveEmpty > 2) {
        alerts.push({
          id: nextId(),
          type: 'booking-gap',
          severity: 'info',
          date: gapStart,
          message: `${consecutiveEmpty} dias consecutivos sem atividades planejadas (${formatDateBR(gapStart)} a ${formatDateBR(day)}).`,
          involvedItems: [],
          suggestion:
            'Considere adicionar atividades ou passeios para esses dias.',
        });
      }
      consecutiveEmpty = 0;
    }
  }

  // Handle trailing gap
  if (consecutiveEmpty > 2) {
    const lastDay = days[days.length - 1];
    alerts.push({
      id: nextId(),
      type: 'booking-gap',
      severity: 'info',
      date: gapStart,
      message: `${consecutiveEmpty} dias consecutivos sem atividades planejadas (${formatDateBR(gapStart)} a ${formatDateBR(lastDay)}).`,
      involvedItems: [],
      suggestion:
        'Considere adicionar atividades ou passeios para esses dias.',
    });
  }

  return alerts;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Run all conflict detection rules against a trip and return a consolidated
 * list of alerts sorted by date then severity.
 */
export function computeAllConflicts(trip: Trip): ConflictAlert[] {
  _idCounter = 0;

  const alerts: ConflictAlert[] = [
    ...detectTimeOverlaps(trip),
    ...detectNoHotelNights(trip),
    ...detectCheckoutMismatch(trip),
    ...detectBookingGaps(trip),
  ];

  const severityOrder: Record<string, number> = {
    error: 0,
    warning: 1,
    info: 2,
  };

  alerts.sort((a, b) => {
    const dateComp = a.date.localeCompare(b.date);
    if (dateComp !== 0) return dateComp;
    return (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3);
  });

  return alerts;
}
