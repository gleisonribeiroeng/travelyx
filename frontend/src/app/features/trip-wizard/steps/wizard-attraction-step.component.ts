import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, switchMap, finalize } from 'rxjs/operators';
import { NotificationService } from '../../../core/services/notification.service';
import { MatDialog } from '@angular/material/dialog';
import { ItemDetailDialogComponent, ItemDetailData, ItemDetailResult } from '../../../shared/components/item-detail-dialog/item-detail-dialog.component';
import { MATERIAL_IMPORTS } from '../../../core/material.exports';
import { ScheduleDialogComponent, ScheduleDialogData } from '../../../shared/components/schedule-dialog/schedule-dialog.component';
import { AttractionApiService } from '../../../core/api/attraction-api.service';
import { HotelApiService, DestinationOption } from '../../../core/api/hotel-api.service';
import { TripStateService } from '../../../core/services/trip-state.service';
import { Attraction } from '../../../core/models/trip.models';
import { ListItemBaseComponent } from '../../../shared/components/list-item-base/list-item-base.component';
import { attractionToListItem } from '../../../shared/components/list-item-base/list-item-mappers';

@Component({
  selector: 'app-wizard-attraction-step',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule, ListItemBaseComponent],
  templateUrl: './wizard-attraction-step.component.html',
  styleUrl: './wizard-attraction-step.component.scss',
})
export class WizardAttractionStepComponent {
  private readonly api = inject(AttractionApiService);
  private readonly hotelApi = inject(HotelApiService);
  private readonly tripState = inject(TripStateService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  readonly selectedAttractions = this.tripState.attractions;
  readonly results = signal<Attraction[]>([]);
  readonly isSearching = signal(false);
  readonly isLoadingMore = signal(false);
  readonly hasSearched = signal(false);
  readonly hasMore = signal(false);
  readonly totalCount = signal(0);
  private currentOffset = 0;
  private readonly PAGE_SIZE = 20;
  private lastCity = '';
  readonly formCollapsed = signal(false);

  readonly cityControl = new FormControl<string | DestinationOption>('', Validators.required);

  constructor() {
    const trip = this.tripState.trip();
    if (trip.destination && !this.hasSearched()) {
      this.cityControl.setValue(trip.destination);
      setTimeout(() => {
        if (this.searchForm.valid) {
          this.search();
        }
      }, 300);
    }
  }

  searchForm = new FormGroup({
    city: this.cityControl,
  });

  filteredCities$: Observable<DestinationOption[]> = this.cityControl.valueChanges.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    filter((v) => typeof v === 'string' && v.length >= 2),
    switchMap((keyword) => this.hotelApi.searchDestinations(keyword as string))
  );

  displayCity(opt: DestinationOption | string | null): string {
    if (!opt) return '';
    if (typeof opt === 'string') return opt;
    return opt.label || opt.name;
  }

  isAdded(id: string): boolean {
    return this.selectedAttractions().some((a) => a.id === id);
  }

  toListItem(attr: Attraction) {
    return attractionToListItem(attr, { isAdded: this.isAdded(attr.id) });
  }

  selectById(id: string): void {
    const attr = this.results().find(a => a.id === id);
    if (attr) this.select(attr);
  }

  openDetailById(id: string): void {
    const attr = this.results().find(a => a.id === id) ?? this.selectedAttractions().find(a => a.id === id);
    if (attr) this.openDetail(attr);
  }

  search(): void {
    if (this.searchForm.invalid) return;
    this.isSearching.set(true);
    this.hasSearched.set(true);
    this.formCollapsed.set(true);
    this.currentOffset = 0;

    const cityVal = this.cityControl.value;
    const city = typeof cityVal === 'string' ? cityVal : (cityVal as DestinationOption)?.label ?? '';
    this.lastCity = city;

    this.api.searchAttractionsPaginated({ city }, 0, this.PAGE_SIZE)
      .pipe(finalize(() => this.isSearching.set(false)))
      .subscribe({
        next: (result) => {
          this.results.set(result.data);
          this.totalCount.set(result.totalCount);
          this.hasMore.set(result.hasMore);
          this.currentOffset = result.data.length;
        },
      });
  }

  loadMore(): void {
    if (this.isLoadingMore() || !this.lastCity) return;
    this.isLoadingMore.set(true);
    this.api.searchAttractionsPaginated({ city: this.lastCity }, this.currentOffset, this.PAGE_SIZE)
      .pipe(finalize(() => this.isLoadingMore.set(false)))
      .subscribe({
        next: (result) => {
          if (!result.error) {
            this.results.update(current => [...current, ...result.data]);
            this.totalCount.set(result.totalCount);
            this.hasMore.set(result.hasMore);
            this.currentOffset += result.data.length;
          }
        },
      });
  }

  openDetail(attraction: Attraction): void {
    const ref = this.dialog.open(ItemDetailDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { type: 'attraction', item: attraction, isAdded: this.isAdded(attraction.id) } as ItemDetailData,
    });
    ref.afterClosed().subscribe((result: ItemDetailResult) => {
      if (!result) return;
      if (result.action === 'add') this.select(attraction);
      else if (result.action === 'remove') this.remove(attraction.id);
    });
  }

  select(attraction: Attraction): void {
    const dialogRef = this.dialog.open(ScheduleDialogComponent, {
      width: '400px',
      panelClass: 'mobile-fullscreen-dialog',
      data: {
        name: attraction.name,
        type: 'attraction',
        defaultDate: this.tripState.trip().dates.start || new Date().toISOString().split('T')[0],
        tripDates: this.tripState.trip().dates,
        durationMinutes: null,
      } as ScheduleDialogData,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;
      this.tripState.addAttraction(attraction);
      this.tripState.addItineraryItem({
        id: crypto.randomUUID(),
        type: 'attraction',
        refId: attraction.id,
        date: result.date,
        timeSlot: result.timeSlot,
        durationMinutes: result.durationMinutes,
        label: `Atividade: ${attraction.name}`,
        notes: attraction.category || '',
        order: 0,
        isPaid: false,
        attachment: null,
      });
      this.notify.success('Atividade adicionada!');
    });
  }

  remove(id: string): void {
    this.tripState.removeAttraction(id);
    this.tripState.removeItineraryItem(
      this.tripState.itineraryItems().find((i) => i.refId === id)?.id ?? ''
    );
  }
}
