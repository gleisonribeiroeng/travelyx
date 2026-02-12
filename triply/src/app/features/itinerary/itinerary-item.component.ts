import { Component, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { TripStateService } from '../../core/services/trip-state.service';
import { ItineraryItem, ItineraryItemType } from '../../core/models/trip.models';

/**
 * Custom validator for time slot (HH:MM format).
 * Returns null for empty/null values, error object for invalid format.
 */
function timeSlotValidator(control: any) {
  const value = control.value;
  if (!value) return null; // Empty is valid (all-day items)

  const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timePattern.test(value) ? null : { invalidTimeSlot: true };
}

@Component({
  selector: 'app-itinerary-item',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule],
  templateUrl: './itinerary-item.component.html',
  styleUrl: './itinerary-item.component.scss',
})
export class ItineraryItemComponent implements OnInit {
  @Input({ required: true }) item!: ItineraryItem;
  @Input() isFirst = false;
  @Input() isLast = false;

  @Output() moveUp = new EventEmitter<void>();
  @Output() moveDown = new EventEmitter<void>();
  @Output() remove = new EventEmitter<void>();

  protected readonly tripState = inject(TripStateService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  readonly isEditing = signal(false);
  editForm!: FormGroup;

  ngOnInit(): void {
    this.editForm = this.fb.group({
      date: [this.item.date, Validators.required],
      timeSlot: [this.item.timeSlot, timeSlotValidator],
      label: [this.item.label, Validators.required],
      notes: [this.item.notes],
    });
  }

  /**
   * Enters edit mode and resets form to current item values.
   */
  startEdit(): void {
    this.isEditing.set(true);
    this.editForm.patchValue({
      date: this.item.date,
      timeSlot: this.item.timeSlot,
      label: this.item.label,
      notes: this.item.notes,
    });
  }

  /**
   * Cancels edit mode without saving.
   */
  cancelEdit(): void {
    this.isEditing.set(false);
  }

  /**
   * Saves edited values via TripStateService.
   */
  saveEdit(): void {
    if (this.editForm.invalid) return;

    const formValue = this.editForm.value;
    const updated: ItineraryItem = {
      ...this.item,
      date: formValue.date,
      timeSlot: formValue.timeSlot || null, // Normalize empty string to null
      label: formValue.label,
      notes: formValue.notes,
    };

    this.tripState.updateItineraryItem(updated);
    this.isEditing.set(false);
    this.snackBar.open('Item updated', undefined, { duration: 2000 });
  }

  /**
   * Returns Material icon name for the given item type.
   */
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
}
