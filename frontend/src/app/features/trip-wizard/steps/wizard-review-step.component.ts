import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService } from '../../../core/services/notification.service';
import { MATERIAL_IMPORTS } from '../../../core/material.exports';
import { TripStateService } from '../../../core/services/trip-state.service';

@Component({
  selector: 'app-wizard-review-step',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CommonModule],
  template: `
    <div class="wizard-step">
      <div class="step-header">
        <h2>Revisão da viagem</h2>
        <p>Confira tudo o que você adicionou antes de finalizar</p>
      </div>

      @if (isEmpty()) {
        <div class="empty-state">
          <mat-icon>luggage</mat-icon>
          <h3>Nenhum item adicionado</h3>
          <p>Você pulou todas as etapas. Volte e adicione pelo menos um item para montar seu roteiro.</p>
        </div>
      } @else {
        <!-- Summary stats -->
        <div class="summary-stats">
          @if (flightCount() > 0) {
            <div class="stat-chip">
              <mat-icon>flight</mat-icon>
              <span>{{ flightCount() }} voo(s)</span>
            </div>
          }
          @if (hotelCount() > 0) {
            <div class="stat-chip">
              <mat-icon>hotel</mat-icon>
              <span>{{ hotelCount() }} hotel(is)</span>
            </div>
          }
          @if (carCount() > 0) {
            <div class="stat-chip">
              <mat-icon>directions_car</mat-icon>
              <span>{{ carCount() }} carro(s)</span>
            </div>
          }
          @if (transportCount() > 0) {
            <div class="stat-chip">
              <mat-icon>directions_bus</mat-icon>
              <span>{{ transportCount() }} transporte(s)</span>
            </div>
          }
          @if (tourCount() > 0) {
            <div class="stat-chip">
              <mat-icon>local_activity</mat-icon>
              <span>{{ tourCount() }} passeio(s)</span>
            </div>
          }
          @if (attractionCount() > 0) {
            <div class="stat-chip">
              <mat-icon>museum</mat-icon>
              <span>{{ attractionCount() }} atração(ões)</span>
            </div>
          }
        </div>

        <!-- Flights -->
        @if (flightCount() > 0) {
          <mat-card class="review-section">
            <mat-card-content>
              <h3><mat-icon>flight</mat-icon> Voos</h3>
              @for (flight of tripState.flights(); track flight.id) {
                <div class="review-item">
                  <div class="review-item-info">
                    <strong>{{ flight.origin }} → {{ flight.destination }}</strong>
                    <span>{{ flight.airline }} {{ flight.flightNumber }}</span>
                  </div>
                  <span class="review-item-price">{{ flight.price.currency }} {{ flight.price.total | number:'1.2-2' }}</span>
                  <button mat-icon-button color="warn" (click)="removeFlight(flight.id)">
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </div>
              }
            </mat-card-content>
          </mat-card>
        }

        <!-- Hotels -->
        @if (hotelCount() > 0) {
          <mat-card class="review-section">
            <mat-card-content>
              <h3><mat-icon>hotel</mat-icon> Hotéis</h3>
              @for (hotel of tripState.stays(); track hotel.id) {
                <div class="review-item">
                  <div class="review-item-info">
                    <strong>{{ hotel.name }}</strong>
                    <span>{{ hotel.checkIn }} a {{ hotel.checkOut }}</span>
                  </div>
                  <span class="review-item-price">{{ hotel.pricePerNight.currency }} {{ hotel.pricePerNight.total | number:'1.2-2' }}/noite</span>
                  <button mat-icon-button color="warn" (click)="removeHotel(hotel.id)">
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </div>
              }
            </mat-card-content>
          </mat-card>
        }

        <!-- Cars -->
        @if (carCount() > 0) {
          <mat-card class="review-section">
            <mat-card-content>
              <h3><mat-icon>directions_car</mat-icon> Carros</h3>
              @for (car of tripState.carRentals(); track car.id) {
                <div class="review-item">
                  <div class="review-item-info">
                    <strong>{{ car.vehicleType }}</strong>
                    <span>{{ car.pickUpLocation }}</span>
                  </div>
                  <span class="review-item-price">{{ car.price.currency }} {{ car.price.total | number:'1.2-2' }}</span>
                  <button mat-icon-button color="warn" (click)="removeCar(car.id)">
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </div>
              }
            </mat-card-content>
          </mat-card>
        }

        <!-- Transports -->
        @if (transportCount() > 0) {
          <mat-card class="review-section">
            <mat-card-content>
              <h3><mat-icon>directions_bus</mat-icon> Transportes</h3>
              @for (t of tripState.transports(); track t.id) {
                <div class="review-item">
                  <div class="review-item-info">
                    <strong>{{ t.origin }} → {{ t.destination }}</strong>
                    <span>{{ t.mode | titlecase }}</span>
                  </div>
                  <span class="review-item-price">{{ t.price.currency }} {{ t.price.total | number:'1.2-2' }}</span>
                  <button mat-icon-button color="warn" (click)="removeTransport(t.id)">
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </div>
              }
            </mat-card-content>
          </mat-card>
        }

        <!-- Tours -->
        @if (tourCount() > 0) {
          <mat-card class="review-section">
            <mat-card-content>
              <h3><mat-icon>local_activity</mat-icon> Passeios</h3>
              @for (tour of tripState.activities(); track tour.id) {
                <div class="review-item">
                  <div class="review-item-info">
                    <strong>{{ tour.name }}</strong>
                    <span>{{ tour.city }}</span>
                  </div>
                  <span class="review-item-price">{{ tour.price.currency }} {{ tour.price.total | number:'1.2-2' }}</span>
                  <button mat-icon-button color="warn" (click)="removeTour(tour.id)">
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </div>
              }
            </mat-card-content>
          </mat-card>
        }

        <!-- Attractions -->
        @if (attractionCount() > 0) {
          <mat-card class="review-section">
            <mat-card-content>
              <h3><mat-icon>museum</mat-icon> Atrações</h3>
              @for (attr of tripState.attractions(); track attr.id) {
                <div class="review-item">
                  <div class="review-item-info">
                    <strong>{{ attr.name }}</strong>
                    <span>{{ attr.city }} &middot; {{ attr.category }}</span>
                  </div>
                  <button mat-icon-button color="warn" (click)="removeAttraction(attr.id)">
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </div>
              }
            </mat-card-content>
          </mat-card>
        }

        <!-- Total cost -->
        <mat-card class="total-card">
          <mat-card-content>
            <div class="total-row">
              <span class="total-label">Custo total estimado</span>
              <span class="total-value">BRL {{ totalCost() | number:'1.2-2' }}</span>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Finalize button -->
        <button mat-flat-button color="primary" class="finalize-btn" (click)="finalize()">
          <mat-icon>check_circle</mat-icon>
          Finalizar e ver roteiro
        </button>
      }
    </div>
  `,
  styles: [`
    .wizard-step { display: flex; flex-direction: column; gap: var(--triply-spacing-md); }
    .step-header h2 { margin: 0 0 4px; font-size: 1.3rem; font-weight: 700; color: #0D0B30; }
    .step-header p { margin: 0; font-size: 0.9rem; color: var(--mat-sys-on-surface-variant); }

    .empty-state { text-align: center; padding: var(--triply-spacing-xl); }
    .empty-state mat-icon { font-size: 56px; width: 56px; height: 56px; color: var(--mat-sys-on-surface-variant); opacity: 0.5; }
    .empty-state h3 { margin: 12px 0 8px; font-size: 1.1rem; font-weight: 700; color: #0D0B30; }
    .empty-state p { margin: 0; font-size: 0.9rem; color: var(--mat-sys-on-surface-variant); }

    .summary-stats { display: flex; flex-wrap: wrap; gap: 8px; }
    .stat-chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; background: rgba(124,77,255,0.1); color: #7C4DFF; border-radius: 20px; font-size: 0.85rem; font-weight: 500; }
    .stat-chip mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .review-section { margin-bottom: 4px; }
    .review-section h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; font-size: 1rem; font-weight: 700; color: #0D0B30; }
    .review-section h3 mat-icon { font-size: 20px; width: 20px; height: 20px; color: #7C4DFF; }

    .review-item { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(0,0,0,0.06); }
    .review-item:last-child { border-bottom: none; }
    .review-item-info { flex: 1; display: flex; flex-direction: column; }
    .review-item-info strong { font-size: 0.9rem; color: #0D0B30; }
    .review-item-info span { font-size: 0.8rem; color: var(--mat-sys-on-surface-variant); }
    .review-item-price { font-weight: 700; color: #7C4DFF; font-size: 0.9rem; white-space: nowrap; }

    .total-card { background: var(--mat-sys-surface-container-low) !important; }
    .total-row { display: flex; justify-content: space-between; align-items: center; }
    .total-label { font-size: 1rem; font-weight: 600; color: #0D0B30; }
    .total-value { font-size: 1.3rem; font-weight: 700; color: #7C4DFF; }

    .finalize-btn { width: 100%; height: 48px; font-size: 1rem; }

    @media (max-width: 600px) {
      .summary-stats { gap: 6px; }
      .stat-chip { font-size: 0.8rem; padding: 4px 10px; }
    }
  `],
})
export class WizardReviewStepComponent {
  readonly tripState = inject(TripStateService);
  private readonly router = inject(Router);
  private readonly notify = inject(NotificationService);

