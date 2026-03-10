import { Component, signal, computed, inject, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  FormArray,
  Validators,
  ValidatorFn,
  AbstractControl,
  ValidationErrors,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from '../../../core/services/notification.service';
import { ItemDetailDialogComponent, ItemDetailData, ItemDetailResult } from '../../../shared/components/item-detail-dialog/item-detail-dialog.component';
import { Observable, of, forkJoin, Subscription } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  switchMap,
  finalize,
  map,
} from 'rxjs/operators';
import { MATERIAL_IMPORTS } from '../../../core/material.exports';
import {
  FlightApiService,
  AirportOption,
} from '../../../core/api/flight-api.service';
import { TripStateService } from '../../../core/services/trip-state.service';
import { Flight } from '../../../core/models/trip.models';
import {
  categorizeFlights,
  CategorizedFlights,
} from '../../../core/utils/flight-categorizer.util';
import { ListItemBaseComponent } from '../../../shared/components/list-item-base/list-item-base.component';
import { flightToListItem, FlightTagType } from '../../../shared/components/list-item-base/list-item-mappers';
import {
  ManualFlightDialogComponent,
  ManualFlightDialogData,
  ManualFlightDialogResult,
} from '../../../shared/components/manual-flight-dialog/manual-flight-dialog.component';

type TripType = 'roundTrip' | 'oneWay' | 'multi';

