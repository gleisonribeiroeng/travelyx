import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { TransportApiService, TransportSearchParams } from '../../core/api/transport-api.service';
import { TripStateService } from '../../core/services/trip-state.service';
import { Transport, ItineraryItem } from '../../core/models/trip.models';

@Component({
  selector: 'app-transport-search',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule],
  templateUrl: './transport-search.component.html',
  styleUrl: './transport-search.component.scss',
})
export class TransportSearchComponent {
  private readonly transportApi = inject(TransportApiService);
  private readonly tripState = inject(TripStateService);
  private readonly snackBar = inject(MatSnackBar);

  // Form controls
  transportSearchForm = new FormGroup({
    origin: new FormControl('', Validators.required),
    destination: new FormControl('', Validators.required),
    departureDate: new FormControl<Date | null>(null, Validators.required),
  });

  // Search state signals
  searchResults = signal<Transport[]>([]);
  isSearching = signal(false);
  hasSearched = signal(false);
  modeFilter = signal<string>(''); // '' means all modes, or 'bus'/'train'/'ferry'

  // Computed signal for filtered and sorted results
  filteredResults = computed(() => {
    let results = this.searchResults();
    const mode = this.modeFilter();
    if (mode) {
      results = results.filter(r => r.mode === mode);
    }
    // Sort by price ascending
    return [...results].sort((a, b) => a.price.total - b.price.total);
  });

  // Date getter
  get minDepartureDate(): Date {
    return new Date();
  }

  // Search transport
  searchTransport(): void {
    if (this.transportSearchForm.invalid) {
      return;
    }

    const formValue = this.transportSearchForm.value;
    const origin = formValue.origin ?? '';
    const destination = formValue.destination ?? '';
    const departureDate = formValue.departureDate;

    if (!departureDate) {
      return;
    }

    // Format date to YYYY-MM-DD string
    const dateStr = departureDate.toISOString().split('T')[0];

    this.isSearching.set(true);
    this.hasSearched.set(true);

    this.transportApi
      .searchTransport({
        origin,
        destination,
        departureDate: dateStr,
      })
      .pipe(finalize(() => this.isSearching.set(false)))
      .subscribe({
        next: (result) => {
          if (result.error) {
            this.snackBar.open(
              'Failed to search transport options. Please try again.',
              'Close',
              { duration: 3000 }
            );
            this.searchResults.set([]);
          } else {
            this.searchResults.set(result.data);
          }
        },
        error: () => {
          this.snackBar.open('An error occurred. Please try again.', 'Close', {
            duration: 3000,
          });
          this.searchResults.set([]);
        },
      });
  }

  // Add to itinerary
  addToItinerary(transport: Transport): void {
    this.tripState.addTransport({ ...transport, addedToItinerary: true });
    this.tripState.addItineraryItem({
      id: crypto.randomUUID(),
      type: 'transport',
      refId: transport.id,
      date: transport.departureAt.split('T')[0],
      timeSlot: transport.departureAt.split('T')[1]?.substring(0, 5) || null,
      label: `${transport.mode.charAt(0).toUpperCase() + transport.mode.slice(1)}: ${transport.origin} → ${transport.destination}`,
      notes: '',
      order: 0,
    });
    this.snackBar.open('Transport added to itinerary', 'Close', {
      duration: 3000,
    });
  }

  // Set mode filter
  setModeFilter(mode: string): void {
    this.modeFilter.set(mode);
  }

  // Mode icon helper
  getModeIcon(mode: string): string {
    const icons: Record<string, string> = {
      bus: 'directions_bus',
      train: 'train',
      ferry: 'directions_boat',
      other: 'commute',
    };
    return icons[mode] || 'commute';
  }

  // Duration format helper
  formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }
}
