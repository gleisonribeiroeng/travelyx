import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TripStateService } from '../../services/trip-state.service';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule],
  template: `
    @if (tripState.hasActiveTrip()) {
      <nav class="bottom-nav">
        @for (tab of tabs; track tab.label) {
          <a
            class="tab"
            [class.center]="tab.center"
            [routerLink]="getRoute(tab.path)"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: tab.path === 'home' }"
          >
            @if (tab.center) {
              <span class="fab-circle">
                <mat-icon>{{ tab.icon }}</mat-icon>
              </span>
            } @else {
              <mat-icon class="tab-icon">{{ tab.icon }}</mat-icon>
            }
            <span class="tab-label">{{ tab.label }}</span>
          </a>
        }
      </nav>
    }
  `,
  styles: [`
    :host { display: contents; }

    .bottom-nav { display: none; }

    @media (max-width: 959px) {
      .bottom-nav {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 1000;
        display: flex;
        align-items: flex-end;
        justify-content: space-around;
        height: 56px;
        padding-bottom: env(safe-area-inset-bottom, 0px);
        background: #fff;
        border-top: 1px solid rgba(0, 0, 0, 0.08);
        box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.06);
      }

      .tab {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        flex: 1;
        height: 56px;
        text-decoration: none;
        color: #9e9e9e;
        gap: 2px;
        -webkit-tap-highlight-color: transparent;
        transition: color 0.2s ease;
      }

      .tab-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }

      .tab-label {
        font-size: 0.6rem;
        font-weight: 500;
        letter-spacing: 0.02em;
        line-height: 1;
      }

      .tab.active {
        color: var(--triply-primary, #f97316);
      }

      .fab-circle {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: var(--triply-primary, #f97316);
        color: #fff;
        margin-top: -18px;
        box-shadow: 0 2px 10px rgba(249, 115, 22, 0.35);
        transition: transform 0.2s ease;

        mat-icon {
          font-size: 26px;
          width: 26px;
          height: 26px;
        }
      }

      .center .tab-label {
        color: var(--triply-primary, #f97316);
        font-weight: 600;
      }

      .center.active .fab-circle {
        transform: scale(1.08);
        box-shadow: 0 4px 16px rgba(249, 115, 22, 0.45);
      }
    }
  `],
})
export class BottomNavComponent {
  readonly tripState = inject(TripStateService);

  readonly tabs = [
    { icon: 'space_dashboard', label: 'Inicio', path: 'home', center: false },
    { icon: 'flight', label: 'Voos', path: 'search', center: false },
    { icon: 'route', label: 'Planejar', path: 'planner', center: true },
    { icon: 'hotel', label: 'Hoteis', path: 'hotels', center: false },
    { icon: 'event_note', label: 'Roteiro', path: 'itinerary', center: false },
  ];

  getRoute(path: string): string {
    const tripId = this.tripState.activeTripId();
    return `/viagem/${tripId}/${path}`;
  }
}
