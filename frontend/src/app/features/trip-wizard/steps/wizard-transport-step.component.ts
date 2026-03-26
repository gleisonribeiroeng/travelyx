import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, switchMap, finalize } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from '../../../core/services/notification.service';
import { ItemDetailDialogComponent, ItemDetailData, ItemDetailResult } from '../../../shared/components/item-detail-dialog/item-detail-dialog.component';
import { HotelApiService, DestinationOption } from '../../../core/api/hotel-api.service';
import { MATERIAL_IMPORTS } from '../../../core/material.exports';
import { TransportApiService } from '../../../core/api/transport-api.service';
import { TripStateService } from '../../../core/services/trip-state.service';
import { Transport } from '../../../core/models/trip.models';
import { ListItemBaseComponent } from '../../../shared/components/list-item-base/list-item-base.component';
import { transportToListItem } from '../../../shared/components/list-item-base/list-item-mappers';

@Component({
  selector: 'app-wizard-transport-step',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule, ListItemBaseComponent],
  templateUrl: './wizard-transport-step.component.html',
  styleUrl: './wizard-transport-step.component.scss',
})
export class WizardTransportStepComponent {
  private readonly api = inject(TransportApiService);
  private readonly hotelApi = inject(HotelApiService);
  private readonly tripState = inject(TripStateService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  readonly selectedTransports = this.tripState.transports;
  readonly results = signal<Transport[]>([]);
  readonly isSearching = signal(false);
  readonly hasSearched = signal(false);
  readonly formCollapsed = signal(false);
  readonly minDate = new Date();

  readonly originControl = new FormControl<string | DestinationOption>('', Validators.required);
  readonly destinationControl = new FormControl<string | DestinationOption>('', Validators.required);

  searchForm = new FormGroup({
    origin: this.originControl,
    destination: this.destinationControl,
    date: new FormControl<Date | null>(null, Validators.required),
  });

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

  isAdded(id: string): boolean {
    return this.selectedTransports().some((t) => t.id === id);
  }

  toListItem(t: Transport) {
    return transportToListItem(t, { isAdded: this.isAdded(t.id) });
  }

  selectById(id: string): void {
    const t = this.results().find(x => x.id === id);
    if (t) this.select(t);
  }

  openDetailById(id: string): void {
    const t = this.results().find(x => x.id === id) ?? this.selectedTransports().find(x => x.id === id);
    if (t) this.openDetail(t);
  }

  getModeIcon(mode: string): string {
    const icons: Record<string, string> = { bus: 'directions_bus', train: 'train', ferry: 'directions_boat', other: 'commute' };
    return icons[mode] || 'commute';
  }

  formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  search(): void {
    if (this.searchForm.invalid) return;
    const date = this.searchForm.value.date;
    if (!date) return;

    this.isSearching.set(true);
    this.hasSearched.set(true);
    this.formCollapsed.set(true);

    const originVal = this.originControl.value;
    const destVal = this.destinationControl.value;
    this.api.searchTransport({
      origin: typeof originVal === 'string' ? originVal : (originVal as DestinationOption)?.label ?? '',
      destination: typeof destVal === 'string' ? destVal : (destVal as DestinationOption)?.label ?? '',
      departureDate: date.toISOString().split('T')[0],
    }).pipe(finalize(() => this.isSearching.set(false)))
      .subscribe({
        next: (result) => {
          this.results.set(result.data);
        },
      });
  }

  openDetail(transport: Transport): void {
    const ref = this.dialog.open(ItemDetailDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { type: 'transport', item: transport, isAdded: this.isAdded(transport.id) } as ItemDetailData,
    });
    ref.afterClosed().subscribe((result: ItemDetailResult) => {
      if (!result) return;
      if (result.action === 'add') this.select(transport);
      else if (result.action === 'remove') this.remove(transport.id);
    });
  }

  select(transport: Transport): void {
    this.tripState.addTransport(transport);
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
    this.notify.success('Transporte adicionado!');
  }

  remove(id: string): void {
    this.tripState.removeTransport(id);
    this.tripState.removeItineraryItem(
      this.tripState.itineraryItems().find((i) => i.refId === id)?.id ?? ''
    );
  }
}
