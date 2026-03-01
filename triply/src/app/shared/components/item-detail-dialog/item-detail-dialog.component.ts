import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MATERIAL_IMPORTS } from '../../../core/material.exports';
import {
  Flight, Stay, CarRental, Transport, Activity, Attraction,
} from '../../../core/models/trip.models';
import { ExternalLink } from '../../../core/models/base.model';

// ─── Public API ────────────────────────────────────────────────────────────────

export type ItemDetailData =
  | { type: 'flight'; item: Flight; isAdded: boolean }
  | { type: 'stay'; item: Stay; isAdded: boolean }
  | { type: 'car-rental'; item: CarRental; isAdded: boolean }
  | { type: 'transport'; item: Transport; isAdded: boolean }
  | { type: 'activity'; item: Activity; isAdded: boolean }
  | { type: 'attraction'; item: Attraction; isAdded: boolean };

export type ItemDetailResult =
  | { action: 'add' }
  | { action: 'remove' }
  | { action: 'edit' }
  | undefined;

// ─── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  flight: 'Voo', stay: 'Hotel', 'car-rental': 'Aluguel de Carro',
  transport: 'Transporte', activity: 'Passeio', attraction: 'Atração',
};

const TYPE_ICONS: Record<string, string> = {
  flight: 'flight', stay: 'hotel', 'car-rental': 'directions_car',
  transport: 'directions_bus', activity: 'local_activity', attraction: 'museum',
};

const MODE_LABELS: Record<string, string> = {
  bus: 'Ônibus', train: 'Trem', ferry: 'Balsa', other: 'Outro',
};

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, '0')}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

