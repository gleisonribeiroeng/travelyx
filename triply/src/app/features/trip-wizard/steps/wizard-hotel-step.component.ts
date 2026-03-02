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
        <h2>Escolha seu hotel</h2>
        <p>Encontre a hospedagem perfeita para sua viagem</p>
      </div>

      <!-- Manual entry -->
      <div class="manual-entry-section">
        <button mat-stroked-button (click)="openManualHotelDialog()">
          <mat-icon>edit_note</mat-icon>
          Adicionar hotel manualmente
        </button>
        <span class="manual-hint">Ja tem uma reserva? Insira os dados da hospedagem.</span>
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
                <mat-date-range-input [rangePicker]="rangePicker" [min]="minDate" (click)="rangePicker.open()">
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
        </div>
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

    .results-list { display: flex; flex-direction: column; gap: var(--triply-spacing-sm); }
    .results-list h3 { margin: 0 0 var(--triply-spacing-sm); font-size: 0.95rem; font-weight: 600; color: var(--triply-text-primary); }

    /* Manual entry */
    .manual-entry-section {
      display: flex; flex-direction: column; align-items: flex-start; gap: 4px;
    }
    .manual-hint {
      font-size: 0.8rem; color: var(--triply-text-secondary);
    }
    .manual-badge {
      font-size: 0.65rem; font-weight: 600; padding: 2px 8px;
      border-radius: 10px; background: rgba(124, 77, 255, 0.1);
      color: var(--triply-primary); text-transform: uppercase;
      letter-spacing: 0.3px; white-space: nowrap;
    }

    @media (min-width: 600px) {
      .form-row { flex-direction: row; gap: var(--triply-spacing-md); }
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
    const dates = this.tripState.trip().dates;
    if (dates.start && dates.end) {
      this.searchForm.get('dateRange')!.patchValue({
        start: new Date(dates.start + 'T00:00:00'),
        end: new Date(dates.end + 'T00:00:00'),
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

  // Sorted results: bestValue first, then rest
  readonly sortedResults = computed(() => {
    const cat = this.categorized();
    const all = cat.all;
    if (!cat.bestValue) return all;
    return [cat.bestValue, ...all.filter(h => h.id !== cat.bestValue!.id)];
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
