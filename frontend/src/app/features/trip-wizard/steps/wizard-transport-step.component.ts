import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NotificationService } from '../../../core/services/notification.service';
import { finalize } from 'rxjs/operators';
import { MATERIAL_IMPORTS } from '../../../core/material.exports';
import { TransportApiService } from '../../../core/api/transport-api.service';
import { TripStateService } from '../../../core/services/trip-state.service';
import { Transport } from '../../../core/models/trip.models';

@Component({
  selector: 'app-wizard-transport-step',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule],
  template: `
    <div class="wizard-step">
      <div class="step-header">
        <h2>Transporte terrestre</h2>
        <p>Busque ônibus, trens e balsas para complementar sua viagem</p>
      </div>

      @if (selectedTransports().length > 0) {
        <div class="current-selection">
          <h3>Transportes selecionados</h3>
          @for (t of selectedTransports(); track t.id) {
            <mat-card class="selected-card">
              <mat-card-content>
                <div class="selected-info">
                  <mat-icon>{{ getModeIcon(t.mode) }}</mat-icon>
                  <div class="selected-details">
                    <strong>{{ t.origin }} → {{ t.destination }}</strong>
                    <span>{{ t.mode | titlecase }} &middot; {{ formatDuration(t.durationMinutes) }}</span>
                  </div>
                  <span class="selected-price">{{ t.price.currency }} {{ t.price.total | number:'1.2-2' }}</span>
                  <button mat-icon-button color="warn" (click)="remove(t.id)">
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
                <mat-label>Origem</mat-label>
                <input matInput formControlName="origin">
                <mat-icon matPrefix>trip_origin</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Destino</mat-label>
                <input matInput formControlName="destination">
                <mat-icon matPrefix>place</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Data</mat-label>
                <input matInput [matDatepicker]="dp" formControlName="date" [min]="minDate">
                <mat-datepicker-toggle matSuffix [for]="dp"></mat-datepicker-toggle>
                <mat-datepicker #dp></mat-datepicker>
              </mat-form-field>
            </div>

            <button mat-flat-button color="primary" type="submit"
                    [disabled]="searchForm.invalid || isSearching()">
              @if (isSearching()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                <mat-icon>search</mat-icon>
                Buscar transporte
              }
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      @if (isSearching()) {
        <div class="loading-state">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Buscando transportes...</p>
        </div>
      }

      @if (!isSearching() && hasSearched() && results().length === 0) {
        <div class="empty-results">
          <mat-icon>search_off</mat-icon>
          <p>Nenhum transporte encontrado.</p>
        </div>
      }

      @if (results().length > 0) {
        <div class="results-list">
          <h3>{{ results().length }} opções encontradas</h3>
          @for (t of results(); track t.id) {
            <mat-card class="result-card" [class.added]="isAdded(t.id)">
              <mat-card-content>
                <div class="result-row">
                  <mat-icon class="mode-icon">{{ getModeIcon(t.mode) }}</mat-icon>
                  <div class="result-info">
                    <strong>{{ t.origin }} → {{ t.destination }}</strong>
                    <span>{{ t.mode | titlecase }} &middot; {{ formatDuration(t.durationMinutes) }}</span>
                  </div>
                  <div class="result-price">
                    <span class="price-value">{{ t.price.currency }} {{ t.price.total | number:'1.2-2' }}</span>
                    @if (isAdded(t.id)) {
                      <button mat-stroked-button color="warn" (click)="remove(t.id)">
                        <mat-icon>check</mat-icon> Adicionado
                      </button>
                    } @else {
                      <button mat-flat-button color="primary" (click)="select(t)">
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
    .form-row { display: flex; gap: var(--triply-spacing-md); margin-bottom: var(--triply-spacing-sm); }
    .form-row mat-form-field { flex: 1; }
    form button[type="submit"] { width: 100%; height: 44px; }

    .loading-state, .empty-results { text-align: center; padding: var(--triply-spacing-xl); }
    .loading-state p, .empty-results p { margin-top: 12px; color: var(--mat-sys-on-surface-variant); }
    .empty-results mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--mat-sys-on-surface-variant); opacity: 0.5; }

    .results-list { display: flex; flex-direction: column; gap: 8px; }
    .results-list h3 { margin: 0; font-size: 0.95rem; font-weight: 600; color: #0D0B30; }
    .result-card { transition: all 0.2s ease; }
    .result-card:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .result-card.added { border-left: 3px solid #10b981 !important; opacity: 0.7; }
    .result-row { display: flex; align-items: center; gap: var(--triply-spacing-md); }
    .mode-icon { color: #3b82f6; }
    .result-info { flex: 1; display: flex; flex-direction: column; }
    .result-info strong { font-size: 0.9rem; color: #0D0B30; }
    .result-info span { font-size: 0.8rem; color: var(--mat-sys-on-surface-variant); }
    .result-price { text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
    .price-value { font-size: 1.05rem; font-weight: 700; color: #7C4DFF; }

    @media (max-width: 600px) {
      .form-row { flex-direction: column; gap: 0; }
      .result-row { flex-wrap: wrap; }
      .result-price { width: 100%; flex-direction: row; justify-content: space-between; margin-top: 8px; }
    }
  `],
})
export class WizardTransportStepComponent {
  private readonly api = inject(TransportApiService);
  private readonly tripState = inject(TripStateService);
  private readonly notify = inject(NotificationService);

  readonly selectedTransports = this.tripState.transports;
  readonly results = signal<Transport[]>([]);
  readonly isSearching = signal(false);
  readonly hasSearched = signal(false);
  readonly minDate = new Date();

  searchForm = new FormGroup({
    origin: new FormControl('', Validators.required),
    destination: new FormControl('', Validators.required),
    date: new FormControl<Date | null>(null, Validators.required),
  });

  isAdded(id: string): boolean {
    return this.selectedTransports().some((t) => t.id === id);
  }

  getModeIcon(mode: string): string {
    const icons: Record<string, string> = { bus: 'directions_bus', train: 'train', ferry: 'directions_boat', other: 'commute' };
    return icons[mode] || 'commute';
  }

  formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  search(): void {
    if (this.searchForm.invalid) return;
    const date = this.searchForm.value.date;
    if (!date) return;

    this.isSearching.set(true);
    this.hasSearched.set(true);

    this.api.searchTransport({
      origin: this.searchForm.value.origin ?? '',
      destination: this.searchForm.value.destination ?? '',
      departureDate: date.toISOString().split('T')[0],
    }).pipe(finalize(() => this.isSearching.set(false)))
      .subscribe({
        next: (result) => {
          this.results.set(result.data);
        },
      });
  }

  select(transport: Transport): void {
    this.tripState.addTransport(transport);
    this.tripState.addItineraryItem({
      id: crypto.randomUUID(),
      type: 'transport',
      refId: transport.id,
      date: transport.departureAt.split('T')[0],
      timeSlot: transport.departureAt.split('T')[1]?.substring(0, 5) || null,
      durationMinutes: null,
      label: `Transporte: ${transport.origin} → ${transport.destination}`,
      notes: '',
      order: 0,
    });
    this.notify.success('Transporte adicionado!');
  }

  remove(id: string): void {
    this.tripState.removeTransport(id);
    this.tripState.removeItineraryItem(
      this.tripState.itineraryItems().find((i) => i.refId === id)?.id ?? ''
    );
  }
}
