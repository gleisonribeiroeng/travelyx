import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { StripeService } from '../../../core/services/stripe.service';

export interface PaywallDialogData {
  feature: string;       // e.g. 'Orçamento', 'Documentos'
  description: string;   // e.g. 'Controle seus gastos com o plano Pro'
  requiredPlan: string;  // e.g. 'Pro'
}

@Component({
  selector: 'app-paywall-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="paywall-dialog">
      <div class="paywall-icon">
        <mat-icon>lock</mat-icon>
      </div>
      <h2>Recurso {{ data.requiredPlan }}</h2>
      <p class="feature-name">{{ data.feature }}</p>
      <p class="feature-desc">{{ data.description }}</p>

      <div class="plan-card">
        <div class="plan-header">
          <span class="plan-badge">PRO</span>
          <span class="plan-price">R$ 19,90<small>/mês</small></span>
        </div>
        <ul class="plan-features">
          <li><mat-icon>check_circle</mat-icon> Viagens ilimitadas</li>
          <li><mat-icon>check_circle</mat-icon> Itens ilimitados no roteiro</li>
          <li><mat-icon>check_circle</mat-icon> Orçamento completo</li>
          <li><mat-icon>check_circle</mat-icon> Documentos e checklist</li>
          <li><mat-icon>check_circle</mat-icon> Agenda interativa com drag & drop</li>
          <li><mat-icon>check_circle</mat-icon> Viagem ativa em tempo real</li>
          <li><mat-icon>check_circle</mat-icon> Alertas detalhados</li>
        </ul>
      </div>

      <div class="paywall-actions">
        @if (loading()) {
          <button mat-flat-button color="primary" class="upgrade-btn" disabled>
            <mat-icon class="spin">sync</mat-icon>
            Redirecionando...
          </button>
        } @else {
          <button mat-flat-button color="primary" class="upgrade-btn" (click)="onUpgrade()">
            <mat-icon>rocket_launch</mat-icon>
            Fazer Upgrade
          </button>
        }
        <button mat-button (click)="dialogRef.close()" [disabled]="loading()">Agora não</button>
      </div>
    </div>
  `,
  styles: [`
    .paywall-dialog {
      text-align: center;
      padding: 8px;
      max-width: 400px;
    }

    .paywall-icon {
      margin: 0 auto 16px;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: linear-gradient(135deg, #f97316, #fb923c);
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        color: white;
        font-size: 32px;
        width: 32px;
        height: 32px;
      }
    }

    h2 {
      margin: 0 0 4px;
      font-size: 1.5rem;
      color: #1a1a2e;
    }

    .feature-name {
      font-weight: 600;
      color: #f97316;
      margin: 0 0 4px;
    }

    .feature-desc {
      color: #666;
      margin: 0 0 20px;
      font-size: 0.9rem;
    }

    .plan-card {
      background: #f8f5ff;
      border: 1px solid #e9e0ff;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 20px;
      text-align: left;
    }

    .plan-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .plan-badge {
      background: linear-gradient(135deg, #f97316, #fb923c);
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-weight: 700;
      font-size: 0.8rem;
      letter-spacing: 1px;
    }

    .plan-price {
      font-size: 1.3rem;
      font-weight: 700;
      color: #1a1a2e;

      small {
        font-size: 0.8rem;
        font-weight: 400;
        color: #666;
      }
    }

    .plan-features {
      list-style: none;
      padding: 0;
      margin: 0;

      li {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 0;
        font-size: 0.85rem;
        color: #333;

        mat-icon {
          color: #f97316;
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }
    }

    .paywall-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .upgrade-btn {
      background: linear-gradient(135deg, #f97316, #fb923c) !important;
      color: white !important;
      padding: 8px 24px;
      font-size: 1rem;
      border-radius: 8px;

      mat-icon {
        margin-right: 4px;
      }
    }

    .spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
  `],
})
export class PaywallDialogComponent {
  readonly data = inject<PaywallDialogData>(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<PaywallDialogComponent>);
  private readonly stripe = inject(StripeService);

  readonly loading = signal(false);

  async onUpgrade(): Promise<void> {
    this.loading.set(true);
    try {
      await this.stripe.checkout();
    } catch {
      this.loading.set(false);
    }
  }
}
