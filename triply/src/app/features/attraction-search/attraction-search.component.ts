import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { NotificationService } from '../../core/services/notification.service';
import { MatDialog } from '@angular/material/dialog';
import { finalize } from 'rxjs/operators';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { ScheduleDialogComponent, ScheduleDialogData } from '../../shared/components/schedule-dialog/schedule-dialog.component';
import { ItemDetailDialogComponent, ItemDetailData, ItemDetailResult } from '../../shared/components/item-detail-dialog/item-detail-dialog.component';
import { AttractionApiService } from '../../core/api/attraction-api.service';
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
  private readonly tripState = inject(TripStateService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  // Form controls
  attractionSearchForm = new FormGroup({
    city: new FormControl('', Validators.required),
  });

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

    const city = this.attractionSearchForm.value.city ?? '';

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
    });
  }
}
