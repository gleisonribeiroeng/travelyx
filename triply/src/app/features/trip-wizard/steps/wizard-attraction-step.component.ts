import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, switchMap, finalize } from 'rxjs/operators';
import { NotificationService } from '../../../core/services/notification.service';
import { MatDialog } from '@angular/material/dialog';
import { ItemDetailDialogComponent, ItemDetailData, ItemDetailResult } from '../../../shared/components/item-detail-dialog/item-detail-dialog.component';
import { MATERIAL_IMPORTS } from '../../../core/material.exports';
import { ScheduleDialogComponent, ScheduleDialogData } from '../../../shared/components/schedule-dialog/schedule-dialog.component';
import { AttractionApiService } from '../../../core/api/attraction-api.service';
import { HotelApiService, DestinationOption } from '../../../core/api/hotel-api.service';
import { TripStateService } from '../../../core/services/trip-state.service';
import { Attraction } from '../../../core/models/trip.models';
import { ListItemBaseComponent } from '../../../shared/components/list-item-base/list-item-base.component';
import { attractionToListItem } from '../../../shared/components/list-item-base/list-item-mappers';

@Component({
  selector: 'app-wizard-attraction-step',
  standalone: true,
  imports: [MATERIAL_IMPORTS, ReactiveFormsModule, CommonModule, ListItemBaseComponent],
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

      @if (formCollapsed()) {
        <div class="search-toggle-bar" (click)="formCollapsed.set(false)">
          <div class="toggle-info">
            <mat-icon>museum</mat-icon>
            <span>Busca de Atrações</span>
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
        <div class="results-list">
          <h3>{{ results().length }} atrações encontradas</h3>
          @for (attr of results(); track attr.id) {
            <app-list-item-base
              [config]="toListItem(attr)"
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
export class WizardAttractionStepComponent {
  private readonly api = inject(AttractionApiService);
  private readonly tripState = inject(TripStateService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  readonly selectedAttractions = this.tripState.attractions;
  readonly results = signal<Attraction[]>([]);
  readonly isSearching = signal(false);
  readonly hasSearched = signal(false);
  readonly formCollapsed = signal(false);

  searchForm = new FormGroup({
    city: new FormControl('', Validators.required),
  });

  isAdded(id: string): boolean {
    return this.selectedAttractions().some((a) => a.id === id);
  }

  toListItem(attr: Attraction) {
    return attractionToListItem(attr, { isAdded: this.isAdded(attr.id) });
  }

  selectById(id: string): void {
    const attr = this.results().find(a => a.id === id);
    if (attr) this.select(attr);
  }

  openDetailById(id: string): void {
    const attr = this.results().find(a => a.id === id) ?? this.selectedAttractions().find(a => a.id === id);
    if (attr) this.openDetail(attr);
  }

  search(): void {
    if (this.searchForm.invalid) return;
    this.isSearching.set(true);
    this.hasSearched.set(true);
    this.formCollapsed.set(true);

    this.api.searchAttractions({ city: this.searchForm.value.city ?? '' })
      .pipe(finalize(() => this.isSearching.set(false)))
      .subscribe({
        next: (result) => {
          this.results.set(result.data);
        },
      });
  }

  openDetail(attraction: Attraction): void {
    const ref = this.dialog.open(ItemDetailDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { type: 'attraction', item: attraction, isAdded: this.isAdded(attraction.id) } as ItemDetailData,
    });
    ref.afterClosed().subscribe((result: ItemDetailResult) => {
      if (!result) return;
      if (result.action === 'add') this.select(attraction);
      else if (result.action === 'remove') this.remove(attraction.id);
    });
  }

  select(attraction: Attraction): void {
    const dialogRef = this.dialog.open(ScheduleDialogComponent, {
      width: '400px',
      panelClass: 'mobile-fullscreen-dialog',
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
        isPaid: false,
        attachment: null,
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
