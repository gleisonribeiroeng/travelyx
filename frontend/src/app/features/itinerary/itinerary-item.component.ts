import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { CurrencyPipe, NgTemplateOutlet } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { TripStateService } from '../../core/services/trip-state.service';
import {
  ItineraryItem,
  ItineraryItemType,
  Flight,
  Stay,
  CarRental,
  Transport,
  Activity,
  Attraction,
} from '../../core/models/trip.models';
import { buildTimeBlocks, detectConflicts } from '../../core/utils/schedule-conflict.util';

function timeSlotValidator(control: any) {
  const value = control.value;
  if (!value) return null;
  const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timePattern.test(value) ? null : { invalidTimeSlot: true };
}

@Component({
  selector: 'app-itinerary-item',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CurrencyPipe, NgTemplateOutlet],
  templateUrl: './itinerary-item.component.html',
  styleUrl: './itinerary-item.component.scss',
})
export class ItineraryItemComponent implements OnInit {
  readonly item = input.required<ItineraryItem>();
  readonly isFirst = input(false);
  readonly isLast = input(false);

  readonly moveUp = output<void>();
  readonly moveDown = output<void>();
  readonly remove = output<void>();

  protected readonly tripState = inject(TripStateService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  readonly isEditing = signal(false);
  editForm!: FormGroup;

  // ── Resolve source data from refId ──

  readonly resolvedData = computed(() => {
    const item = this.item();
    if (!item.refId) return null;

    switch (item.type) {
      case 'flight':
        return this.tripState.flights().find(f => f.id === item.refId) ?? null;
      case 'stay':
        return this.tripState.stays().find(s => s.id === item.refId) ?? null;
      case 'car-rental':
        return this.tripState.carRentals().find(c => c.id === item.refId) ?? null;
      case 'transport':
        return this.tripState.transports().find(t => t.id === item.refId) ?? null;
      case 'activity':
        return this.tripState.activities().find(a => a.id === item.refId) ?? null;
      case 'attraction':
        return this.tripState.attractions().find(a => a.id === item.refId) ?? null;
      default:
        return null;
    }
  });

  readonly asFlight = computed(() =>
    this.item().type === 'flight' ? (this.resolvedData() as Flight | null) : null
  );
  readonly asStay = computed(() =>
    this.item().type === 'stay' ? (this.resolvedData() as Stay | null) : null
  );
  readonly asCarRental = computed(() =>
    this.item().type === 'car-rental' ? (this.resolvedData() as CarRental | null) : null
  );
  readonly asTransport = computed(() =>
    this.item().type === 'transport' ? (this.resolvedData() as Transport | null) : null
  );
  readonly asActivity = computed(() =>
    this.item().type === 'activity' ? (this.resolvedData() as Activity | null) : null
  );
  readonly asAttraction = computed(() =>
    this.item().type === 'attraction' ? (this.resolvedData() as Attraction | null) : null
  );

  // ── Lifecycle ──

  ngOnInit(): void {
    const item = this.item();
    this.editForm = this.fb.group({
      date: [item.date, Validators.required],
      timeSlot: [item.timeSlot, timeSlotValidator],
      durationMinutes: [item.durationMinutes],
      label: [item.label, Validators.required],
      notes: [item.notes],
    });
  }

  // ── Edit actions ──

  startEdit(): void {
    this.isEditing.set(true);
    const item = this.item();
    this.editForm.patchValue({
      date: item.date,
      timeSlot: item.timeSlot,
      durationMinutes: item.durationMinutes,
      label: item.label,
      notes: item.notes,
    });
  }

  cancelEdit(): void {
    this.isEditing.set(false);
  }

  saveEdit(): void {
    if (this.editForm.invalid) return;

    const formValue = this.editForm.value;
    const updated: ItineraryItem = {
      ...this.item(),
      date: formValue.date,
      timeSlot: formValue.timeSlot || null,
      durationMinutes: formValue.durationMinutes ?? null,
      label: formValue.label,
      notes: formValue.notes,
    };

    // Validate conflicts for timed items
    if (updated.timeSlot) {
      const trip = this.tripState.trip();
      const blocks = buildTimeBlocks(
        trip.flights,
        trip.carRentals,
        trip.transports,
        trip.itineraryItems,
        updated.id  // exclude the item being edited
      );
      const result = detectConflicts(updated.date, updated.timeSlot, updated.durationMinutes, blocks);
      if (result.hasConflict) {
        const conflictNames = result.conflicts.map(c => c.label).join(', ');
        this.snackBar.open(`Conflito de horário: ${conflictNames}`, 'OK', { duration: 5000 });
        return;
      }
    }

    this.tripState.updateItineraryItem(updated);
    this.isEditing.set(false);
    this.snackBar.open('Item atualizado', undefined, { duration: 2000 });
  }

  // ── Helpers ──

  getTypeIcon(type: ItineraryItemType): string {
    const iconMap: Record<ItineraryItemType, string> = {
      flight: 'flight',
      stay: 'hotel',
      'car-rental': 'directions_car',
      transport: 'directions_bus',
      activity: 'local_activity',
      attraction: 'museum',
      custom: 'event',
    };
    return iconMap[type];
  }

  getTypeClass(type: ItineraryItemType): string {
    const classMap: Record<ItineraryItemType, string> = {
      flight: 'type-flight',
      stay: 'type-stay',
      'car-rental': 'type-car',
      transport: 'type-transport',
      activity: 'type-activity',
      attraction: 'type-attraction',
      custom: 'type-custom',
    };
    return classMap[type];
  }

  getTransportIcon(mode: string): string {
    const icons: Record<string, string> = {
      train: 'train',
      bus: 'directions_bus',
      ferry: 'directions_boat',
      other: 'commute',
    };
    return icons[mode] || 'commute';
  }

  formatTime(isoDatetime: string): string {
    const d = new Date(isoDatetime);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins.toString().padStart(2, '0')}m`;
  }

  formatDate(isoDate: string): string {
    const d = new Date(isoDate + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }
}