interface MonthOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-wizard-flight-step',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule, ListItemBaseComponent],
  template: `
    <div class="wizard-step">
      <div class="step-header">
        <h2>Escolha seu voo</h2>
        <p>Busque e selecione o voo ideal para sua viagem</p>
      </div>

      <!-- Manual entry -->
      <div class="manual-entry-section">
        <button mat-stroked-button (click)="openManualFlightDialog()">
          <mat-icon>edit_note</mat-icon>
          Adicionar voo manualmente
        </button>
        <span class="manual-hint">Ja tem uma reserva? Insira os dados do voo.</span>
      </div>

      <!-- Current selection -->
      @if (selectedFlights().length > 0) {
        <div class="current-selection">
          <h3>Voos selecionados</h3>
          @for (flight of selectedFlights(); track flight.id) {
            <mat-card class="selected-card">
              <mat-card-content>
                <div class="selected-info">
                  <mat-icon>flight</mat-icon>
                  <div class="selected-details">
                    <strong>
                      @if (outboundFlightId() === flight.id) { <span class="leg-badge ida">IDA</span> }
                      @if (returnFlightId() === flight.id) { <span class="leg-badge volta">VOLTA</span> }
                      {{ flight.origin }} &rarr; {{ flight.destination }}
                    </strong>
                    <span>{{ flight.airline }} {{ flight.flightNumber }} &middot; {{ formatDuration(flight.durationMinutes) }}</span>
                  </div>
                  @if (flight.source === 'manual') {
                    <span class="manual-badge">Manual</span>
                  }
                  <span class="selected-price">{{ flight.price.currency }} {{ flight.price.total | number:'1.2-2' }}</span>
                  @if (flight.source === 'manual') {
                    <button mat-icon-button (click)="openManualFlightDialog(flight); $event.stopPropagation()">
                      <mat-icon>edit</mat-icon>
                    </button>
                  }
                  <button mat-icon-button color="warn" (click)="remove(flight.id)">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              </mat-card-content>
            </mat-card>
          }
        </div>
      }

      <!-- Search toggle bar (collapsed) -->
      @if (formCollapsed()) {
        <div class="search-toggle-bar" (click)="formCollapsed.set(false)">
          <div class="toggle-info">
            <mat-icon>flight</mat-icon>
            <span>Busca de Voos</span>
          </div>
          <div class="toggle-action">
            <span>Editar busca</span>
            <mat-icon>expand_more</mat-icon>
          </div>
        </div>
      }

      <!-- Search form -->
      <mat-card class="search-form-card" [class.collapsed]="formCollapsed()">
        <mat-card-content>
          <form [formGroup]="searchForm" (ngSubmit)="search()">
            <!-- Trip type toggle -->
            <div class="trip-type-row">
              <mat-button-toggle-group [value]="tripType()" (change)="onTripTypeChange($event.value)" class="trip-type-toggle">
                <mat-button-toggle value="roundTrip">
                  <mat-icon>sync_alt</mat-icon> Ida e volta
                </mat-button-toggle>
                <mat-button-toggle value="oneWay">
                  <mat-icon>arrow_forward</mat-icon> Só ida
                </mat-button-toggle>
                <mat-button-toggle value="multi">
                  <mat-icon>account_tree</mat-icon> Multi
                </mat-button-toggle>
              </mat-button-toggle-group>
            </div>

            <!-- Origin / Destination (non-multi) -->
            @if (tripType() !== 'multi') {
              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>Origem</mat-label>
                  <input matInput [formControl]="originControl"
                         [matAutocomplete]="autoOrigin">
                  <mat-icon matPrefix>flight_takeoff</mat-icon>
                  <mat-autocomplete #autoOrigin="matAutocomplete"
                                    [displayWith]="displayAirport">
                    @for (option of filteredOrigins$ | async; track option.iataCode) {
                      <mat-option [value]="option">
                        {{ option.cityName }} — {{ option.name }} ({{ option.iataCode }})
                      </mat-option>
                    }
                  </mat-autocomplete>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Destino</mat-label>
                  <input matInput [formControl]="destinationControl"
                         [matAutocomplete]="autoDest">
                  <mat-icon matPrefix>flight_land</mat-icon>
                  <mat-autocomplete #autoDest="matAutocomplete"
                                    [displayWith]="displayAirport">
                    @for (option of filteredDestinations$ | async; track option.iataCode) {
                      <mat-option [value]="option">
                        {{ option.cityName }} — {{ option.name }} ({{ option.iataCode }})
                      </mat-option>
                    }
                  </mat-autocomplete>
                </mat-form-field>
              </div>

              <!-- Flexible dates toggle -->
              <div class="flexible-row">
                <mat-slide-toggle [checked]="flexibleDates()" (change)="flexibleDates.set($event.checked)">
                  Ainda não defini a data
                </mat-slide-toggle>
              </div>

              <!-- Date fields (fixed dates) -->
              @if (!flexibleDates()) {
                <div class="form-row" formGroupName="dateRange">
                  @if (tripType() === 'roundTrip') {
                    <mat-form-field appearance="outline">
                      <mat-label>Ida — Volta</mat-label>
                      <mat-date-range-input [rangePicker]="rangePicker" [min]="minDate" (click)="rangePicker.open()">
                        <input matStartDate formControlName="start" placeholder="Ida">
                        <input matEndDate formControlName="end" placeholder="Volta">
                      </mat-date-range-input>
                      <mat-datepicker-toggle matIconSuffix [for]="rangePicker"></mat-datepicker-toggle>
                      <mat-date-range-picker #rangePicker></mat-date-range-picker>
                    </mat-form-field>
                  } @else {
                    <mat-form-field appearance="outline">
                      <mat-label>Data de ida</mat-label>
                      <input matInput [matDatepicker]="dpDeparture"
                             formControlName="start"
                             [min]="minDate"
                             (focus)="dpDeparture.open()">
                      <mat-datepicker-toggle matSuffix [for]="dpDeparture"></mat-datepicker-toggle>
                      <mat-datepicker #dpDeparture></mat-datepicker>
                    </mat-form-field>
                  }
                </div>
              }

              <!-- Month grid (flexible dates) -->
              @if (flexibleDates()) {
                <div class="month-grid">
                  @for (month of availableMonths; track month.value) {
                    <mat-checkbox [checked]="isMonthSelected(month.value)"
                                  (change)="toggleMonth(month.value)">
                      {{ month.label }}
                    </mat-checkbox>
                  }
                </div>
              }
            }

            <!-- Multi-city segments -->
            @if (tripType() === 'multi') {
              <div class="multi-segments">
                @for (segment of segmentsArray.controls; track $index; let i = $index) {
                  <div class="segment-card">
                    <div class="segment-header">
                      <span class="seg-label">Trecho {{ i + 1 }}</span>
                      @if (segmentsArray.length > MIN_SEGMENTS) {
                        <button mat-icon-button type="button" (click)="removeSegment(i)">
                          <mat-icon>close</mat-icon>
                        </button>
                      }
                    </div>
                    <div class="form-row">
                      <mat-form-field appearance="outline">
                        <mat-label>Origem</mat-label>
                        <input matInput [formControl]="getSegmentControl(i, 'origin')" [matAutocomplete]="segAutoOrigin">
                        <mat-icon matPrefix>flight_takeoff</mat-icon>
                        <mat-autocomplete #segAutoOrigin="matAutocomplete" [displayWith]="displayAirport">
                          @for (opt of (segmentOriginStreams()[i] | async); track opt.iataCode) {
                            <mat-option [value]="opt">{{ opt.cityName }} — {{ opt.name }} ({{ opt.iataCode }})</mat-option>
                          }
                        </mat-autocomplete>
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>Destino</mat-label>
                        <input matInput [formControl]="getSegmentControl(i, 'destination')" [matAutocomplete]="segAutoDest">
                        <mat-icon matPrefix>flight_land</mat-icon>
                        <mat-autocomplete #segAutoDest="matAutocomplete" [displayWith]="displayAirport">
                          @for (opt of (segmentDestinationStreams()[i] | async); track opt.iataCode) {
                            <mat-option [value]="opt">{{ opt.cityName }} — {{ opt.name }} ({{ opt.iataCode }})</mat-option>
                          }
                        </mat-autocomplete>
                      </mat-form-field>
                    </div>
                    <mat-form-field appearance="outline" style="width:100%">
                      <mat-label>Data</mat-label>
                      <input matInput [matDatepicker]="segDp" [formControl]="getSegmentControl(i, 'date')" [min]="getMinDateForSegment(i)" (focus)="segDp.open()">
                      <mat-datepicker-toggle matSuffix [for]="segDp"></mat-datepicker-toggle>
                      <mat-datepicker #segDp></mat-datepicker>
                    </mat-form-field>
                    @if (segmentHasSameAirports(i)) {
                      <p class="seg-error">Origem e destino não podem ser iguais</p>
                    }
                  </div>
                }
                @if (segmentsArray.length < MAX_SEGMENTS) {
                  <button mat-stroked-button type="button" class="add-segment-btn" (click)="addSegment()">
                    <mat-icon>add</mat-icon> Adicionar trecho
                  </button>
                }
              </div>
            }

            <!-- Passengers -->
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Passageiros</mat-label>
                <input matInput type="number" formControlName="passengers" min="1" max="9">
                <mat-icon matPrefix>person</mat-icon>
              </mat-form-field>
            </div>

            <button mat-flat-button color="primary" type="submit"
                    [disabled]="!canSearch() || isSearching()">
              @if (isSearching()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                <mat-icon>search</mat-icon>
                Buscar voos
              }
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Segment indicator for round-trip -->
      @if (isRoundTrip() && hasSearched()) {
        <div class="segment-indicator">
          <div class="segment-tabs">
            <button class="seg-tab" [class.active]="currentSegment() === 'outbound'"
                    [class.done]="hasOutbound()"
                    (click)="switchSegment('outbound')">
              <mat-icon>flight_takeoff</mat-icon>
              <span>IDA</span>
              @if (hasOutbound()) { <mat-icon class="check">check_circle</mat-icon> }
            </button>
            <div class="seg-connector"></div>
            <button class="seg-tab" [class.active]="currentSegment() === 'return'"
                    [class.done]="hasReturn()"
                    (click)="switchSegment('return')">
              <mat-icon>flight_land</mat-icon>
              <span>VOLTA</span>
              @if (hasReturn()) { <mat-icon class="check">check_circle</mat-icon> }
            </button>
          </div>
          <p class="segment-hint">Selecionando: {{ segmentLabel() }}</p>
        </div>
      }

      <!-- Results -->
      @if (isSearching()) {
        <div class="loading-state">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Buscando voos...</p>
        </div>
      }

      @if (!isSearching() && hasSearched() && results().length === 0) {
        <div class="empty-results">
          <mat-icon>search_off</mat-icon>
          <p>Nenhum voo encontrado. Tente ajustar os filtros.</p>
        </div>
      }

      @if (results().length > 0 && !isSearching()) {
        <div class="results-list">
          <h3>{{ results().length }} voos encontrados</h3>
          @for (flight of sortedResults(); track flight.id) {
            <app-list-item-base
              [config]="toListItem(flight)"
              (primaryClick)="selectById($event)"
              (secondaryClick)="openDetailById($event)"
              (cardClick)="openDetailById($event)"
            />
          }
        </div>
      }

      <!-- Multi-city results -->
      @if (tripType() === 'multi' && multiCityHasResults() && !isSearching()) {
        @for (segResults of multiCityResults(); track $index; let si = $index) {
          <div class="multi-segment-results">
            <h3>Trecho {{ si + 1 }}</h3>
            @if (segResults.length === 0) {
              <p class="no-results-seg">Nenhum voo encontrado para este trecho.</p>
            }
            @for (flight of segResults; track flight.id) {
              <app-list-item-base
                [config]="toListItemForSegment(flight, si)"
                (primaryClick)="selectSegmentById($event, si)"
                (secondaryClick)="openDetailById($event)"
                (cardClick)="openDetailById($event)"
              />
            }
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
    .selected-card { border-left: 3px solid var(--triply-success) !important; }
    .selected-info { display: flex; align-items: center; gap: 12px; }
    .selected-info mat-icon { color: var(--triply-success); }
    .selected-details { flex: 1; display: flex; flex-direction: column; }
    .selected-details strong { font-size: 0.9rem; color: var(--triply-text-primary); }
    .selected-details span { font-size: 0.8rem; color: var(--triply-text-secondary); }
    .selected-price { font-weight: 700; color: var(--triply-primary); font-size: 0.95rem; }

    .search-form-card { margin-top: 8px; }

    .trip-type-row { margin-bottom: var(--triply-spacing-md); }
    .trip-type-toggle { width: 100%; }
    .trip-type-toggle mat-button-toggle { flex: 1; }
    :host ::ng-deep .trip-type-toggle .mat-button-toggle-label-content {
      display: flex; align-items: center; gap: 6px; font-size: 0.85rem;
    }
    :host ::ng-deep .trip-type-toggle .mat-button-toggle-checked {
      background: rgba(124, 77, 255, 0.1); color: var(--triply-primary);
    }

    .flexible-row { margin-bottom: var(--triply-spacing-md); }

    .month-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-bottom: var(--triply-spacing-md);
      padding: 12px;
      background: rgba(124, 77, 255, 0.04);
      border-radius: 8px;
      border: 1px dashed rgba(124, 77, 255, 0.2);
    }

    .form-row { display: flex; flex-direction: column; gap: 0; margin-bottom: var(--triply-spacing-sm); }
    .form-row mat-form-field { flex: 1; }
    form button[type="submit"] { width: 100%; height: 44px; }

    .loading-state, .empty-results { text-align: center; padding: var(--triply-spacing-xl); }
    .loading-state p, .empty-results p { margin-top: 12px; color: var(--triply-text-secondary); }
    .empty-results mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--triply-text-secondary); opacity: 0.5; }

    .results-list { display: flex; flex-direction: column; gap: var(--triply-spacing-sm); }
    .results-list h3 { margin: 0 0 var(--triply-spacing-sm); font-size: 0.95rem; font-weight: 600; color: var(--triply-text-primary); }

    /* Segment indicator */
    .segment-indicator {
      text-align: center;
      margin-bottom: var(--triply-spacing-md);
    }
    .segment-tabs {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--triply-surface-1);
      border-radius: var(--triply-border-radius-lg, 12px);
      padding: 6px 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
    .seg-tab {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border: none;
      border-radius: var(--triply-border-radius-md, 8px);
      background: transparent;
      cursor: pointer;
      font-family: inherit;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--triply-text-secondary);
      transition: all 0.2s ease;
    }
    .seg-tab.active { background: rgba(124, 77, 255, 0.08); color: var(--triply-primary); }
    .seg-tab.done { color: var(--triply-success); }
    .seg-tab .check { font-size: 16px; width: 16px; height: 16px; color: var(--triply-success); }
    .seg-connector {
      width: 24px;
      height: 2px;
      background: var(--triply-border);
    }
    .segment-hint {
      margin: 8px 0 0;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--triply-primary);
    }

    /* Leg badges */
    .leg-badge {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-right: 6px;
    }
    .leg-badge.ida { background: rgba(124, 77, 255, 0.1); color: var(--triply-primary); }
    .leg-badge.volta { background: rgba(16, 185, 129, 0.1); color: #059669; }

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

    /* Multi-city */
    .multi-segments { display: flex; flex-direction: column; gap: var(--triply-spacing-md); margin-bottom: var(--triply-spacing-md); }
    .segment-card { padding: 12px; background: var(--triply-surface-1); border-radius: 8px; border: 1px solid var(--triply-border); }
    .segment-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .seg-label { font-size: 0.85rem; font-weight: 600; color: var(--triply-primary); }
    .seg-error { font-size: 0.75rem; color: #f44336; margin: 4px 0 0; }
    .add-segment-btn { width: 100%; }
    .multi-segment-results { display: flex; flex-direction: column; gap: var(--triply-spacing-sm); }
    .multi-segment-results h3 { margin: 0 0 var(--triply-spacing-sm); font-size: 0.9rem; font-weight: 700; color: var(--triply-text-primary); padding: 10px 0 8px; border-bottom: 1px solid var(--triply-border); }
    .no-results-seg { color: var(--triply-text-secondary); font-size: 0.85rem; text-align: center; padding: 8px; margin: 0; }

    @media (min-width: 600px) {
      .form-row { flex-direction: row; gap: var(--triply-spacing-md); }
      .month-grid { grid-template-columns: repeat(3, 1fr); }
    }
  `],
})
export class WizardFlightStepComponent {
  private readonly api = inject(FlightApiService);
  private readonly tripState = inject(TripStateService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  readonly selectedFlights = this.tripState.flights;
  readonly results = signal<Flight[]>([]);
  readonly isSearching = signal(false);
  readonly hasSearched = signal(false);
  readonly formCollapsed = signal(false);
  readonly minDate = new Date();

  readonly tripType = signal<TripType>('roundTrip');
  readonly flexibleDates = signal(false);
  readonly selectedMonths = signal<string[]>([]);

  // Segment tracking for round-trip flights
  readonly currentSegment = signal<'outbound' | 'return'>('outbound');
  readonly outboundFlightId = signal<string | null>(null);
  readonly returnFlightId = signal<string | null>(null);

  readonly segmentLabel = computed(() =>
    this.currentSegment() === 'outbound' ? 'Voo de IDA' : 'Voo de VOLTA'
  );
  readonly isRoundTrip = computed(() => this.tripType() === 'roundTrip');
  readonly hasOutbound = computed(() => this.outboundFlightId() !== null);
  readonly hasReturn = computed(() => this.returnFlightId() !== null);

  readonly categorized = computed((): CategorizedFlights<Flight> => categorizeFlights(this.results()));
  readonly sortedResults = computed(() => {
    const cat = this.categorized();
    const all = cat.all;
    if (!cat.bestValue) return all;
    return [cat.bestValue, ...all.filter(f => f.id !== cat.bestValue!.id)];
  });

  readonly availableMonths: MonthOption[] = this.buildAvailableMonths();

  // ── Multi-city state ──
  readonly MIN_SEGMENTS = 2;
  readonly MAX_SEGMENTS = 6;
  segmentsArray = new FormArray<FormGroup>([]);
  segmentOriginStreams = signal<Observable<AirportOption[]>[]>([]);
  segmentDestinationStreams = signal<Observable<AirportOption[]>[]>([]);
  multiCityResults = signal<Flight[][]>([]);
  private smartFillSubs: Subscription[] = [];

  multiCityHasResults = computed(() => this.multiCityResults().some(s => s.length > 0));

  originControl = new FormControl<AirportOption | null>(null, [
    Validators.required,
    this.airportValidator(),
  ]);
  destinationControl = new FormControl<AirportOption | null>(null, [
    Validators.required,
    this.airportValidator(),
  ]);

  searchForm = new FormGroup({
    origin: this.originControl,
    destination: this.destinationControl,
    dateRange: new FormGroup({
      start: new FormControl<Date | null>(null),
      end: new FormControl<Date | null>(null),
    }),
    passengers: new FormControl(1, [Validators.required, Validators.min(1), Validators.max(9)]),
  });

  filteredOrigins$: Observable<AirportOption[]> = this.originControl.valueChanges.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    filter((v) => typeof v === 'string' && (v as string).length >= 2),
    switchMap((keyword) => this.api.searchAirports(keyword as string)),
  );

