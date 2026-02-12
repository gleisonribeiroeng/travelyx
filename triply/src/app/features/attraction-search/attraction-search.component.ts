import { Component, signal, inject } from '@angular/core';
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
import { AttractionApiService } from '../../core/api/attraction-api.service';
import { TripStateService } from '../../core/services/trip-state.service';
import { Attraction, ItineraryItem } from '../../core/models/trip.models';

@Component({
  selector: 'app-attraction-search',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule],
  templateUrl: './attraction-search.component.html',
  styleUrl: './attraction-search.component.scss',
})
export class AttractionSearchComponent {
  private readonly attractionApi = inject(AttractionApiService);
  private readonly tripState = inject(TripStateService);
  private readonly snackBar = inject(MatSnackBar);

  // Form controls
  attractionSearchForm = new FormGroup({
    city: new FormControl('', Validators.required),
  });

  // Search state signals
  searchResults = signal<Attraction[]>([]);
  isSearching = signal(false);
  hasSearched = signal(false);

  // Search attractions
  searchAttractions(): void {
    if (this.attractionSearchForm.invalid) {
      return;
    }

    const city = this.attractionSearchForm.value.city ?? '';

    this.isSearching.set(true);
    this.hasSearched.set(true);

    this.attractionApi
      .searchAttractions({ city })
      .pipe(finalize(() => this.isSearching.set(false)))
      .subscribe({
        next: (result) => {
          if (result.error) {
            this.snackBar.open(
              'Failed to search attractions. Please try again.',
              'Close',
              { duration: 3000 }
            );
            this.searchResults.set([]);
          } else {
            this.searchResults.set(result.data);
          }
        },
      });
  }

  // Add to itinerary
  addToItinerary(attraction: Attraction): void {
    this.tripState.addAttraction({ ...attraction, addedToItinerary: true });
    const defaultDate = this.tripState.trip().dates.start || new Date().toISOString().split('T')[0];
    this.tripState.addItineraryItem({
      id: crypto.randomUUID(),
      type: 'attraction',
      refId: attraction.id,
      date: defaultDate,
      timeSlot: null,
      label: `Attraction: ${attraction.name}`,
      notes: attraction.category || '',
      order: 0,
    });
    this.snackBar.open('Attraction added to itinerary', 'Close', {
      duration: 3000,
    });
  }
}
