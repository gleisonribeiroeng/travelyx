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
            <div class="alert-card" [class.inactive]="!alert.active" [class.triggered]="!!alert.triggeredAt"
                 [attr.data-type]="alert.type">
              <!-- Top row: type + label + status + actions -->
              <div class="alert-top">
                <div class="alert-identity">
                  <div class="type-icon-circle">
                    <mat-icon>{{ alert.type === 'flight' ? 'flight' : 'hotel' }}</mat-icon>
                  </div>
                  <div>
                    <span class="type-badge" [class.flight]="alert.type === 'flight'" [class.hotel]="alert.type === 'hotel'">
                      {{ alert.type === 'flight' ? 'Voo' : 'Hotel' }}
                    </span>
                    <h3 class="alert-label">{{ alert.label }}</h3>
                  </div>
                </div>
                <div class="alert-right">
                  <span class="status-badge" [class.active]="alert.active" [class.paused]="!alert.active">
                    <mat-icon>{{ alert.active ? 'radio_button_checked' : 'pause' }}</mat-icon>
                    {{ alert.active ? 'Monitorando' : 'Pausado' }}
                  </span>
                  <div class="alert-actions">
                    <button mat-icon-button (click)="toggleAlert(alert)" [matTooltip]="alert.active ? 'Pausar' : 'Ativar'">
                      <mat-icon>{{ alert.active ? 'pause_circle' : 'play_circle' }}</mat-icon>
                    </button>
                    <button mat-icon-button (click)="toggleHistory(alert.id)" [matTooltip]="expandedId() === alert.id ? 'Fechar' : 'Histórico'">
                      <mat-icon>{{ expandedId() === alert.id ? 'expand_less' : 'show_chart' }}</mat-icon>
                    </button>
                    <button mat-icon-button (click)="deleteAlert(alert.id)" matTooltip="Excluir">
                      <mat-icon>delete_outline</mat-icon>
                    </button>
                  </div>
                </div>
              </div>

              @if (alert.triggeredAt) {
                <div class="triggered-banner">
                  <mat-icon>celebration</mat-icon>
                  <span>Preço atingiu a meta!</span>
                </div>
              }

              <!-- Price section with progress bar -->
              <div class="price-section">
                <div class="price-main">
                  <span class="price-label-sm">Preço atual</span>
                  <span class="price-big">{{ alert.currency }} {{ alert.currentPrice | number:'1.2-2' }}</span>
                </div>
                <div class="price-details">
                  <div class="price-detail">
                    <mat-icon>trending_down</mat-icon>
                    <div>
                      <span class="detail-label">Menor já visto</span>
                      <span class="detail-value lowest">{{ alert.currency }} {{ (alert.lowestPrice ?? alert.currentPrice) | number:'1.2-2' }}</span>
                    </div>
                  </div>
                  <div class="price-detail">
                    <mat-icon>flag</mat-icon>
                    <div>
                      <span class="detail-label">Meta</span>
                      <span class="detail-value target">{{ alert.currency }} {{ alert.targetPrice | number:'1.2-2' }}</span>
                    </div>
                  </div>
                </div>

                <!-- Progress bar: how close to target -->
                <div class="progress-section">
                  <div class="progress-bar">
                    <div class="progress-fill"
                         [style.width.%]="getProgress(alert)"
                         [class.reached]="alert.currentPrice <= alert.targetPrice"
                         [class.close]="getDiffPercent(alert) <= 5 && alert.currentPrice > alert.targetPrice">
                    </div>
                  </div>
                  <span class="progress-label"
                        [class.reached]="alert.currentPrice <= alert.targetPrice"
                        [class.close]="getDiffPercent(alert) <= 5 && alert.currentPrice > alert.targetPrice">
                    @if (alert.currentPrice <= alert.targetPrice) {
                      Meta atingida!
                    } @else {
                      {{ getDiffPercent(alert) }}% acima da meta
                    }
                  </span>
                </div>
              </div>

              <div class="alert-footer">
                <span class="created-at">Criado em {{ formatDate(alert.createdAt) }}</span>
                @if (alert.lastCheckedAt) {
                  <span class="last-checked">Verificado {{ formatDate(alert.lastCheckedAt) }}</span>
                }
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
    }

    .page-header {
      display: flex;
      align-items: center;
      margin-bottom: 16px;

      .header-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .header-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
        color: var(--triply-primary);
      }

      h1 {
        margin: 0;
        font-size: 1.15rem;
        font-weight: 700;
        color: var(--triply-text-primary, #1a1a2e);
      }

      p {
        margin: 1px 0 0;
        font-size: 0.78rem;
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
        font-size: 48px; width: 48px; height: 48px;
        margin-bottom: 12px; opacity: 0.3;
      }
      h3 { margin: 0 0 8px; font-size: 1.05rem; color: var(--triply-text-primary); }
      p { margin: 0; font-size: 0.85rem; max-width: 360px; }
    }

    .loading-state { flex-direction: row; gap: 12px; padding: 40px; }

    .alerts-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    /* ── Alert Card ── */
    [data-type="flight"] { --alert-color: #2196F3; }
    [data-type="hotel"]  { --alert-color: #7C4DFF; }

    .alert-card {
      background: #fff;
      border: 1px solid var(--triply-border-subtle, #e8e8e8);
      border-left: 3px solid var(--alert-color, #6c5ce7);
      border-radius: 10px;
      padding: 14px 16px;
      transition: box-shadow 0.2s, transform 0.2s;

      &:hover {
        box-shadow: 0 3px 14px rgba(0,0,0,0.06);
        transform: translateY(-1px);
      }
      &.inactive { opacity: 0.55; }
      &.triggered {
        border-left-color: var(--triply-success, #22c55e);
        background: linear-gradient(135deg, rgba(34,197,94,0.03), #fff);
      }
    }

    /* ── Top row ── */
    .alert-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 12px;
    }

    .alert-identity {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .type-icon-circle {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: color-mix(in srgb, var(--alert-color, #6c5ce7) 10%, transparent);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      mat-icon {
        font-size: 17px; width: 17px; height: 17px;
        color: var(--alert-color, #6c5ce7);
      }
    }

    .type-badge {
      font-size: 0.55rem;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 3px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #fff;
      display: inline-block;
      margin-bottom: 2px;

      &.flight { background: #2196F3; }
      &.hotel { background: #7C4DFF; }
    }

    .alert-label {
      margin: 0;
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--triply-text-primary, #1a1a2e);
      line-height: 1.3;
    }

    .alert-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
      flex-shrink: 0;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 0.62rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 10px;

      mat-icon { font-size: 10px; width: 10px; height: 10px; }

      &.active {
        background: rgba(34, 197, 94, 0.08);
        color: #16a34a;
      }
      &.paused {
        background: rgba(156, 163, 175, 0.1);
        color: #9ca3af;
      }
    }

    .alert-actions {
      display: flex;
      gap: 0;

      button {
        width: 28px !important; height: 28px !important; line-height: 28px !important;
        color: var(--triply-text-secondary, #888);

        mat-icon { font-size: 17px; width: 17px; height: 17px; }
        &:hover { color: var(--triply-text-primary); background: var(--triply-surface-2, #f0f0f0); }
      }
    }

    /* ── Triggered banner ── */
    .triggered-banner {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 7px 12px;
      background: rgba(34,197,94,0.08);
      border-radius: 8px;
      font-size: 0.78rem;
      font-weight: 600;
      color: #16a34a;
      margin-bottom: 10px;

      mat-icon { font-size: 17px; width: 17px; height: 17px; }
    }

    /* ── Price section ── */
    .price-section {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 10px;
    }

    .price-main {
      display: flex;
      flex-direction: column;
    }

    .price-label-sm {
      font-size: 0.62rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: var(--triply-text-tertiary, #9ca3af);
    }

    .price-big {
      font-size: 1.3rem;
      font-weight: 800;
      color: var(--triply-text-primary, #1a1a2e);
      letter-spacing: -0.02em;
      font-variant-numeric: tabular-nums;
    }

    .price-details {
      display: flex;
      gap: 20px;
    }

    .price-detail {
      display: flex;
      align-items: center;
      gap: 6px;

      mat-icon {
        font-size: 15px; width: 15px; height: 15px;
        color: var(--triply-text-tertiary, #bbb);
      }

      .detail-label {
        font-size: 0.6rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        color: var(--triply-text-tertiary, #9ca3af);
        display: block;
      }

      .detail-value {
        font-size: 0.85rem;
        font-weight: 700;
        display: block;

        &.lowest { color: #16a34a; }
        &.target { color: var(--triply-primary, #6c5ce7); }
      }
    }

    /* ── Progress bar ── */
    .progress-section {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .progress-bar {
      flex: 1;
      height: 5px;
      background: var(--triply-surface-2, #f0f0f0);
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: var(--triply-primary, #6c5ce7);
      border-radius: 3px;
      transition: width 0.4s ease;

      &.close { background: #f59e0b; }
      &.reached { background: #16a34a; }
    }

    .progress-label {
      font-size: 0.68rem;
      font-weight: 600;
      color: var(--triply-text-tertiary, #9ca3af);
      white-space: nowrap;
      flex-shrink: 0;

      &.close { color: #d97706; }
      &.reached { color: #16a34a; }
    }

    /* ── Footer ── */
    .alert-footer {
      display: flex;
      justify-content: space-between;
      font-size: 0.65rem;
      color: var(--triply-text-tertiary, #bbb);
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

  // ── Progress helpers ──

  getProgress(alert: PriceAlert): number {
    if (alert.currentPrice <= alert.targetPrice) return 100;
    const initial = alert.currentPrice;
    const target = alert.targetPrice;
    const diff = initial - target;
    if (diff <= 0) return 100;
    const progress = ((initial - alert.currentPrice) / diff) * 100;
    return Math.max(0, Math.min(100, 100 - this.getDiffPercent(alert)));
  }

  getDiffPercent(alert: PriceAlert): number {
    if (alert.targetPrice === 0) return 0;
    const diff = Math.abs(alert.currentPrice - alert.targetPrice) / alert.targetPrice * 100;
    return Math.round(diff);
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
