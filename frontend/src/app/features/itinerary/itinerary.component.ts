import { Component, computed, inject, signal } from '@angular/core';
import { KeyValuePipe, DatePipe, CurrencyPipe } from '@angular/common';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { NotificationService } from '../../core/services/notification.service';
import { MatDialog } from '@angular/material/dialog';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { TripStateService } from '../../core/services/trip-state.service';
import { ItineraryItem } from '../../core/models/trip.models';
import { ItineraryItemComponent } from './itinerary-item.component';
import { ManualItemFormComponent } from './manual-item-form.component';
import { buildTimeBlocks, detectConflicts } from '../../core/utils/schedule-conflict.util';
import {
  ScheduleDialogComponent,
  ScheduleDialogData,
  ScheduleDialogResult,
} from '../../shared/components/schedule-dialog/schedule-dialog.component';

import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, EventDropArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';

// Color map per item type
const TYPE_COLORS: Record<string, string> = {
  flight: '#f59e0b',
  stay: '#22c55e',
  'car-rental': '#f97316',
  transport: '#3b82f6',
  activity: '#ec4899',
  attraction: '#8b5cf6',
  custom: '#8f9bb3',
};

@Component({
  selector: 'app-itinerary',
  standalone: true,
  imports: [
    MATERIAL_IMPORTS,
    KeyValuePipe,
    DatePipe,
    CurrencyPipe,
    ItineraryItemComponent,
    ManualItemFormComponent,
    FullCalendarModule,
  ],
  templateUrl: './itinerary.component.html',
  styleUrl: './itinerary.component.scss',
})
export class ItineraryComponent {
  protected readonly tripState = inject(TripStateService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  // ── View toggle ──
  readonly activeView = signal<'calendar' | 'list'>('calendar');

  // ── Calendar events from itinerary items ──
  readonly calendarEvents = computed<EventInput[]>(() => {
    const items = this.tripState.itineraryItems();
    return items.map(item => {
      const color = TYPE_COLORS[item.type] || '#8f9bb3';
      const isDraggable = item.type === 'activity' || item.type === 'attraction' || item.type === 'custom';

      if (item.timeSlot) {
        const duration = item.durationMinutes ?? 60;
        const startDate = new Date(`${item.date}T${item.timeSlot}:00`);
        const endDate = new Date(startDate.getTime() + duration * 60000);

        return {
          id: item.id,
          title: item.label,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          allDay: false,
          backgroundColor: color,
          borderColor: color,
          editable: isDraggable,
          durationEditable: isDraggable,
          extendedProps: { type: item.type },
        };
      }

      return {
        id: item.id,
        title: item.label,
        start: item.date,
        allDay: true,
        backgroundColor: color,
        borderColor: color,
        editable: isDraggable,
        durationEditable: false,
        extendedProps: { type: item.type },
      };
    });
  });

  readonly calendarOptions = computed<CalendarOptions>(() => ({
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
    },
    locale: 'pt-br',
    height: 'auto',
    events: this.calendarEvents(),
    editable: true,
    selectable: false,
    eventDisplay: 'block',
    dayMaxEvents: 3,
    eventOverlap: (stillEvent: any) => {
      const fixedTypes = ['flight', 'car-rental', 'transport'];
      return !fixedTypes.includes(stillEvent.extendedProps?.type);
    },
    eventDrop: (info: EventDropArg) => this.onEventDrop(info),
    eventResize: (info: any) => this.onEventResize(info),
    eventClick: (arg: EventClickArg) => this.onCalendarEventClick(arg),
    buttonText: {
      today: 'Hoje',
      month: 'Mês',
      week: 'Semana',
      day: 'Dia',
      list: 'Lista',
    },
    initialDate: this.calendarInitialDate(),
  }));

  // Start calendar on the first itinerary date
  private readonly calendarInitialDate = computed(() => {
    const items = this.tripState.itineraryItems();
    if (items.length === 0) return new Date().toISOString().split('T')[0];
    const dates = items.map(i => i.date).sort();
    return dates[0];
  });

  // ── Summary card data ──
  readonly summaryFlights = computed(() => {
    const flights = this.tripState.flights();
    return flights.map(f => ({
      ...f,
      _type: 'flight' as const,
    }));
  });

