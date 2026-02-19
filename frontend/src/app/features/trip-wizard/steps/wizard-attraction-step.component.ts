import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NotificationService } from '../../../core/services/notification.service';
import { MatDialog } from '@angular/material/dialog';
import { finalize } from 'rxjs/operators';
import { MATERIAL_IMPORTS } from '../../../core/material.exports';
import { ScheduleDialogComponent, ScheduleDialogData } from '../../../shared/components/schedule-dialog/schedule-dialog.component';
import { AttractionApiService } from '../../../core/api/attraction-api.service';
import { TripStateService } from '../../../core/services/trip-state.service';
import { Attraction } from '../../../core/models/trip.models';

@Component({
  selector: 'app-wizard-attraction-step',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule],
  template: `
    <div class="wizard-step">
      <div class="step-header">
        <h2>Atrações turísticas</h2>
        <p>Encontre pontos turísticos e lugares imperdíveis</p>
      </div>

      @if (selectedAttractions().length > 0) {
        <div class="current-selection">
          <h3>Atrações selecionadas</h3>
          @for (attr of selectedAttractions(); track attr.id) {
            <mat-card class="selected-card">
              <mat-card-content>
                <div class="selected-info">
                  <mat-icon>museum</mat-icon>
                  <div class="selected-details">
                    <strong>{{ attr.name }}</strong>
                    <span>{{ attr.city }} &middot; {{ attr.category }}</span>
                  </div>
                  <button mat-icon-button color="warn" (click)="remove(attr.id)">
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
                <mat-label>Cidade</mat-label>
                <input matInput formControlName="city">
                <mat-icon matPrefix>location_city</mat-icon>
              </mat-form-field>
            </div>

            <button mat-flat-button color="primary" type="submit"
                    [disabled]="searchForm.invalid || isSearching()">
              @if (isSearching()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                <mat-icon>search</mat-icon>
                Buscar atrações
              }
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      @if (isSearching()) {
        <div class="loading-state">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Buscando atrações...</p>
        </div>
      }

      @if (!isSearching() && hasSearched() && results().length === 0) {
        <div class="empty-results">
          <mat-icon>search_off</mat-icon>
          <p>Nenhuma atração encontrada.</p>
        </div>
      }

      @if (results().length > 0) {
        <div class="results-grid">
          <h3>{{ results().length }} atrações encontradas</h3>
          <div class="attraction-grid">
            @for (attr of results(); track attr.id) {
              <mat-card class="attraction-card" [class.added]="isAdded(attr.id)">
                @if (attr.images.length > 0) {
                  <img [src]="attr.images[0]" class="attraction-photo" alt="">
                }
                <mat-card-content>
                  <div class="attraction-category">{{ attr.category }}</div>
                  <h4>{{ attr.name }}</h4>
                  <p class="attraction-desc">{{ attr.description | slice:0:100 }}{{ attr.description.length > 100 ? '...' : '' }}</p>
                  <span class="attraction-city"><mat-icon>place</mat-icon> {{ attr.city }}</span>
                  @if (isAdded(attr.id)) {
                    <button mat-stroked-button color="warn" class="full-width" (click)="remove(attr.id)">
                      <mat-icon>check</mat-icon> Adicionada
                    </button>
                  } @else {
                    <button mat-flat-button color="primary" class="full-width" (click)="select(attr)">
                      Selecionar
                    </button>
                  }
                </mat-card-content>
              </mat-card>
            }
          </div>
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

    .search-form-card { margin-top: 8px; }
    .form-row { display: flex; gap: var(--triply-spacing-md); margin-bottom: var(--triply-spacing-sm); }
    .form-row mat-form-field { flex: 1; }
    form button[type="submit"] { width: 100%; height: 44px; }

    .loading-state, .empty-results { text-align: center; padding: var(--triply-spacing-xl); }
    .loading-state p, .empty-results p { margin-top: 12px; color: var(--mat-sys-on-surface-variant); }
    .empty-results mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--mat-sys-on-surface-variant); opacity: 0.5; }

    .results-grid h3 { margin: 0 0 var(--triply-spacing-md); font-size: 0.95rem; font-weight: 600; color: #0D0B30; }
    .attraction-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: var(--triply-spacing-md); }
    .attraction-card { overflow: hidden; transition: all 0.2s ease; }
    .attraction-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .attraction-card.added { border: 2px solid #10b981 !important; opacity: 0.7; }
    .attraction-photo { width: 100%; height: 150px; object-fit: cover; }
    .attraction-category { display: inline-block; font-size: 0.7rem; font-weight: 600; color: #7C4DFF; background: rgba(124,77,255,0.1); padding: 2px 8px; border-radius: 10px; margin-bottom: 4px; text-transform: uppercase; }
    .attraction-card h4 { margin: 4px 0; font-size: 0.95rem; font-weight: 700; color: #0D0B30; }
    .attraction-desc { font-size: 0.8rem; color: var(--mat-sys-on-surface-variant); margin: 0 0 8px; line-height: 1.4; }
    .attraction-city { display: flex; align-items: center; gap: 4px; font-size: 0.8rem; color: var(--mat-sys-on-surface-variant); margin-bottom: 12px; }
    .attraction-city mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .full-width { width: 100%; }

    @media (max-width: 600px) {
      .form-row { flex-direction: column; gap: 0; }
      .attraction-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class WizardAttractionStepComponent {
  private readonly api = inject(AttractionApiService);
  private readonly tripState = inject(TripStateService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  readonly selectedAttractions = this.tripState.attractions;
  readonly results = signal<Attraction[]>([]);
  readonly isSearching = signal(false);
  readonly hasSearched = signal(false);

  searchForm = new FormGroup({
    city: new FormControl('', Validators.required),
  });

  isAdded(id: string): boolean {
    return this.selectedAttractions().some((a) => a.id === id);
  }

  search(): void {
    if (this.searchForm.invalid) return;
    this.isSearching.set(true);
    this.hasSearched.set(true);

    this.api.searchAttractions({ city: this.searchForm.value.city ?? '' })
      .pipe(finalize(() => this.isSearching.set(false)))
      .subscribe({
        next: (result) => {
          this.results.set(result.data);
        },
      });
  }

  select(attraction: Attraction): void {
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
      this.tripState.addAttraction(attraction);
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
      this.notify.success('Atração adicionada!');
    });
  }

  remove(id: string): void {
    this.tripState.removeAttraction(id);
    this.tripState.removeItineraryItem(
      this.tripState.itineraryItems().find((i) => i.refId === id)?.id ?? ''
    );
  }
}
