import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { finalize } from 'rxjs/operators';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { ScheduleDialogComponent, ScheduleDialogData } from '../../shared/components/schedule-dialog/schedule-dialog.component';
import { AttractionApiService } from '../../core/api/attraction-api.service';
import { TripStateService } from '../../core/services/trip-state.service';
import { Attraction, ItineraryItem } from '../../core/models/trip.models';
import { ErrorBannerComponent } from '../../shared/components/error-banner/error-banner.component';

@Component({
  selector: 'app-attraction-search',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule, ErrorBannerComponent],
  templateUrl: './attraction-search.component.html',
  styleUrl: './attraction-search.component.scss',
})
export class AttractionSearchComponent {
  private readonly attractionApi = inject(AttractionApiService);
  private readonly tripState = inject(TripStateService);
  private readonly snackBar = inject(MatSnackBar);
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
      });
      this.snackBar.open('Atração adicionada ao roteiro', 'Fechar', { duration: 3000 });
    });
  }
}
