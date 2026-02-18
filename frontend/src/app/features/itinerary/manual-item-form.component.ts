import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { TripStateService } from '../../core/services/trip-state.service';
import { ItineraryItem } from '../../core/models/trip.models';

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
  selector: 'app-manual-item-form',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule],
  templateUrl: './manual-item-form.component.html',
  styleUrl: './manual-item-form.component.scss',
})
export class ManualItemFormComponent {
  private readonly tripState = inject(TripStateService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  readonly showForm = signal(false);

  readonly form = this.fb.group({
    label: ['', Validators.required],
    date: ['', Validators.required],
    timeSlot: ['', timeSlotValidator],
    notes: [''],
  });

  /**
   * Toggles form visibility (collapsed by default).
   */
  toggleForm(): void {
    this.showForm.update((show) => !show);
  }

  /**
   * Creates a custom ItineraryItem and adds it to the trip.
   */
  onSubmit(): void {
    if (this.form.invalid) return;

    const newItem: ItineraryItem = {
      id: crypto.randomUUID(),
      type: 'custom',
      refId: null,
      date: this.form.value.date!,
      timeSlot: this.form.value.timeSlot || null,
      durationMinutes: null,
      label: this.form.value.label!,
      notes: this.form.value.notes || '',
      order: 0,
    };

    this.tripState.addItineraryItem(newItem);
    this.form.reset();
    this.showForm.set(false);
    this.snackBar.open('Item personalizado adicionado', undefined, { duration: 2000 });
  }
}
