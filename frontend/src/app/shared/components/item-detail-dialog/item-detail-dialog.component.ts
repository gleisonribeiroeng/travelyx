import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MATERIAL_IMPORTS } from '../../../core/material.exports';
import {
  Flight, Stay, CarRental, Transport, Activity, Attraction,
} from '../../../core/models/trip.models';
import { ExternalLink } from '../../../core/models/base.model';
import { HotelApiService, HotelDetails, HotelRoom } from '../../../core/api/hotel-api.service';
import { PriceAlertApiService, PriceAlert, PriceHistoryPoint } from '../../../core/api/price-alert-api.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';

// ─── Public API ────────────────────────────────────────────────────────────────

export type ItemDetailData =
  | { type: 'flight'; item: Flight; isAdded: boolean; isPaid?: boolean }
  | { type: 'stay'; item: Stay; isAdded: boolean; isPaid?: boolean }
  | { type: 'car-rental'; item: CarRental; isAdded: boolean; isPaid?: boolean }
  | { type: 'transport'; item: Transport; isAdded: boolean; isPaid?: boolean }
  | { type: 'activity'; item: Activity; isAdded: boolean; isPaid?: boolean }
  | { type: 'attraction'; item: Attraction; isAdded: boolean; isPaid?: boolean };

export type ItemDetailResult =
  | { action: 'add'; selectedRoom?: HotelRoom | null }
  | { action: 'remove' }
  | { action: 'edit' }
  | { action: 'togglePaid' }
  | undefined;

// ─── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  flight: 'Voo', stay: 'Hotel', 'car-rental': 'Aluguel de Carro',
  transport: 'Transporte', activity: 'Atividade', attraction: 'Atividade',
};

const TYPE_ICONS: Record<string, string> = {
  flight: 'flight', stay: 'hotel', 'car-rental': 'directions_car',
  transport: 'directions_bus', activity: 'local_activity', attraction: 'local_activity',
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
  const lang = localStorage.getItem('triply_lang') || (navigator.language.startsWith('pt') ? 'pt' : 'en');
  const locale = lang === 'pt' ? 'pt-BR' : 'en-US';
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
}

