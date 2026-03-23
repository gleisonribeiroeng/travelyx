import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationService } from '../../core/i18n/translation.service';
import { environment } from '../../../environments/environment';

interface PublicTrip {
  name: string;
  destination: string;
  dates: { start: string; end: string };
  coverImage?: string;
  travelers?: number;
  owner?: { name: string; picture: string };
  itineraryItems: PublicItem[];
  enhanced?: boolean;
  flights?: PublicFlight[];
  stays?: PublicStay[];
  activities?: PublicActivity[];
}

interface PublicItem {
  id: string;
  type: string;
  label: string;
  date: string;
  timeSlot: string | null;
  durationMinutes: number | null;
  notes: string | null;
}

interface PublicFlight {
  origin: string;
  destination: string;
  airline: string;
  airlineLogo?: string;
  departureAt: string;
  arrivalAt: string;
  durationMinutes: number;
  stops: number;
}

interface PublicStay {
  name: string;
  address: string;
  photoUrl?: string;
  rating?: number;
  checkIn: string;
  checkOut: string;
}

interface PublicActivity {
  name: string;
  description?: string;
  images?: string[];
  rating?: number;
}

@Component({
  selector: 'app-public-itinerary',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CommonModule, TranslatePipe],
  template: `
    <div class="public-page" [class.enhanced]="trip()?.enhanced">
      @if (loading()) {
        <div class="loading-state">
          <mat-spinner diameter="48"></mat-spinner>
          <p>{{ 'public.loading' | translate }}</p>
        </div>
      } @else if (error()) {
        <div class="error-state">
          <mat-icon>error_outline</mat-icon>
          <h2>{{ 'public.notFound' | translate }}</h2>
          <p>{{ 'public.notFoundDesc' | translate }}</p>
          <a mat-flat-button color="primary" href="/">{{ 'public.createItinerary' | translate }}</a>
        </div>
      } @else if (trip()) {
        <!-- Hero -->
        <div class="hero" [style.background-image]="trip()!.coverImage ? 'url(' + trip()!.coverImage + ')' : ''">
          <div class="hero-overlay">
            <div class="hero-badge">
              <mat-icon>public</mat-icon>
              {{ 'public.badge' | translate }}
            </div>
            <h1>{{ trip()!.name || trip()!.destination }}</h1>
            @if (trip()!.destination) {
              <p class="hero-destination">
                <mat-icon>place</mat-icon>
                {{ trip()!.destination }}
              </p>
            }
            @if (trip()!.dates.start) {
              <p class="hero-dates">
                <mat-icon>calendar_today</mat-icon>
                {{ formatDateRange(trip()!.dates.start, trip()!.dates.end) }}
                @if (tripDays() > 0) {
                  <span class="hero-days">• {{ tripDays() }} {{ tripDays() === 1 ? ('public.daysSingular' | translate) : ('public.daysPlural' | translate) }}</span>
                }
              </p>
            }
            @if (trip()!.owner) {
              <div class="hero-author">
                @if (trip()!.owner!.picture) {
                  <img [src]="trip()!.owner!.picture" class="author-avatar" alt="Author" referrerpolicy="no-referrer" />
                }
                <span>{{ 'public.by' | translate }} {{ trip()!.owner!.name }}</span>
              </div>
            }
          </div>
        </div>

        <!-- Enhanced: Trip Summary Stats -->
        @if (trip()!.enhanced) {
          <div class="trip-stats">
            @if (trip()!.flights && trip()!.flights!.length > 0) {
              <div class="stat-item">
                <mat-icon>flight</mat-icon>
                <span class="stat-count">{{ trip()!.flights!.length }}</span>
                <span class="stat-label">{{ trip()!.flights!.length === 1 ? ('public.flightSingular' | translate) : ('public.flightPlural' | translate) }}</span>
              </div>
            }
            @if (trip()!.stays && trip()!.stays!.length > 0) {
              <div class="stat-item">
                <mat-icon>hotel</mat-icon>
                <span class="stat-count">{{ trip()!.stays!.length }}</span>
                <span class="stat-label">{{ trip()!.stays!.length === 1 ? ('public.staySingular' | translate) : ('public.stayPlural' | translate) }}</span>
              </div>
            }
            @if (trip()!.activities && trip()!.activities!.length > 0) {
              <div class="stat-item">
                <mat-icon>local_activity</mat-icon>
                <span class="stat-count">{{ trip()!.activities!.length }}</span>
                <span class="stat-label">{{ trip()!.activities!.length === 1 ? ('public.activitySingular' | translate) : ('public.activityPlural' | translate) }}</span>
              </div>
            }
            @if (trip()!.travelers && trip()!.travelers! > 1) {
              <div class="stat-item">
                <mat-icon>group</mat-icon>
                <span class="stat-count">{{ trip()!.travelers }}</span>
                <span class="stat-label">{{ 'public.travelers' | translate }}</span>
              </div>
            }
          </div>
        }

        <!-- Enhanced: Flight Cards -->
        @if (trip()!.enhanced && trip()!.flights && trip()!.flights!.length > 0) {
          <div class="section">
            <h2 class="section-title"><mat-icon>flight</mat-icon> {{ 'public.flights' | translate }}</h2>
            <div class="flight-cards">
              @for (flight of trip()!.flights!; track $index) {
                <div class="flight-card">
                  <div class="flight-route">
                    <span class="airport">{{ flight.origin }}</span>
                    <div class="flight-line">
                      <div class="line"></div>
                      <mat-icon>flight</mat-icon>
                      <div class="line"></div>
                    </div>
                    <span class="airport">{{ flight.destination }}</span>
                  </div>
                  <div class="flight-meta">
                    <span>{{ flight.airline }}</span>
                    <span>{{ formatDuration(flight.durationMinutes) }}</span>
                    <span>{{ flight.stops === 0 ? ('public.direct' | translate) : flight.stops + ' ' + (flight.stops > 1 ? ('public.stopPlural' | translate) : ('public.stopSingular' | translate)) }}</span>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- Enhanced: Stay Cards -->
        @if (trip()!.enhanced && trip()!.stays && trip()!.stays!.length > 0) {
          <div class="section">
            <h2 class="section-title"><mat-icon>hotel</mat-icon> {{ 'public.stays' | translate }}</h2>
            <div class="stay-cards">
              @for (stay of trip()!.stays!; track $index) {
                <div class="stay-card">
                  @if (stay.photoUrl) {
                    <img [src]="stay.photoUrl" class="stay-photo" [alt]="stay.name" />
                  }
                  <div class="stay-info">
                    <h3>{{ stay.name }}</h3>
                    @if (stay.address) {
                      <p class="stay-address"><mat-icon>place</mat-icon> {{ stay.address }}</p>
                    }
                    <p class="stay-dates">
                      <mat-icon>calendar_today</mat-icon>
                      {{ formatDate(stay.checkIn) }} — {{ formatDate(stay.checkOut) }}
                    </p>
                    @if (stay.rating) {
                      <div class="stay-rating">
                        <mat-icon>star</mat-icon> {{ stay.rating.toFixed(1) }}
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- Day-by-day timeline -->
        @if (dayGroups().length > 0) {
          <div class="section">
            <h2 class="section-title"><mat-icon>event_note</mat-icon> {{ 'public.itinerary' | translate }}</h2>
            <div class="timeline">
              @for (group of dayGroups(); track group.date; let dayIdx = $index) {
                <div class="day-group">
                  <div class="day-header">
                    <span class="day-number">{{ 'public.day' | translate }} {{ dayIdx + 1 }}</span>
                    <span class="day-date">{{ formatDayDate(group.date) }}</span>
                  </div>
                  <div class="day-items">
                    @for (item of group.items; track item.id) {
                      <div class="timeline-item">
                        <div class="item-indicator" [style.background]="getTypeColor(item.type)"></div>
                        <mat-icon class="item-icon" [style.color]="getTypeColor(item.type)">{{ getTypeIcon(item.type) }}</mat-icon>
                        <div class="item-content">
                          <span class="item-label">{{ item.label }}</span>
                          <div class="item-meta">
                            @if (item.timeSlot) {
                              <span class="item-time">
                                <mat-icon>schedule</mat-icon>
                                {{ item.timeSlot }}
                              </span>
                            }
                            @if (item.durationMinutes) {
                              <span class="item-duration">
                                <mat-icon>timelapse</mat-icon>
                                {{ formatDuration(item.durationMinutes) }}
                              </span>
                            }
                          </div>
                          @if (item.notes) {
                            <p class="item-notes">{{ item.notes }}</p>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        } @else {
          <div class="empty-itinerary">
            <mat-icon>event_note</mat-icon>
            <p>{{ 'public.emptyItinerary' | translate }}</p>
          </div>
        }

        <!-- CTA -->
        <div class="cta-section">
          <mat-card class="cta-card">
            <mat-card-content>
              <mat-icon class="cta-icon">flight_takeoff</mat-icon>
              <h3>{{ 'public.ctaTitle' | translate }}</h3>
              <p>{{ 'public.ctaDesc' | translate }}</p>
              <a mat-flat-button color="primary" href="/landing" class="cta-btn">
                {{ 'public.ctaButton' | translate }}
                <mat-icon>arrow_forward</mat-icon>
              </a>
            </mat-card-content>
          </mat-card>
        </div>
      }
    </div>
  `,
  styles: [`
    .public-page {
      max-width: 720px;
      margin: 0 auto;
      padding: 32px 20px 64px;
      min-height: 100vh;
    }

    /* Loading / Error */
    .loading-state, .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 120px 24px;
      text-align: center;
      gap: 16px;
      color: #9ca3af;

      mat-icon {
        font-size: 56px; width: 56px; height: 56px; opacity: 0.5;
      }
      h2 { margin: 0; font-size: 1.25rem; font-weight: 700; color: #1a1a2e; }
      p { margin: 0; font-size: 0.9rem; }
    }

    /* Hero */
    .hero {
      text-align: center;
      margin-bottom: 32px;
      border-radius: 20px;
      overflow: hidden;
      background-size: cover;
      background-position: center;
    }

    .hero-overlay {
      padding: 40px 20px 32px;
      background: linear-gradient(135deg, rgba(108, 92, 231, 0.92) 0%, rgba(124, 77, 255, 0.88) 100%);
    }

    .hero:not([style*="url"]) .hero-overlay {
      background: linear-gradient(135deg, rgba(108, 92, 231, 0.06) 0%, rgba(124, 77, 255, 0.03) 100%);
    }
    .hero:not([style*="url"]) .hero-overlay h1,
    .hero:not([style*="url"]) .hero-overlay .hero-destination,
    .hero:not([style*="url"]) .hero-overlay .hero-dates,
    .hero:not([style*="url"]) .hero-overlay .hero-author {
      color: #1a1a2e;
    }
    .hero:not([style*="url"]) .hero-overlay .hero-destination mat-icon,
    .hero:not([style*="url"]) .hero-overlay .hero-dates mat-icon {
      color: #6C5CE7;
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #6C5CE7;
      background: rgba(255, 255, 255, 0.9);
      padding: 4px 14px;
      border-radius: 20px;
      margin-bottom: 16px;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }

    .hero h1 {
      margin: 0 0 8px;
      font-size: 1.85rem;
      font-weight: 800;
      color: #fff;
      letter-spacing: -0.02em;
    }

    .hero-destination, .hero-dates {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin: 6px 0 0;
      font-size: 0.92rem;
      color: rgba(255,255,255,0.9);
      font-weight: 500;
      mat-icon { font-size: 16px; width: 16px; height: 16px; color: rgba(255,255,255,0.7); }
    }

    .hero-days { opacity: 0.8; }

    .hero-author {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 16px;
      font-size: 0.85rem;
      color: rgba(255,255,255,0.85);
      font-weight: 500;
    }

    .author-avatar {
      width: 28px; height: 28px;
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.4);
    }

    /* Stats */
    .trip-stats {
      display: flex;
      justify-content: center;
      gap: 24px;
      margin-bottom: 32px;
      padding: 16px;
      background: #f9f8ff;
      border-radius: 16px;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.85rem;
      color: #666;
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: #6C5CE7; }
    }
    .stat-count { font-weight: 700; color: #1a1a2e; }

    /* Sections */
    .section { margin-bottom: 32px; }
    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1.15rem;
      font-weight: 700;
      color: #1a1a2e;
      margin: 0 0 16px;
      mat-icon { color: #6C5CE7; font-size: 22px; width: 22px; height: 22px; }
    }

    /* Flight cards */
    .flight-cards { display: flex; flex-direction: column; gap: 12px; }
    .flight-card {
      background: #fff;
      border: 1px solid #eee;
      border-radius: 14px;
      padding: 16px 20px;
    }
    .flight-route {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
    }
    .airport { font-size: 1.3rem; font-weight: 800; color: #1a1a2e; letter-spacing: 0.05em; }
    .flight-line {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 4px;
      .line { flex: 1; height: 1px; background: #ddd; }
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: #6C5CE7; transform: rotate(90deg); }
    }
    .flight-meta {
      display: flex;
      gap: 16px;
      font-size: 0.8rem;
      color: #888;
    }

    /* Stay cards */
    .stay-cards { display: flex; flex-direction: column; gap: 12px; }
    .stay-card {
      background: #fff;
      border: 1px solid #eee;
      border-radius: 14px;
      overflow: hidden;
    }
    .stay-photo { width: 100%; height: 160px; object-fit: cover; }
    .stay-info { padding: 14px 18px; }
    .stay-info h3 { margin: 0 0 6px; font-size: 1rem; font-weight: 700; color: #1a1a2e; }
    .stay-address, .stay-dates {
      display: flex; align-items: center; gap: 4px;
      margin: 4px 0 0; font-size: 0.82rem; color: #888;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }
    .stay-rating {
      display: inline-flex; align-items: center; gap: 2px;
      margin-top: 6px;
      font-size: 0.82rem; font-weight: 600; color: #f59e0b;
      mat-icon { font-size: 16px; width: 16px; height: 16px; color: #f59e0b; }
    }

    /* Timeline */
    .timeline { display: flex; flex-direction: column; gap: 28px; }
    .day-group { display: flex; flex-direction: column; gap: 12px; }
    .day-header {
      display: flex; align-items: baseline; gap: 10px;
      padding-bottom: 8px; border-bottom: 2px solid rgba(108, 92, 231, 0.12);
    }
    .day-number { font-size: 1rem; font-weight: 800; color: #6C5CE7; }
    .day-date { font-size: 0.85rem; color: #9ca3af; font-weight: 500; }
    .day-items { display: flex; flex-direction: column; gap: 4px; padding-left: 4px; }
    .timeline-item {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 12px 14px; border-radius: 12px;
      transition: background 0.15s ease;
      &:hover { background: rgba(108, 92, 231, 0.03); }
    }
    .item-indicator { width: 3px; height: 100%; min-height: 32px; border-radius: 2px; opacity: 0.6; flex-shrink: 0; }
    .item-icon { font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; margin-top: 2px; }
    .item-content { flex: 1; min-width: 0; }
    .item-label { display: block; font-size: 0.95rem; font-weight: 600; color: #1a1a2e; }
    .item-meta { display: flex; gap: 14px; margin-top: 4px; }
    .item-time, .item-duration {
      display: flex; align-items: center; gap: 4px;
      font-size: 0.78rem; color: #9ca3af; font-weight: 500;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }
    .item-notes { margin: 6px 0 0; font-size: 0.82rem; color: #666; line-height: 1.4; }

    .empty-itinerary {
      text-align: center; padding: 48px 24px; color: #9ca3af;
      mat-icon { font-size: 40px; width: 40px; height: 40px; opacity: 0.4; margin-bottom: 8px; }
      p { margin: 0; font-size: 0.9rem; }
    }

    /* CTA */
    .cta-section { margin-top: 48px; }
    .cta-card {
      text-align: center;
      background: linear-gradient(135deg, #6C5CE7 0%, #7C4DFF 50%, #651FFF 100%) !important;
      color: #fff !important;
      border-radius: 20px !important;
      overflow: hidden;
      mat-card-content {
        padding: 40px 32px !important;
        display: flex; flex-direction: column; align-items: center; gap: 8px;
      }
    }
    .cta-icon { font-size: 40px; width: 40px; height: 40px; color: rgba(255,255,255,0.8); margin-bottom: 8px; }
    .cta-card h3 { margin: 0; font-size: 1.2rem; font-weight: 700; color: #fff; }
    .cta-card p { margin: 0; font-size: 0.88rem; color: rgba(255,255,255,0.85); max-width: 360px; }
    .cta-btn {
      margin-top: 12px;
      background: rgba(255,255,255,0.2) !important;
      color: #fff !important;
      font-weight: 700 !important;
      border-radius: 24px !important;
      padding: 0 24px !important;
      border: 1px solid rgba(255,255,255,0.3) !important;
      mat-icon { font-size: 18px; width: 18px; height: 18px; margin-left: 6px; }
    }

    @media (max-width: 599px) {
      .public-page { padding: 16px 16px 48px; }
      .hero h1 { font-size: 1.4rem; }
      .hero-overlay { padding: 28px 16px 24px; }
      .trip-stats { gap: 12px; flex-wrap: wrap; }
      .flight-route { flex-direction: column; gap: 4px; }
      .airport { font-size: 1.1rem; }
    }
  `],
})
export class PublicItineraryComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(TranslationService);
  private readonly baseUrl = `${environment.apiBaseUrl}/api`;

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly trip = signal<PublicTrip | null>(null);

  readonly tripDays = computed(() => {
    const t = this.trip();
    if (!t?.dates?.start || !t?.dates?.end) return 0;
    const start = new Date(t.dates.start);
    const end = new Date(t.dates.end);
    return Math.ceil((end.getTime() - start.getTime()) / 86400000);
  });

  readonly dayGroups = computed(() => {
    const t = this.trip();
    if (!t || !t.itineraryItems.length) return [];

    const groups = new Map<string, PublicItem[]>();
    const sorted = [...t.itineraryItems].sort((a, b) =>
      a.date.localeCompare(b.date) || (a.timeSlot ?? '').localeCompare(b.timeSlot ?? '')
    );

    for (const item of sorted) {
      const list = groups.get(item.date) ?? [];
      list.push(item);
      groups.set(item.date, list);
    }

    return Array.from(groups.entries()).map(([date, items]) => ({ date, items }));
  });

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      this.error.set(true);
      this.loading.set(false);
      return;
    }

    this.http.get<PublicTrip>(`${this.baseUrl}/v/${slug}`).subscribe({
      next: (data) => {
        this.trip.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  getTypeIcon(type: string): string {
    const map: Record<string, string> = {
      flight: 'flight', stay: 'hotel', 'car-rental': 'directions_car',
      transport: 'directions_bus', activity: 'local_activity',
      attraction: 'museum', custom: 'event',
    };
    return map[type] || 'event';
  }

  getTypeColor(type: string): string {
    const map: Record<string, string> = {
      flight: '#4299e1', stay: '#6C5CE7', 'car-rental': '#f6ad55',
      transport: '#48bb78', activity: '#ed64a6',
      attraction: '#9f7aea', custom: '#6C5CE7',
    };
    return map[type] || '#6C5CE7';
  }

  formatDateRange(start: string, end: string): string {
    const locale = this.i18n.lang() === 'en' ? 'en-US' : 'pt-BR';
    const fmt = (d: string) => {
      const date = new Date(d + 'T00:00:00');
      return date.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
    };
    return `${fmt(start)} — ${fmt(end)}`;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const locale = this.i18n.lang() === 'en' ? 'en-US' : 'pt-BR';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(locale, { day: '2-digit', month: 'short' });
  }

  formatDayDate(dateStr: string): string {
    const locale = this.i18n.lang() === 'en' ? 'en-US' : 'pt-BR';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(locale, { weekday: 'long', day: '2-digit', month: 'long' });
  }

  formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h${m.toString().padStart(2, '0')}`;
  }
}
