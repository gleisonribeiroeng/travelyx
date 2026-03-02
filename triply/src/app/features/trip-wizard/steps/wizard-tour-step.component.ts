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
import { ListItemBaseComponent } from '../../../shared/components/list-item-base/list-item-base.component';
import { activityToListItem, TourTagType } from '../../../shared/components/list-item-base/list-item-mappers';

@Component({
  selector: 'app-wizard-tour-step',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule, ListItemBaseComponent],
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

      @if (formCollapsed()) {
        <div class="search-toggle-bar" (click)="formCollapsed.set(false)">
          <div class="toggle-info">
            <mat-icon>explore</mat-icon>
            <span>Busca de Passeios</span>
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

      @if (results().length > 0) {
        <div class="results-list">
          <h3>{{ results().length }} passeios encontrados</h3>
          @for (tour of sortedResults(); track tour.id) {
            <app-list-item-base
              [config]="toListItem(tour)"
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

    .results-list { display: flex; flex-direction: column; gap: var(--triply-spacing-sm); }
    .results-list h3 { margin: 0 0 var(--triply-spacing-sm); font-size: 0.95rem; font-weight: 600; color: var(--triply-text-primary); }

    @media (min-width: 600px) {
      .form-row { flex-direction: row; gap: var(--triply-spacing-md); }
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
  readonly formCollapsed = signal(false);

  searchForm = new FormGroup({
    destination: new FormControl('', Validators.required),
  });

  // Categorization
  readonly categorized = computed((): CategorizedTours<Activity> =>
    categorizeTours(this.results())
  );

  readonly sortedResults = computed(() => {
    const cat = this.categorized();
    const all = cat.all;
    if (!cat.bestValue) return all;
    return [cat.bestValue, ...all.filter(t => t.id !== cat.bestValue!.id)];
  });

  isAdded(id: string): boolean {
    return this.selectedTours().some((t) => t.id === id);
  }

  getTourTag(tour: Activity): TourTagType | null {
    const cat = this.categorized();
    if (cat.bestValue?.id === tour.id) return 'bestValue';
    if (cat.cheapest?.id === tour.id) return 'cheapest';
    if (cat.bestRated?.id === tour.id) return 'bestRated';
    return null;
  }

  toListItem(tour: Activity) {
    return activityToListItem(tour, {
      isAdded: this.isAdded(tour.id),
      tag: this.getTourTag(tour),
    });
  }

  selectById(id: string): void {
    const tour = this.results().find(t => t.id === id);
    if (tour) this.select(tour);
  }

  openDetailById(id: string): void {
    const tour = this.results().find(t => t.id === id) ?? this.selectedTours().find(t => t.id === id);
    if (tour) this.openDetail(tour);
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
    this.formCollapsed.set(true);

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
