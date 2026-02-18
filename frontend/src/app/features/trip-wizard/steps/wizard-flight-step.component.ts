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
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, of, forkJoin } from 'rxjs';
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

type TripType = 'roundTrip' | 'oneWay' | 'returnOnly';

interface MonthOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-wizard-flight-step',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule],
  template: `
    <div class="wizard-step">
      <div class="step-header">
        <h2>Escolha seu voo</h2>
        <p>Busque e selecione o voo ideal para sua viagem</p>
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
                    <strong>{{ flight.origin }} &rarr; {{ flight.destination }}</strong>
                    <span>{{ flight.airline }} {{ flight.flightNumber }} &middot; {{ formatDuration(flight.durationMinutes) }}</span>
                  </div>
                  <span class="selected-price">{{ flight.price.currency }} {{ flight.price.total | number:'1.2-2' }}</span>
                  <button mat-icon-button color="warn" (click)="remove(flight.id)">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              </mat-card-content>
            </mat-card>
          }
        </div>
      }

      <!-- Search form -->
      <mat-card class="search-form-card">
        <mat-card-content>
          <form [formGroup]="searchForm" (ngSubmit)="search()">
            <!-- Trip type toggle -->
            <div class="trip-type-row">
              <mat-button-toggle-group [value]="tripType()" (change)="tripType.set($event.value)" class="trip-type-toggle">
                <mat-button-toggle value="roundTrip">
                  <mat-icon>sync_alt</mat-icon> Ida e volta
                </mat-button-toggle>
                <mat-button-toggle value="oneWay">
                  <mat-icon>arrow_forward</mat-icon> Só ida
                </mat-button-toggle>
                <mat-button-toggle value="returnOnly">
                  <mat-icon>arrow_back</mat-icon> Só volta
                </mat-button-toggle>
              </mat-button-toggle-group>
            </div>

            <!-- Origin / Destination -->
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
                      {{ option.iataCode }} - {{ option.cityName }}
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
                      {{ option.iataCode }} - {{ option.cityName }}
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
              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>Data de ida</mat-label>
                  <input matInput [matDatepicker]="dpDeparture"
                         formControlName="departure"
                         [min]="minDate">
                  <mat-datepicker-toggle matSuffix [for]="dpDeparture"></mat-datepicker-toggle>
                  <mat-datepicker #dpDeparture></mat-datepicker>
                </mat-form-field>

                @if (tripType() === 'roundTrip') {
                  <mat-form-field appearance="outline">
                    <mat-label>Data de volta</mat-label>
                    <input matInput [matDatepicker]="dpReturn"
                           formControlName="returnDate"
                           [min]="searchForm.get('departure')?.value || minDate">
                    <mat-datepicker-toggle matSuffix [for]="dpReturn"></mat-datepicker-toggle>
                    <mat-datepicker #dpReturn></mat-datepicker>
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
        <!-- Recommended -->
        @if (categorized().bestValue; as best) {
          <div class="recommended-section">
            <h3><mat-icon>auto_awesome</mat-icon> Recomendado para você</h3>
            <mat-card class="recommended-card" [class.added]="isAdded(best.id)">
              <mat-card-content>
                <span class="rec-badge">Melhor custo-benefício</span>
                <div class="result-row">
                  <div class="result-airline">
                    <mat-icon>flight</mat-icon>
                    <div>
                      <strong>{{ best.airline }}</strong>
                      <span class="flight-number">{{ best.flightNumber }}</span>
                    </div>
                  </div>
                  <div class="result-route">
                    <span class="time">{{ formatTime(best.departureAt) }}</span>
                    <span class="code">{{ best.origin }}</span>
                  </div>
                  <div class="result-duration">
                    <span>{{ formatDuration(best.durationMinutes) }}</span>
                    <div class="duration-line"></div>
                    <span class="stops">{{ best.stops === 0 ? 'Direto' : best.stops + ' parada(s)' }}</span>
                  </div>
                  <div class="result-route">
                    <span class="time">{{ formatTime(best.arrivalAt) }}</span>
                    <span class="code">{{ best.destination }}</span>
                  </div>
                  <div class="result-price">
                    <span class="price-value">{{ best.price.currency }} {{ best.price.total | number:'1.2-2' }}</span>
                    @if (isAdded(best.id)) {
                      <button mat-stroked-button color="warn" (click)="remove(best.id)">
                        <mat-icon>check</mat-icon> Adicionado
                      </button>
                    } @else {
                      <button mat-flat-button color="primary" (click)="select(best)">
                        Selecionar
                      </button>
                    }
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        }

        <!-- Other options -->
        @if (otherFlights().length > 0) {
          <div class="results-list">
            <h3>Outras opções ({{ otherFlights().length }})</h3>
            @for (flight of otherFlights(); track flight.id) {
              <mat-card class="result-card" [class.added]="isAdded(flight.id)">
                <mat-card-content>
                  <div class="result-row">
                    <div class="result-airline">
                      <mat-icon>flight</mat-icon>
                      <div>
                        <strong>{{ flight.airline }}</strong>
                        <span class="flight-number">{{ flight.flightNumber }}</span>
                      </div>
                      @if (categorized().cheapest?.id === flight.id) {
                        <span class="tag tag-cheap">Mais barato</span>
                      }
                      @if (categorized().fastest?.id === flight.id) {
                        <span class="tag tag-fast">Mais rápido</span>
                      }
                    </div>
                    <div class="result-route">
                      <span class="time">{{ formatTime(flight.departureAt) }}</span>
                      <span class="code">{{ flight.origin }}</span>
                    </div>
                    <div class="result-duration">
                      <span>{{ formatDuration(flight.durationMinutes) }}</span>
                      <div class="duration-line"></div>
                      <span class="stops">{{ flight.stops === 0 ? 'Direto' : flight.stops + ' parada(s)' }}</span>
                    </div>
                    <div class="result-route">
                      <span class="time">{{ formatTime(flight.arrivalAt) }}</span>
                      <span class="code">{{ flight.destination }}</span>
                    </div>
                    <div class="result-price">
                      <span class="price-value">{{ flight.price.currency }} {{ flight.price.total | number:'1.2-2' }}</span>
                      @if (isAdded(flight.id)) {
                        <button mat-stroked-button color="warn" (click)="remove(flight.id)">
                          <mat-icon>check</mat-icon> Adicionado
                        </button>
                      } @else {
                        <button mat-flat-button color="primary" (click)="select(flight)">
                          Selecionar
                        </button>
                      }
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .wizard-step { display: flex; flex-direction: column; gap: var(--triply-spacing-md); }
    .step-header h2 { margin: 0 0 4px; font-size: 1.3rem; font-weight: 700; color: #0D0B30; }
    .step-header p { margin: 0; font-size: 0.9rem; color: var(--mat-sys-on-surface-variant); }

    .current-selection { display: flex; flex-direction: column; gap: 8px; }
    .current-selection h3 { margin: 0; font-size: 0.95rem; font-weight: 600; color: #0D0B30; }
    .selected-card { border-left: 3px solid #10b981 !important; }
    .selected-info { display: flex; align-items: center; gap: 12px; }
    .selected-info mat-icon { color: #10b981; }
    .selected-details { flex: 1; display: flex; flex-direction: column; }
    .selected-details strong { font-size: 0.9rem; color: #0D0B30; }
    .selected-details span { font-size: 0.8rem; color: var(--mat-sys-on-surface-variant); }
    .selected-price { font-weight: 700; color: #7C4DFF; font-size: 0.95rem; }

    .search-form-card { margin-top: 8px; }

    .trip-type-row { margin-bottom: var(--triply-spacing-md); }
    .trip-type-toggle { width: 100%; }
    .trip-type-toggle mat-button-toggle { flex: 1; }
    :host ::ng-deep .trip-type-toggle .mat-button-toggle-label-content {
      display: flex; align-items: center; gap: 6px; font-size: 0.85rem;
    }
    :host ::ng-deep .trip-type-toggle .mat-button-toggle-checked {
      background: rgba(124, 77, 255, 0.1); color: #7C4DFF;
    }

    .flexible-row { margin-bottom: var(--triply-spacing-md); }

    .month-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: var(--triply-spacing-md);
      padding: 12px;
      background: rgba(124, 77, 255, 0.04);
      border-radius: 8px;
      border: 1px dashed rgba(124, 77, 255, 0.2);
    }

    .form-row { display: flex; gap: var(--triply-spacing-md); margin-bottom: var(--triply-spacing-sm); }
    .form-row mat-form-field { flex: 1; }
    form button[type="submit"] { width: 100%; height: 44px; }

    .loading-state, .empty-results { text-align: center; padding: var(--triply-spacing-xl); }
    .loading-state p, .empty-results p { margin-top: 12px; color: var(--mat-sys-on-surface-variant); }
    .empty-results mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--mat-sys-on-surface-variant); opacity: 0.5; }

    /* Recommended section */
    .recommended-section h3 {
      margin: 0 0 8px;
      font-size: 1rem;
      font-weight: 600;
      color: #7C4DFF;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .recommended-card {
      border: 2px solid #7C4DFF !important;
      background: linear-gradient(135deg, rgba(124,77,255,0.03), rgba(124,77,255,0.08)) !important;
    }
    .recommended-card.added { opacity: 0.7; }
    .rec-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: linear-gradient(135deg, #7C4DFF, #651fff);
      color: #fff;
      font-size: 0.7rem;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 12px;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Other options */
    .results-list { display: flex; flex-direction: column; gap: 8px; }
    .results-list h3 { margin: 0; font-size: 0.95rem; font-weight: 600; color: #0D0B30; }
    .result-card { cursor: pointer; transition: all 0.2s ease; }
    .result-card:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .result-card.added { border-left: 3px solid #10b981 !important; opacity: 0.7; }
    .result-row { display: flex; align-items: center; gap: var(--triply-spacing-md); }
    .result-airline { display: flex; align-items: center; gap: 8px; min-width: 100px; flex-wrap: wrap; }
    .result-airline mat-icon { color: #f59e0b; }
    .result-airline strong { font-size: 0.85rem; color: #0D0B30; }
    .flight-number { font-size: 0.75rem; color: var(--mat-sys-on-surface-variant); display: block; }
    .result-route { text-align: center; min-width: 60px; }
    .result-route .time { font-size: 1rem; font-weight: 700; color: #0D0B30; display: block; }
    .result-route .code { font-size: 0.75rem; color: var(--mat-sys-on-surface-variant); }
    .result-duration { flex: 1; text-align: center; }
    .result-duration > span { font-size: 0.8rem; color: var(--mat-sys-on-surface-variant); }
    .duration-line { height: 2px; background: var(--mat-sys-outline-variant); margin: 4px 0; border-radius: 1px; position: relative; }
    .stops { font-size: 0.75rem; color: var(--mat-sys-on-surface-variant); }
    .result-price { text-align: right; min-width: 140px; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
    .price-value { font-size: 1.05rem; font-weight: 700; color: #7C4DFF; }

    /* Tags */
    .tag {
      font-size: 0.65rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 10px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      white-space: nowrap;
    }
    .tag-cheap { background: rgba(16,185,129,0.12); color: #059669; }
    .tag-fast { background: rgba(59,130,246,0.12); color: #2563eb; }

    @media (max-width: 600px) {
      .form-row { flex-direction: column; gap: 0; }
      .month-grid { grid-template-columns: repeat(2, 1fr); }
      .result-row { flex-wrap: wrap; }
      .result-airline { width: 100%; margin-bottom: 8px; }
      .result-price { width: 100%; flex-direction: row; align-items: center; justify-content: space-between; margin-top: 8px; }
      :host ::ng-deep .trip-type-toggle .mat-button-toggle-label-content {
        font-size: 0.75rem;
      }
    }
  `],
})
export class WizardFlightStepComponent {
  private readonly api = inject(FlightApiService);
  private readonly tripState = inject(TripStateService);
  private readonly snackBar = inject(MatSnackBar);

