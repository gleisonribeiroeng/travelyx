import { Component, inject } from '@angular/core';
import { NavLoadingService } from '../../../core/services/nav-loading.service';

@Component({
  selector: 'app-route-loader',
  standalone: true,
  template: `
    @if (navLoading.loading()) {
      <div class="route-loader">
        <div class="loader-bar"></div>
        <div class="loader-plane">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
                  fill="currentColor"/>
          </svg>
        </div>
      </div>
    }
  `,
  styles: [`
    .route-loader {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 9999;
      height: 3px;
      pointer-events: none;
    }

    .loader-bar {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: 0;
      background: linear-gradient(90deg, var(--triply-primary), var(--triply-accent-teal), var(--triply-primary));
      background-size: 200% 100%;
      border-radius: 0 2px 2px 0;
      animation: bar-grow 2.5s cubic-bezier(0.4, 0, 0.2, 1) forwards,
                 bar-shimmer 1.2s ease-in-out infinite;
      box-shadow: 0 0 12px rgba(249, 115, 22, 0.4), 0 0 4px rgba(249, 115, 22, 0.2);
    }

    .loader-plane {
      position: absolute;
      top: -9px;
      left: 0;
      color: var(--triply-primary);
      animation: plane-slide 2.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      filter: drop-shadow(0 1px 3px rgba(249, 115, 22, 0.35));
      transform: rotate(90deg);
    }

    @keyframes bar-grow {
      0% { width: 0; }
      20% { width: 40%; }
      50% { width: 65%; }
      80% { width: 85%; }
      100% { width: 95%; }
    }

    @keyframes bar-shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    @keyframes plane-slide {
      0% { left: 0; }
      20% { left: 40%; }
      50% { left: 65%; }
      80% { left: 85%; }
      100% { left: 95%; }
    }
  `],
})
export class RouteLoaderComponent {
  readonly navLoading = inject(NavLoadingService);
}
