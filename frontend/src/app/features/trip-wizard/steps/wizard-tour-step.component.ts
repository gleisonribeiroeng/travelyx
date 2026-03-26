import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, switchMap, finalize } from 'rxjs/operators';
import { NotificationService } from '../../../core/services/notification.service';
import { MatDialog } from '@angular/material/dialog';
import { ItemDetailDialogComponent, ItemDetailData, ItemDetailResult } from '../../../shared/components/item-detail-dialog/item-detail-dialog.component';
import { HotelApiService, DestinationOption } from '../../../core/api/hotel-api.service';
import { MATERIAL_IMPORTS } from '../../../core/material.exports';
import { ScheduleDialogComponent, ScheduleDialogData } from '../../../shared/components/schedule-dialog/schedule-dialog.component';
import { TourApiService } from '../../../core/api/tour-api.service';
import { TripStateService } from '../../../core/services/trip-state.service';
import { Activity } from '../../../core/models/trip.models';
import {
  categorizeTours,
  CategorizedTours,
} from '../../../core/utils/tour-categorizer.util';
import { ListItemBaseComponent } from '../../../shared/components/list-item-base/list-item-base.component';
import { activityToListItem, TourTagType } from '../../../shared/components/list-item-base/list-item-mappers';

@Component({
  selector: 'app-wizard-tour-step',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule, ListItemBaseComponent],
  templateUrl: './wizard-tour-step.component.html',
  styleUrl: './wizard-tour-step.component.scss',
})
export class WizardTourStepComponent {
  private readonly api = inject(TourApiService);
  private readonly hotelApi = inject(HotelApiService);
  private readonly tripState = inject(TripStateService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  readonly selectedTours = this.tripState.activities;
  readonly results = signal<Activity[]>([]);
  readonly isSearching = signal(false);
  readonly isLoadingMore = signal(false);
  readonly hasSearched = signal(false);
  readonly hasMore = signal(false);
  readonly totalCount = signal(0);
  private currentOffset = 0;
  private readonly PAGE_SIZE = 20;
  private lastDestination = '';
  readonly formCollapsed = signal(false);

  readonly destinationControl = new FormControl<string | DestinationOption>('', Validators.required);

  constructor() {
    const trip = this.tripState.trip();
    if (trip.destination && !this.hasSearched()) {
      this.destinationControl.setValue(trip.destination);
      setTimeout(() => {
        if (this.searchForm.valid) {
          this.search();
        }
      }, 300);
    }
  }

  searchForm = new FormGroup({
    destination: this.destinationControl,
  });

  filteredDestinations$: Observable<DestinationOption[]> = this.destinationControl.valueChanges.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    filter((v) => typeof v === 'string' && v.length >= 2),
    switchMap((keyword) => this.hotelApi.searchDestinations(keyword as string))
  );

  displayDestination(opt: DestinationOption | string | null): string {
    if (!opt) return '';
    if (typeof opt === 'string') return opt;
    return opt.label || opt.name;
  }

  // Categorization
  readonly categorized = computed((): CategorizedTours<Activity> =>
    categorizeTours(this.results())
  );

  readonly sortedResults = computed(() => {
    const cat = this.categorized();
    const all = cat.all;
    if (!cat.bestValue) return all;
    return [cat.bestValue, ...all.filter(t => t.id !== cat.bestValue!.id)];
  });

  isAdded(id: string): boolean {
    return this.selectedTours().some((t) => t.id === id);
  }

  getTourTag(tour: Activity): TourTagType | null {
    const cat = this.categorized();
    if (cat.bestValue?.id === tour.id) return 'bestValue';
    if (cat.cheapest?.id === tour.id) return 'cheapest';
    if (cat.bestRated?.id === tour.id) return 'bestRated';
    return null;
  }

  toListItem(tour: Activity) {
    return activityToListItem(tour, {
      isAdded: this.isAdded(tour.id),
      tag: this.getTourTag(tour),
    });
  }

  selectById(id: string): void {
    const tour = this.results().find(t => t.id === id);
    if (tour) this.select(tour);
  }

  openDetailById(id: string): void {
    const tour = this.results().find(t => t.id === id) ?? this.selectedTours().find(t => t.id === id);
    if (tour) this.openDetail(tour);
  }

  formatDuration(minutes: number | null): string {
    if (!minutes) return '';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  search(): void {
    if (this.searchForm.invalid) return;
    this.isSearching.set(true);
    this.hasSearched.set(true);
    this.formCollapsed.set(true);
    this.currentOffset = 0;

    const destVal = this.destinationControl.value;
    const destination = typeof destVal === 'string' ? destVal : (destVal as DestinationOption)?.label ?? '';
    this.lastDestination = destination;

    this.api.searchToursPaginated({ destination }, 0, this.PAGE_SIZE)
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
    if (this.isLoadingMore() || !this.lastDestination) return;
    this.isLoadingMore.set(true);
    this.api.searchToursPaginated({ destination: this.lastDestination }, this.currentOffset, this.PAGE_SIZE)
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

  openDetail(tour: Activity): void {
    const ref = this.dialog.open(ItemDetailDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { type: 'activity', item: tour, isAdded: this.isAdded(tour.id) } as ItemDetailData,
    });
    ref.afterClosed().subscribe((result: ItemDetailResult) => {
      if (!result) return;
      if (result.action === 'add') this.select(tour);
      else if (result.action === 'remove') this.remove(tour.id);
    });
  }

  select(tour: Activity): void {
    const dialogRef = this.dialog.open(ScheduleDialogComponent, {
      width: '400px',
      panelClass: 'mobile-fullscreen-dialog',
      data: {
        name: tour.name,
        type: 'activity',
        defaultDate: this.tripState.trip().dates.start || new Date().toISOString().split('T')[0],
        tripDates: this.tripState.trip().dates,
        durationMinutes: tour.durationMinutes,
      } as ScheduleDialogData,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;
      this.tripState.addActivity(tour);
      this.tripState.addItineraryItem({
        id: crypto.randomUUID(),
        type: 'activity',
        refId: tour.id,
        date: result.date,
        timeSlot: result.timeSlot,
        durationMinutes: result.durationMinutes,
        label: `Atividade: ${tour.name}`,
        notes: tour.city || '',
        order: 0,
        isPaid: false,
        attachment: null,
      });
      this.notify.success('Atividade adicionada!');
    });
  }

  remove(id: string): void {
    this.tripState.removeActivity(id);
    this.tripState.removeItineraryItem(
      this.tripState.itineraryItems().find((i) => i.refId === id)?.id ?? ''
    );
  }
}