  readonly selectedFlights = this.tripState.flights;
  readonly results = signal<Flight[]>([]);
  readonly isSearching = signal(false);
  readonly hasSearched = signal(false);
  readonly minDate = new Date();

  readonly tripType = signal<TripType>('roundTrip');
  readonly flexibleDates = signal(false);
  readonly selectedMonths = signal<string[]>([]);

  readonly categorized = computed((): CategorizedFlights<Flight> => categorizeFlights(this.results()));
  readonly otherFlights = computed(() => {
    const cat = this.categorized();
    if (!cat.bestValue) return cat.all;
    return cat.all.filter(f => f.id !== cat.bestValue!.id);
  });

  readonly availableMonths: MonthOption[] = this.buildAvailableMonths();

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
    departure: new FormControl<Date | null>(null),
    returnDate: new FormControl<Date | null>(null),
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
    return airport ? `${airport.iataCode} - ${airport.cityName}` : '';
  }

  canSearch(): boolean {
    const hasAirports = this.originControl.valid && this.destinationControl.valid;
    const passengersValid = this.searchForm.get('passengers')?.valid ?? false;
    if (this.flexibleDates()) {
      return hasAirports && passengersValid && this.selectedMonths().length > 0;
    }
    return hasAirports && passengersValid && !!this.searchForm.get('departure')?.value;
  }

  isAdded(id: string): boolean {
    return this.selectedFlights().some((f) => f.id === id);
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

    const origin = this.originControl.value as AirportOption;
    const dest = this.destinationControl.value as AirportOption;
    const passengers = this.searchForm.value.passengers ?? 1;

    const effectiveOrigin = this.tripType() === 'returnOnly' ? dest.iataCode : origin.iataCode;
    const effectiveDest = this.tripType() === 'returnOnly' ? origin.iataCode : dest.iataCode;

    this.isSearching.set(true);
    this.hasSearched.set(true);

    if (this.flexibleDates()) {
      const searches = this.selectedMonths().map(monthStr => {
        const departureDate = `${monthStr}-01`;
        return this.api.searchFlights({
          origin: effectiveOrigin,
          destination: effectiveDest,
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
      const departure = this.searchForm.value.departure;
      if (!departure) return;

      const params: any = {
        origin: effectiveOrigin,
        destination: effectiveDest,
        departureDate: departure.toISOString().split('T')[0],
        adults: passengers,
      };

      if (this.tripType() === 'roundTrip' && this.searchForm.value.returnDate) {
        params.returnDate = this.searchForm.value.returnDate.toISOString().split('T')[0];
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

  select(flight: Flight): void {
    this.tripState.addFlight(flight);
    this.tripState.addItineraryItem({
      id: crypto.randomUUID(),
      type: 'flight',
      refId: flight.id,
      date: flight.departureAt.split('T')[0],
      timeSlot: flight.departureAt.split('T')[1]?.substring(0, 5) || null,
      durationMinutes: null,
      label: `Voo: ${flight.origin} \u2192 ${flight.destination}`,
      notes: `${flight.airline} ${flight.flightNumber}`,
      order: 0,
    });
    this.snackBar.open('Voo adicionado!', 'OK', { duration: 2000 });
  }

  remove(id: string): void {
    this.tripState.removeFlight(id);
    this.tripState.removeItineraryItem(
      this.tripState.itineraryItems().find((i) => i.refId === id)?.id ?? ''
    );
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
