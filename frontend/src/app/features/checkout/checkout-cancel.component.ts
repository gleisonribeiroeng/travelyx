import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-checkout-cancel',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  template: `
    <div class="checkout-page">
      <div class="cancel-icon">
        <mat-icon>info</mat-icon>
      </div>
      <h2>Checkout cancelado</h2>
      <p>Sem problemas! Você pode fazer o upgrade a qualquer momento.</p>
      <button mat-flat-button color="primary" (click)="goBack()">
        <mat-icon>arrow_back</mat-icon>
        Voltar
      </button>
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

    .cancel-icon mat-icon {
      font-size: 72px;
      width: 72px;
      height: 72px;
      color: #f59e0b;
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
  `],
})
export class CheckoutCancelComponent {
  private readonly router = inject(Router);

  goBack(): void {
    this.router.navigate(['/viagens']);
  }
}
