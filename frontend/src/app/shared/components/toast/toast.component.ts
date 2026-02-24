import { Component, input, output, computed } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Toast, ToastVariant } from '../../../core/services/notification.service';

const ICONS: Record<string, string> = {
  success: 'check_circle',
  error: 'error',
  warning: 'warning',
  info: 'info',
};

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  template: `
    <div
      class="toast"
      [class]="cssClasses()"
      [attr.role]="toast().type === 'error' ? 'alert' : 'status'"
      [attr.aria-live]="toast().type === 'error' ? 'assertive' : 'polite'"
    >
      <!-- Progress bar (bold variant only) -->
      @if (variant() === 'bold' && toast().state === 'visible') {
        <div class="toast-progress" [style.animation-duration.ms]="toast().duration"></div>
      }

      <div class="toast-body">
        <mat-icon class="toast-icon">{{ icon() }}</mat-icon>
        <span class="toast-message">{{ toast().message }}</span>
        @if (toast().dismissible) {
          <button
            mat-icon-button
            class="toast-close"
            (click)="close.emit(toast().id)"
            aria-label="Fechar notificação"
          >
            <mat-icon>close</mat-icon>
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    /* ─── Base toast ─────────────────────────────────────────────────── */
    .toast {
      position: relative;
      overflow: hidden;
      border-radius: 10px;
      pointer-events: auto;
      font-family: 'Open Sans', Roboto, 'Helvetica Neue', sans-serif;
      font-size: 0.9rem;
      line-height: 1.4;
      box-sizing: border-box;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                  opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      transform: translateY(-16px);
      opacity: 0;
    }

    .toast.state-visible,
    .toast.state-leaving {
      transform: translateY(0);
      opacity: 1;
    }

    .toast.state-leaving {
      transform: translateY(-16px);
      opacity: 0;
    }

    /* ─── Toast body layout ─────────────────────────────────────────── */
    .toast-body {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      min-height: 48px;
    }

    .toast-icon {
      flex-shrink: 0;
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .toast-message {
      flex: 1;
      font-weight: 500;
    }

    .toast-close {
      flex-shrink: 0;
      width: 44px !important;
      height: 44px !important;
      line-height: 44px !important;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    /* ─── Progress bar (bold variant) ───────────────────────────────── */
    .toast-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      width: 100%;
      animation: progress-shrink linear forwards;
      transform-origin: left;
    }

    @keyframes progress-shrink {
      from { transform: scaleX(1); }
      to   { transform: scaleX(0); }
    }

    /* ────────────────────────────────────────────────────────────────── */
    /*  MINIMAL VARIANT                                                  */
    /*  Clean, subtle — white bg, left color accent bar, muted icons     */
    /* ────────────────────────────────────────────────────────────────── */
    .toast.variant-minimal {
      background: #ffffff;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08),
                  0 1px 3px rgba(0, 0, 0, 0.06);
      border-left: 4px solid transparent;
      border-radius: 12px;
      backdrop-filter: blur(8px);
    }

    .toast.variant-minimal .toast-message {
      color: var(--triply-text-primary);
    }

    .toast.variant-minimal .toast-close {
      color: var(--triply-text-secondary);
    }

    /* Minimal — success */
    .toast.variant-minimal.type-success {
      border-left-color: var(--triply-success);
    }
    .toast.variant-minimal.type-success .toast-icon {
      color: var(--triply-success);
    }

    /* Minimal — error */
    .toast.variant-minimal.type-error {
      border-left-color: var(--triply-error);
    }
    .toast.variant-minimal.type-error .toast-icon {
      color: var(--triply-error);
    }

    /* Minimal — warning */
    .toast.variant-minimal.type-warning {
      border-left-color: var(--triply-warning);
    }
    .toast.variant-minimal.type-warning .toast-icon {
      color: var(--triply-warning);
    }

    /* Minimal — info */
    .toast.variant-minimal.type-info {
      border-left-color: var(--triply-cat-transport);
    }
    .toast.variant-minimal.type-info .toast-icon {
      color: var(--triply-cat-transport);
    }

    /* ────────────────────────────────────────────────────────────────── */
    /*  BOLD VARIANT                                                     */
    /*  Vivid colored backgrounds, white text, larger presence           */
    /* ────────────────────────────────────────────────────────────────── */
    .toast.variant-bold {
      color: #ffffff;
      border-radius: 12px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2),
                  0 4px 8px rgba(0, 0, 0, 0.08);
    }

    .toast.variant-bold .toast-message {
      color: #ffffff;
    }

    .toast.variant-bold .toast-icon {
      color: rgba(255, 255, 255, 0.9);
    }

    .toast.variant-bold .toast-close {
      color: rgba(255, 255, 255, 0.8);
    }

    /* Bold — success */
    .toast.variant-bold.type-success {
      background: linear-gradient(135deg, var(--triply-success) 0%, color-mix(in srgb, var(--triply-success) 85%, #000) 100%);
    }
    .toast.variant-bold.type-success .toast-progress {
      background: rgba(255, 255, 255, 0.35);
    }

    /* Bold — error */
    .toast.variant-bold.type-error {
      background: linear-gradient(135deg, var(--triply-error) 0%, color-mix(in srgb, var(--triply-error) 85%, #000) 100%);
    }
    .toast.variant-bold.type-error .toast-progress {
      background: rgba(255, 255, 255, 0.35);
    }

    /* Bold — warning */
    .toast.variant-bold.type-warning {
      background: linear-gradient(135deg, var(--triply-warning) 0%, color-mix(in srgb, var(--triply-warning) 85%, #000) 100%);
    }
    .toast.variant-bold.type-warning .toast-progress {
      background: rgba(255, 255, 255, 0.35);
    }

    /* Bold — info */
    .toast.variant-bold.type-info {
      background: linear-gradient(135deg, var(--triply-cat-transport) 0%, color-mix(in srgb, var(--triply-cat-transport) 85%, #000) 100%);
    }
    .toast.variant-bold.type-info .toast-progress {
      background: rgba(255, 255, 255, 0.35);
    }
  `]
})
export class ToastComponent {
  readonly toast = input.required<Toast>();
  readonly variant = input<ToastVariant>('minimal');
  readonly close = output<number>();

  readonly icon = computed(() => ICONS[this.toast().type]);

  readonly cssClasses = computed(() => {
    const t = this.toast();
    return `toast variant-${this.variant()} type-${t.type} state-${t.state}`;
  });
}