@Component({
  selector: 'app-item-detail-dialog',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CommonModule, TranslatePipe],
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
      @if (loadingPhotos()) {
        <div class="hero-section">
          <div class="hero-skeleton">
            <mat-spinner diameter="28"></mat-spinner>
            <span>{{ 'dialog.detail.loadingPhotos' | translate }}</span>
          </div>
        </div>
      } @else if (images().length > 0) {
        <div class="hero-section" [class.hero-section--car]="data.type === 'car-rental'">
          <div class="hero-image-wrapper" [class.car-image-wrapper]="data.type === 'car-rental'" (click)="openLightbox(selectedImage())">
            <img [src]="images()[selectedImage()]" class="hero-image" [class.car-image]="data.type === 'car-rental'" alt=""
                 (error)="onImageError($event)">
            <div class="hero-zoom-hint">
              <mat-icon>zoom_in</mat-icon>
            </div>
          </div>
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

      <!-- Lightbox overlay -->
      @if (lightboxOpen()) {
        <div class="lightbox" (click)="closeLightbox()">
          <button class="lb-close" (click)="closeLightbox()">
            <mat-icon>close</mat-icon>
          </button>
          <span class="lb-counter">{{ lightboxIndex() + 1 }} / {{ images().length }}</span>
          @if (images().length > 1) {
            <button class="lb-nav lb-prev" (click)="lbPrev($event)">
              <mat-icon>chevron_left</mat-icon>
            </button>
            <button class="lb-nav lb-next" (click)="lbNext($event)">
              <mat-icon>chevron_right</mat-icon>
            </button>
          }
          <div class="lb-img-wrapper"
               (click)="$event.stopPropagation()"
               (touchstart)="onTouchStart($event)"
               (touchend)="onTouchEnd($event)">
            <img [src]="images()[lightboxIndex()]" class="lb-img" alt="">
          </div>
        </div>
      }

      <!-- Type-specific content -->
      <div class="detail-body">
        @switch (data.type) {
          @case ('flight') {
            <!-- Hero route banner -->
            <div class="flight-hero">
              <div class="flight-hero-bg"></div>
              <div class="flight-hero-content">
                <div class="fh-point">
                  <span class="fh-iata">{{ asF().origin }}</span>
                  <span class="fh-time">{{ fmtTime(asF().departureAt) }}</span>
                  <span class="fh-date">{{ fmtDate(asF().departureAt) }}</span>
                </div>
                <div class="fh-route">
                  <div class="fh-line"></div>
                  <div class="fh-plane"><mat-icon>flight</mat-icon></div>
                  <div class="fh-line"></div>
                </div>
                <div class="fh-point">
                  <span class="fh-iata">{{ asF().destination }}</span>
                  <span class="fh-time">{{ fmtTime(asF().arrivalAt) }}</span>
                  <span class="fh-date">{{ fmtDate(asF().arrivalAt) }}</span>
                </div>
              </div>
              <div class="fh-meta">
                <span class="fh-chip"><mat-icon>schedule</mat-icon> {{ fmtDuration(asF().durationMinutes) }}</span>
                <span class="fh-chip"><mat-icon>{{ asF().stops === 0 ? 'check_circle' : 'connecting_airports' }}</mat-icon> {{ asF().stops === 0 ? 'Direto' : asF().stops + ' parada(s)' }}</span>
              </div>
            </div>

            <!-- Airline + flight info -->
            <div class="flight-info-strip">
              @if (asF().airlineLogo) {
                <img [src]="asF().airlineLogo" class="airline-logo-img" alt="">
              } @else {
                <div class="airline-logo-placeholder"><mat-icon>airlines</mat-icon></div>
              }
              <div class="airline-details">
                <span class="airline-name">{{ asF().airline }}</span>
                <span class="flight-number">{{ asF().flightNumber }}</span>
              </div>
              @if (asF().terminal || asF().gate || asF().seat) {
                <div class="flight-extras">
                  @if (asF().terminal) { <span class="extra-chip">Terminal {{ asF().terminal }}</span> }
                  @if (asF().gate) { <span class="extra-chip">Portão {{ asF().gate }}</span> }
                  @if (asF().seat) { <span class="extra-chip">Assento {{ asF().seat }}</span> }
                </div>
              }
            </div>

            @if (asF().reservationNumber) {
              <div class="reservation-strip">
                <mat-icon>bookmark</mat-icon>
                <span class="res-label">Reserva</span>
                <span class="res-value">{{ asF().reservationNumber }}</span>
              </div>
            }

            <!-- Price -->
            <div class="flight-price-card">
              <div class="fp-main">
                <span class="fp-value">{{ asF().price.total | number:'1.2-2' }}</span>
                <span class="fp-currency">{{ asF().price.currency }}</span>
              </div>
              <span class="fp-label">por pessoa</span>
            </div>
          }

          @case ('stay') {
            <!-- Star rating & property type banner -->
            @if (hotelDetails(); as details) {
              @if (details.starRating > 0 || details.propertyType) {
                <div class="hotel-overview-bar">
                  @if (details.starRating > 0) {
                    <div class="star-rating">
                      @for (_ of starsArray(details.starRating); track $index) {
                        <mat-icon class="star-filled">star</mat-icon>
                      }
                      @for (_ of starsArray(5 - details.starRating); track $index) {
                        <mat-icon class="star-empty">star_border</mat-icon>
                      }
                      <span class="star-count">{{ 'dialog.detail.stars' | translate:{ count: details.starRating } }}</span>
                    </div>
                  }
                  @if (details.propertyType) {
                    <span class="property-type-badge">{{ details.propertyType }}</span>
                  }
                </div>
              }
            }

            <!-- Rating & Review summary card -->
            @if (asH().rating) {
              <div class="review-summary-card">
                <div class="review-score">
                  <span class="score-number">{{ asH().rating!.toFixed(1) }}</span>
                  <span class="score-max">/5</span>
                </div>
                <div class="review-info">
                  <span class="review-word">{{ getReviewWord(asH().rating!) }}</span>
                  <span class="review-count">{{ asH().reviewCount | number }} {{ 'dialog.detail.reviews' | translate }}</span>
                </div>
                <div class="review-bar-group">
                  <div class="review-bar">
                    <div class="review-bar-fill" [style.width.%]="(asH().rating! / 5) * 100"></div>
                  </div>
                </div>
              </div>
            }

            <!-- Key info grid -->
            <div class="info-grid">
              <div class="info-item">
                <mat-icon>location_on</mat-icon>
                <div><span class="label">{{ 'dialog.detail.address' | translate }}</span><span class="value">{{ asH().address }}</span></div>
              </div>
              <div class="info-item">
                <mat-icon>calendar_today</mat-icon>
                <div><span class="label">{{ 'dialog.detail.checkIn' | translate }}</span><span class="value">{{ fmtDate(asH().checkIn) }}</span></div>
              </div>
              <div class="info-item">
                <mat-icon>event</mat-icon>
                <div><span class="label">{{ 'dialog.detail.checkOut' | translate }}</span><span class="value">{{ fmtDate(asH().checkOut) }}</span></div>
              </div>
              <div class="info-item">
                <mat-icon>nights_stay</mat-icon>
                <div><span class="label">{{ 'dialog.detail.stay' | translate }}</span><span class="value">{{ 'dialog.detail.nights' | translate:{ count: calculateNights(asH().checkIn, asH().checkOut) } }}</span></div>
              </div>
              @if (asH().checkInTime) {
                <div class="info-item">
                  <mat-icon>schedule</mat-icon>
                  <div><span class="label">{{ 'dialog.detail.checkInTime' | translate }}</span><span class="value">{{ asH().checkInTime }}</span></div>
                </div>
              }
              @if (asH().checkOutTime) {
                <div class="info-item">
                  <mat-icon>schedule</mat-icon>
                  <div><span class="label">{{ 'dialog.detail.checkOutTime' | translate }}</span><span class="value">{{ asH().checkOutTime }}</span></div>
                </div>
              }
              @if (asH().reservationNumber) {
                <div class="info-item">
                  <mat-icon>bookmark</mat-icon>
                  <div><span class="label">{{ 'dialog.detail.reservation' | translate }}</span><span class="value">{{ asH().reservationNumber }}</span></div>
                </div>
              }
            </div>

            <!-- Price -->
            <div class="price-section">
              <div class="price-main">
                <span class="price-value">{{ asH().pricePerNight.currency }} {{ asH().pricePerNight.total | number:'1.2-2' }}</span>
                <span class="price-label">{{ 'dialog.detail.perNight' | translate }}</span>
              </div>
              <span class="price-total">{{ 'dialog.detail.totalPrice' | translate }} {{ asH().pricePerNight.currency }} {{ (asH().pricePerNight.total * calculateNights(asH().checkIn, asH().checkOut)) | number:'1.2-2' }}</span>
            </div>

            <!-- Available Rooms -->
            @if (loadingRooms()) {
              <div class="details-skeleton">
                <mat-spinner diameter="20"></mat-spinner>
                <span>Buscando quartos disponíveis...</span>
              </div>
            }
            @if (hotelRooms().length > 0) {
              <div class="hotel-section">
                <h3 class="section-title"><mat-icon>bed</mat-icon> Quartos disponíveis</h3>
                <div class="rooms-list">
                  @for (room of hotelRooms(); track room.id) {
                    <div class="room-card" [class.selected]="selectedRoom()?.id === room.id" (click)="selectRoom(room)">
                      @if (room.photo) {
                        <img [src]="room.photo" class="room-photo" alt="" loading="lazy">
                      } @else {
                        <div class="room-photo-placeholder"><mat-icon>bed</mat-icon></div>
                      }
                      <div class="room-body">
                        <div class="room-info">
                          <span class="room-name">{{ room.name }}</span>
                          @if (room.bedConfig) {
                            <span class="room-bed"><mat-icon>king_bed</mat-icon> {{ room.bedConfig }}</span>
                          }
                          <div class="room-tags">
                            @if (room.roomSize) {
                              <span class="room-tag"><mat-icon>straighten</mat-icon> {{ room.roomSize }}</span>
                            }
                            @if (room.freeCancellation) {
                              <span class="room-tag room-tag-green"><mat-icon>check_circle</mat-icon> Cancelamento grátis</span>
                            }
                            @if (room.mealPlan) {
                              <span class="room-tag room-tag-blue"><mat-icon>restaurant</mat-icon> {{ room.mealPlan }}</span>
                            }
                            @if (room.maxOccupancy) {
                              <span class="room-tag"><mat-icon>person</mat-icon> Até {{ room.maxOccupancy }}</span>
                            }
                          </div>
                        </div>
                        <div class="room-footer">
                          <div class="room-price">
                            @if (room.price) {
                              <span class="room-price-value">{{ room.currency }} {{ room.price | number:'1.0-0' }}</span>
                              <span class="room-price-label">/noite</span>
                            }
                            @if (room.totalPrice && room.totalPrice !== room.price) {
                              <span class="room-total">· Total {{ room.currency }} {{ room.totalPrice | number:'1.0-0' }}</span>
                            }
                          </div>
                          <div class="room-select-indicator">
                            <mat-icon>{{ selectedRoom()?.id === room.id ? 'radio_button_checked' : 'radio_button_unchecked' }}</mat-icon>
                          </div>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Hotel details from API -->
            @if (loadingDetails()) {
              <div class="details-skeleton">
                <mat-spinner diameter="20"></mat-spinner>
                <span>{{ 'dialog.detail.loadingDetails' | translate }}</span>
              </div>
            }
            @if (hotelDetails(); as details) {
              <!-- Highlights -->
              @if (details.highlights.length > 0) {
                <div class="hotel-section">
                  <h3 class="section-title"><mat-icon>thumb_up</mat-icon> {{ 'dialog.detail.highlights' | translate }}</h3>
                  <div class="highlights-list">
                    @for (h of details.highlights; track h) {
                      <span class="highlight-chip"><mat-icon>check_circle</mat-icon> {{ h }}</span>
                    }
                  </div>
                </div>
              }

              <!-- Key Amenities visual grid -->
              @if (keyAmenities().length > 0) {
                <div class="hotel-section">
                  <h3 class="section-title"><mat-icon>star_outline</mat-icon> {{ 'dialog.detail.keyAmenities' | translate }}</h3>
                  <div class="amenities-grid">
                    @for (a of keyAmenities(); track a.name) {
                      <div class="amenity-card">
                        <mat-icon>{{ a.icon }}</mat-icon>
                        <span>{{ a.name }}</span>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Check-in / Check-out times -->
              @if (details.checkinFrom || details.checkoutTo) {
                <div class="hotel-section">
                  <h3 class="section-title"><mat-icon>schedule</mat-icon> {{ 'dialog.detail.times' | translate }}</h3>
                  <div class="times-grid">
                    @if (details.checkinFrom) {
                      <div class="time-card">
                        <mat-icon>login</mat-icon>
                        <div>
                          <span class="time-label">{{ 'dialog.detail.checkIn' | translate }}</span>
                          <span class="time-value">{{ details.checkinFrom }}{{ details.checkinTo ? ' — ' + details.checkinTo : '' }}</span>
                        </div>
                      </div>
                    }
                    @if (details.checkoutFrom || details.checkoutTo) {
                      <div class="time-card">
                        <mat-icon>logout</mat-icon>
                        <div>
                          <span class="time-label">{{ 'dialog.detail.checkOut' | translate }}</span>
                          <span class="time-value">{{ details.checkoutFrom ? details.checkoutFrom + ' — ' : i18n.t('dialog.detail.until') + ' ' }}{{ details.checkoutTo }}</span>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- All Facilities -->
              @if (details.facilities.length > 0) {
                <div class="hotel-section">
                  <h3 class="section-title"><mat-icon>room_service</mat-icon> {{ 'dialog.detail.allFacilities' | translate }}</h3>
                  <div class="facilities-list">
                    @for (f of details.facilities.slice(0, showAllFacilities() ? 999 : 12); track f.name) {
                      <span class="facility-chip">{{ f.name }}</span>
                    }
                  </div>
                  @if (details.facilities.length > 12) {
                    <button class="show-more-btn" (click)="showAllFacilities.set(!showAllFacilities())">
                      {{ showAllFacilities() ? ('dialog.detail.showLess' | translate) : ('dialog.detail.showAll' | translate:{ count: details.facilities.length }) }}
                    </button>
                  }
                </div>
              }

              <!-- Description -->
              @if (details.description) {
                <div class="hotel-section">
                  <h3 class="section-title"><mat-icon>info</mat-icon> {{ 'dialog.detail.aboutHotel' | translate }}</h3>
                  <p class="hotel-description" [class.truncated]="!showFullDescription()" (click)="showFullDescription.set(true)">{{ details.description }}</p>
                  @if (!showFullDescription() && details.description.length > 200) {
                    <button class="show-more-btn" (click)="showFullDescription.set(true)">{{ 'dialog.detail.readMore' | translate }}</button>
                  }
                </div>
              }

              <!-- Address -->
              @if (details.address) {
                <div class="hotel-section">
                  <h3 class="section-title"><mat-icon>place</mat-icon> {{ 'dialog.detail.location' | translate }}</h3>
                  <p class="hotel-address">{{ details.address }}{{ details.city ? ', ' + details.city : '' }}{{ details.country ? ' — ' + details.country : '' }}</p>
                </div>
              }
            }
          }

          @case ('car-rental') {
            <!-- Car hero: pickup → dropoff -->
            <div class="car-hero">
              <div class="car-hero-bg"></div>
              <div class="car-hero-content">
                <div class="ch-point">
                  <span class="ch-label">Retirada</span>
                  <span class="ch-time">{{ fmtTime(asCar().pickUpAt) }}</span>
                  <span class="ch-date">{{ fmtDate(asCar().pickUpAt) }}</span>
                </div>
                <div class="ch-route">
                  <div class="ch-line"></div>
                  <div class="ch-icon">
                    <mat-icon>directions_car</mat-icon>
                  </div>
                  <div class="ch-line"></div>
                </div>
                <div class="ch-point">
                  <span class="ch-label">Devolução</span>
                  <span class="ch-time">{{ fmtTime(asCar().dropOffAt) }}</span>
                  <span class="ch-date">{{ fmtDate(asCar().dropOffAt) }}</span>
                </div>
              </div>
              @if (asCar().details?.rentalDays) {
                <div class="ch-meta">
                  <span class="ch-chip">
                    <mat-icon>calendar_today</mat-icon>
                    {{ asCar().details!.rentalDays }} {{ asCar().details!.rentalDays === 1 ? 'dia' : 'dias' }}
                  </span>
                </div>
              }
            </div>

            <!-- Locations -->
            <div class="car-locations">
              <div class="car-loc-item">
                <mat-icon>pin_drop</mat-icon>
                <span>{{ asCar().pickUpLocation }}</span>
              </div>
              @if (asCar().dropOffLocation && asCar().dropOffLocation !== asCar().pickUpLocation) {
                <div class="car-loc-item">
                  <mat-icon>flag</mat-icon>
                  <span>{{ asCar().dropOffLocation }}</span>
                </div>
              }
            </div>

            <!-- Partner strip -->
            @if (asCar().partner?.name) {
              <div class="car-partner-strip">
                @if (asCar().partner!.logo) {
                  <img [src]="asCar().partner!.logo" class="partner-logo" alt="" (error)="onImageError($event)">
                } @else {
                  <div class="partner-logo-placeholder">
                    <mat-icon>store</mat-icon>
                  </div>
                }
                <div class="partner-details">
                  <span class="partner-label">Locadora</span>
                  <span class="partner-name">{{ asCar().partner!.name }}</span>
                </div>
              </div>
            }

            <!-- Vehicle detail chips -->
            @if (asCar().details) {
              <div class="car-chips">
                @if (asCar().details!.passengers) {
                  <div class="car-chip">
                    <mat-icon>person</mat-icon>
                    <span>{{ asCar().details!.passengers }} passageiros</span>
                  </div>
                }
                @if (asCar().details!.doors) {
                  <div class="car-chip">
                    <mat-icon>sensor_door</mat-icon>
                    <span>{{ asCar().details!.doors }} portas</span>
                  </div>
                }
                @if (asCar().details!.bags) {
                  <div class="car-chip">
                    <mat-icon>luggage</mat-icon>
                    <span>{{ asCar().details!.bags }} malas</span>
                  </div>
                }
                @if (asCar().details!.transmission) {
                  <div class="car-chip">
                    <mat-icon>settings</mat-icon>
                    <span>{{ asCar().details!.transmission }}</span>
                  </div>
                }
                @if (asCar().details!.airConditioning) {
                  <div class="car-chip">
                    <mat-icon>ac_unit</mat-icon>
                    <span>Ar condicionado</span>
                  </div>
                }
                @if (asCar().details!.mileage) {
                  <div class="car-chip">
                    <mat-icon>speed</mat-icon>
                    <span>{{ asCar().details!.mileage === 'Unlimited' ? 'Km ilimitado' : asCar().details!.mileage }}</span>
                  </div>
                }
              </div>

              @if (asCar().details!.freeCancellation) {
                <div class="car-free-cancel">
                  <mat-icon>verified</mat-icon>
                  <span>Cancelamento grátis</span>
                </div>
              }
            }

            <!-- Enriched price -->
            <div class="car-price-card">
              <div class="car-price-main">
                <span class="car-price-currency">{{ asCar().price.currency }}</span>
                <span class="car-price-value">{{ asCar().price.total | number:'1.2-2' }}</span>
                <span class="car-price-label">total</span>
              </div>
              @if (asCar().details?.rentalDays && asCar().details!.rentalDays! > 0) {
                <div class="car-price-daily">
                  <span>{{ asCar().price.currency }} {{ asCar().price.total / asCar().details!.rentalDays! | number:'1.2-2' }}</span>
                  <span class="car-price-label">/dia</span>
                </div>
              }
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
            <!-- Quick-glance chips -->
            <div class="tour-chips">
              <div class="tour-chip">
                <mat-icon>location_on</mat-icon>
                <span>{{ asTour().city }}</span>
              </div>
              @if (asTour().durationMinutes) {
                <div class="tour-chip">
                  <mat-icon>schedule</mat-icon>
                  <span>{{ fmtDuration(asTour().durationMinutes!) }}</span>
                </div>
              }
              @if (asTour().link?.provider) {
                <div class="tour-chip tour-chip--provider">
                  <mat-icon>storefront</mat-icon>
                  <span>{{ asTour().link.provider }}</span>
                </div>
              }
            </div>

            <!-- Rating bar -->
            @if (asTour().rating) {
              <div class="tour-rating-bar">
                <div class="tour-stars">
                  @for (s of [1,2,3,4,5]; track s) {
                    <mat-icon class="tour-star" [class.filled]="s <= Math.round(asTour().rating!)">star</mat-icon>
                  }
                </div>
                <span class="tour-rating-score">{{ asTour().rating!.toFixed(1) }}</span>
                <span class="tour-rating-count">({{ asTour().reviewCount | number }} avaliações)</span>
              </div>
            }

            <!-- Description -->
            <p class="tour-description">{{ asTour().description }}</p>

            <!-- Price card -->
            <div class="tour-price-card">
              <div class="tour-price-from">a partir de</div>
              <div class="tour-price-main">
                <span class="tour-price-currency">{{ asTour().price.currency }}</span>
                <span class="tour-price-value">{{ asTour().price.total | number:'1.2-2' }}</span>
              </div>
              <div class="tour-price-unit">por pessoa</div>
            </div>
          }

          @case ('attraction') {
            <!-- Category + city chips -->
            <div class="tour-chips">
              <div class="tour-chip tour-chip--category">
                <mat-icon>style</mat-icon>
                <span>{{ asAttr().category }}</span>
              </div>
              <div class="tour-chip">
                <mat-icon>location_on</mat-icon>
                <span>{{ asAttr().city }}</span>
              </div>
            </div>

            <!-- Description -->
            <p class="tour-description">{{ asAttr().description }}</p>
          }
        }

        <!-- Price history (for flights & hotels with active alert) -->
        @if (priceAlert(); as alert) {
          <div class="price-history-section">
            <div class="price-history-header">
              <mat-icon>show_chart</mat-icon>
              <span>Historico de Preco</span>
            </div>
            <div class="price-history-summary">
              <div class="ph-item">
                <span class="ph-label">Menor preco</span>
                <span class="ph-value lowest">{{ alert.currency }} {{ (alert.lowestPrice ?? alert.currentPrice) | number:'1.2-2' }}</span>
              </div>
              <div class="ph-item">
                <span class="ph-label">Meta</span>
                <span class="ph-value target">{{ alert.currency }} {{ alert.targetPrice | number:'1.2-2' }}</span>
              </div>
              <div class="ph-item">
                <span class="ph-label">Status</span>
                <span class="ph-value" [class.active]="alert.active">{{ alert.active ? 'Monitorando' : 'Pausado' }}</span>
              </div>
            </div>
            @if (priceHistory().length > 1) {
              <div class="mini-chart-container">
                <svg viewBox="0 0 300 60" class="mini-chart" preserveAspectRatio="none">
                  <polyline [attr.points]="miniChartPoints()" class="mini-line" fill="none" />
                  <polygon [attr.points]="miniChartArea()" class="mini-area" />
                </svg>
              </div>
            }
          </div>
        }

        <!-- How to buy hint (flights) -->
        @if (data.type === 'flight' && asF().flightNumber) {
          <div class="buy-hint">
            <mat-icon>info_outline</mat-icon>
            <span>Para comprar, busque o voo <strong>{{ asF().flightNumber }}</strong> de <strong>{{ asF().origin }} → {{ asF().destination }}</strong> em <strong>{{ asF().departureAt | date:'dd/MM/yyyy' }}</strong> no site da companhia aérea ou em sites como Booking.com ou Decolar.</span>
          </div>
        }

        <!-- External link -->
        @if (externalLink(); as link) {
          @if (link.url && link.url !== '#' && link.provider !== 'manual') {
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
      @if (data.isAdded) {
        <button mat-stroked-button (click)="onTogglePaid()" [class.paid-active]="isPaid()">
          <mat-icon>{{ isPaid() ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
          {{ isPaid() ? 'Pago' : 'Marcar como pago' }}
        </button>
      }
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

    .hero-skeleton {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      height: 220px;
      background: var(--triply-surface-1, #f3f4f6);
      border-radius: var(--triply-radius-md);
      animation: skeleton-pulse 1.5s ease-in-out infinite;

      span {
        font-size: 0.8rem;
        color: var(--triply-text-secondary);
      }
    }

    @keyframes skeleton-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .hero-image-wrapper {
      position: relative;
      cursor: pointer;
      overflow: hidden;
      border-radius: var(--triply-radius-md);

      &:hover .hero-zoom-hint {
        opacity: 1;
      }

      &:hover .hero-image {
        transform: scale(1.02);
      }
    }

    .hero-image {
      width: 100%;
      max-height: 280px;
      object-fit: cover;
      border-radius: 0;
      transition: transform 0.3s ease;
      display: block;
    }

    /* ─── Car-specific image treatment ─────────────────────────── */
    .hero-section--car {
      margin-bottom: var(--triply-spacing-sm);
    }

    .car-image-wrapper {
      background: linear-gradient(145deg, #f0f4f8 0%, #e2e8f0 40%, #f8fafc 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px 16px;
      min-height: 200px;
    }

    .car-image {
      object-fit: contain !important;
      max-height: 200px !important;
      width: auto !important;
      max-width: 90%;
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
      filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.12));
    }

    .hero-zoom-hint {
      position: absolute;
      bottom: 8px;
      right: 8px;
      background: rgba(0, 0, 0, 0.55);
      color: #fff;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s ease;
      pointer-events: none;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
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

    /* ─── Lightbox ─────────────────────────────────────────────── */
    .lightbox {
      position: fixed;
      inset: 0;
      z-index: 100000;
      background: rgba(0, 0, 0, 0.92);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: lb-fade-in 0.2s ease;
    }

    @keyframes lb-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .lb-close {
      position: absolute;
      top: 12px;
      right: 12px;
      background: rgba(255, 255, 255, 0.15);
      border: none;
      color: #fff;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 2;

      &:hover { background: rgba(255, 255, 255, 0.3); }
    }

    .lb-counter {
      position: absolute;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.85rem;
      font-weight: 600;
      z-index: 2;
    }

    .lb-nav {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(255, 255, 255, 0.15);
      border: none;
      color: #fff;
      border-radius: 50%;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 2;

      &:hover { background: rgba(255, 255, 255, 0.3); }

      mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }
    }

    .lb-prev { left: 12px; }
    .lb-next { right: 12px; }

    .lb-img-wrapper {
      max-width: 90vw;
      max-height: 85vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .lb-img {
      max-width: 100%;
      max-height: 85vh;
      object-fit: contain;
      border-radius: 8px;
      user-select: none;
      -webkit-user-drag: none;
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
    /* ─── Flight hero banner ──────────────────────────────────── */
    .flight-hero {
      position: relative;
      border-radius: var(--triply-radius-lg, 16px);
      overflow: hidden;
      padding: 28px 24px 16px;
      background: linear-gradient(135deg, #1a1a2e 0%, #2d2b55 50%, #1a1a2e 100%);
    }

    .flight-hero-bg {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 50% 120%, rgba(249, 115, 22, 0.25) 0%, transparent 60%);
      pointer-events: none;
    }

    .flight-hero-content {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .fh-point {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      text-align: center;
      min-width: 60px;
    }

    .fh-iata {
      font-size: 1.5rem;
      font-weight: 800;
      color: #fff;
      letter-spacing: 0.05em;
    }

    .fh-time {
      font-size: 1rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.9);
    }

    .fh-date {
      font-size: 0.7rem;
      color: rgba(255, 255, 255, 0.5);
    }

    .fh-route {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 0;
    }

    .fh-line {
      flex: 1;
      height: 2px;
      background: linear-gradient(90deg, rgba(255,255,255,0.1), rgba(249, 115, 22, 0.4), rgba(255,255,255,0.1));
      border-radius: 1px;
    }

    .fh-plane {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--triply-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 0 16px rgba(249, 115, 22, 0.5);
    }

    .fh-plane mat-icon {
      color: #fff;
      font-size: 18px;
      width: 18px;
      height: 18px;
      transform: rotate(45deg);
    }

    .fh-meta {
      position: relative;
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-top: 14px;
    }

    .fh-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.72rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.7);
      background: rgba(255, 255, 255, 0.08);
      padding: 4px 12px;
      border-radius: 20px;
      backdrop-filter: blur(4px);
    }

    .fh-chip mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: rgba(255, 255, 255, 0.6);
    }

    /* ─── Airline info strip ───────────────────────────────────── */
    .flight-info-strip {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 0;
    }

    .airline-logo-img {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      object-fit: contain;
      background: var(--triply-surface-2, #f0f0f4);
      padding: 4px;
    }

    .airline-logo-placeholder {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      background: var(--triply-surface-2, #f0f0f4);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .airline-logo-placeholder mat-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
      color: var(--triply-primary);
    }

    .airline-details {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .airline-name {
      font-size: 0.88rem;
      font-weight: 700;
      color: var(--triply-text-primary);
    }

    .flight-number {
      font-size: 0.75rem;
      color: var(--triply-text-secondary);
      font-weight: 500;
    }

    .flight-extras {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .extra-chip {
      font-size: 0.68rem;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 6px;
      background: var(--triply-surface-2, #f0f0f4);
      color: var(--triply-text-secondary);
    }

    /* ─── Reservation ──────────────────────────────────────────── */
    .reservation-strip {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: var(--triply-surface-2, #f5f5f8);
      border-radius: 10px;
      margin-bottom: 4px;
    }

    .reservation-strip mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--triply-primary);
    }

    .res-label {
      font-size: 0.75rem;
      color: var(--triply-text-secondary);
      font-weight: 500;
    }

    .res-value {
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--triply-text-primary);
      font-family: monospace;
      letter-spacing: 0.5px;
    }

    /* ─── Flight price card ────────────────────────────────────── */
    .flight-price-card {
      display: flex;
      align-items: baseline;
      gap: 8px;
      padding: 14px 18px;
      background: var(--triply-primary-muted, rgba(249, 115, 22, 0.06));
      border-radius: var(--triply-radius-md);
    }

    .fp-main {
      display: flex;
      align-items: baseline;
      gap: 4px;
    }

    .fp-value {
      font-size: 1.4rem;
      font-weight: 800;
      color: var(--triply-primary);
      letter-spacing: -0.02em;
    }

    .fp-currency {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--triply-primary);
      opacity: 0.7;
    }

    .fp-label {
      font-size: 0.78rem;
      color: var(--triply-text-secondary);
    }

    /* ─── Transport route (keep original styles) ───────────────── */
    .transport-route {
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

    .city-name {
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
      flex: 0 0 auto;
      min-width: 0;
      transform: rotate(90deg);
      width: 100px;
      margin: 8px 0;

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
        background: linear-gradient(90deg, rgba(249, 115, 22, 0.3), rgba(249, 115, 22, 0.1));
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

    /* ─── Car hero banner ──────────────────────────────────────── */
    .car-hero {
      position: relative;
      border-radius: var(--triply-radius-lg, 16px);
      overflow: hidden;
      padding: 24px 20px 14px;
      background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%);
    }

    .car-hero-bg {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 50% 120%, rgba(59, 130, 246, 0.2) 0%, transparent 60%);
      pointer-events: none;
    }

    .car-hero-content {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .ch-point {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      text-align: center;
      min-width: 70px;
    }

    .ch-label {
      font-size: 0.65rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: rgba(255, 255, 255, 0.5);
    }

    .ch-time {
      font-size: 1.1rem;
      font-weight: 700;
      color: #fff;
    }

    .ch-date {
      font-size: 0.7rem;
      color: rgba(255, 255, 255, 0.5);
    }

    .ch-route {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 0;
    }

    .ch-line {
      flex: 1;
      height: 2px;
      background: linear-gradient(90deg, rgba(255,255,255,0.08), rgba(59, 130, 246, 0.35), rgba(255,255,255,0.08));
      border-radius: 1px;
    }

    .ch-icon {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #3b82f6;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 0 16px rgba(59, 130, 246, 0.45);

      mat-icon {
        color: #fff;
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .ch-meta {
      position: relative;
      display: flex;
      justify-content: center;
      margin-top: 12px;
    }

    .ch-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.72rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.7);
      background: rgba(255, 255, 255, 0.08);
      padding: 4px 12px;
      border-radius: 20px;
      backdrop-filter: blur(4px);

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
        color: rgba(255, 255, 255, 0.6);
      }
    }

    /* ─── Car locations ────────────────────────────────────────── */
    .car-locations {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .car-loc-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.82rem;
      color: var(--triply-text-secondary);

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--triply-text-tertiary, #9ca3af);
        flex-shrink: 0;
      }
    }

    /* ─── Car partner strip ────────────────────────────────────── */
    .car-partner-strip {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 0;
    }

    .partner-logo {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      object-fit: contain;
      background: var(--triply-surface-2, #f0f0f4);
      padding: 4px;
    }

    .partner-logo-placeholder {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      background: var(--triply-surface-2, #f0f0f4);
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 22px;
        width: 22px;
        height: 22px;
        color: var(--triply-primary);
      }
    }

    .partner-details {
      display: flex;
      flex-direction: column;
    }

    .partner-label {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      color: var(--triply-text-secondary);
    }

    .partner-name {
      font-size: 0.88rem;
      font-weight: 700;
      color: var(--triply-text-primary);
    }

    /* ─── Car detail chips ─────────────────────────────────────── */
    .car-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .car-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 6px 12px;
      background: var(--triply-surface-2, #f0f0f4);
      border-radius: 8px;
      font-size: 0.78rem;
      font-weight: 500;
      color: var(--triply-text-primary);

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: var(--triply-text-secondary);
      }
    }

    /* ─── Free cancellation badge ──────────────────────────────── */
    .car-free-cancel {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.18);
      border-radius: 10px;
      font-size: 0.82rem;
      font-weight: 600;
      color: #059669;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: #10b981;
      }
    }

    /* ─── Car price card ───────────────────────────────────────── */
    .car-price-card {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      padding: 14px 18px;
      background: var(--triply-primary-muted, rgba(249, 115, 22, 0.06));
      border-radius: var(--triply-radius-md);
    }

    .car-price-main {
      display: flex;
      align-items: baseline;
      gap: 4px;
    }

    .car-price-currency {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--triply-primary);
      opacity: 0.7;
    }

    .car-price-value {
      font-size: 1.4rem;
      font-weight: 800;
      color: var(--triply-primary);
      letter-spacing: -0.02em;
    }

    .car-price-label {
      font-size: 0.78rem;
      color: var(--triply-text-secondary);
      margin-left: 2px;
    }

    .car-price-daily {
      display: flex;
      align-items: baseline;
      gap: 2px;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--triply-text-secondary);

      .car-price-label {
        font-size: 0.72rem;
      }
    }

    /* ─── Tour/Activity chips ──────────────────────────────────── */
    .tour-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .tour-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 6px 12px;
      background: var(--triply-surface-2, #f0f0f4);
      border-radius: 20px;
      font-size: 0.78rem;
      font-weight: 500;
      color: var(--triply-text-primary);

      mat-icon {
        font-size: 15px;
        width: 15px;
        height: 15px;
        color: var(--triply-text-secondary);
      }
    }

    .tour-chip--provider {
      background: var(--triply-primary-muted, rgba(249, 115, 22, 0.08));
      color: var(--triply-primary);

      mat-icon { color: var(--triply-primary); }
    }

    .tour-chip--category {
      background: rgba(245, 158, 11, 0.1);
      color: #b45309;

      mat-icon { color: #f59e0b; }
    }

    /* ─── Tour rating bar ──────────────────────────────────────── */
    .tour-rating-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: var(--triply-surface-1, #fafafa);
      border-radius: 10px;
    }

    .tour-stars {
      display: flex;
      gap: 1px;
    }

    .tour-star {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #d1d5db;
      transition: color 0.15s ease;

      &.filled {
        color: #f59e0b;
      }
    }

    .tour-rating-score {
      font-size: 0.95rem;
      font-weight: 800;
      color: var(--triply-text-primary);
    }

    .tour-rating-count {
      font-size: 0.78rem;
      color: var(--triply-text-secondary);
    }

    /* ─── Tour description ─────────────────────────────────────── */
    .tour-description {
      margin: 0;
      font-size: 0.85rem;
      line-height: 1.7;
      color: var(--triply-text-secondary);
      display: -webkit-box;
      -webkit-line-clamp: 5;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* ─── Tour price card ──────────────────────────────────────── */
    .tour-price-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 16px 20px;
      background: var(--triply-primary-muted, rgba(249, 115, 22, 0.06));
      border-radius: var(--triply-radius-md);
    }

    .tour-price-from {
      font-size: 0.7rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--triply-text-secondary);
    }

    .tour-price-main {
      display: flex;
      align-items: baseline;
      gap: 4px;
    }

    .tour-price-currency {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--triply-primary);
      opacity: 0.7;
    }

    .tour-price-value {
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--triply-primary);
      letter-spacing: -0.02em;
    }

    .tour-price-unit {
      font-size: 0.75rem;
      color: var(--triply-text-secondary);
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

    /* ─── Hotel details sections ─────────────────────────────────── */
    .details-skeleton {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 16px;
      background: var(--triply-surface-1, #f3f4f6);
      border-radius: var(--triply-radius-md);
      animation: skeleton-pulse 1.5s ease-in-out infinite;
      span { font-size: 0.8rem; color: var(--triply-text-secondary); }
    }

    .hotel-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 0;
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--triply-text-primary);
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--triply-primary); }
    }

    .highlights-list, .facilities-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    /* ─── Hotel overview bar (stars + property type) ─────────── */
    .hotel-overview-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
      padding: 10px 14px;
      background: linear-gradient(135deg, rgba(249, 115, 22, 0.06), rgba(249, 115, 22, 0.02));
      border: 1px solid rgba(249, 115, 22, 0.1);
      border-radius: var(--triply-radius-md);
    }

    .star-rating {
      display: flex;
      align-items: center;
      gap: 2px;

      .star-filled {
        color: #f59e0b;
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      .star-empty {
        color: #d1d5db;
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      .star-count {
        margin-left: 6px;
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--triply-text-secondary);
      }
    }

    .property-type-badge {
      padding: 3px 10px;
      background: var(--triply-primary-muted);
      color: var(--triply-primary);
      font-size: 0.72rem;
      font-weight: 600;
      border-radius: 12px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    /* ─── Review summary card ─────────────────────────────────── */
    .review-summary-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      background: var(--triply-surface-1, #f3f4f6);
      border-radius: var(--triply-radius-md);
    }

    .review-score {
      display: flex;
      align-items: baseline;
      background: var(--triply-primary);
      color: #fff;
      border-radius: 10px;
      padding: 6px 10px;
      flex-shrink: 0;

      .score-number {
        font-size: 1.2rem;
        font-weight: 800;
        line-height: 1;
      }

      .score-max {
        font-size: 0.7rem;
        font-weight: 500;
        opacity: 0.8;
      }
    }

    .review-info {
      display: flex;
      flex-direction: column;
      gap: 1px;
      min-width: 0;

      .review-word {
        font-size: 0.85rem;
        font-weight: 700;
        color: var(--triply-text-primary);
      }

      .review-count {
        font-size: 0.73rem;
        color: var(--triply-text-secondary);
      }
    }

    .review-bar-group {
      flex: 1;
      min-width: 40px;
    }

    .review-bar {
      height: 6px;
      background: rgba(0, 0, 0, 0.08);
      border-radius: 3px;
      overflow: hidden;
    }

    .review-bar-fill {
      height: 100%;
      background: var(--triply-primary);
      border-radius: 3px;
      transition: width 0.5s ease;
    }

    /* ─── Price section enhanced ──────────────────────────────── */
    .price-main {
      display: flex;
      align-items: baseline;
      gap: 6px;
    }

    .price-total {
      font-size: 0.82rem;
      color: var(--triply-text-primary);
      margin-left: auto;
      font-weight: 700;
      background: var(--triply-surface-2, #f0f0f4);
      padding: 4px 12px;
      border-radius: 8px;
    }

    /* ─── Room list ──────────────────────────────────────────── */
    .rooms-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .room-card {
      display: flex;
      gap: 12px;
      padding: 12px;
      border: 1px solid var(--triply-border-subtle, #e8e8ec);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      background: var(--triply-surface-1, #fff);
    }

    .room-card:hover {
      border-color: var(--triply-primary);
      box-shadow: 0 2px 8px rgba(249, 115, 22, 0.08);
    }

    .room-card.selected {
      border-color: var(--triply-primary);
      background: rgba(249, 115, 22, 0.04);
      box-shadow: 0 0 0 1px var(--triply-primary);
    }

    .room-photo {
      width: 150px;
      height: 110px;
      border-radius: 8px;
      object-fit: cover;
      flex-shrink: 0;
    }

    .room-photo-placeholder {
      width: 150px;
      height: 110px;
      border-radius: 8px;
      background: var(--triply-surface-2, #f0f0f4);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .room-photo-placeholder mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: var(--triply-text-tertiary, #999);
    }

    .room-body {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 6px;
    }

    .room-info {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .room-name {
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--triply-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .room-bed {
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 0.72rem;
      color: var(--triply-text-secondary);
    }

    .room-bed mat-icon {
      font-size: 13px;
      width: 13px;
      height: 13px;
    }

    .room-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .room-tag {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-size: 0.62rem;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 4px;
      background: var(--triply-surface-2, #f0f0f4);
      color: var(--triply-text-secondary);
    }

    .room-tag mat-icon {
      font-size: 11px;
      width: 11px;
      height: 11px;
    }

    .room-tag-green {
      background: rgba(34, 197, 94, 0.1);
      color: #059669;
    }

    .room-tag-blue {
      background: rgba(59, 130, 246, 0.1);
      color: #2563eb;
    }

    .room-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .room-price {
      display: flex;
      align-items: baseline;
      gap: 4px;
    }

    .room-price-value {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--triply-primary);
      white-space: nowrap;
    }

    .room-price-label {
      font-size: 0.7rem;
      color: var(--triply-text-secondary);
    }

    .room-total {
      font-size: 0.68rem;
      color: var(--triply-text-tertiary, #999);
      white-space: nowrap;
      margin-left: 6px;
    }

    .room-select-indicator {
      flex-shrink: 0;
    }

    .room-select-indicator mat-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
      color: var(--triply-border-subtle, #ccc);
      transition: color 0.2s ease;
    }

    .room-card.selected .room-select-indicator mat-icon {
      color: var(--triply-primary);
    }

    /* ─── Key amenities grid ─────────────────────────────────── */
    .amenities-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }

    .amenity-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 10px 6px;
      background: var(--triply-surface-1, #f3f4f6);
      border-radius: var(--triply-radius-md);
      text-align: center;
      transition: background 0.2s ease;

      &:hover {
        background: rgba(249, 115, 22, 0.06);
      }

      mat-icon {
        color: var(--triply-primary);
        font-size: 22px;
        width: 22px;
        height: 22px;
      }

      span {
        font-size: 0.7rem;
        font-weight: 600;
        color: var(--triply-text-primary);
        line-height: 1.2;
      }
    }

    .highlight-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 5px 10px;
      background: rgba(16, 185, 129, 0.1);
      color: #059669;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
    }

    /* ─── Time cards ──────────────────────────────────────────── */
    .times-grid { display: flex; gap: 10px; flex-wrap: wrap; }

    .time-card {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
      min-width: 140px;
      padding: 10px 12px;
      background: var(--triply-surface-1, #f3f4f6);
      border-radius: var(--triply-radius-md);

      mat-icon {
        color: var(--triply-primary);
        font-size: 20px;
        width: 20px;
        height: 20px;
        flex-shrink: 0;
      }

      div {
        display: flex;
        flex-direction: column;
        gap: 1px;
      }
    }

    .time-label { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; color: var(--triply-text-secondary); }
    .time-value { font-size: 0.88rem; font-weight: 600; color: var(--triply-text-primary); }

    .facility-chip {
      padding: 4px 10px;
      background: var(--triply-surface-1, #f3f4f6);
      color: var(--triply-text-primary);
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .show-more-btn {
      background: none;
      border: none;
      color: var(--triply-primary);
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      padding: 4px 0;
      align-self: flex-start;
      &:hover { text-decoration: underline; }
    }

    .hotel-description, .hotel-address {
      margin: 0;
      font-size: 0.85rem;
      line-height: 1.6;
      color: var(--triply-text-secondary);
    }

    .hotel-description.truncated {
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
      overflow: hidden;
      cursor: pointer;
    }

    /* ─── Buy hint ────────────────────────────────────────────────── */
    .buy-hint {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 12px 14px;
      background: rgba(249, 115, 22, 0.06);
      border-radius: 10px;
      font-size: 0.82rem;
      line-height: 1.5;
      color: var(--triply-text-secondary);
      margin-top: 8px;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--triply-primary);
        flex-shrink: 0;
        margin-top: 1px;
      }

      strong {
        color: var(--triply-text-primary);
      }
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
      background: rgba(249, 115, 22, 0.08);
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

    /* ─── Price history section ───────────────────────────────────── */
    .price-history-section {
      margin-top: 12px;
      padding: 12px;
      background: var(--triply-surface-1, #f9fafb);
      border-radius: 8px;
      border: 1px solid var(--triply-border-subtle, #e8e8e8);
    }

    .price-history-header {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--triply-text-primary, #1a1a2e);
      margin-bottom: 10px;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--triply-primary);
      }
    }

    .price-history-summary {
      display: flex;
      gap: 16px;
      margin-bottom: 8px;

      .ph-item {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 1px;
      }

      .ph-label {
        font-size: 0.6rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        color: var(--triply-text-secondary, #9ca3af);
      }

      .ph-value {
        font-size: 0.85rem;
        font-weight: 700;
        color: var(--triply-text-primary);

        &.lowest { color: var(--triply-success, #22c55e); }
        &.target { color: var(--triply-primary, #f97316); }
        &.active { color: var(--triply-success, #22c55e); }
      }
    }

    .mini-chart-container {
      margin-top: 4px;
    }

    .mini-chart {
      width: 100%;
      height: 60px;

      .mini-line { stroke: var(--triply-success, #22c55e); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
      .mini-area { fill: rgba(34,197,94,0.08); }
    }

    /* ─── Actions ────────────────────────────────────────────────── */
    .detail-actions {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
      padding: 12px var(--triply-spacing-md) !important;
      border-top: 1px solid var(--triply-border);
      max-height: none;
      overflow: visible;

      .action-spacer { display: none; }

      button {
        min-height: 44px;
        width: 100%;
        font-size: 0.85rem;
        white-space: nowrap;
      }

      button mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        margin-right: 4px;
      }

      button.paid-active {
        color: var(--triply-success, #4CAF50) !important;
        border-color: var(--triply-success, #4CAF50) !important;
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
        max-height: 320px;
      }

      .info-grid {
        grid-template-columns: 1fr 1fr;
      }

      .amenities-grid {
        grid-template-columns: repeat(4, 1fr);
      }

      .transport-route {
        flex-direction: row;
        gap: 12px;
      }

      .route-line {
        transform: none;
        width: auto;
      }

      .detail-actions {
        flex-direction: row;
        flex-wrap: nowrap;
        padding: var(--triply-spacing-sm) var(--triply-spacing-lg) !important;

        .action-spacer { display: block; flex: 1; }

        button {
          width: auto;
          flex: none;
          min-width: 0;
        }
      }
    }
  `],
})
export class ItemDetailDialogComponent implements OnInit {
  readonly data = inject<ItemDetailData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ItemDetailDialogComponent>);
  private readonly hotelApi = inject(HotelApiService);
  private readonly priceAlertApi = inject(PriceAlertApiService);

  /** Expose Math for template usage (e.g. Math.round in star rating) */
  readonly Math = Math;
  readonly i18n = inject(TranslationService);

  readonly selectedImage = signal(0);
  readonly isPaid = signal(this.data.isPaid ?? false);
  readonly isManual = computed(() => this.data.item.source === 'manual');
  readonly extraPhotos = signal<string[]>([]);
  readonly loadingPhotos = signal(false);
  readonly hotelDetails = signal<HotelDetails | null>(null);
  readonly loadingDetails = signal(false);
  readonly hotelRooms = signal<HotelRoom[]>([]);
  readonly loadingRooms = signal(false);
  readonly selectedRoom = signal<HotelRoom | null>(null);
  readonly showAllFacilities = signal(false);
  readonly showFullDescription = signal(false);

  // Price alert state
  readonly priceAlert = signal<PriceAlert | null>(null);
  readonly priceHistory = signal<PriceHistoryPoint[]>([]);

  // Lightbox state
  readonly lightboxOpen = signal(false);
  readonly lightboxIndex = signal(0);
  private touchStartX = 0;

  ngOnInit(): void {
    if (this.data.type === 'stay') {
      const hotel = this.data.item as Stay;
      const hotelId = hotel.id;

      this.loadingPhotos.set(true);
      this.hotelApi.getHotelPhotos(hotelId).subscribe({
        next: photos => {
          if (photos.length > 0) this.extraPhotos.set(photos);
          this.loadingPhotos.set(false);
        },
        error: () => this.loadingPhotos.set(false),
      });

      this.loadingDetails.set(true);
      this.hotelApi.getHotelDetails(hotelId, hotel.checkIn, hotel.checkOut).subscribe({
        next: details => {
          this.hotelDetails.set(details);
          this.loadingDetails.set(false);
        },
        error: () => this.loadingDetails.set(false),
      });

      // Load available rooms
      this.loadingRooms.set(true);
      this.hotelApi.getHotelRooms(hotelId, hotel.checkIn, hotel.checkOut).subscribe({
        next: rooms => {
          this.hotelRooms.set(rooms);
          this.loadingRooms.set(false);
        },
        error: () => this.loadingRooms.set(false),
      });
    }

    // Load price alert for flights and hotels
    if (this.data.type === 'flight' || this.data.type === 'stay') {
      this.priceAlertApi.getAlerts().subscribe({
        next: alerts => {
          const itemId = this.data.item.id;
          const match = alerts.find(a => {
            try {
              const params = typeof a.searchParams === 'string' ? JSON.parse(a.searchParams) : a.searchParams;
              return params?.itemId === itemId;
            } catch { return false; }
          });
          if (match) {
            this.priceAlert.set(match);
            this.priceAlertApi.getHistory(match.id).subscribe({
              next: data => {
                if (data?.history) this.priceHistory.set(data.history);
              },
            });
          }
        },
      });
    }
  }

  // ── Mini chart helpers for price history in detail dialog ──

  miniChartPoints(): string {
    return this.miniChartDots().map(d => `${d.x},${d.y}`).join(' ');
  }

  miniChartArea(): string {
    const dots = this.miniChartDots();
    if (dots.length === 0) return '';
    const line = dots.map(d => `${d.x},${d.y}`).join(' ');
    return `0,58 ${line} ${dots[dots.length - 1].x},58`;
  }

  private miniChartDots(): { x: number; y: number }[] {
    const points = this.priceHistory();
    if (points.length < 2) return [];
    const prices = points.map(p => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const pad = range * 0.1;
    return points.map((p, i) => ({
      x: (i / (points.length - 1)) * 300,
      y: 56 - ((p.price - (min - pad)) / (range + pad * 2)) * 50,
    }));
  }

  selectRoom(room: HotelRoom): void {
    this.selectedRoom.set(this.selectedRoom()?.id === room.id ? null : room);
  }

  openLightbox(index: number): void {
    this.lightboxIndex.set(index);
    this.lightboxOpen.set(true);
  }

  closeLightbox(): void {
    this.lightboxOpen.set(false);
  }

  lbPrev(e: Event): void {
    e.stopPropagation();
    const total = this.images().length;
    this.lightboxIndex.update(i => (i - 1 + total) % total);
  }

  lbNext(e: Event): void {
    e.stopPropagation();
    const total = this.images().length;
    this.lightboxIndex.update(i => (i + 1) % total);
  }

  onTouchStart(e: TouchEvent): void {
    this.touchStartX = e.touches[0].clientX;
  }

  onTouchEnd(e: TouchEvent): void {
    const diff = e.changedTouches[0].clientX - this.touchStartX;
    if (Math.abs(diff) > 50) {
      if (diff < 0) this.lbNext(e);
      else this.lbPrev(e);
    }
  }

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
      case 'stay': {
        const extra = this.extraPhotos();
        if (extra.length > 0) return extra;
        const h = this.data.item;
        return h.photoUrl ? [h.photoUrl] : [];
      }
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

  starsArray(n: number): number[] {
    return Array(Math.max(0, Math.floor(n)));
  }

  calculateNights(checkIn: string, checkOut: string): number {
    if (!checkIn || !checkOut) return 1;
    const diff = Math.round(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24),
    );
    return Math.max(1, diff);
  }

  getReviewWord(rating: number): string {
    if (rating >= 4.5) return this.i18n.t('dialog.detail.reviewWord.exceptional');
    if (rating >= 4.0) return this.i18n.t('dialog.detail.reviewWord.excellent');
    if (rating >= 3.5) return this.i18n.t('dialog.detail.reviewWord.veryGood');
    if (rating >= 3.0) return this.i18n.t('dialog.detail.reviewWord.good');
    if (rating >= 2.0) return this.i18n.t('dialog.detail.reviewWord.average');
    return this.i18n.t('dialog.detail.reviewWord.belowAverage');
  }

  readonly keyAmenities = computed((): { name: string; icon: string }[] => {
    const details = this.hotelDetails();
    if (!details) return [];

    const AMENITY_MAP: { keywords: string[]; icon: string; key: string }[] = [
      { keywords: ['piscina', 'pool', 'swimming'], icon: 'pool', key: 'dialog.detail.amenity.pool' },
      { keywords: ['wi-fi', 'wifi', 'internet', 'wi‑fi'], icon: 'wifi', key: 'dialog.detail.amenity.wifi' },
      { keywords: ['estacionamento', 'parking', 'garagem'], icon: 'local_parking', key: 'dialog.detail.amenity.parking' },
      { keywords: ['restaurante', 'restaurant'], icon: 'restaurant', key: 'dialog.detail.amenity.restaurant' },
      { keywords: ['academia', 'gym', 'fitness'], icon: 'fitness_center', key: 'dialog.detail.amenity.gym' },
      { keywords: ['spa', 'sauna', 'massagem'], icon: 'spa', key: 'dialog.detail.amenity.spa' },
      { keywords: ['bar', 'lounge'], icon: 'local_bar', key: 'dialog.detail.amenity.bar' },
      { keywords: ['café da manhã', 'breakfast', 'cafe da manha'], icon: 'free_breakfast', key: 'dialog.detail.amenity.breakfast' },
      { keywords: ['ar condicionado', 'air conditioning', 'ar-condicionado'], icon: 'ac_unit', key: 'dialog.detail.amenity.airConditioning' },
      { keywords: ['pet', 'animais', 'animal'], icon: 'pets', key: 'dialog.detail.amenity.petFriendly' },
      { keywords: ['jogos', 'game', 'recreação', 'entretenimento'], icon: 'sports_esports', key: 'dialog.detail.amenity.gameRoom' },
      { keywords: ['praia', 'beach'], icon: 'beach_access', key: 'dialog.detail.amenity.beach' },
      { keywords: ['lavanderia', 'laundry'], icon: 'local_laundry_service', key: 'dialog.detail.amenity.laundry' },
      { keywords: ['transfer', 'shuttle', 'aeroporto'], icon: 'airport_shuttle', key: 'dialog.detail.amenity.transfer' },
      { keywords: ['recepção 24', '24-hour', 'front desk', '24 horas'], icon: 'concierge', key: 'dialog.detail.amenity.frontDesk24h' },
      { keywords: ['cofre', 'safe'], icon: 'lock', key: 'dialog.detail.amenity.safe' },
    ];

    const allNames = details.facilities.map(f => f.name.toLowerCase());
    const found: { name: string; icon: string }[] = [];

    for (const amenity of AMENITY_MAP) {
      if (allNames.some(n => amenity.keywords.some(k => n.includes(k)))) {
        found.push({ name: this.i18n.t(amenity.key), icon: amenity.icon });
      }
      if (found.length >= 8) break;
    }

    return found;
  });

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  onClose(): void {
    this.dialogRef.close(undefined);
  }

  onAdd(): void {
    this.dialogRef.close({ action: 'add', selectedRoom: this.selectedRoom() } as ItemDetailResult);
  }

  onRemove(): void {
    this.dialogRef.close({ action: 'remove' } as ItemDetailResult);
  }

  onEdit(): void {
    this.dialogRef.close({ action: 'edit' } as ItemDetailResult);
  }

  onTogglePaid(): void {
    this.isPaid.update(v => !v);
    this.dialogRef.close({ action: 'togglePaid' } as ItemDetailResult);
  }
}
