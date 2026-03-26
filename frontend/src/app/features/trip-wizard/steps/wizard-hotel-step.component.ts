import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  Validators,
  ValidatorFn,
  AbstractControl,
  ValidationErrors,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from '../../../core/services/notification.service';
import { ItemDetailDialogComponent, ItemDetailData, ItemDetailResult } from '../../../shared/components/item-detail-dialog/item-detail-dialog.component';
import { Observable } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  switchMap,
  finalize,
} from 'rxjs/operators';
import { MATERIAL_IMPORTS } from '../../../core/material.exports';
import {
  HotelApiService,
  DestinationOption,
} from '../../../core/api/hotel-api.service';
import { TripStateService } from '../../../core/services/trip-state.service';
import { PriceAlertApiService, CreatePriceAlertDto } from '../../../core/api/price-alert-api.service';
import { PlanService } from '../../../core/services/plan.service';
import { Stay } from '../../../core/models/trip.models';
import { ListItemBaseComponent } from '../../../shared/components/list-item-base/list-item-base.component';
import { stayToListItem } from '../../../shared/components/list-item-base/list-item-mappers';
import {
  ManualHotelDialogComponent,
  ManualHotelDialogData,
  ManualHotelDialogResult,
} from '../../../shared/components/manual-hotel-dialog/manual-hotel-dialog.component';

@Component({
  selector: 'app-wizard-hotel-step',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule, ListItemBaseComponent],
  templateUrl: './wizard-hotel-step.component.html',
  styleUrl: './wizard-hotel-step.component.scss',
})
export class WizardHotelStepComponent {
  private readonly api = inject(HotelApiService);
  private readonly tripState = inject(TripStateService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly priceAlertApi = inject(PriceAlertApiService);
  private readonly planService = inject(PlanService);

  readonly selectedHotels = this.tripState.stays;
  readonly results = signal<Stay[]>([]);

  // Trip context for header
  readonly tripDestination = computed(() => this.tripState.trip().destination || '');
  readonly tripDates = computed(() => {
    const t = this.tripState.trip();
    if (!t.dates.start) return '';
    const fmt = (d: string) => {
      const date = new Date(d + 'T00:00:00');
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    };
    return `${fmt(t.dates.start)} a ${fmt(t.dates.end || t.dates.start)}`;
  });
  readonly isSearching = signal(false);
  readonly isLoadingMore = signal(false);
  readonly hasSearched = signal(false);
  readonly hasMore = signal(false);
  readonly totalCount = signal(0);
  private currentPage = 1;
  private lastSearchParams: any = null;
  readonly formCollapsed = signal(false);
  readonly currentSort = signal<string>('popularity');
  readonly minDate = new Date();

  get minCheckOut(): Date {
    return this.searchForm.value.dateRange?.start || new Date();
  }

  destinationControl = new FormControl<DestinationOption | null>(null, [
    Validators.required,
    this.destinationValidator(),
  ]);

  searchForm = new FormGroup({
    destination: this.destinationControl,
    dateRange: new FormGroup({
      start: new FormControl<Date | null>(null, Validators.required),
      end: new FormControl<Date | null>(null, Validators.required),
    }),
    guests: new FormControl(2, [Validators.required, Validators.min(1), Validators.max(30)]),
  });

  constructor() {
    const trip = this.tripState.trip();
    const dates = trip.dates;
    if (dates.start && dates.end) {
      this.searchForm.get('dateRange')!.patchValue({
        start: new Date(dates.start + 'T00:00:00'),
        end: new Date(dates.end + 'T00:00:00'),
      });
    }

    // Auto-fill destination from trip
    if (trip.destination && !this.hasSearched()) {
      this.api.searchDestinations(trip.destination).subscribe({
        next: (results) => {
          if (results.length > 0) {
            this.destinationControl.setValue(results[0]);
            // Auto-search after destination resolves
            setTimeout(() => {
              if (this.searchForm.valid) {
                this.search();
              }
            }, 300);
          }
        },
      });
    }
  }

  filteredDestinations$: Observable<DestinationOption[]> = this.destinationControl.valueChanges.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    filter((v) => typeof v === 'string' && (v as string).length >= 2),
    switchMap((keyword) => this.api.searchDestinations(keyword as string)),
  );

  // Results in API order — no frontend reordering
  readonly sortedResults = computed(() => this.results());

