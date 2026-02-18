import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { finalize } from 'rxjs/operators';
import { MATERIAL_IMPORTS } from '../../../core/material.exports';
import { ScheduleDialogComponent, ScheduleDialogData } from '../../../shared/components/schedule-dialog/schedule-dialog.component';
import { TourApiService } from '../../../core/api/tour-api.service';
import { TripStateService } from '../../../core/services/trip-state.service';
import { Activity } from '../../../core/models/trip.models';
import {
  categorizeTours,
  CategorizedTours,
} from '../../../core/utils/tour-categorizer.util';

@Component({
  selector: 'app-wizard-tour-step',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule],
  template: `
    <div class="wizard-step">
      <div class="step-header">
        <h2>Passeios e atividades</h2>
        <p>Descubra tours guiados e experiencias no seu destino</p>
      </div>

      @if (selectedTours().length > 0) {
        <div class="current-selection">
          <h3>Passeios selecionados</h3>
          @for (tour of selectedTours(); track tour.id) {
            <mat-card class="selected-card">
              <mat-card-content>
                <div class="selected-info">
                  <mat-icon>local_activity</mat-icon>
                  <div class="selected-details">
                    <strong>{{ tour.name }}</strong>
                    <span>{{ tour.city }} @if (tour.durationMinutes) { &middot; {{ formatDuration(tour.durationMinutes) }} }</span>
                  </div>
                  <span class="selected-price">{{ tour.price.currency }} {{ tour.price.total | number:'1.2-2' }}</span>
                  <button mat-icon-button color="warn" (click)="remove(tour.id)">
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
                <input matInput formControlName="destination">
                <mat-icon matPrefix>explore</mat-icon>
              </mat-form-field>
            </div>

            <button mat-flat-button color="primary" type="submit"
                    [disabled]="searchForm.invalid || isSearching()">
              @if (isSearching()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                <mat-icon>search</mat-icon>
                Buscar passeios
              }
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      @if (isSearching()) {
        <div class="loading-state">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Buscando passeios...</p>
        </div>
      }

      @if (!isSearching() && hasSearched() && results().length === 0) {
        <div class="empty-results">
          <mat-icon>search_off</mat-icon>
          <p>Nenhum passeio encontrado.</p>
        </div>
      }

      <!-- Categorized Results -->
      @if (results().length > 0) {
        <!-- Section 1: Recommended -->
        @if (categorized().bestValue; as best) {
          <div class="recommended-section">
            <h3>Recomendado para voce</h3>
            <mat-card class="recommended-card" [class.added]="isAdded(best.id)">
              <div class="rec-layout">
                @if (best.images.length > 0) {
                  <img [src]="best.images[0]" class="rec-photo" alt="">
                }
                <div class="rec-content">
                  <div class="rec-badge">
                    <mat-icon>auto_awesome</mat-icon>
                    Melhor custo-beneficio
                  </div>
                  <h4>{{ best.name }}</h4>
                  <p class="rec-desc">{{ best.description | slice:0:100 }}{{ best.description.length > 100 ? '...' : '' }}</p>
                  <div class="rec-meta">
                    <span><mat-icon>place</mat-icon> {{ best.city }}</span>
                    @if (best.durationMinutes) {
                      <span><mat-icon>schedule</mat-icon> {{ formatDuration(best.durationMinutes) }}</span>
                    }
                  </div>
                  <div class="rec-rating">
                    @if (best.rating) {
                      <mat-icon class="star-icon">star</mat-icon>
                      <span class="rating-num">{{ best.rating.toFixed(1) }}</span>
                    }
                    @if (best.reviewCount > 0) {
                      <span class="review-count">({{ best.reviewCount }} avaliacoes)</span>
                    }
                  </div>
                  <div class="rec-footer">
                    <div class="rec-price">
                      <span class="price-value">{{ best.price.currency }} {{ best.price.total | number:'1.2-2' }}</span>
                    </div>
                    <div class="rec-actions">
                      @if (isAdded(best.id)) {
                        <button mat-stroked-button color="warn" (click)="remove(best.id)">
                          <mat-icon>check</mat-icon> Adicionado
                        </button>
                      } @else {
                        <button mat-flat-button color="primary" (click)="select(best)">
                          Selecionar
                        </button>
                      }
                      <a mat-stroked-button [href]="best.link.url" target="_blank" rel="noopener noreferrer">
                        Ver detalhes
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </mat-card>
          </div>
        }

        <!-- Section 2: Other options -->
        @if (otherTours().length > 0) {
          <div class="results-grid">
            <h3>Outras opcoes ({{ otherTours().length }})</h3>
            <div class="tour-grid">
              @for (tour of otherTours(); track tour.id) {
                <mat-card class="tour-card" [class.added]="isAdded(tour.id)">
                  <!-- Tags -->
                  @if (categorized().cheapest?.id === tour.id || categorized().bestRated?.id === tour.id) {
                    <div class="tour-tags">
                      @if (categorized().cheapest?.id === tour.id) {
                        <span class="htag htag-cheap">Melhor preco</span>
                      }
                      @if (categorized().bestRated?.id === tour.id) {
                        <span class="htag htag-rated">Mais bem avaliado</span>
                      }
                    </div>
                  }
                  @if (tour.images.length > 0) {
                    <img [src]="tour.images[0]" class="tour-photo" alt="">
                  }
                  <mat-card-content>
                    <h4>{{ tour.name }}</h4>
                    <p class="tour-desc">{{ tour.description | slice:0:100 }}{{ tour.description.length > 100 ? '...' : '' }}</p>
                    <div class="tour-meta">
                      <span class="tour-city"><mat-icon>place</mat-icon> {{ tour.city }}</span>
                      @if (tour.durationMinutes) {
                        <span class="tour-duration"><mat-icon>schedule</mat-icon> {{ formatDuration(tour.durationMinutes) }}</span>
                      }
                    </div>
                    <div class="tour-rating">
                      @if (tour.rating) {
                        <mat-icon>star</mat-icon>
                        <span>{{ tour.rating.toFixed(1) }}</span>
                      }
                      @if (tour.reviewCount > 0) {
                        <span class="review-count">({{ tour.reviewCount }})</span>
                      }
                    </div>
                    <div class="tour-price">
                      <span class="price-value">{{ tour.price.currency }} {{ tour.price.total | number:'1.2-2' }}</span>
                    </div>
                    <div class="card-buttons">
                      @if (isAdded(tour.id)) {
                        <button mat-stroked-button color="warn" class="full-width" (click)="remove(tour.id)">
                          <mat-icon>check</mat-icon> Adicionado
                        </button>
                      } @else {
                        <button mat-flat-button color="primary" class="full-width" (click)="select(tour)">
                          Selecionar
                        </button>
                      }
                      <a mat-stroked-button class="full-width detail-link" [href]="tour.link.url" target="_blank" rel="noopener noreferrer">
                        Ver detalhes
                      </a>
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
    .selected-price { font-weight: 700; color: #7C4DFF; font-size: 0.95rem; white-space: nowrap; }

    .search-form-card { margin-top: 8px; }
    .form-row { display: flex; gap: var(--triply-spacing-md); margin-bottom: var(--triply-spacing-sm); }
    .form-row mat-form-field { flex: 1; }
    form button[type="submit"] { width: 100%; height: 44px; }

    .loading-state, .empty-results { text-align: center; padding: var(--triply-spacing-xl); }
    .loading-state p, .empty-results p { margin-top: 12px; color: var(--mat-sys-on-surface-variant); }
    .empty-results mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--mat-sys-on-surface-variant); opacity: 0.5; }

    /* Recommended section */
    .recommended-section h3 { margin: 0 0 var(--triply-spacing-sm); font-size: 1rem; font-weight: 700; color: #0D0B30; }
    .recommended-card {
      border-left: 4px solid #7C4DFF !important;
      background: linear-gradient(135deg, rgba(124, 77, 255, 0.03) 0%, #fff 60%) !important;
      transition: all 0.2s ease;
    }
    .recommended-card:hover { box-shadow: 0 4px 16px rgba(124, 77, 255, 0.12); }
    .recommended-card.added { border-left-color: #10b981 !important; opacity: 0.7; }

    .rec-layout { display: flex; gap: 16px; }
    .rec-photo { width: 200px; height: 160px; object-fit: cover; border-radius: 8px; flex-shrink: 0; }
    .rec-content { flex: 1; display: flex; flex-direction: column; gap: 6px; }

    .rec-badge {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
      color: #7C4DFF;
    }
    .rec-badge mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .rec-content h4 { margin: 0; font-size: 1.1rem; font-weight: 700; color: #0D0B30; }
    .rec-desc { margin: 0; font-size: 0.85rem; color: var(--mat-sys-on-surface-variant); line-height: 1.4; }
    .rec-meta { display: flex; gap: 12px; }
    .rec-meta span { display: flex; align-items: center; gap: 4px; font-size: 0.8rem; color: var(--mat-sys-on-surface-variant); }
    .rec-meta mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .rec-rating { display: flex; align-items: center; gap: 4px; }
    .rec-rating .star-icon { font-size: 16px; width: 16px; height: 16px; color: #f59e0b; }
    .rec-rating .rating-num { font-size: 0.9rem; font-weight: 600; color: #0D0B30; }
    .rec-rating .review-count { font-size: 0.8rem; color: var(--mat-sys-on-surface-variant); }

    .rec-footer { display: flex; align-items: center; justify-content: space-between; margin-top: auto; }
    .rec-price .price-value { font-size: 1.2rem; font-weight: 700; color: #7C4DFF; }
    .rec-actions { display: flex; gap: 8px; }
    .rec-actions a { text-decoration: none; }

    /* Other options */
    .results-grid h3 { margin: 0 0 var(--triply-spacing-md); font-size: 0.95rem; font-weight: 600; color: #0D0B30; }
    .tour-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--triply-spacing-md); }
    .tour-card { overflow: hidden; transition: all 0.2s ease; }
    .tour-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .tour-card.added { border: 2px solid #10b981 !important; opacity: 0.7; }
    .tour-photo { width: 100%; height: 160px; object-fit: cover; }
    .tour-card h4 { margin: 8px 0 4px; font-size: 0.95rem; font-weight: 700; color: #0D0B30; }
    .tour-desc { font-size: 0.8rem; color: var(--mat-sys-on-surface-variant); margin: 0 0 8px; line-height: 1.4; }
    .tour-meta { display: flex; gap: 12px; margin-bottom: 8px; }
    .tour-meta span { display: flex; align-items: center; gap: 4px; font-size: 0.8rem; color: var(--mat-sys-on-surface-variant); }
    .tour-meta mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .tour-rating { display: flex; align-items: center; gap: 4px; margin-bottom: 8px; }
    .tour-rating mat-icon { font-size: 16px; width: 16px; height: 16px; color: #f59e0b; }
    .tour-rating span { font-size: 0.85rem; font-weight: 600; color: #0D0B30; }
    .tour-rating .review-count { font-weight: 400; color: var(--mat-sys-on-surface-variant); font-size: 0.8rem; }
    .tour-price { margin-bottom: 12px; }
    .price-value { font-size: 1.1rem; font-weight: 700; color: #7C4DFF; }
    .full-width { width: 100%; }
    .card-buttons { display: flex; flex-direction: column; gap: 6px; }
    .detail-link { text-decoration: none; text-align: center; }

    /* Tags */
    .tour-tags { display: flex; gap: 6px; padding: 8px 16px 0; }
    .htag {
      font-size: 0.65rem; font-weight: 600; padding: 2px 8px; border-radius: 10px;
      text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap;
    }
    .htag-cheap { background: rgba(16, 185, 129, 0.1); color: #059669; }
    .htag-rated { background: rgba(245, 158, 11, 0.1); color: #d97706; }
    .htag-value { background: rgba(124, 77, 255, 0.1); color: #7C4DFF; }

    @media (max-width: 600px) {
      .form-row { flex-direction: column; gap: 0; }
      .tour-grid { grid-template-columns: 1fr; }
      .rec-layout { flex-direction: column; }
      .rec-photo { width: 100%; height: 180px; }
      .rec-footer { flex-direction: column; gap: 12px; align-items: stretch; }
      .rec-actions { flex-direction: column; }
    }
  `],
})
export class WizardTourStepComponent {
  private readonly api = inject(TourApiService);
  private readonly tripState = inject(TripStateService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  readonly selectedTours = this.tripState.activities;
  readonly results = signal<Activity[]>([]);
  readonly isSearching = signal(false);
  readonly hasSearched = signal(false);

  searchForm = new FormGroup({
    destination: new FormControl('', Validators.required),
  });

  // Categorization
  readonly categorized = computed((): CategorizedTours<Activity> =>
    categorizeTours(this.results())
  );

  readonly otherTours = computed(() => {
    const cat = this.categorized();
    if (!cat.bestValue) return cat.all;
    return cat.all.filter(t => t.id !== cat.bestValue!.id);
  });

  isAdded(id: string): boolean {
    return this.selectedTours().some((t) => t.id === id);
  }

  formatDuration(minutes: number | null): string {
    if (!minutes) return '';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  search(): void {
    if (this.searchForm.invalid) return;
    this.isSearching.set(true);
    this.hasSearched.set(true);

    this.api.searchTours({ destination: this.searchForm.value.destination ?? '' })
      .pipe(finalize(() => this.isSearching.set(false)))
      .subscribe({
        next: (result) => {
          this.results.set(result.data);
        },
      });
  }

  select(tour: Activity): void {
    const dialogRef = this.dialog.open(ScheduleDialogComponent, {
      width: '400px',
      data: {
        name: tour.name,
        type: 'activity',
        defaultDate: this.tripState.trip().dates.start || new Date().toISOString().split('T')[0],
        tripDates: this.tripState.trip().dates,
        durationMinutes: tour.durationMinutes,
      } as ScheduleDialogData,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;
      this.tripState.addActivity(tour);
      this.tripState.addItineraryItem({
        id: crypto.randomUUID(),
        type: 'activity',
        refId: tour.id,
        date: result.date,
        timeSlot: result.timeSlot,
        durationMinutes: result.durationMinutes,
        label: `Passeio: ${tour.name}`,
        notes: tour.city || '',
        order: 0,
      });
      this.snackBar.open('Passeio adicionado!', 'OK', { duration: 2000 });
    });
  }

  remove(id: string): void {
    this.tripState.removeActivity(id);
    this.tripState.removeItineraryItem(
      this.tripState.itineraryItems().find((i) => i.refId === id)?.id ?? ''
    );
  }
}