@Component({
  selector: 'app-item-detail-dialog',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CommonModule],
  template: `
    <!-- Header -->
    <div class="detail-header">
      <div class="header-left">
        <mat-icon class="type-icon">{{ typeIcon() }}</mat-icon>
        <div>
          <span class="type-label">{{ typeLabel() }}</span>
          <h2>{{ title() }}</h2>
          @if (isManual()) {
            <span class="manual-badge"><mat-icon>edit_note</mat-icon> Entrada manual</span>
          }
        </div>
      </div>
      <button mat-icon-button (click)="onClose()" aria-label="Fechar">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <!-- Added banner -->
    @if (data.isAdded) {
      <div class="added-banner">
        <mat-icon>check_circle</mat-icon>
        <span>Este item já está no seu roteiro</span>
      </div>
    }

    <mat-dialog-content>
      <!-- Hero image -->
      @if (images().length > 0) {
        <div class="hero-section">
          <img [src]="images()[selectedImage()]" class="hero-image" alt=""
               (error)="onImageError($event)">
          @if (images().length > 1) {
            <div class="thumb-strip">
              @for (img of images(); track img; let i = $index) {
                <img [src]="img" class="thumb" [class.active]="i === selectedImage()"
                     (click)="selectedImage.set(i)" alt=""
                     (error)="onImageError($event)">
              }
            </div>
          }
        </div>
      }

      <!-- Type-specific content -->
      <div class="detail-body">
        @switch (data.type) {
          @case ('flight') {
            <div class="info-section">
              <div class="flight-route">
                <div class="route-point">
                  <span class="iata">{{ asF().origin }}</span>
                  <span class="time">{{ fmtTime(asF().departureAt) }}</span>
                  <span class="date">{{ fmtDate(asF().departureAt) }}</span>
                </div>
                <div class="route-line">
                  <mat-icon>flight_takeoff</mat-icon>
                  <div class="connector"></div>
                  <span class="duration-label">{{ fmtDuration(asF().durationMinutes) }}</span>
                  <div class="connector"></div>
                  <mat-icon>flight_land</mat-icon>
                </div>
                <div class="route-point">
                  <span class="iata">{{ asF().destination }}</span>
                  <span class="time">{{ fmtTime(asF().arrivalAt) }}</span>
                  <span class="date">{{ fmtDate(asF().arrivalAt) }}</span>
                </div>
              </div>
            </div>
            <div class="info-grid">
              <div class="info-item">
                <mat-icon>airlines</mat-icon>
                <div><span class="label">Companhia</span><span class="value">{{ asF().airline }}</span></div>
              </div>
              <div class="info-item">
                <mat-icon>confirmation_number</mat-icon>
                <div><span class="label">Voo</span><span class="value">{{ asF().flightNumber }}</span></div>
              </div>
              <div class="info-item">
                <mat-icon>schedule</mat-icon>
                <div><span class="label">Duração</span><span class="value">{{ fmtDuration(asF().durationMinutes) }}</span></div>
              </div>
              <div class="info-item">
                <mat-icon>connecting_airports</mat-icon>
                <div><span class="label">Paradas</span><span class="value">{{ asF().stops === 0 ? 'Direto' : asF().stops + ' parada(s)' }}</span></div>
              </div>
              @if (asF().terminal) {
                <div class="info-item">
                  <mat-icon>door_front</mat-icon>
                  <div><span class="label">Terminal</span><span class="value">{{ asF().terminal }}</span></div>
                </div>
              }
              @if (asF().gate) {
                <div class="info-item">
                  <mat-icon>meeting_room</mat-icon>
                  <div><span class="label">Portao</span><span class="value">{{ asF().gate }}</span></div>
                </div>
              }
              @if (asF().seat) {
                <div class="info-item">
                  <mat-icon>airline_seat_recline_normal</mat-icon>
                  <div><span class="label">Assento</span><span class="value">{{ asF().seat }}</span></div>
                </div>
              }
              @if (asF().reservationNumber) {
                <div class="info-item">
                  <mat-icon>bookmark</mat-icon>
                  <div><span class="label">Reserva</span><span class="value">{{ asF().reservationNumber }}</span></div>
                </div>
              }
            </div>
            <div class="price-section">
              <span class="price-value">{{ asF().price.currency }} {{ asF().price.total | number:'1.2-2' }}</span>
              <span class="price-label">por pessoa</span>
            </div>
          }

          @case ('stay') {
            <div class="info-grid">
              <div class="info-item">
                <mat-icon>location_on</mat-icon>
                <div><span class="label">Endereço</span><span class="value">{{ asH().address }}</span></div>
              </div>
              <div class="info-item">
                <mat-icon>calendar_today</mat-icon>
                <div><span class="label">Check-in</span><span class="value">{{ fmtDate(asH().checkIn) }}</span></div>
              </div>
              <div class="info-item">
                <mat-icon>event</mat-icon>
                <div><span class="label">Check-out</span><span class="value">{{ fmtDate(asH().checkOut) }}</span></div>
              </div>
              @if (asH().rating) {
                <div class="info-item">
                  <mat-icon class="star">star</mat-icon>
                  <div>
                    <span class="label">Avaliação</span>
                    <span class="value">{{ asH().rating!.toFixed(1) }} ({{ asH().reviewCount }} avaliações)</span>
                  </div>
                </div>
              }
              @if (asH().checkInTime) {
                <div class="info-item">
                  <mat-icon>schedule</mat-icon>
                  <div><span class="label">Hora check-in</span><span class="value">{{ asH().checkInTime }}</span></div>
                </div>
              }
              @if (asH().checkOutTime) {
                <div class="info-item">
                  <mat-icon>schedule</mat-icon>
                  <div><span class="label">Hora check-out</span><span class="value">{{ asH().checkOutTime }}</span></div>
                </div>
              }
              @if (asH().reservationNumber) {
                <div class="info-item">
                  <mat-icon>bookmark</mat-icon>
                  <div><span class="label">Reserva</span><span class="value">{{ asH().reservationNumber }}</span></div>
                </div>
              }
            </div>
            <div class="price-section">
              <span class="price-value">{{ asH().pricePerNight.currency }} {{ asH().pricePerNight.total | number:'1.2-2' }}</span>
              <span class="price-label">/noite</span>
            </div>
          }

          @case ('car-rental') {
            <div class="info-grid">
              <div class="info-item">
                <mat-icon>directions_car</mat-icon>
                <div><span class="label">Veículo</span><span class="value">{{ asCar().vehicleType }}</span></div>
              </div>
              <div class="info-item">
                <mat-icon>pin_drop</mat-icon>
                <div><span class="label">Retirada</span><span class="value">{{ asCar().pickUpLocation }}<br>{{ fmtDate(asCar().pickUpAt) }} {{ fmtTime(asCar().pickUpAt) }}</span></div>
              </div>
              <div class="info-item">
                <mat-icon>flag</mat-icon>
                <div><span class="label">Devolução</span><span class="value">{{ asCar().dropOffLocation }}<br>{{ fmtDate(asCar().dropOffAt) }} {{ fmtTime(asCar().dropOffAt) }}</span></div>
              </div>
            </div>
            <div class="price-section">
              <span class="price-value">{{ asCar().price.currency }} {{ asCar().price.total | number:'1.2-2' }}</span>
              <span class="price-label">total</span>
            </div>
          }

          @case ('transport') {
            <div class="info-section">
              <div class="transport-route">
                <div class="route-point">
                  <span class="city-name">{{ asTr().origin }}</span>
                  <span class="time">{{ fmtTime(asTr().departureAt) }}</span>
                  <span class="date">{{ fmtDate(asTr().departureAt) }}</span>
                </div>
                <div class="route-arrow">
                  <mat-icon>{{ transportIcon() }}</mat-icon>
                  <span>{{ fmtDuration(asTr().durationMinutes) }}</span>
                </div>
                <div class="route-point">
                  <span class="city-name">{{ asTr().destination }}</span>
                  <span class="time">{{ fmtTime(asTr().arrivalAt) }}</span>
                  <span class="date">{{ fmtDate(asTr().arrivalAt) }}</span>
                </div>
              </div>
            </div>
            <div class="info-grid">
              <div class="info-item">
                <mat-icon>commute</mat-icon>
                <div><span class="label">Tipo</span><span class="value">{{ transportMode() }}</span></div>
              </div>
              <div class="info-item">
                <mat-icon>schedule</mat-icon>
                <div><span class="label">Duração</span><span class="value">{{ fmtDuration(asTr().durationMinutes) }}</span></div>
              </div>
            </div>
            <div class="price-section">
              <span class="price-value">{{ asTr().price.currency }} {{ asTr().price.total | number:'1.2-2' }}</span>
              <span class="price-label">por pessoa</span>
            </div>
          }

          @case ('activity') {
            <p class="description">{{ asTour().description }}</p>
            <div class="info-grid">
              <div class="info-item">
                <mat-icon>location_on</mat-icon>
                <div><span class="label">Cidade</span><span class="value">{{ asTour().city }}</span></div>
              </div>
              @if (asTour().durationMinutes) {
                <div class="info-item">
                  <mat-icon>schedule</mat-icon>
                  <div><span class="label">Duração</span><span class="value">{{ fmtDuration(asTour().durationMinutes!) }}</span></div>
                </div>
              }
              @if (asTour().rating) {
                <div class="info-item">
                  <mat-icon class="star">star</mat-icon>
                  <div>
                    <span class="label">Avaliação</span>
                    <span class="value">{{ asTour().rating!.toFixed(1) }} ({{ asTour().reviewCount }} avaliações)</span>
                  </div>
                </div>
              }
            </div>
            <div class="price-section">
              <span class="price-value">{{ asTour().price.currency }} {{ asTour().price.total | number:'1.2-2' }}</span>
              <span class="price-label">por pessoa</span>
            </div>
          }

          @case ('attraction') {
            <div class="category-badge">{{ asAttr().category }}</div>
            <p class="description">{{ asAttr().description }}</p>
            <div class="info-grid">
              <div class="info-item">
                <mat-icon>location_on</mat-icon>
                <div><span class="label">Cidade</span><span class="value">{{ asAttr().city }}</span></div>
              </div>
            </div>
          }
        }

        <!-- External link -->
        @if (externalLink(); as link) {
          @if (link.url && link.provider !== 'manual') {
            <a class="external-link" [href]="link.url" target="_blank" rel="noopener noreferrer">
              <mat-icon>open_in_new</mat-icon>
              Ver em {{ link.provider }}
            </a>
          }
        }
      </div>
    </mat-dialog-content>

    <!-- Sticky actions -->
    <mat-dialog-actions class="detail-actions">
      <button mat-button (click)="onClose()">Fechar</button>
      <div class="action-spacer"></div>
      @if (isManual() && data.isAdded) {
        <button mat-stroked-button (click)="onEdit()">
          <mat-icon>edit</mat-icon>
          Editar
        </button>
      }
      @if (data.isAdded) {
        <button mat-stroked-button color="warn" (click)="onRemove()">
          <mat-icon>delete_outline</mat-icon>
          Remover do roteiro
        </button>
      } @else {
        <button mat-flat-button color="primary" (click)="onAdd()">
          <mat-icon>add</mat-icon>
          Adicionar ao roteiro
        </button>
      }
    </mat-dialog-actions>
  `,
  styles: [`
    /* ─── Header ─────────────────────────────────────────────────── */
    .detail-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: var(--triply-spacing-sm) var(--triply-spacing-md);
      border-bottom: 1px solid var(--triply-border-subtle);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .type-icon {
      color: var(--triply-primary);
      font-size: 28px;
      width: 28px;
      height: 28px;
      flex-shrink: 0;
    }

    .type-label {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--triply-primary);
    }

    h2 {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: var(--triply-text-primary);
      line-height: 1.3;
    }

    /* ─── Added banner ───────────────────────────────────────────── */
    .added-banner {
      display: flex;
      align-items: center;
      gap: var(--triply-spacing-sm);
      padding: 10px var(--triply-spacing-lg);
      background: rgba(16, 185, 129, 0.08);
      border-bottom: 1px solid rgba(16, 185, 129, 0.15);
      color: #059669;
      font-size: 0.85rem;
      font-weight: 600;

      mat-icon {
        color: var(--triply-success);
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    /* ─── Hero image ─────────────────────────────────────────────── */
    .hero-section {
      margin-bottom: var(--triply-spacing-md);
    }

    .hero-image {
      width: 100%;
      max-height: 180px;
      object-fit: cover;
      border-radius: 0;
    }

    .thumb-strip {
      display: flex;
      gap: 6px;
      margin-top: 8px;
      overflow-x: auto;
      scrollbar-width: none;
      &::-webkit-scrollbar { display: none; }
    }

    .thumb {
      width: 56px;
      height: 40px;
      object-fit: cover;
      border-radius: 4px;
      cursor: pointer;
      opacity: 0.5;
      transition: opacity 0.2s ease;
      flex-shrink: 0;

      &.active, &:hover {
        opacity: 1;
      }
    }

    /* ─── Detail body ────────────────────────────────────────────── */
    .detail-body {
      display: flex;
      flex-direction: column;
      gap: var(--triply-spacing-md);
    }

    .description {
      margin: 0;
      font-size: 0.9rem;
      line-height: 1.6;
      color: var(--triply-text-primary);
    }

    .category-badge {
      display: inline-block;
      padding: 3px 10px;
      background: var(--triply-primary-muted);
      color: var(--triply-primary);
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 12px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      align-self: flex-start;
    }

    /* ─── Info grid ──────────────────────────────────────────────── */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
    }

    .info-item {
      display: flex;
      gap: 10px;
      align-items: flex-start;

      mat-icon {
        color: var(--triply-text-secondary);
        font-size: 20px;
        width: 20px;
        height: 20px;
        margin-top: 2px;
        flex-shrink: 0;

        &.star { color: var(--triply-cat-flight); }
      }

      .label {
        display: block;
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        color: var(--triply-text-secondary);
        margin-bottom: 2px;
      }

      .value {
        display: block;
        font-size: 0.88rem;
        color: var(--triply-text-primary);
        font-weight: 500;
        line-height: 1.4;
      }
    }

    /* ─── Flight route ───────────────────────────────────────────── */
    .flight-route, .transport-route {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: var(--triply-spacing-md);
      background: var(--triply-primary-muted);
      border-radius: var(--triply-radius-md);
      border: 1px solid var(--triply-primary-muted);
    }

    .route-point {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      text-align: center;
    }

    .iata, .city-name {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--triply-text-primary);
    }

    .route-point .time {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--triply-text-primary);
    }

    .route-point .date {
      font-size: 0.75rem;
      color: var(--triply-text-secondary);
    }

    .route-line {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1;
      min-width: 0;
      transform: rotate(90deg);
      width: 80px;

      mat-icon {
        color: var(--triply-primary);
        font-size: 20px;
        width: 20px;
        height: 20px;
        flex-shrink: 0;
      }

      .connector {
        flex: 1;
        height: 2px;
        background: linear-gradient(90deg, rgba(124, 77, 255, 0.3), rgba(124, 77, 255, 0.1));
        border-radius: 1px;
      }

      .duration-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--triply-primary);
        white-space: nowrap;
      }
    }

    .route-arrow {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      color: var(--triply-primary);

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }

      span {
        font-size: 0.75rem;
        font-weight: 600;
      }
    }

    /* ─── Price ───────────────────────────────────────────────────── */
    .price-section {
      display: flex;
      align-items: baseline;
      gap: 6px;
      padding: 12px var(--triply-spacing-md);
      background: var(--triply-primary-muted);
      border-radius: var(--triply-radius-md);
    }

    .price-value {
      font-size: 1.3rem;
      font-weight: 700;
      color: var(--triply-primary);
    }

    .price-label {
      font-size: 0.8rem;
      color: var(--triply-text-secondary);
    }

    /* ─── External link ──────────────────────────────────────────── */
    .external-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--triply-primary);
      text-decoration: none;
      padding: 8px 0;

      &:hover { text-decoration: underline; }

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    /* ─── Manual badge ────────────────────────────────────────────── */
    .manual-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.7rem;
      font-weight: 600;
      padding: 2px 10px;
      border-radius: 12px;
      background: rgba(124, 77, 255, 0.08);
      color: var(--triply-primary);
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-top: 2px;

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
    }

    /* ─── Actions ────────────────────────────────────────────────── */
    .detail-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      padding: var(--triply-spacing-sm) var(--triply-spacing-md) !important;
      border-top: 1px solid var(--triply-border);

      .action-spacer { display: none; }

      button {
        min-height: 44px;
        flex: 1;
        min-width: 120px;
      }

      button mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        margin-right: 4px;
      }
    }

    /* ─── Desktop enhancements ──────────────────────────────────── */
    @media (min-width: 600px) {
      .detail-header {
        padding: var(--triply-spacing-md) var(--triply-spacing-lg);
      }

      h2 { font-size: 1.15rem; }

      .hero-image {
        border-radius: var(--triply-radius-md);
        max-height: 240px;
      }

      .info-grid {
        grid-template-columns: 1fr 1fr;
      }

      .flight-route, .transport-route {
        flex-direction: row;
        gap: 12px;
      }

      .route-line {
        transform: none;
        width: auto;
      }

      .detail-actions {
        flex-wrap: nowrap;
        padding: var(--triply-spacing-sm) var(--triply-spacing-lg) !important;

        .action-spacer { display: block; flex: 1; }

        button {
          flex: none;
          min-width: 0;
        }
      }
    }
  `],
})
export class ItemDetailDialogComponent {
  readonly data = inject<ItemDetailData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ItemDetailDialogComponent>);

  readonly selectedImage = signal(0);
  readonly isManual = computed(() => this.data.item.source === 'manual');

  readonly title = computed(() => {
    switch (this.data.type) {
      case 'flight': return `${this.data.item.origin} → ${this.data.item.destination}`;
      case 'stay': return this.data.item.name;
      case 'car-rental': return this.data.item.vehicleType;
      case 'transport': return `${this.data.item.origin} → ${this.data.item.destination}`;
      case 'activity': return this.data.item.name;
      case 'attraction': return this.data.item.name;
    }
  });

  readonly typeLabel = computed(() => TYPE_LABELS[this.data.type] ?? '');
  readonly typeIcon = computed(() => TYPE_ICONS[this.data.type] ?? 'info');

  readonly images = computed((): string[] => {
    switch (this.data.type) {
      case 'stay': { const h = this.data.item; return h.photoUrl ? [h.photoUrl, ...h.images] : h.images; }
      case 'car-rental': return this.data.item.images;
      case 'activity': return this.data.item.images;
      case 'attraction': return this.data.item.images;
      default: return [];
    }
  });

  readonly externalLink = computed((): ExternalLink | null => {
    const item = this.data.item;
    if ('link' in item) return item.link ?? null;
    return null;
  });

  readonly transportIcon = computed(() => {
    if (this.data.type !== 'transport') return 'directions_bus';
    const mode = (this.data.item as Transport).mode;
    return mode === 'train' ? 'train' : mode === 'ferry' ? 'directions_boat' : 'directions_bus';
  });

  readonly transportMode = computed(() => {
    if (this.data.type !== 'transport') return '';
    return MODE_LABELS[(this.data.item as Transport).mode] ?? 'Outro';
  });

  // Type-cast helpers to avoid template casts
  asF(): Flight { return this.data.item as Flight; }
  asH(): Stay { return this.data.item as Stay; }
  asCar(): CarRental { return this.data.item as CarRental; }
  asTr(): Transport { return this.data.item as Transport; }
  asTour(): Activity { return this.data.item as Activity; }
  asAttr(): Attraction { return this.data.item as Attraction; }

  fmtDuration = formatDuration;
  fmtTime = formatTime;
  fmtDate = formatDate;

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  onClose(): void {
    this.dialogRef.close(undefined);
  }

  onAdd(): void {
    this.dialogRef.close({ action: 'add' } as ItemDetailResult);
  }

  onRemove(): void {
    this.dialogRef.close({ action: 'remove' } as ItemDetailResult);
  }

  onEdit(): void {
    this.dialogRef.close({ action: 'edit' } as ItemDetailResult);
  }
}