  readonly summaryStays = computed(() => {
    const stays = this.tripState.stays();
    return stays.map(s => ({
      ...s,
      _type: 'stay' as const,
    }));
  });

  readonly summaryCarRentals = computed(() => {
    const cars = this.tripState.carRentals();
    return cars.map(c => ({
      ...c,
      _type: 'car-rental' as const,
    }));
  });

  readonly summaryActivities = computed(() => {
    const acts = this.tripState.activities();
    return acts.map(a => ({
      ...a,
      _type: 'activity' as const,
    }));
  });

  readonly hasSummaryItems = computed(() =>
    this.summaryFlights().length > 0 ||
    this.summaryStays().length > 0 ||
    this.summaryCarRentals().length > 0 ||
    this.summaryActivities().length > 0
  );

  // ── List view data ──

  readonly itemsByDay = computed(() => {
    const items = this.tripState.itineraryItems();
    const grouped = items.reduce((acc, item) => {
      if (!acc[item.date]) acc[item.date] = [];
      acc[item.date].push(item);
      return acc;
    }, {} as Record<string, ItineraryItem[]>);

    const sortedGrouped: Record<string, ItineraryItem[]> = {};
    for (const [date, dayItems] of Object.entries(grouped)) {
      sortedGrouped[date] = [...dayItems].sort((a, b) => {
        if (a.timeSlot === null && b.timeSlot !== null) return -1;
        if (a.timeSlot !== null && b.timeSlot === null) return 1;
        if (a.timeSlot !== null && b.timeSlot !== null) {
          const timeCompare = a.timeSlot.localeCompare(b.timeSlot);
          if (timeCompare !== 0) return timeCompare;
        }
        return a.order - b.order;
      });
    }

    const sortedEntries = Object.entries(sortedGrouped).sort(([dateA], [dateB]) =>
      dateA.localeCompare(dateB)
    );
    return new Map(sortedEntries);
  });

  readonly tripDayCount = computed(() => this.itemsByDay().size);
  dateOrder = (a: { key: string }, b: { key: string }) => a.key.localeCompare(b.key);

  // ── Helpers ──

  formatTime(isoDatetime: string): string {
    const d = new Date(isoDatetime);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  }

  // ── List view actions ──

  moveItemUp(item: ItineraryItem, dayItems: ItineraryItem[]): void {
    const index = dayItems.findIndex((i) => i.id === item.id);
    if (index <= 0) return;
    moveItemInArray(dayItems, index, index - 1);
    dayItems.forEach((i, idx) => {
      this.tripState.updateItineraryItem({ ...i, order: idx });
    });
  }

  moveItemDown(item: ItineraryItem, dayItems: ItineraryItem[]): void {
    const index = dayItems.findIndex((i) => i.id === item.id);
    if (index < 0 || index >= dayItems.length - 1) return;
    moveItemInArray(dayItems, index, index + 1);
    dayItems.forEach((i, idx) => {
      this.tripState.updateItineraryItem({ ...i, order: idx });
    });
  }

  removeItem(id: string): void {
    this.tripState.removeItineraryItem(id);
  }

  // ── Summary card remove actions ──

  removeFlight(id: string): void {
    this.tripState.removeFlight(id);
    this.removeItineraryItemsByRef(id);
  }

  removeStay(id: string): void {
    this.tripState.removeStay(id);
    this.removeItineraryItemsByRef(id);
  }

  removeCarRental(id: string): void {
    this.tripState.removeCarRental(id);
    this.removeItineraryItemsByRef(id);
  }

  removeActivity(id: string): void {
    this.tripState.removeActivity(id);
    this.removeItineraryItemsByRef(id);
  }

  // ── Calendar event drop → update custom item date/time ──

