import { Component, signal, inject } from '@angular/core';
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
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { ScheduleDialogComponent, ScheduleDialogData } from '../../shared/components/schedule-dialog/schedule-dialog.component';
import { ItemDetailDialogComponent, ItemDetailData, ItemDetailResult } from '../../shared/components/item-detail-dialog/item-detail-dialog.component';
import { AttractionApiService } from '../../core/api/attraction-api.service';
import { HotelApiService, DestinationOption } from '../../core/api/hotel-api.service';
import { TripStateService } from '../../core/services/trip-state.service';
import { Attraction } from '../../core/models/trip.models';
import { ErrorBannerComponent } from '../../shared/components/error-banner/error-banner.component';
import { ListItemBaseComponent } from '../../shared/components/list-item-base/list-item-base.component';
import { attractionToListItem } from '../../shared/components/list-item-base/list-item-mappers';

@Component({
  selector: 'app-attraction-search',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule, ErrorBannerComponent, ListItemBaseComponent],
  templateUrl: './attraction-search.component.html',
  styleUrl: './attraction-search.component.scss',
})
export class AttractionSearchComponent {
  private readonly attractionApi = inject(AttractionApiService);
  private readonly hotelApi = inject(HotelApiService);
  private readonly tripState = inject(TripStateService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  // Autocomplete city control
  readonly cityControl = new FormControl<string | DestinationOption>('', Validators.required);

  // Form controls
  attractionSearchForm = new FormGroup({
    city: this.cityControl,
  });

  // Autocomplete observable
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

  // Search state signals
  formCollapsed = signal(false);
  searchResults = signal<Attraction[]>([]);
  isSearching = signal(false);
  hasSearched = signal(false);
  errorMessage = signal<string | null>(null);
  errorSource = signal<string | null>(null);

  // Search attractions
  searchAttractions(): void {
    if (this.attractionSearchForm.invalid) {
      return;
    }

    const cityValue = this.cityControl.value;
    const city = typeof cityValue === 'string' ? cityValue : (cityValue as DestinationOption)?.label ?? '';

    this.isSearching.set(true);
    this.hasSearched.set(true);
    this.errorMessage.set(null);
    this.formCollapsed.set(true);

    this.attractionApi
      .searchAttractions({ city })
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
      });
  }

  // Dismiss error banner
  dismissError(): void {
    this.errorMessage.set(null);
    this.errorSource.set(null);
  }

  // Add to itinerary
  addToItinerary(attraction: Attraction): void {
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
      this.tripState.addAttraction({ ...attraction, addedToItinerary: true });
      this.tripState.addItineraryItem({
        id: crypto.randomUUID(),
        type: 'attraction',
        refId: attraction.id,
        date: result.date,
        timeSlot: result.timeSlot,
        durationMinutes: result.durationMinutes,
        label: `Atração: ${attraction.name}`,
        notes: attraction.category || '',
        order: 0,
        isPaid: false,
        attachment: null,
      });
      this.notify.success('Atração adicionada ao roteiro');
    });
  }

  // Check if attraction is already added to trip
  isAttractionAdded(attraction: Attraction): boolean {
    return this.tripState.attractions().some(a => a.id === attraction.id);
  }

  // Map attraction to ListItemConfig
  toListItem(attraction: Attraction) {
    return attractionToListItem(attraction, {
      isAdded: this.isAttractionAdded(attraction),
    });
  }

  // Select attraction by id (primary action)
  selectById(id: string): void {
    const attraction = this.searchResults().find(a => a.id === id);
    if (attraction) this.addToItinerary(attraction);
  }

  // Open detail by id (secondary / card click)
  openDetailById(id: string): void {
    const attraction = this.searchResults().find(a => a.id === id);
    if (!attraction) return;
    const ref = this.dialog.open(ItemDetailDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { type: 'attraction', item: attraction, isAdded: this.isAttractionAdded(attraction) } as ItemDetailData,
    });
    ref.afterClosed().subscribe((result: ItemDetailResult) => {
      if (!result) return;
      if (result.action === 'add') this.addToItinerary(attraction);
      else if (result.action === 'remove') this.removeFromItinerary(attraction.id);
    });
  }

  removeFromItinerary(id: string): void {
    this.tripState.removeAttraction(id);
    this.tripState.removeItineraryItem(
      this.tripState.itineraryItems().find(i => i.refId === id)?.id ?? ''
    );
    this.notify.success('Atração removida do roteiro');
  }
}