  private destinationValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      if (typeof control.value === 'string' || !(control.value as DestinationOption).destId) {
        return { invalidDestination: true };
      }
      return null;
    };
  }

  displayDestination(dest: DestinationOption | null): string {
    return dest ? dest.label || dest.name : '';
  }

  isAdded(id: string): boolean {
    return this.selectedHotels().some((h) => h.id === id);
  }

  toListItem(hotel: Stay) {
    return stayToListItem(hotel, {
      isAdded: this.isAdded(hotel.id),
    });
  }

  onIconAction(event: { itemId: string; actionId: string }): void {
    if (event.actionId !== 'price-alert') return;

    if (!this.planService.hasFeature('priceAlerts')) {
      this.planService.showPaywall('priceAlerts');
      return;
    }

    const hotel = this.results().find(h => h.id === event.itemId);
    if (!hotel) return;

    const dto: CreatePriceAlertDto = {
      type: 'hotel',
      label: hotel.name,
      searchParams: { itemId: hotel.id, name: hotel.name, address: hotel.address },
      currentPrice: hotel.pricePerNight.total,
      targetPrice: Math.round(hotel.pricePerNight.total * 0.9),
      currency: hotel.pricePerNight.currency,
    };

    this.priceAlertApi.createAlert(dto).subscribe({
      next: () => this.notify.success('Alerta de preco criado!'),
      error: () => this.notify.error('Erro ao criar alerta'),
    });
  }

  selectById(id: string): void {
    const hotel = this.results().find(h => h.id === id);
    if (hotel) this.select(hotel);
  }

  openDetailById(id: string): void {
    const hotel = this.results().find(h => h.id === id) ?? this.selectedHotels().find(h => h.id === id);
    if (hotel) this.openDetail(hotel);
  }

  openManualHotelDialog(existingStay?: Stay): void {
    const ref = this.dialog.open(ManualHotelDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: {
        stay: existingStay ?? null,
        tripCurrency: this.tripState.trip().currency,
      } as ManualHotelDialogData,
    });
    ref.afterClosed().subscribe((result: ManualHotelDialogResult | undefined) => {
      if (!result || result.action !== 'save') return;

      if (existingStay) {
        // Edit mode
        this.tripState.updateStay(result.stay);
        const itinItem = this.tripState.itineraryItems().find(i => i.refId === existingStay.id);
        if (itinItem) {
          this.tripState.updateItineraryItem({
            ...itinItem,
            date: result.stay.checkIn,
            label: `Hotel: ${result.stay.name}`,
            notes: result.stay.address || '',
            isPaid: result.isPaid,
          });
        }
        this.notify.success('Hotel atualizado!');
      } else {
        // Create mode
        this.tripState.addStay(result.stay);
        this.tripState.addItineraryItem({
          id: crypto.randomUUID(),
          type: 'stay',
          refId: result.stay.id,
          date: result.stay.checkIn,
          timeSlot: null,
          durationMinutes: null,
          label: `Hotel: ${result.stay.name}`,
          notes: result.stay.address || '',
          order: 0,
          isPaid: result.isPaid,
          attachment: null,
        });
        this.notify.success('Hotel manual adicionado!');
      }
    });
  }

  openDetail(hotel: Stay): void {
    const ref = this.dialog.open(ItemDetailDialogComponent, {
      width: '780px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { type: 'stay', item: hotel, isAdded: this.isAdded(hotel.id) } as ItemDetailData,
    });
    ref.afterClosed().subscribe((result: ItemDetailResult) => {
      if (!result) return;
      if (result.action === 'add') {
        // If a room was selected, update the hotel price with the room price
        if (result.selectedRoom?.price) {
          const updated: Stay = {
            ...hotel,
            pricePerNight: { total: result.selectedRoom.price, currency: result.selectedRoom.currency || hotel.pricePerNight.currency },
          };
          this.select(updated);
        } else {
          this.select(hotel);
        }
      } else if (result.action === 'remove') {
        this.remove(hotel.id);
      }
    });
  }

  onSortChange(sortBy: string): void {
    this.currentSort.set(sortBy);
    if (this.lastSearchParams) {
      this.lastSearchParams.sortBy = sortBy;
      this.isSearching.set(true);
      this.currentPage = 1;
      this.api.searchHotelsPaginated(this.lastSearchParams, 1)
        .pipe(finalize(() => this.isSearching.set(false)))
        .subscribe({
          next: (result) => {
            this.results.set(result.data);
            this.totalCount.set(result.totalCount);
            this.hasMore.set(result.hasMore);
            this.currentPage = 2;
          },
        });
    }
  }

  search(): void {
    if (this.searchForm.invalid) return;
    const dest = this.searchForm.value.destination as DestinationOption;
    const checkIn = this.searchForm.value.dateRange?.start;
    const checkOut = this.searchForm.value.dateRange?.end;
    if (!dest || !checkIn || !checkOut) return;

    this.isSearching.set(true);
    this.hasSearched.set(true);
    this.formCollapsed.set(true);
    this.currentPage = 1;
    this.currentSort.set('popularity');

    const params: any = {
      destId: dest.destId,
      searchType: dest.searchType,
      checkIn: checkIn.toISOString().split('T')[0],
      checkOut: checkOut.toISOString().split('T')[0],
      adults: this.searchForm.value.guests ?? 2,
      rooms: 1,
    };
    this.lastSearchParams = params;

    this.api.searchHotelsPaginated(params, 1)
      .pipe(finalize(() => this.isSearching.set(false)))
      .subscribe({
        next: (result) => {
          this.results.set(result.data);
          this.totalCount.set(result.totalCount);
          this.hasMore.set(result.hasMore);
          this.currentPage = 2;
        },
      });
  }

  loadMore(): void {
    if (!this.lastSearchParams || this.isLoadingMore()) return;
    this.isLoadingMore.set(true);
    this.api.searchHotelsPaginated(this.lastSearchParams, this.currentPage)
      .pipe(finalize(() => this.isLoadingMore.set(false)))
      .subscribe({
        next: (result) => {
          if (!result.error) {
            // Deduplicate: only add hotels not already in results
            this.results.update(current => {
              const existingIds = new Set(current.map(h => h.id));
              const newHotels = result.data.filter(h => !existingIds.has(h.id));
              return [...current, ...newHotels];
            });
            this.totalCount.set(result.totalCount);
            this.hasMore.set(result.hasMore);
            this.currentPage++;
          }
        },
      });
  }

  select(hotel: Stay): void {
    this.tripState.addStay(hotel);
    this.tripState.addItineraryItem({
      id: crypto.randomUUID(),
      type: 'stay',
      refId: hotel.id,
      date: hotel.checkIn,
      timeSlot: null,
      durationMinutes: null,
      label: `Hotel: ${hotel.name}`,
      notes: hotel.address || '',
      order: 0,
      isPaid: false,
      attachment: null,
    });
    this.notify.success('Hotel adicionado!');
  }

  remove(id: string): void {
    this.tripState.removeStay(id);
    this.tripState.removeItineraryItem(
      this.tripState.itineraryItems().find((i) => i.refId === id)?.id ?? ''
    );
  }
}