  onEventDrop(info: EventDropArg): void {
    const eventId = info.event.id;
    const item = this.tripState.itineraryItems().find(i => i.id === eventId);

    if (!item) {
      info.revert();
      return;
    }

    // Only allow dragging for flexible item types
    const draggableTypes = ['activity', 'attraction', 'custom'];
    if (!draggableTypes.includes(item.type)) {
      info.revert();
      return;
    }

    const newStart = info.event.start;
    if (!newStart) {
      info.revert();
      return;
    }

    const newDate = newStart.toISOString().split('T')[0];
    let newTimeSlot: string | null = null;

    if (!info.event.allDay) {
      const hours = newStart.getHours().toString().padStart(2, '0');
      const minutes = newStart.getMinutes().toString().padStart(2, '0');
      newTimeSlot = `${hours}:${minutes}`;
    }

    // Validate conflicts for timed events
    if (newTimeSlot) {
      const trip = this.tripState.trip();
      const blocks = buildTimeBlocks(
        trip.flights,
        trip.carRentals,
        trip.transports,
        trip.itineraryItems,
        item.id  // exclude the item being moved
      );
      const result = detectConflicts(newDate, newTimeSlot, item.durationMinutes, blocks);
      if (result.hasConflict) {
        info.revert();
        const conflictNames = result.conflicts.map(c => c.label).join(', ');
        this.notify.warning(`Conflito de horário: ${conflictNames}`);
        return;
      }
    }

    this.tripState.updateItineraryItem({
      ...item,
      date: newDate,
      timeSlot: newTimeSlot,
    });
  }

  // ── Calendar event resize → update duration ──

  onEventResize(info: any): void {
    const eventId = info.event.id;
    const item = this.tripState.itineraryItems().find(i => i.id === eventId);

    if (!item) {
      info.revert();
      return;
    }

    const draggableTypes = ['activity', 'attraction', 'custom'];
    if (!draggableTypes.includes(item.type)) {
      info.revert();
      return;
    }

    const start = info.event.start as Date;
    const end = info.event.end as Date;
    if (!start || !end) {
      info.revert();
      return;
    }

    const newDuration = Math.round((end.getTime() - start.getTime()) / 60000);
    if (newDuration < 15) {
      info.revert();
      return;
    }

    // Validate conflicts with the new duration
    const newDate = start.toISOString().split('T')[0];
    const hours = start.getHours().toString().padStart(2, '0');
    const minutes = start.getMinutes().toString().padStart(2, '0');
    const newTimeSlot = `${hours}:${minutes}`;

    const trip = this.tripState.trip();
    const blocks = buildTimeBlocks(
      trip.flights,
      trip.carRentals,
      trip.transports,
      trip.itineraryItems,
      item.id
    );
    const result = detectConflicts(newDate, newTimeSlot, newDuration, blocks);
    if (result.hasConflict) {
      info.revert();
      const conflictNames = result.conflicts.map(c => c.label).join(', ');
      this.notify.warning(`Conflito de horário: ${conflictNames}`);
      return;
    }

    this.tripState.updateItineraryItem({
      ...item,
      durationMinutes: newDuration,
    });
  }

  // ── Calendar event click → open edit modal ──

  onCalendarEventClick(arg: EventClickArg): void {
    const eventId = arg.event.id;
    const item = this.tripState.itineraryItems().find(i => i.id === eventId);
    if (!item) return;

    const editableTypes = ['activity', 'attraction', 'custom'];
    if (!editableTypes.includes(item.type)) {
      // For fixed types, just ask to remove
      if (confirm('Remover este item do roteiro?')) {
        this.tripState.removeItineraryItem(eventId);
      }
      return;
    }

    // Open edit dialog for editable types
    const dialogRef = this.dialog.open(ScheduleDialogComponent, {
      width: '400px',
      data: {
        name: item.label,
        type: item.type as 'activity' | 'attraction' | 'custom',
        defaultDate: item.date,
        tripDates: this.tripState.trip().dates,
        durationMinutes: item.durationMinutes,
        editMode: true,
        currentTimeSlot: item.timeSlot ?? '10:00',
        itemId: item.id,
      } as ScheduleDialogData,
    });

    dialogRef.afterClosed().subscribe((result: ScheduleDialogResult | undefined) => {
      if (!result) return;

      if (result.action === 'remove') {
        this.tripState.removeItineraryItem(eventId);
        this.notify.success('Item removido do roteiro');
        return;
      }

      this.tripState.updateItineraryItem({
        ...item,
        date: result.date,
        timeSlot: result.timeSlot,
        durationMinutes: result.durationMinutes,
      });
      this.notify.success('Horário atualizado');
    });
  }

  // ── Private helpers ──

  private removeItineraryItemsByRef(refId: string): void {
    const items = this.tripState.itineraryItems();
    items
      .filter(i => i.refId === refId)
      .forEach(i => this.tripState.removeItineraryItem(i.id));
  }
}
