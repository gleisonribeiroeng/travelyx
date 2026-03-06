import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, switchMap, finalize } from 'rxjs/operators';
import { NotificationService } from '../../core/services/notification.service';
import { MatDialog } from '@angular/material/dialog';
import { HotelApiService, DestinationOption } from '../../core/api/hotel-api.service';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { ItemDetailDialogComponent, ItemDetailData, ItemDetailResult } from '../../shared/components/item-detail-dialog/item-detail-dialog.component';
import { TransportApiService } from '../../core/api/transport-api.service';
import { TripStateService } from '../../core/services/trip-state.service';
import { Transport } from '../../core/models/trip.models';
import { ErrorBannerComponent } from '../../shared/components/error-banner/error-banner.component';
import { ListItemBaseComponent } from '../../shared/components/list-item-base/list-item-base.component';
import { transportToListItem } from '../../shared/components/list-item-base/list-item-mappers';

@Component({
  selector: 'app-transport-search',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule, ErrorBannerComponent, ListItemBaseComponent],
  templateUrl: './transport-search.component.html',
  styleUrl: './transport-search.component.scss',
})
export class TransportSearchComponent {
  private readonly transportApi = inject(TransportApiService);
  private readonly hotelApi = inject(HotelApiService);
  private readonly tripState = inject(TripStateService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  // Autocomplete controls
  readonly originControl = new FormControl<string | DestinationOption>('', Validators.required);
  readonly destinationControl = new FormControl<string | DestinationOption>('', Validators.required);

  // Form controls
  transportSearchForm = new FormGroup({
    origin: this.originControl,
    destination: this.destinationControl,
    departureDate: new FormControl<Date | null>(null, Validators.required),
  });

  // Autocomplete observables
  filteredOrigins$: Observable<DestinationOption[]> = this.originControl.valueChanges.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    filter((v) => typeof v === 'string' && v.length >= 2),
    switchMap((keyword) => this.hotelApi.searchDestinations(keyword as string))
  );

  filteredDestinations$: Observable<DestinationOption[]> = this.destinationControl.valueChanges.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    filter((v) => typeof v === 'string' && v.length >= 2),
    switchMap((keyword) => this.hotelApi.searchDestinations(keyword as string))
  );

  displayLocation(opt: DestinationOption | string | null): string {
    if (!opt) return '';
    if (typeof opt === 'string') return opt;
    return opt.label || opt.name;
  }

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
    const originVal = this.originControl.value;
    const destVal = this.destinationControl.value;
    const origin = typeof originVal === 'string' ? originVal : (originVal as DestinationOption)?.label ?? '';
    const destination = typeof destVal === 'string' ? destVal : (destVal as DestinationOption)?.label ?? '';
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
      isPaid: false,
      attachment: null,
    });
    this.notify.success('Transporte adicionado ao roteiro');
  }

  // Set mode filter
  setModeFilter(mode: string): void {
    this.modeFilter.set(mode);
  }

  // Check if transport is already added to trip
  isTransportAdded(transport: Transport): boolean {
    return this.tripState.transports().some(t => t.id === transport.id);
  }

  // Map transport to ListItemConfig
  toListItem(transport: Transport) {
    return transportToListItem(transport, {
      isAdded: this.isTransportAdded(transport),
    });
  }

  // Select transport by id (primary action)
  selectById(id: string): void {
    const transport = this.searchResults().find(t => t.id === id);
    if (transport) this.addToItinerary(transport);
  }

  // Open detail by id (secondary / card click)
  openDetailById(id: string): void {
    const transport = this.searchResults().find(t => t.id === id);
    if (!transport) return;
    const ref = this.dialog.open(ItemDetailDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { type: 'transport', item: transport, isAdded: this.isTransportAdded(transport) } as ItemDetailData,
    });
    ref.afterClosed().subscribe((result: ItemDetailResult) => {
      if (!result) return;
      if (result.action === 'add') this.addToItinerary(transport);
      else if (result.action === 'remove') this.removeFromItinerary(transport.id);
    });
  }

  removeFromItinerary(id: string): void {
    this.tripState.removeTransport(id);
    this.tripState.removeItineraryItem(
      this.tripState.itineraryItems().find(i => i.refId === id)?.id ?? ''
    );
    this.notify.success('Transporte removido do roteiro');
  }
}
