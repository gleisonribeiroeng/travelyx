import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { StripeService } from '../../core/services/stripe.service';

@Component({
  selector: 'app-checkout-success',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  template: `
    <div class="checkout-page">
      @if (refreshing()) {
        <div class="loading-icon">
          <mat-icon class="spin">sync</mat-icon>
        </div>
        <h2>Ativando seu plano...</h2>
        <p>Aguarde enquanto confirmamos seu pagamento.</p>
      } @else {
        <div class="success-icon">
          <mat-icon>check_circle</mat-icon>
        </div>
        <h2>Bem-vindo ao PRO!</h2>
        <p>Seu plano foi ativado com sucesso. Aproveite todos os recursos!</p>
        <button mat-flat-button color="primary" (click)="goToTrips()">
          <mat-icon>flight_takeoff</mat-icon>
          Ir para minhas viagens
        </button>
      }
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: var(--triply-bg, #f5f5f5);
    }

    .checkout-page {
      text-align: center;
      padding: 40px 24px;
      max-width: 420px;
    }

    .success-icon mat-icon {
      font-size: 72px;
      width: 72px;
      height: 72px;
      color: #22c55e;
    }

    .loading-icon mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #7c3aed;
    }

    h2 {
      margin: 16px 0 8px;
      font-size: 1.5rem;
      color: var(--triply-text-primary, #1a1a2e);
    }

    p {
      color: var(--triply-text-secondary, #666);
      margin: 0 0 24px;
    }

    button {
      background: linear-gradient(135deg, #7c3aed, #a855f7) !important;
      color: white !important;
    }

    .spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
  `],
})
export class CheckoutSuccessComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly stripe = inject(StripeService);

  readonly refreshing = signal(true);

  async ngOnInit(): Promise<void> {
    // Refresh JWT to pick up the new PRO plan from the webhook
    try {
      // Small delay to allow webhook to process
      await new Promise(r => setTimeout(r, 2000));
      await this.stripe.refreshToken();
    } catch {
      // Even if refresh fails, show success — webhook may be delayed
    }
    this.refreshing.set(false);
  }

  goToTrips(): void {
    this.router.navigate(['/viagens']);
  }
}
