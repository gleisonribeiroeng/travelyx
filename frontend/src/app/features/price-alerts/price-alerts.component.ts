import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MATERIAL_IMPORTS } from '../../core/material.exports';
import {
  PriceAlertApiService,
  PriceAlert,
  PriceAlertHistory,
  PriceHistoryPoint,
} from '../../core/api/price-alert-api.service';
import { PlanService } from '../../core/services/plan.service';
import { NotificationService } from '../../core/services/notification.service';
import { DynamicCurrencyPipe } from '../../core/i18n/dynamic-currency.pipe';

@Component({
  selector: 'app-price-alerts',
  standalone: true,
  imports: [MATERIAL_IMPORTS, CommonModule, DynamicCurrencyPipe],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="header-left">
          <mat-icon class="header-icon">notifications_active</mat-icon>
          <div>
            <h1>Alertas de Preço</h1>
            <p>Monitore preços de voos e hotéis e receba avisos quando caírem</p>
          </div>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-state">
          <mat-spinner diameter="32"></mat-spinner>
          <span>Carregando alertas...</span>
        </div>
      } @else if (alerts().length === 0) {
        <div class="empty-state">
          <mat-icon>price_check</mat-icon>
          <h3>Nenhum alerta de preço</h3>
          <p>Busque voos ou hotéis e clique no ícone de sino para criar alertas de preço.</p>
        </div>
      } @else {
        <div class="alerts-list">
          @for (alert of alerts(); track alert.id) {
            <div class="alert-card" [class.inactive]="!alert.active" [class.triggered]="!!alert.triggeredAt">
              <div class="alert-header">
                <div class="alert-type">
                  <mat-icon>{{ alert.type === 'flight' ? 'flight' : 'hotel' }}</mat-icon>
                  <span class="type-badge" [class.flight]="alert.type === 'flight'" [class.hotel]="alert.type === 'hotel'">
                    {{ alert.type === 'flight' ? 'Voo' : 'Hotel' }}
                  </span>
                </div>
                <div class="alert-actions">
                  <button mat-icon-button (click)="toggleAlert(alert)" [matTooltip]="alert.active ? 'Pausar' : 'Ativar'">
                    <mat-icon>{{ alert.active ? 'pause_circle' : 'play_circle' }}</mat-icon>
                  </button>
                  <button mat-icon-button (click)="toggleHistory(alert.id)" [matTooltip]="expandedId() === alert.id ? 'Fechar histórico' : 'Ver histórico'">
                    <mat-icon>{{ expandedId() === alert.id ? 'expand_less' : 'show_chart' }}</mat-icon>
                  </button>
                  <button mat-icon-button color="warn" (click)="deleteAlert(alert.id)" matTooltip="Excluir">
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </div>
              </div>

              <h3 class="alert-label">{{ alert.label }}</h3>

              <div class="price-row">
                <div class="price-item">
                  <span class="price-title">Atual</span>
                  <span class="price-value current">{{ alert.currency }} {{ alert.currentPrice | number:'1.2-2' }}</span>
                </div>
                <div class="price-item">
                  <span class="price-title">Menor já visto</span>
                  <span class="price-value lowest">{{ alert.currency }} {{ (alert.lowestPrice ?? alert.currentPrice) | number:'1.2-2' }}</span>
                </div>
                <div class="price-item">
                  <span class="price-title">Meta</span>
                  <span class="price-value target">{{ alert.currency }} {{ alert.targetPrice | number:'1.2-2' }}</span>
                </div>
              </div>

              @if (alert.triggeredAt) {
                <div class="triggered-banner">
                  <mat-icon>celebration</mat-icon>
                  <span>Preço atingiu a meta!</span>
                </div>
              }

              <div class="alert-footer">
                @if (alert.lastCheckedAt) {
                  <span class="last-checked">Última verificação: {{ formatDate(alert.lastCheckedAt) }}</span>
                }
                <span class="created-at">Criado em {{ formatDate(alert.createdAt) }}</span>
              </div>

              <!-- Price History Chart -->
              @if (expandedId() === alert.id) {
                <div class="history-section">
                  @if (historyLoading()) {
                    <div class="history-loading">
                      <mat-spinner diameter="20"></mat-spinner>
                      <span>Carregando histórico...</span>
                    </div>
                  } @else if (historyData(); as data) {
                    @if (data.history.length > 1) {
                      <div class="chart-container">
                        <svg viewBox="0 0 400 120" class="price-chart" preserveAspectRatio="none">
                          <!-- Grid lines -->
                          <line x1="0" y1="30" x2="400" y2="30" class="grid-line" />
                          <line x1="0" y1="60" x2="400" y2="60" class="grid-line" />
                          <line x1="0" y1="90" x2="400" y2="90" class="grid-line" />
                          <!-- Target price line -->
                          @if (targetLineY(data) >= 0 && targetLineY(data) <= 120) {
                            <line x1="0" [attr.y1]="targetLineY(data)" x2="400" [attr.y2]="targetLineY(data)" class="target-line" />
                            <text x="400" [attr.y]="targetLineY(data) - 4" class="target-label" text-anchor="end">Meta</text>
                          }
                          <!-- Price line -->
                          <polyline [attr.points]="chartPoints(data)" class="price-line" fill="none" />
                          <!-- Price area -->
                          <polygon [attr.points]="chartArea(data)" class="price-area" />
                          <!-- Data points -->
                          @for (point of chartDots(data); track $index) {
                            <circle [attr.cx]="point.x" [attr.cy]="point.y" r="3" class="data-dot" />
                          }
                        </svg>
                        <div class="chart-labels">
                          <span>{{ formatShortDate(data.history[0].recordedAt) }}</span>
                          <span>{{ formatShortDate(data.history[data.history.length - 1].recordedAt) }}</span>
                        </div>
                      </div>
                    } @else {
                      <div class="history-empty">
                        <mat-icon>timeline</mat-icon>
                        <span>Histórico aparecerá após a primeira verificação de preço</span>
                      </div>
                    }
                  }
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px 16px;
    }

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;

      .header-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .header-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        color: var(--triply-primary);
      }

      h1 {
        margin: 0;
        font-size: 1.3rem;
        font-weight: 700;
        color: var(--triply-text-primary, #1a1a2e);
      }

      p {
        margin: 2px 0 0;
        font-size: 0.82rem;
        color: var(--triply-text-secondary, #6b7280);
      }
    }

    .loading-state, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
      color: var(--triply-text-secondary, #6b7280);

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 12px;
        opacity: 0.3;
      }

      h3 { margin: 0 0 8px; font-size: 1.05rem; color: var(--triply-text-primary, #1a1a2e); }
      p { margin: 0; font-size: 0.85rem; max-width: 360px; }
    }

    .loading-state {
      flex-direction: row;
      gap: 12px;
      padding: 40px;
    }

    .alerts-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .alert-card {
      background: #fff;
      border: 1px solid #e8e8e8;
      border-radius: 10px;
      padding: 16px;
      transition: box-shadow 0.2s;

      &:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
      &.inactive { opacity: 0.6; }
      &.triggered { border-color: var(--triply-success, #22c55e); background: linear-gradient(135deg, rgba(34,197,94,0.03), #fff); }
    }

    .alert-header {
      display: flex;
      align-items: center;
      justify-content: space-between;

      .alert-type {
        display: flex;
        align-items: center;
        gap: 6px;

        mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--triply-text-secondary); }
      }

      .alert-actions {
        display: flex;
        gap: 0;
      }

      button { color: var(--triply-text-secondary); }
    }

    .type-badge {
      font-size: 0.6rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 3px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #fff;

      &.flight { background: #003580; }
      &.hotel { background: #c4570a; }
    }

    .alert-label {
      margin: 8px 0 12px;
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--triply-text-primary, #1a1a2e);
    }

    .price-row {
      display: flex;
      gap: 16px;
      margin-bottom: 12px;

      .price-item {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;

        .price-title {
          font-size: 0.65rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          color: var(--triply-text-secondary, #9ca3af);
        }

        .price-value {
          font-size: 0.95rem;
          font-weight: 700;

          &.current { color: var(--triply-text-primary, #1a1a2e); }
          &.lowest { color: var(--triply-success, #22c55e); }
          &.target { color: var(--triply-primary, #6c5ce7); }
        }
      }
    }

    .triggered-banner {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: rgba(34,197,94,0.08);
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--triply-success, #22c55e);
      margin-bottom: 8px;

      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }

    .alert-footer {
      display: flex;
      justify-content: space-between;
      font-size: 0.7rem;
      color: var(--triply-text-secondary, #9ca3af);
    }

    /* ── History Section ── */
    .history-section {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #f0f0f0;
    }

    .history-loading, .history-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 16px;
      font-size: 0.8rem;
      color: var(--triply-text-secondary, #9ca3af);

      mat-icon { font-size: 20px; width: 20px; height: 20px; opacity: 0.4; }
    }

    .chart-container {
      padding: 4px 0;
    }

    .price-chart {
      width: 100%;
      height: 120px;

      .grid-line { stroke: #f0f0f0; stroke-width: 1; }
      .target-line { stroke: var(--triply-primary, #6c5ce7); stroke-width: 1; stroke-dasharray: 6 4; opacity: 0.6; }
      .target-label { font-size: 10px; fill: var(--triply-primary, #6c5ce7); font-weight: 600; }
      .price-line { stroke: var(--triply-success, #22c55e); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
      .price-area { fill: rgba(34,197,94,0.08); }
      .data-dot { fill: var(--triply-success, #22c55e); }
    }

    .chart-labels {
      display: flex;
      justify-content: space-between;
      font-size: 0.65rem;
      color: var(--triply-text-secondary, #9ca3af);
      margin-top: 4px;
    }

    @media (max-width: 639px) {
      .price-row { flex-direction: column; gap: 8px; }
      .alert-footer { flex-direction: column; gap: 2px; }
    }
  `],
})
export class PriceAlertsComponent implements OnInit {
  private readonly api = inject(PriceAlertApiService);
  private readonly notify = inject(NotificationService);
  private readonly planService = inject(PlanService);

  readonly loading = signal(true);
  readonly alerts = signal<PriceAlert[]>([]);
  readonly expandedId = signal<string | null>(null);
  readonly historyLoading = signal(false);
  readonly historyData = signal<PriceAlertHistory | null>(null);

  ngOnInit(): void {
    this.loadAlerts();
  }

  private loadAlerts(): void {
    this.loading.set(true);
    this.api.getAlerts().subscribe({
      next: alerts => {
        this.alerts.set(alerts);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('Erro ao carregar alertas');
      },
    });
  }

  toggleAlert(alert: PriceAlert): void {
    this.api.toggleAlert(alert.id).subscribe({
      next: updated => {
        if (updated) {
          this.alerts.update(list =>
            list.map(a => a.id === updated.id ? updated : a),
          );
          this.notify.success(updated.active ? 'Alerta ativado' : 'Alerta pausado');
        }
      },
    });
  }

  deleteAlert(id: string): void {
    this.api.deleteAlert(id).subscribe({
      next: () => {
        this.alerts.update(list => list.filter(a => a.id !== id));
        if (this.expandedId() === id) this.expandedId.set(null);
        this.notify.success('Alerta excluído');
      },
    });
  }

  toggleHistory(id: string): void {
    if (this.expandedId() === id) {
      this.expandedId.set(null);
      return;
    }

    this.expandedId.set(id);
    this.historyLoading.set(true);
    this.historyData.set(null);

    this.api.getHistory(id).subscribe({
      next: data => {
        this.historyData.set(data);
        this.historyLoading.set(false);
      },
      error: () => this.historyLoading.set(false),
    });
  }

  // ── Chart helpers ──

  targetLineY(data: PriceAlertHistory): number {
    const prices = data.history.map(p => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const padding = range * 0.1;
    return 110 - ((data.alert.targetPrice - (min - padding)) / (range + padding * 2)) * 100;
  }

  chartPoints(data: PriceAlertHistory): string {
    return this.chartDots(data).map(d => `${d.x},${d.y}`).join(' ');
  }

  chartArea(data: PriceAlertHistory): string {
    const dots = this.chartDots(data);
    if (dots.length === 0) return '';
    const line = dots.map(d => `${d.x},${d.y}`).join(' ');
    return `0,110 ${line} ${dots[dots.length - 1].x},110`;
  }

  chartDots(data: PriceAlertHistory): { x: number; y: number }[] {
    const points = data.history;
    if (points.length < 2) return [];
    const prices = points.map(p => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const padding = range * 0.1;

    return points.map((p, i) => ({
      x: (i / (points.length - 1)) * 400,
      y: 110 - ((p.price - (min - padding)) / (range + padding * 2)) * 100,
    }));
  }

  formatDate(iso: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  formatShortDate(iso: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }
}
