import { Component, input, output } from '@angular/core';
import { MATERIAL_IMPORTS } from '../../../core/material.exports';

/**
 * Reusable error banner component for displaying per-source API errors.
 *
 * Usage:
 *   <app-error-banner
 *     [source]="'Flights'"
 *     [message]="'Unable to load flight results'"
 *     (dismiss)="clearError()" />
 */
@Component({
  selector: 'app-error-banner',
  standalone: true,
  imports: [MATERIAL_IMPORTS],
  template: `
    <mat-card class="error-banner">
      <mat-card-content>
        <div class="error-content">
          <mat-icon color="warn">error</mat-icon>
          <div class="error-text">
            <strong>Erro em {{ source() }}</strong>
            <p>{{ message() }}</p>
          </div>
          <button mat-icon-button (click)="dismiss.emit()" aria-label="Fechar erro">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .error-banner {
      background-color: color-mix(in srgb, var(--triply-error) 8%, #fff);
      color: var(--triply-text-primary);
      margin-bottom: var(--triply-spacing-md);
      border-left: 4px solid var(--triply-error);
      box-shadow: var(--triply-shadow-sm);
    }

    .error-content {
      display: flex;
      align-items: flex-start;
      gap: var(--triply-spacing-xs);
    }

    .error-text {
      flex: 1;
    }

    .error-text strong {
      display: block;
      margin-bottom: 4px;
    }

    .error-text p {
      margin: 0;
      font-size: 0.9rem;
    }

    mat-icon[color="warn"] {
      color: var(--triply-error);
    }

    @media (min-width: 600px) {
      .error-content {
        gap: var(--triply-spacing-sm);
      }
    }
  `]
})
export class ErrorBannerComponent {
  /** The API source name (e.g. "Flights", "Hotels") */
  source = input.required<string>();

  /** The error message text */
  message = input.required<string>();

  /** Emitted when user clicks the close button */
  dismiss = output<void>();
}