  readonly flightCount = computed(() => this.tripState.flights().length);
  readonly hotelCount = computed(() => this.tripState.stays().length);
  readonly carCount = computed(() => this.tripState.carRentals().length);
  readonly transportCount = computed(() => this.tripState.transports().length);
  readonly tourCount = computed(() => this.tripState.activities().length);
  readonly attractionCount = computed(() => this.tripState.attractions().length);

  readonly isEmpty = computed(() =>
    this.flightCount() === 0 &&
    this.hotelCount() === 0 &&
    this.carCount() === 0 &&
    this.transportCount() === 0 &&
    this.tourCount() === 0 &&
    this.attractionCount() === 0
  );

  readonly totalCost = computed(() => {
    let total = 0;
    for (const f of this.tripState.flights()) total += f.price.total;
    for (const h of this.tripState.stays()) total += h.pricePerNight.total;
    for (const c of this.tripState.carRentals()) total += c.price.total;
    for (const t of this.tripState.transports()) total += t.price.total;
    for (const a of this.tripState.activities()) total += a.price.total;
    return total;
  });

  removeFlight(id: string): void {
    this.tripState.removeFlight(id);
    this.removeItineraryRef(id);
  }

  removeHotel(id: string): void {
    this.tripState.removeStay(id);
    this.removeItineraryRef(id);
  }

  removeCar(id: string): void {
    this.tripState.removeCarRental(id);
    this.removeItineraryRef(id);
  }

  removeTransport(id: string): void {
    this.tripState.removeTransport(id);
    this.removeItineraryRef(id);
  }

  removeTour(id: string): void {
    this.tripState.removeActivity(id);
    this.removeItineraryRef(id);
  }

  removeAttraction(id: string): void {
    this.tripState.removeAttraction(id);
    this.removeItineraryRef(id);
  }

  private removeItineraryRef(refId: string): void {
    const item = this.tripState.itineraryItems().find((i) => i.refId === refId);
    if (item) {
      this.tripState.removeItineraryItem(item.id);
    }
  }

  finalize(): void {
    this.notify.success('Viagem finalizada! Confira seu roteiro.');
    this.router.navigate(['/itinerary']);
  }
}
