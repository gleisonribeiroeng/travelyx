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
import { ListItemBaseComponent } from '../../../shared/components/list-item-base/list-item-base.component';
import { stayToListItem, HotelTagType } from '../../../shared/components/list-item-base/list-item-mappers';
import {
  ManualHotelDialogComponent,
  ManualHotelDialogData,
  ManualHotelDialogResult,
} from '../../../shared/components/manual-hotel-dialog/manual-hotel-dialog.component';

@Component({
  selector: 'app-wizard-hotel-step',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule, ListItemBaseComponent],
  template: `
    <div class="wizard-step">
      <div class="step-header">
        <h2>
          @if (tripDestination()) {
            Hotéis em {{ tripDestination() }}
          } @else {
            Escolha seu hotel
          }
        </h2>
        <p>
          @if (tripDates()) {
            Encontre a hospedagem ideal para {{ tripDates() }}
          } @else {
            Encontre a hospedagem perfeita para sua viagem
          }
        </p>
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
                  @if (hotel.source === 'manual') {
                    <span class="manual-badge">Manual</span>
                  }
                  <span class="selected-price">{{ hotel.pricePerNight.currency }} {{ hotel.pricePerNight.total | number:'1.2-2' }}/noite</span>
                  @if (hotel.source === 'manual') {
                    <button mat-icon-button (click)="openManualHotelDialog(hotel); $event.stopPropagation()">
                      <mat-icon>edit</mat-icon>
                    </button>
                  }
                  <button mat-icon-button color="warn" (click)="remove(hotel.id)">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              </mat-card-content>
            </mat-card>
          }
        </div>
      }

      @if (formCollapsed()) {
        <div class="search-toggle-bar" (click)="formCollapsed.set(false)">
          <div class="toggle-info">
            <mat-icon>hotel</mat-icon>
            <span>Busca de Hotéis</span>
          </div>
          <div class="toggle-action">
            <span>Editar busca</span>
            <mat-icon>expand_more</mat-icon>
          </div>
        </div>
      }

      <mat-card class="search-form-card" [class.collapsed]="formCollapsed()">
        <mat-card-content>
          <form [formGroup]="searchForm" (ngSubmit)="search()">
            <div class="form-row-inline">
              <mat-form-field appearance="outline" class="field-destination">
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

              <div formGroupName="dateRange">
                <mat-form-field appearance="outline" class="field-dates">
                  <mat-label>Check-in — Check-out</mat-label>
                  <mat-date-range-input [rangePicker]="rangePicker" [min]="minDate" (click)="rangePicker.open()">
                    <input matStartDate formControlName="start" placeholder="Check-in">
                    <input matEndDate formControlName="end" placeholder="Check-out">
                  </mat-date-range-input>
                  <mat-datepicker-toggle matIconSuffix [for]="rangePicker"></mat-datepicker-toggle>
                  <mat-date-range-picker #rangePicker></mat-date-range-picker>
                </mat-form-field>
              </div>

              <mat-form-field appearance="outline" class="field-guests">
                <mat-label>Hóspedes</mat-label>
                <input matInput type="number" formControlName="guests" min="1" max="30">
                <mat-icon matPrefix>person</mat-icon>
              </mat-form-field>
            </div>

            <button mat-flat-button color="primary" type="submit" class="search-cta-btn"
                    [disabled]="searchForm.invalid || isSearching()">
              @if (isSearching()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                <mat-icon>search</mat-icon>
                Buscar hotéis
              }
            </button>
          </form>

          <div class="manual-entry-section">
            <button mat-stroked-button (click)="openManualHotelDialog()">
              <mat-icon>edit_note</mat-icon>
              Adicionar hotel manualmente
            </button>
            <span class="manual-hint">Ja tem uma reserva? Insira os dados da hospedagem.</span>
          </div>
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

      @if (results().length > 0 && !isSearching()) {
        <div class="results-list">
          <h3>{{ results().length }} hotéis encontrados</h3>
          @for (hotel of sortedResults(); track hotel.id) {
            <app-list-item-base
              [config]="toListItem(hotel)"
              (primaryClick)="selectById($event)"
              (secondaryClick)="openDetailById($event)"
              (cardClick)="openDetailById($event)"
            />
          }
          @if (hasMore()) {
            <div class="load-more-container">
              <button mat-stroked-button class="load-more-btn" (click)="loadMore()" [disabled]="isLoadingMore()">
                @if (isLoadingMore()) {
                  <mat-spinner diameter="18"></mat-spinner>
                } @else {
                  <mat-icon>expand_more</mat-icon>
                }
                Carregar mais
              </button>
              <span class="load-more-count">{{ results().length }} hotéis carregados</span>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .wizard-step { display: flex; flex-direction: column; gap: var(--triply-spacing-sm, 8px); }
    .step-header { margin-bottom: 2px; }
    .step-header h2 { margin: 0 0 4px; font-size: 1.4rem; font-weight: 800; color: var(--triply-text-primary); letter-spacing: -0.02em; }
    .step-header p { margin: 0; font-size: 0.88rem; color: var(--triply-text-secondary); }

    .current-selection { display: flex; flex-direction: column; gap: 6px; }
    .current-selection h3 { margin: 0; font-size: 0.88rem; font-weight: 600; color: var(--triply-text-primary); }
    .selected-card { border-left: 3px solid var(--triply-success) !important; box-shadow: var(--triply-shadow-sm); }
    .selected-info { display: flex; align-items: center; gap: 10px; }
    .selected-info mat-icon { color: var(--triply-success); font-size: 22px; }
    .selected-thumb { width: 40px; height: 40px; border-radius: 6px; object-fit: cover; }
    .selected-details { flex: 1; display: flex; flex-direction: column; }
    .selected-details strong { font-size: 0.85rem; color: var(--triply-text-primary); }
    .selected-details span { font-size: 0.75rem; color: var(--triply-text-secondary); }
    .selected-price { font-weight: 700; color: var(--triply-primary); font-size: 0.88rem; white-space: nowrap; }

    .search-form-card { margin-top: 4px; margin-bottom: 8px !important; }

    .form-row-inline { display: flex; flex-direction: column; gap: 0; }
    .form-row-inline mat-form-field { width: 100%; }
    .field-guests { max-width: 140px; }

    form button[type="submit"] { width: 100%; height: 48px; font-size: 0.95rem !important; font-weight: 700 !important; border-radius: 12px !important; box-shadow: 0 2px 10px rgba(108, 92, 231, 0.25); display: inline-flex !important; align-items: center; justify-content: center; gap: 8px; }
    form button[type="submit"] mat-icon { font-size: 20px; width: 20px; height: 20px; }
    form button[type="submit"]:not(:disabled):hover { box-shadow: 0 4px 16px rgba(108, 92, 231, 0.35); transform: translateY(-1px); }

    .loading-state, .empty-results { display: flex; flex-direction: column; align-items: center; text-align: center; padding: var(--triply-spacing-lg); }
    .loading-state p, .empty-results p { margin-top: 12px; color: var(--triply-text-secondary); }
    .empty-results mat-icon { font-size: 40px; width: 40px; height: 40px; color: var(--triply-text-secondary); opacity: 0.5; }

    .results-list { display: flex; flex-direction: column; gap: 6px; }
    .results-list h3 { margin: 0 0 4px; font-size: 0.85rem; font-weight: 600; color: var(--triply-text-secondary); }

    /* Manual entry */
    .manual-entry-section {
      display: flex; align-items: center; gap: 8px;
      margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(0,0,0,0.06);
    }
    .manual-entry-section button { white-space: nowrap; font-size: 0.82rem; color: var(--triply-text-secondary) !important; border-color: var(--triply-border-subtle) !important; }
    .manual-hint {
      font-size: 0.75rem; color: var(--triply-text-tertiary, #999);
    }
    .manual-badge {
      font-size: 0.65rem; font-weight: 600; padding: 2px 8px;
      border-radius: 10px; background: rgba(124, 77, 255, 0.1);
      color: var(--triply-primary); text-transform: uppercase;
      letter-spacing: 0.3px; white-space: nowrap;
    }

    .load-more-container { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 0; }
    .load-more-btn { font-size: 0.82rem; }
    .load-more-count { font-size: 0.72rem; color: var(--triply-text-tertiary, #999); }

    @media (min-width: 600px) {
      .form-row-inline { flex-direction: row; gap: var(--triply-spacing-sm, 8px); align-items: flex-start; }
      .field-destination { flex: 2; }
      .field-dates { width: 100%; }
      .field-guests { max-width: 120px; }
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

  // Categorization
  readonly categorized = computed((): CategorizedHotels<Stay> =>
    categorizeHotels(this.results())
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

  getHotelTag(hotel: Stay): HotelTagType | null {
    const cat = this.categorized();
    if (cat.bestValue?.id === hotel.id) return 'bestValue';
    if (cat.cheapest?.id === hotel.id) return 'cheapest';
    if (cat.bestRated?.id === hotel.id) return 'bestRated';
    return null;
  }

  toListItem(hotel: Stay) {
    return stayToListItem(hotel, {
      isAdded: this.isAdded(hotel.id),
      tag: this.getHotelTag(hotel),
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
    this.formCollapsed.set(true);
    this.currentPage = 1;

    const params = {
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
