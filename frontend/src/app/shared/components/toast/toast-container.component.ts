import { Component, inject } from '@angular/core';
import { NotificationService } from '../../../core/services/notification.service';
import { ToastComponent } from './toast.component';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [ToastComponent],
  template: `
    <div class="toast-container" aria-label="Notificações">
      @for (toast of notifications.toasts(); track toast.id) {
        <app-toast
          [toast]="toast"
          [variant]="notifications.variant()"
          (close)="notifications.dismiss($event)"
        />
      }
    </div>
  `,
  styles: [`
    /* Mobile-first: near full width, offset below top bar */
    .toast-container {
      position: fixed;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-top: calc(var(--triply-topbar-height, 64px) + 8px);
      width: calc(100vw - 24px);
      max-width: calc(100vw - 32px);
      pointer-events: none;
    }

    @media (min-width: 960px) {
      .toast-container {
        width: 420px;
        padding-top: 16px;
      }
    }
  `]
})
export class ToastContainerComponent {
  readonly notifications = inject(NotificationService);
}