  filteredDestinations$: Observable<AirportOption[]> = this.destinationControl.valueChanges.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    filter((v) => typeof v === 'string' && (v as string).length >= 2),
    switchMap((keyword) => this.api.searchAirports(keyword as string)),
  );

  constructor() {
    // Pre-fill dates from trip
    const dates = this.tripState.trip().dates;
    if (dates.start && dates.end) {
      this.searchForm.get('dateRange')!.patchValue({
        start: new Date(dates.start + 'T00:00:00'),
        end: new Date(dates.end + 'T00:00:00'),
      });
    }

    // Reset segment state when tripType changes
    effect(() => {
      this.tripType();
      untracked(() => {
        this.currentSegment.set('outbound');
        this.outboundFlightId.set(null);
        this.returnFlightId.set(null);
      });
    });
  }

  onTripTypeChange(value: string): void {
    this.tripType.set(value as TripType);
    if (value === 'multi') {
      this.initMultiSegments();
      this.flexibleDates.set(false);
    } else {
      this.segmentsArray.clear();
      this.multiCityResults.set([]);
      this.smartFillSubs.forEach(s => s.unsubscribe());
      this.smartFillSubs = [];
    }
  }

  private createSegmentGroup(): FormGroup {
    return new FormGroup({
      origin: new FormControl<AirportOption | null>(null, [Validators.required, this.airportValidator()]),
      destination: new FormControl<AirportOption | null>(null, [Validators.required, this.airportValidator()]),
      date: new FormControl<Date | null>(null, Validators.required),
    });
  }

  initMultiSegments(): void {
    this.segmentsArray.clear();
    for (let i = 0; i < this.MIN_SEGMENTS; i++) {
      this.segmentsArray.push(this.createSegmentGroup());
    }
    this.rebuildSegmentAutocomplete();
    this.multiCityResults.set([]);
  }

  addSegment(): void {
    if (this.segmentsArray.length >= this.MAX_SEGMENTS) return;
    const newGroup = this.createSegmentGroup();
    const prevIndex = this.segmentsArray.length - 1;
    if (prevIndex >= 0) {
      const prevDest = this.segmentsArray.at(prevIndex).get('destination')?.value;
      if (prevDest && typeof prevDest === 'object' && prevDest.iataCode) {
        newGroup.get('origin')?.setValue(prevDest);
      }
    }
    this.segmentsArray.push(newGroup);
    this.rebuildSegmentAutocomplete();
  }

  removeSegment(index: number): void {
    if (this.segmentsArray.length <= this.MIN_SEGMENTS) return;
    this.segmentsArray.removeAt(index);
    this.rebuildSegmentAutocomplete();
  }

  private rebuildSegmentAutocomplete(): void {
    this.smartFillSubs.forEach(s => s.unsubscribe());
    this.smartFillSubs = [];
    const originStreams: Observable<AirportOption[]>[] = [];
    const destStreams: Observable<AirportOption[]>[] = [];
    for (let i = 0; i < this.segmentsArray.length; i++) {
      const group = this.segmentsArray.at(i);
      const originCtrl = group.get('origin') as FormControl;
      const destCtrl = group.get('destination') as FormControl;
      originStreams.push(originCtrl.valueChanges.pipe(
        debounceTime(300), distinctUntilChanged(),
        filter((v) => typeof v === 'string' && (v as string).length >= 2),
        switchMap((keyword) => this.api.searchAirports(keyword as string))
      ));
      destStreams.push(destCtrl.valueChanges.pipe(
        debounceTime(300), distinctUntilChanged(),
        filter((v) => typeof v === 'string' && (v as string).length >= 2),
        switchMap((keyword) => this.api.searchAirports(keyword as string))
      ));
      if (i < this.segmentsArray.length - 1) {
        const nextOriginCtrl = this.segmentsArray.at(i + 1).get('origin') as FormControl;
        this.smartFillSubs.push(
          destCtrl.valueChanges.pipe(
            filter(val => val && typeof val === 'object' && val.iataCode),
          ).subscribe(val => {
            if (!nextOriginCtrl.value || !nextOriginCtrl.value.iataCode) {
              nextOriginCtrl.setValue(val);
            }
          })
        );
      }
    }
    this.segmentOriginStreams.set(originStreams);
    this.segmentDestinationStreams.set(destStreams);
  }

  getMinDateForSegment(index: number): Date {
    if (index === 0) return new Date();
    const prevDate = this.segmentsArray.at(index - 1)?.get('date')?.value;
    return prevDate instanceof Date ? prevDate : new Date();
  }

  segmentHasSameAirports(index: number): boolean {
    const group = this.segmentsArray.at(index);
    const origin = group.get('origin')?.value;
    const dest = group.get('destination')?.value;
    if (!origin || !dest) return false;
    if (typeof origin === 'string' || typeof dest === 'string') return false;
    return origin.iataCode === dest.iataCode;
  }

  getSegmentControl(index: number, field: string): FormControl {
    return this.segmentsArray.at(index).get(field) as FormControl;
  }

  private canSearchMulti(): boolean {
    const passengersValid = this.searchForm.get('passengers')?.valid ?? false;
    if (!passengersValid) return false;
    if (this.segmentsArray.length < this.MIN_SEGMENTS) return false;
    for (let i = 0; i < this.segmentsArray.length; i++) {
      const group = this.segmentsArray.at(i);
      if (!group.valid) return false;
      if (this.segmentHasSameAirports(i)) return false;
      if (i > 0) {
        const prevDate = this.segmentsArray.at(i - 1).get('date')?.value;
        const currDate = group.get('date')?.value;
        if (prevDate && currDate && currDate < prevDate) return false;
      }
    }
    return true;
  }

  private searchMultiCity(): void {
    const passengers = this.searchForm.value.passengers ?? 1;
    this.isSearching.set(true);
    this.hasSearched.set(true);
    this.formCollapsed.set(true);
    this.results.set([]);
    this.multiCityResults.set([]);
    const segmentSearches = [];
    for (let i = 0; i < this.segmentsArray.length; i++) {
      const group = this.segmentsArray.at(i);
      const origin = group.get('origin')?.value as AirportOption;
      const dest = group.get('destination')?.value as AirportOption;
      const date = group.get('date')?.value as Date;
      segmentSearches.push(
        this.api.searchFlights({
          origin: origin.iataCode,
          destination: dest.iataCode,
          fromId: origin.id || `${origin.iataCode}.AIRPORT`,
          toId: dest.id || `${dest.iataCode}.AIRPORT`,
          departureDate: date.toISOString().split('T')[0],
          adults: passengers,
        })
      );
    }
    forkJoin(segmentSearches)
      .pipe(finalize(() => this.isSearching.set(false)))
      .subscribe({
        next: (results) => {
          this.multiCityResults.set(results.map(r => r.data ?? []));
        },
      });
  }

  addSegmentFlight(flight: Flight, segmentIndex: number): void {
    this.tripState.addFlight(flight);
    this.tripState.addItineraryItem({
      id: crypto.randomUUID(),
      type: 'flight',
      refId: flight.id,
      date: flight.departureAt.split('T')[0],
      timeSlot: flight.departureAt.split('T')[1]?.substring(0, 5) || null,
      durationMinutes: flight.durationMinutes,
      label: `Voo Trecho ${segmentIndex + 1}: ${flight.origin} \u2192 ${flight.destination}`,
      notes: `${flight.airline} ${flight.flightNumber}`,
      order: segmentIndex,
      isPaid: false,
      attachment: null,
    });
    this.notify.success(`Trecho ${segmentIndex + 1} adicionado!`);
  }

  selectSegmentById(id: string, segmentIndex: number): void {
    const flight = this.multiCityResults()[segmentIndex]?.find(f => f.id === id);
    if (flight) this.addSegmentFlight(flight, segmentIndex);
  }

  toListItemForSegment(flight: Flight, segmentIndex: number) {
    return flightToListItem(flight, { isAdded: this.isAdded(flight.id), tag: null });
  }

  private airportValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      if (typeof control.value === 'string' || !(control.value as AirportOption).iataCode) {
        return { invalidAirport: true };
      }
      return null;
    };
  }

  displayAirport(airport: AirportOption | null): string {
    return airport ? `${airport.cityName} (${airport.iataCode})` : '';
  }

  canSearch(): boolean {
    if (this.tripType() === 'multi') return this.canSearchMulti();
    const hasAirports = this.originControl.valid && this.destinationControl.valid;
    const passengersValid = this.searchForm.get('passengers')?.valid ?? false;
    if (this.flexibleDates()) {
      return hasAirports && passengersValid && this.selectedMonths().length > 0;
    }
    return hasAirports && passengersValid && !!this.searchForm.get('dateRange')?.get('start')?.value;
  }

  isAdded(id: string): boolean {
    return this.selectedFlights().some((f) => f.id === id);
  }

  getFlightTag(flight: Flight): FlightTagType | null {
    const cat = this.categorized();
    if (cat.bestValue?.id === flight.id) return 'bestValue';
    if (cat.cheapest?.id === flight.id) return 'cheapest';
    if (cat.fastest?.id === flight.id) return 'fastest';
    return null;
  }

  toListItem(flight: Flight) {
    return flightToListItem(flight, {
      isAdded: this.isAdded(flight.id),
      tag: this.getFlightTag(flight),
    });
  }

  selectById(id: string): void {
    const flight = this.results().find(f => f.id === id);
    if (flight) this.select(flight);
  }

  openDetailById(id: string): void {
    const flight = this.results().find(f => f.id === id) ?? this.selectedFlights().find(f => f.id === id);
    if (flight) this.openDetail(flight);
  }

  isMonthSelected(value: string): boolean {
    return this.selectedMonths().includes(value);
  }

  toggleMonth(value: string): void {
    this.selectedMonths.update(months => {
      if (months.includes(value)) {
        return months.filter(m => m !== value);
      }
      return [...months, value];
    });
  }

  search(): void {
    if (!this.canSearch()) return;
    if (this.tripType() === 'multi') { this.searchMultiCity(); return; }

    const origin = this.originControl.value as AirportOption;
    const dest = this.destinationControl.value as AirportOption;
    const passengers = this.searchForm.value.passengers ?? 1;

    const effectiveOrigin = origin.iataCode;
    const effectiveDest = dest.iataCode;
    const fromId = origin.id || `${effectiveOrigin}.AIRPORT`;
    const toId = dest.id || `${effectiveDest}.AIRPORT`;

    this.isSearching.set(true);
    this.hasSearched.set(true);
    this.formCollapsed.set(true);

    if (this.flexibleDates()) {
      const searches = this.selectedMonths().map(monthStr => {
        const departureDate = `${monthStr}-01`;
        return this.api.searchFlights({
          origin: effectiveOrigin,
          destination: effectiveDest,
          fromId,
          toId,
          departureDate,
          adults: passengers,
        }).pipe(map(result => result.data));
      });

      forkJoin(searches)
        .pipe(finalize(() => this.isSearching.set(false)))
        .subscribe({
          next: (arrays) => {
            const allFlights = arrays.flat();
            const seen = new Set<string>();
            const unique = allFlights.filter(f => {
              if (seen.has(f.id)) return false;
              seen.add(f.id);
              return true;
            });
            this.results.set(unique);
          },
        });
    } else {
      const departure = this.searchForm.value.dateRange?.start;
      if (!departure) return;

      const params: any = {
        origin: effectiveOrigin,
        destination: effectiveDest,
        fromId,
        toId,
        departureDate: departure.toISOString().split('T')[0],
        adults: passengers,
      };

      if (this.tripType() === 'roundTrip' && this.searchForm.value.dateRange?.end) {
        params.returnDate = this.searchForm.value.dateRange.end.toISOString().split('T')[0];
      }

      this.api.searchFlights(params)
        .pipe(finalize(() => this.isSearching.set(false)))
        .subscribe({
          next: (result) => {
            this.results.set(result.data);
          },
        });
    }
  }

  openManualFlightDialog(existingFlight?: Flight): void {
    const ref = this.dialog.open(ManualFlightDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: {
        flight: existingFlight ?? null,
        tripCurrency: this.tripState.trip().currency,
      } as ManualFlightDialogData,
    });
    ref.afterClosed().subscribe((result: ManualFlightDialogResult | undefined) => {
      if (!result || result.action !== 'save') return;

      if (existingFlight) {
        // Edit mode
        this.tripState.updateFlight(result.flight);
        const itinItem = this.tripState.itineraryItems().find(i => i.refId === existingFlight.id);
        if (itinItem) {
          this.tripState.updateItineraryItem({
            ...itinItem,
            date: result.flight.departureAt.split('T')[0],
            timeSlot: result.flight.departureAt.split('T')[1]?.substring(0, 5) || null,
            label: `Voo: ${result.flight.origin} \u2192 ${result.flight.destination}`,
            notes: `${result.flight.airline} ${result.flight.flightNumber}`,
            isPaid: result.isPaid,
          });
        }
        this.notify.success('Voo atualizado!');
      } else {
        // Create mode
        this.tripState.addFlight(result.flight);
        this.tripState.addItineraryItem({
          id: crypto.randomUUID(),
          type: 'flight',
          refId: result.flight.id,
          date: result.flight.departureAt.split('T')[0],
          timeSlot: result.flight.departureAt.split('T')[1]?.substring(0, 5) || null,
          durationMinutes: result.flight.durationMinutes,
          label: `Voo: ${result.flight.origin} \u2192 ${result.flight.destination}`,
          notes: `${result.flight.airline} ${result.flight.flightNumber}`,
          order: 0,
          isPaid: result.isPaid,
          attachment: null,
        });
        this.notify.success('Voo manual adicionado!');
      }
    });
  }

  openDetail(flight: Flight): void {
    const ref = this.dialog.open(ItemDetailDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { type: 'flight', item: flight, isAdded: this.isAdded(flight.id) } as ItemDetailData,
    });
    ref.afterClosed().subscribe((result: ItemDetailResult) => {
      if (!result) return;
      if (result.action === 'add') this.select(flight);
      else if (result.action === 'remove') this.remove(flight.id);
    });
  }

  select(flight: Flight): void {
    this.tripState.addFlight(flight);

    const isReturn = this.isRoundTrip() && this.currentSegment() === 'return';
    const label = isReturn
      ? `Voo volta: ${flight.origin} \u2192 ${flight.destination}`
      : this.isRoundTrip()
        ? `Voo ida: ${flight.origin} \u2192 ${flight.destination}`
        : `Voo: ${flight.origin} \u2192 ${flight.destination}`;

    this.tripState.addItineraryItem({
      id: crypto.randomUUID(),
      type: 'flight',
      refId: flight.id,
      date: flight.departureAt.split('T')[0],
      timeSlot: flight.departureAt.split('T')[1]?.substring(0, 5) || null,
      durationMinutes: flight.durationMinutes,
      label,
      notes: `${flight.airline} ${flight.flightNumber}`,
      order: 0,
      isPaid: false,
      attachment: null,
    });

    if (this.isRoundTrip()) {
      if (this.currentSegment() === 'outbound') {
        this.outboundFlightId.set(flight.id);
        this.notify.success('Voo de ida selecionado!');
        this.currentSegment.set('return');
        this.searchReturnFlights();
      } else {
        this.returnFlightId.set(flight.id);
        this.notify.success('Voo de volta selecionado!');
      }
    } else {
      this.notify.success('Voo adicionado!');
    }
  }

  remove(id: string): void {
    this.tripState.removeFlight(id);
    this.tripState.removeItineraryItem(
      this.tripState.itineraryItems().find((i) => i.refId === id)?.id ?? ''
    );
    if (this.outboundFlightId() === id) this.outboundFlightId.set(null);
    if (this.returnFlightId() === id) this.returnFlightId.set(null);
  }

  switchSegment(seg: 'outbound' | 'return'): void {
    if (seg === this.currentSegment()) return;
    this.currentSegment.set(seg);
    if (seg === 'outbound') {
      this.search();
    } else {
      this.searchReturnFlights();
    }
  }

  private searchReturnFlights(): void {
    const origin = this.originControl.value as AirportOption;
    const dest = this.destinationControl.value as AirportOption;
    const returnDate = this.searchForm.value.dateRange?.end;
    if (!origin || !dest || !returnDate) return;

    this.isSearching.set(true);
    this.api.searchFlights({
      origin: dest.iataCode,
      destination: origin.iataCode,
      fromId: dest.id || `${dest.iataCode}.AIRPORT`,
      toId: origin.id || `${origin.iataCode}.AIRPORT`,
      departureDate: returnDate.toISOString().split('T')[0],
      adults: this.searchForm.value.passengers ?? 1,
    }).pipe(finalize(() => this.isSearching.set(false)))
      .subscribe({ next: (result) => this.results.set(result.data) });
  }

  formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  }

  formatTime(isoDate: string): string {
    const d = new Date(isoDate);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  private buildAvailableMonths(): MonthOption[] {
    const months: MonthOption[] = [];
    const now = new Date();
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      months.push({ value, label });
    }
    return months;
  }
}
