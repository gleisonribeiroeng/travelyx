import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import { environment } from '../../../environments/environment';

interface PublicTrip {
  name: string;
  destination: string;
  dates: { start: string; end: string };
  itineraryItems: PublicItem[];
}

interface PublicItem {
  id: string;
  type: string;
  label: string;
  date: string;
  timeSlot: string | null;
  duration: number | null;
  notes: string | null;
}

@Component({
  selector: 'app-public-itinerary',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CommonModule],
  template: `
    <div class="public-page">
      @if (loading()) {
        <div class="loading-state">
          <mat-spinner diameter="48"></mat-spinner>
          <p>Carregando roteiro...</p>
        </div>
      } @else if (error()) {
        <div class="error-state">
          <mat-icon>error_outline</mat-icon>
          <h2>Roteiro não encontrado</h2>
          <p>Este link pode ter expirado ou sido desativado.</p>
          <a mat-flat-button color="primary" href="/">Criar meu roteiro</a>
        </div>
      } @else if (trip()) {
        <!-- Hero -->
        <div class="hero">
          <div class="hero-badge">
            <mat-icon>public</mat-icon>
            Roteiro público
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
            </p>
          }
        </div>

        <!-- Day-by-day timeline -->
        @if (dayGroups().length > 0) {
          <div class="timeline">
            @for (group of dayGroups(); track group.date; let dayIdx = $index) {
              <div class="day-group">
                <div class="day-header">
                  <span class="day-number">Dia {{ dayIdx + 1 }}</span>
                  <span class="day-date">{{ formatDate(group.date) }}</span>
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
                          @if (item.duration) {
                            <span class="item-duration">
                              <mat-icon>timelapse</mat-icon>
                              {{ formatDuration(item.duration) }}
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
        } @else {
          <div class="empty-itinerary">
            <mat-icon>event_note</mat-icon>
            <p>Este roteiro ainda está sendo montado.</p>
          </div>
        }

        <!-- CTA -->
        <div class="cta-section">
          <mat-card class="cta-card">
            <mat-card-content>
              <mat-icon class="cta-icon">flight_takeoff</mat-icon>
              <h3>Planeje sua viagem na Travelyx</h3>
              <p>Crie roteiros inteligentes, compare voos e hotéis, e planeje com amigos.</p>
              <a mat-flat-button color="primary" href="/landing" class="cta-btn">
                Começar agora
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
        font-size: 56px;
        width: 56px;
        height: 56px;
        opacity: 0.5;
      }

      h2 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 700;
        color: #1a1a2e;
      }

      p {
        margin: 0;
        font-size: 0.9rem;
      }
    }

    /* Hero */
    .hero {
      text-align: center;
      margin-bottom: 40px;
      padding: 40px 20px 32px;
      background: linear-gradient(135deg, rgba(108, 92, 231, 0.06) 0%, rgba(124, 77, 255, 0.03) 100%);
      border-radius: 20px;
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
      background: rgba(108, 92, 231, 0.1);
      padding: 4px 14px;
      border-radius: 20px;
      margin-bottom: 16px;

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
    }

    .hero h1 {
      margin: 0 0 8px;
      font-size: 1.85rem;
      font-weight: 800;
      color: #1a1a2e;
      letter-spacing: -0.02em;
    }

    .hero-destination, .hero-dates {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin: 6px 0 0;
      font-size: 0.92rem;
      color: #666;
      font-weight: 500;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: #6C5CE7;
      }
    }

    /* Timeline */
    .timeline {
      display: flex;
      flex-direction: column;
      gap: 28px;
    }

    .day-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .day-header {
      display: flex;
      align-items: baseline;
      gap: 10px;
      padding-bottom: 8px;
      border-bottom: 2px solid rgba(108, 92, 231, 0.12);
    }

    .day-number {
      font-size: 1rem;
      font-weight: 800;
      color: #6C5CE7;
    }

    .day-date {
      font-size: 0.85rem;
      color: #9ca3af;
      font-weight: 500;
    }

    .day-items {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding-left: 4px;
    }

    .timeline-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 12px;
      transition: background 0.15s ease;

      &:hover {
        background: rgba(108, 92, 231, 0.03);
      }
    }

    .item-indicator {
      width: 3px;
      height: 100%;
      min-height: 32px;
      border-radius: 2px;
      opacity: 0.6;
      flex-shrink: 0;
    }

    .item-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .item-content {
      flex: 1;
      min-width: 0;
    }

    .item-label {
      display: block;
      font-size: 0.95rem;
      font-weight: 600;
      color: #1a1a2e;
    }

    .item-meta {
      display: flex;
      gap: 14px;
      margin-top: 4px;
    }

    .item-time, .item-duration {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.78rem;
      color: #9ca3af;
      font-weight: 500;

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
    }

    .item-notes {
      margin: 6px 0 0;
      font-size: 0.82rem;
      color: #666;
      line-height: 1.4;
    }

    /* Empty itinerary */
    .empty-itinerary {
      text-align: center;
      padding: 48px 24px;
      color: #9ca3af;

      mat-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
        opacity: 0.4;
        margin-bottom: 8px;
      }

      p {
        margin: 0;
        font-size: 0.9rem;
      }
    }

    /* CTA */
    .cta-section {
      margin-top: 48px;
    }

    .cta-card {
      text-align: center;
      background: linear-gradient(135deg, #6C5CE7 0%, #7C4DFF 50%, #651FFF 100%) !important;
      color: #fff !important;
      border-radius: 20px !important;
      overflow: hidden;

      mat-card-content {
        padding: 40px 32px !important;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
      }
    }

    .cta-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: rgba(255, 255, 255, 0.8);
      margin-bottom: 8px;
    }

    .cta-card h3 {
      margin: 0;
      font-size: 1.2rem;
      font-weight: 700;
      color: #fff;
    }

    .cta-card p {
      margin: 0;
      font-size: 0.88rem;
      color: rgba(255, 255, 255, 0.85);
      max-width: 360px;
    }

    .cta-btn {
      margin-top: 12px;
      background: rgba(255, 255, 255, 0.2) !important;
      color: #fff !important;
      font-weight: 700 !important;
      border-radius: 24px !important;
      padding: 0 24px !important;
      border: 1px solid rgba(255, 255, 255, 0.3) !important;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        margin-left: 6px;
      }
    }

    @media (max-width: 599px) {
      .public-page {
        padding: 16px 16px 48px;
      }

      .hero h1 {
        font-size: 1.4rem;
      }

      .hero {
        padding: 28px 16px 24px;
      }
    }
  `],
})
export class PublicItineraryComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api`;

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly trip = signal<PublicTrip | null>(null);

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
    const fmt = (d: string) => {
      const date = new Date(d + 'T00:00:00');
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    };
    return `${fmt(start)} — ${fmt(end)}`;
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  }

  formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h${m.toString().padStart(2, '0')}`;
  }
}
