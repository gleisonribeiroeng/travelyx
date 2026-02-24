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
import { Stay } from '../../../core/models/trip.models';
import {
  categorizeHotels,
  CategorizedHotels,
} from '../../../core/utils/hotel-categorizer.util';

@Component({
  selector: 'app-wizard-hotel-step',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule],
  template: `
    <div class="wizard-step">
      <div class="step-header">
        <h2>Escolha seu hotel</h2>
        <p>Encontre a hospedagem perfeita para sua viagem</p>
      </div>

      @if (selectedHotels().length > 0) {
        <div class="current-selection">
          <h3>Hotéis selecionados</h3>
          @for (hotel of selectedHotels(); track hotel.id) {
            <mat-card class="selected-card">
              <mat-card-content>
                <div class="selected-info">
                  @if (hotel.photoUrl) {
                    <img [src]="hotel.photoUrl" class="selected-thumb" alt="">
                  } @else {
                    <mat-icon>hotel</mat-icon>
                  }
                  <div class="selected-details">
                    <strong>{{ hotel.name }}</strong>
                    <span>{{ hotel.address }} &middot; {{ hotel.checkIn }} a {{ hotel.checkOut }}</span>
                  </div>
                  <span class="selected-price">{{ hotel.pricePerNight.currency }} {{ hotel.pricePerNight.total | number:'1.2-2' }}/noite</span>
                  <button mat-icon-button color="warn" (click)="remove(hotel.id)">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              </mat-card-content>
            </mat-card>
          }
        </div>
      }

      <mat-card class="search-form-card">
        <mat-card-content>
          <form [formGroup]="searchForm" (ngSubmit)="search()">
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Destino</mat-label>
                <input matInput [formControl]="destinationControl"
                       [matAutocomplete]="autoDest">
                <mat-icon matPrefix>location_on</mat-icon>
                <mat-autocomplete #autoDest="matAutocomplete"
                                  [displayWith]="displayDestination">
                  @for (option of filteredDestinations$ | async; track option.destId) {
                    <mat-option [value]="option">{{ option.label || option.name }}</mat-option>
                  }
                </mat-autocomplete>
              </mat-form-field>
            </div>

            <div class="form-row" formGroupName="dateRange">
              <mat-form-field appearance="outline">
                <mat-label>Check-in — Check-out</mat-label>
                <mat-date-range-input [rangePicker]="rangePicker" [min]="minDate">
                  <input matStartDate formControlName="start" placeholder="Check-in">
                  <input matEndDate formControlName="end" placeholder="Check-out">
                </mat-date-range-input>
                <mat-datepicker-toggle matIconSuffix [for]="rangePicker"></mat-datepicker-toggle>
                <mat-date-range-picker #rangePicker></mat-date-range-picker>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Hóspedes</mat-label>
                <input matInput type="number" formControlName="guests" min="1" max="30">
                <mat-icon matPrefix>person</mat-icon>
              </mat-form-field>
            </div>

            <button mat-flat-button color="primary" type="submit"
                    [disabled]="searchForm.invalid || isSearching()">
              @if (isSearching()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                <mat-icon>search</mat-icon>
                Buscar hotéis
              }
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      @if (isSearching()) {
        <div class="loading-state">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Buscando hotéis...</p>
        </div>
      }

      @if (!isSearching() && hasSearched() && results().length === 0) {
        <div class="empty-results">
          <mat-icon>search_off</mat-icon>
          <p>Nenhum hotel encontrado. Tente ajustar os filtros.</p>
        </div>
      }

      <!-- Categorized Results -->
      @if (results().length > 0) {
        <!-- Section 1: Recommended -->
        @if (categorized().bestValue; as best) {
          <div class="recommended-section">
            <h3>Recomendado para você</h3>
            <mat-card class="recommended-card" [class.added]="isAdded(best.id)"
                      (click)="openDetail(best)" role="button" tabindex="0">
              <div class="rec-layout">
                @if (best.photoUrl) {
                  <img [src]="best.photoUrl" class="rec-photo" alt="">
                }
                <div class="rec-content">
                  <div class="rec-badge">
                    <mat-icon>auto_awesome</mat-icon>
                    Melhor custo-benefício
                  </div>
                  <h4>{{ best.name }}</h4>
                  <p class="rec-address">{{ best.address }}</p>
                  <div class="rec-rating">
                    @if (best.rating) {
                      <mat-icon class="star-icon">star</mat-icon>
                      <span class="rating-num">{{ best.rating.toFixed(1) }}</span>
                    }
                    @if (best.reviewCount > 0) {
                      <span class="review-count">({{ best.reviewCount }} avaliações)</span>
                    }
                  </div>
                  <div class="rec-footer">
                    <div class="rec-price">
                      <span class="price-value">{{ best.pricePerNight.currency }} {{ best.pricePerNight.total | number:'1.2-2' }}</span>
                      <span class="price-label">/noite</span>
                    </div>
                    <div class="rec-actions">
                      @if (isAdded(best.id)) {
                        <button mat-stroked-button color="warn" (click)="openDetail(best); $event.stopPropagation()">
                          <mat-icon>check</mat-icon> Adicionado
                        </button>
                      } @else {
                        <button mat-flat-button color="primary" (click)="openDetail(best); $event.stopPropagation()">
                          Ver detalhes
                        </button>
                      }
                    </div>
                  </div>
                </div>
              </div>
            </mat-card>
          </div>
        }

        <!-- Section 2: Other options -->
        @if (otherHotels().length > 0) {
          <div class="results-grid">
            <h3>Outras opções ({{ otherHotels().length }})</h3>
            <div class="hotel-grid">
              @for (hotel of otherHotels(); track hotel.id) {
                <mat-card class="hotel-card" [class.added]="isAdded(hotel.id)"
                          (click)="openDetail(hotel)" role="button" tabindex="0">
                  <!-- Tags -->
                  @if (categorized().cheapest?.id === hotel.id || categorized().bestRated?.id === hotel.id) {
                    <div class="hotel-tags">
                      @if (categorized().cheapest?.id === hotel.id) {
                        <span class="htag htag-cheap">Melhor preço</span>
                      }
                      @if (categorized().bestRated?.id === hotel.id) {
                        <span class="htag htag-rated">Mais bem avaliado</span>
                      }
                    </div>
                  }
                  @if (hotel.photoUrl) {
                    <img [src]="hotel.photoUrl" class="hotel-photo" alt="">
                  }
                  <mat-card-content>
                    <h4>{{ hotel.name }}</h4>
                    <p class="hotel-address">{{ hotel.address }}</p>
                    <div class="hotel-rating">
                      @if (hotel.rating) {
                        <mat-icon>star</mat-icon>
                        <span>{{ hotel.rating.toFixed(1) }}</span>
                      }
                      @if (hotel.reviewCount > 0) {
                        <span class="review-count">({{ hotel.reviewCount }})</span>
                      }
                    </div>
                    <div class="hotel-price">
                      <span class="price-value">{{ hotel.pricePerNight.currency }} {{ hotel.pricePerNight.total | number:'1.2-2' }}</span>
                      <span class="price-label">/noite</span>
                    </div>
                    <div class="card-buttons">
                      @if (isAdded(hotel.id)) {
                        <button mat-stroked-button color="warn" class="full-width"
                                (click)="openDetail(hotel); $event.stopPropagation()">
                          <mat-icon>check</mat-icon> Adicionado
                        </button>
                      } @else {
                        <button mat-flat-button color="primary" class="full-width"
                                (click)="openDetail(hotel); $event.stopPropagation()">
                          Ver detalhes
                        </button>
                      }
                    </div>
                  </mat-card-content>
                </mat-card>
              }
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .wizard-step { display: flex; flex-direction: column; gap: var(--triply-spacing-md); }
    .step-header h2 { margin: 0 0 4px; font-size: 1.3rem; font-weight: 700; color: var(--triply-text-primary); letter-spacing: -0.02em; }
    .step-header p { margin: 0; font-size: 0.9rem; color: var(--triply-text-secondary); }

    .current-selection { display: flex; flex-direction: column; gap: 8px; }
    .current-selection h3 { margin: 0; font-size: 0.95rem; font-weight: 600; color: var(--triply-text-primary); }
    .selected-card { border-left: 3px solid var(--triply-success) !important; box-shadow: var(--triply-shadow-sm); }
    .selected-info { display: flex; align-items: center; gap: 12px; }
    .selected-info mat-icon { color: var(--triply-success); font-size: 24px; }
    .selected-thumb { width: 48px; height: 48px; border-radius: 8px; object-fit: cover; }
    .selected-details { flex: 1; display: flex; flex-direction: column; }
    .selected-details strong { font-size: 0.9rem; color: var(--triply-text-primary); }
    .selected-details span { font-size: 0.8rem; color: var(--triply-text-secondary); }
    .selected-price { font-weight: 700; color: var(--triply-primary); font-size: 0.95rem; white-space: nowrap; }

    .search-form-card { margin-top: 8px; }
    .form-row { display: flex; flex-direction: column; gap: 0; margin-bottom: var(--triply-spacing-sm); }
    .form-row mat-form-field { flex: 1; }
    form button[type="submit"] { width: 100%; height: 44px; }

    .loading-state, .empty-results { text-align: center; padding: var(--triply-spacing-xl); }
    .loading-state p, .empty-results p { margin-top: 12px; color: var(--triply-text-secondary); }
    .empty-results mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--triply-text-secondary); opacity: 0.5; }

    /* Recommended section */
    .recommended-section h3 { margin: 0 0 var(--triply-spacing-sm); font-size: 1rem; font-weight: 700; color: var(--triply-text-primary); }
    .recommended-card {
      border-left: 4px solid var(--triply-primary) !important;
      background: linear-gradient(135deg, rgba(124, 77, 255, 0.03) 0%, var(--triply-surface-1) 60%) !important;
      transition: all 0.2s ease;
      box-shadow: var(--triply-shadow-sm);
    }
    .recommended-card { cursor: pointer; }
    .recommended-card:hover { box-shadow: 0 4px 16px rgba(124, 77, 255, 0.12); }
    .recommended-card.added { border-left-color: var(--triply-success) !important; opacity: 0.7; }

    .rec-layout { display: flex; flex-direction: column; gap: 16px; }
    .rec-photo { width: 100%; height: 180px; object-fit: cover; border-radius: 8px; flex-shrink: 0; }
    .rec-content { flex: 1; display: flex; flex-direction: column; gap: 6px; }

    .rec-badge {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
      color: var(--triply-primary);
    }
    .rec-badge mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .rec-content h4 { margin: 0; font-size: 1.1rem; font-weight: 700; color: var(--triply-text-primary); }
    .rec-address { margin: 0; font-size: 0.85rem; color: var(--triply-text-secondary); }

    .rec-rating { display: flex; align-items: center; gap: 4px; }
    .rec-rating .star-icon { font-size: 16px; width: 16px; height: 16px; color: var(--triply-cat-flight); }
    .rec-rating .rating-num { font-size: 0.9rem; font-weight: 600; color: var(--triply-text-primary); }
    .rec-rating .review-count { font-size: 0.8rem; color: var(--triply-text-secondary); }

    .rec-footer { display: flex; flex-direction: column; gap: 12px; align-items: stretch; margin-top: auto; }
    .rec-price .price-value { font-size: 1.2rem; font-weight: 700; color: var(--triply-primary); }
    .rec-price .price-label { font-size: 0.8rem; color: var(--triply-text-secondary); }
    .rec-actions { display: flex; flex-direction: column; gap: 8px; }
    .rec-actions a { text-decoration: none; }

    /* Other options */
    .results-grid h3 { margin: 0 0 var(--triply-spacing-md); font-size: 0.95rem; font-weight: 600; color: var(--triply-text-primary); }
    .hotel-grid { display: grid; grid-template-columns: 1fr; gap: var(--triply-spacing-md); }
    .hotel-card { overflow: hidden; transition: all 0.2s ease; cursor: pointer; }
    @media (hover: hover) { .hotel-card:hover { transform: translateY(-2px); box-shadow: var(--triply-shadow-md); } }
    .hotel-card.added { border: 2px solid var(--triply-success) !important; opacity: 0.7; }
    .hotel-photo { width: 100%; height: 160px; object-fit: cover; }
    .hotel-card h4 { margin: 8px 0 4px; font-size: 0.95rem; font-weight: 700; color: var(--triply-text-primary); }
    .hotel-address { font-size: 0.8rem; color: var(--triply-text-secondary); margin: 0 0 8px; }
    .hotel-rating { display: flex; align-items: center; gap: 4px; margin-bottom: 8px; }
    .hotel-rating mat-icon { font-size: 16px; width: 16px; height: 16px; color: var(--triply-cat-flight); }
    .hotel-rating span { font-size: 0.85rem; font-weight: 600; color: var(--triply-text-primary); }
    .hotel-rating .review-count { font-weight: 400; color: var(--triply-text-secondary); font-size: 0.8rem; }
    .hotel-price { margin-bottom: 12px; }
    .price-value { font-size: 1.1rem; font-weight: 700; color: var(--triply-primary); }
    .price-label { font-size: 0.8rem; color: var(--triply-text-secondary); }
    .full-width { width: 100%; }
    .card-buttons { display: flex; flex-direction: column; gap: 6px; }
    .detail-link { text-decoration: none; text-align: center; }

    /* Tags */
    .hotel-tags { display: flex; gap: 6px; padding: 8px 16px 0; }
    .htag {
      font-size: 0.65rem; font-weight: 600; padding: 2px 8px; border-radius: 10px;
      text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap;
    }
    .htag-cheap { background: rgba(16, 185, 129, 0.1); color: #059669; }
    .htag-rated { background: rgba(245, 158, 11, 0.1); color: #d97706; }
    .htag-value { background: rgba(124, 77, 255, 0.1); color: var(--triply-primary); }

    @media (min-width: 600px) {
      .form-row { flex-direction: row; gap: var(--triply-spacing-md); }
      .hotel-grid { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
      .rec-layout { flex-direction: row; }
      .rec-photo { width: 200px; height: 160px; }
      .rec-footer { flex-direction: row; align-items: center; justify-content: space-between; gap: 8px; }
      .rec-actions { flex-direction: row; }
    }
  `],
})
export class WizardHotelStepComponent {
  private readonly api = inject(HotelApiService);
  private readonly tripState = inject(TripStateService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  readonly selectedHotels = this.tripState.stays;
  readonly results = signal<Stay[]>([]);
  readonly isSearching = signal(false);
  readonly hasSearched = signal(false);
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

  filteredDestinations$: Observable<DestinationOption[]> = this.destinationControl.valueChanges.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    filter((v) => typeof v === 'string' && (v as string).length >= 2),
    switchMap((keyword) => this.api.searchDestinations(keyword as string)),
  );

