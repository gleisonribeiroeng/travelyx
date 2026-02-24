import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NotificationService } from '../../../core/services/notification.service';
import { MatDialog } from '@angular/material/dialog';
import { ItemDetailDialogComponent, ItemDetailData, ItemDetailResult } from '../../../shared/components/item-detail-dialog/item-detail-dialog.component';
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
            <mat-card class="recommended-card" [class.added]="isAdded(best.id)" (click)="openDetail(best)">
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
                        <button mat-stroked-button color="warn" (click)="remove(best.id); $event.stopPropagation()">
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
        @if (otherTours().length > 0) {
          <div class="results-grid">
            <h3>Outras opcoes ({{ otherTours().length }})</h3>
            <div class="tour-grid">
              @for (tour of otherTours(); track tour.id) {
                <mat-card class="tour-card" [class.added]="isAdded(tour.id)" (click)="openDetail(tour)">
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
                        <button mat-stroked-button color="warn" class="full-width" (click)="remove(tour.id); $event.stopPropagation()">
                          <mat-icon>check</mat-icon> Adicionado
                        </button>
                      } @else {
                        <button mat-flat-button color="primary" class="full-width" (click)="openDetail(tour); $event.stopPropagation()">
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
    .selected-card { border-left: 3px solid var(--triply-success) !important; }
    .selected-info { display: flex; align-items: center; gap: 12px; }
    .selected-info mat-icon { color: var(--triply-success); }
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
      background: linear-gradient(135deg, rgba(124, 77, 255, 0.03) 0%, rgba(124, 77, 255, 0.08) 60%) !important;
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
    .rec-desc { margin: 0; font-size: 0.85rem; color: var(--triply-text-secondary); line-height: 1.4; }
    .rec-meta { display: flex; gap: 12px; }
    .rec-meta span { display: flex; align-items: center; gap: 4px; font-size: 0.8rem; color: var(--triply-text-secondary); }
    .rec-meta mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .rec-rating { display: flex; align-items: center; gap: 4px; }
    .rec-rating .star-icon { font-size: 16px; width: 16px; height: 16px; color: var(--triply-cat-flight); }
    .rec-rating .rating-num { font-size: 0.9rem; font-weight: 600; color: var(--triply-text-primary); }
    .rec-rating .review-count { font-size: 0.8rem; color: var(--triply-text-secondary); }

    .rec-footer { display: flex; flex-direction: column; gap: 12px; align-items: stretch; margin-top: auto; }
    .rec-price .price-value { font-size: 1.2rem; font-weight: 700; color: var(--triply-primary); }
    .rec-actions { display: flex; flex-direction: column; gap: 8px; }
    .rec-actions a { text-decoration: none; }

    /* Other options */
    .results-grid h3 { margin: 0 0 var(--triply-spacing-md); font-size: 0.95rem; font-weight: 600; color: var(--triply-text-primary); }
    .tour-grid { display: grid; grid-template-columns: 1fr; gap: var(--triply-spacing-md); }
    .tour-card { overflow: hidden; transition: all 0.2s ease; cursor: pointer; }
    .tour-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .tour-card.added { border: 2px solid var(--triply-success) !important; opacity: 0.7; }
    .tour-photo { width: 100%; height: 160px; object-fit: cover; }
    .tour-card h4 { margin: 8px 0 4px; font-size: 0.95rem; font-weight: 700; color: var(--triply-text-primary); }
    .tour-desc { font-size: 0.8rem; color: var(--triply-text-secondary); margin: 0 0 8px; line-height: 1.4; }
    .tour-meta { display: flex; gap: 12px; margin-bottom: 8px; }
    .tour-meta span { display: flex; align-items: center; gap: 4px; font-size: 0.8rem; color: var(--triply-text-secondary); }
    .tour-meta mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .tour-rating { display: flex; align-items: center; gap: 4px; margin-bottom: 8px; }
    .tour-rating mat-icon { font-size: 16px; width: 16px; height: 16px; color: var(--triply-cat-flight); }
    .tour-rating span { font-size: 0.85rem; font-weight: 600; color: var(--triply-text-primary); }
    .tour-rating .review-count { font-weight: 400; color: var(--triply-text-secondary); font-size: 0.8rem; }
    .tour-price { margin-bottom: 12px; }
    .price-value { font-size: 1.1rem; font-weight: 700; color: var(--triply-primary); }
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
    .htag-value { background: rgba(124, 77, 255, 0.1); color: var(--triply-primary); }

    @media (min-width: 600px) {
      .form-row { flex-direction: row; gap: var(--triply-spacing-md); }
      .tour-grid { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
      .rec-layout { flex-direction: row; }
      .rec-photo { width: 200px; height: 160px; }
      .rec-footer { flex-direction: row; align-items: center; justify-content: space-between; gap: 8px; }
      .rec-actions { flex-direction: row; }
    }
  `],
})
export class WizardTourStepComponent {
  private readonly api = inject(TourApiService);
  private readonly tripState = inject(TripStateService);
  private readonly notify = inject(NotificationService);
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

  openDetail(tour: Activity): void {
    const ref = this.dialog.open(ItemDetailDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { type: 'activity', item: tour, isAdded: this.isAdded(tour.id) } as ItemDetailData,
    });
    ref.afterClosed().subscribe((result: ItemDetailResult) => {
      if (!result) return;
      if (result.action === 'add') this.select(tour);
      else if (result.action === 'remove') this.remove(tour.id);
    });
  }

  select(tour: Activity): void {
    const dialogRef = this.dialog.open(ScheduleDialogComponent, {
      width: '400px',
      panelClass: 'mobile-fullscreen-dialog',
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
        isPaid: false,
        attachment: null,
      });
      this.notify.success('Passeio adicionado!');
    });
  }

  remove(id: string): void {
    this.tripState.removeActivity(id);
    this.tripState.removeItineraryItem(
      this.tripState.itineraryItems().find((i) => i.refId === id)?.id ?? ''
    );
  }
}
