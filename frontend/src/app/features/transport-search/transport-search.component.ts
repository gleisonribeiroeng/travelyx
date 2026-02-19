import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { NotificationService } from '../../core/services/notification.service';
import { finalize } from 'rxjs/operators';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { TransportApiService, TransportSearchParams } from '../../core/api/transport-api.service';
import { TripStateService } from '../../core/services/trip-state.service';
import { Transport, ItineraryItem } from '../../core/models/trip.models';
import { ErrorBannerComponent } from '../../shared/components/error-banner/error-banner.component';

@Component({
  selector: 'app-transport-search',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule, ErrorBannerComponent],
  templateUrl: './transport-search.component.html',
  styleUrl: './transport-search.component.scss',
})
export class TransportSearchComponent {
  private readonly transportApi = inject(TransportApiService);
  private readonly tripState = inject(TripStateService);
  private readonly notify = inject(NotificationService);

  // Form controls
  transportSearchForm = new FormGroup({
    origin: new FormControl('', Validators.required),
    destination: new FormControl('', Validators.required),
    departureDate: new FormControl<Date | null>(null, Validators.required),
  });

  // Search state signals
  formCollapsed = signal(false);
  searchResults = signal<Transport[]>([]);
  isSearching = signal(false);
  hasSearched = signal(false);
  modeFilter = signal<string>(''); // '' means all modes, or 'bus'/'train'/'ferry'
  errorMessage = signal<string | null>(null);
  errorSource = signal<string | null>(null);

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
    this.errorMessage.set(null);
    this.formCollapsed.set(true);

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
            this.errorMessage.set(result.error.message);
            this.errorSource.set(result.error.source);
            this.searchResults.set([]);
          } else {
            this.searchResults.set(result.data);
          }
        },
        error: () => {
          this.errorMessage.set('Ocorreu um erro inesperado. Tente novamente.');
          this.errorSource.set('Transport');
          this.searchResults.set([]);
        },
      });
  }

  // Dismiss error banner
  dismissError(): void {
    this.errorMessage.set(null);
    this.errorSource.set(null);
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
      durationMinutes: null,
      label: `Transporte: ${transport.origin} → ${transport.destination}`,
      notes: '',
      order: 0,
    });
    this.notify.success('Transporte adicionado ao roteiro');
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