  // Categorization
  readonly categorized = computed((): CategorizedHotels<Stay> =>
    categorizeHotels(this.results())
  );

  readonly otherHotels = computed(() => {
    const cat = this.categorized();
    if (!cat.bestValue) return cat.all;
    return cat.all.filter(h => h.id !== cat.bestValue!.id);
  });

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

  openDetail(hotel: Stay): void {
    const ref = this.dialog.open(ItemDetailDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { type: 'stay', item: hotel, isAdded: this.isAdded(hotel.id) } as ItemDetailData,
    });
    ref.afterClosed().subscribe((result: ItemDetailResult) => {
      if (!result) return;
      if (result.action === 'add') this.select(hotel);
      else if (result.action === 'remove') this.remove(hotel.id);
    });
  }

  search(): void {
    if (this.searchForm.invalid) return;
    const dest = this.searchForm.value.destination as DestinationOption;
    const checkIn = this.searchForm.value.dateRange?.start;
    const checkOut = this.searchForm.value.dateRange?.end;
    if (!dest || !checkIn || !checkOut) return;

    this.isSearching.set(true);
    this.hasSearched.set(true);

    this.api.searchHotels({
      destId: dest.destId,
      searchType: dest.searchType,
      checkIn: checkIn.toISOString().split('T')[0],
      checkOut: checkOut.toISOString().split('T')[0],
      adults: this.searchForm.value.guests ?? 2,
      rooms: 1,
    }).pipe(finalize(() => this.isSearching.set(false)))
      .subscribe({
        next: (result) => {
          this.results.set(result.data);
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
