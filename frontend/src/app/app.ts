import { Component, inject, signal, viewChild, OnInit, OnDestroy, NgZone } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SidebarComponent } from './core/components/sidebar/sidebar.component';
import { TopBarComponent } from './core/components/top-bar/top-bar.component';
import { ToastContainerComponent } from './shared/components/toast/toast-container.component';
import { SupportChatComponent } from './shared/components/support-chat/support-chat.component';
import { AuthService } from './core/services/auth.service';
import { TripStateService } from './core/services/trip-state.service';
import { TransitionService } from './core/services/transition.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopBarComponent, ToastContainerComponent, SupportChatComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly zone = inject(NgZone);
  readonly tripState = inject(TripStateService);
  readonly transition = inject(TransitionService);
  readonly isLandingPage = signal(!this.auth.isLoggedIn());
  readonly sidebar = viewChild(SidebarComponent);

  // Plane overlay animation state
  // Starts fully covering the screen (all 4 corners)
  readonly overlayClip = signal('polygon(0% 100%, 0% 0%, 100% 0%, 100% 100%, 0% 100%)');
  readonly planeX = signal(-10);
  readonly planeY = signal(-10);

  private animFrameId = 0;

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => {
        const url = e.urlAfterRedirects;
        this.isLandingPage.set(
          url.startsWith('/landing') || url.startsWith('/auth/callback') ||
          url.startsWith('/voos') || url.startsWith('/hoteis') || url.startsWith('/passeios')
        );

        // When we navigate away from auth/callback and transition is active, run the wipe
        if (this.transition.active() && !url.startsWith('/auth/callback') && !url.startsWith('/landing')) {
          // Small delay to let the page render underneath
          setTimeout(() => this.runPlaneAnimation(), 300);
        }
      });

    if (this.auth.isLoggedIn()) {
      this.tripState.loadFromApi().subscribe();
    }
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  }

  onHamburgerClick(): void {
    this.sidebar()?.toggleMobile();
  }

  private runPlaneAnimation(): void {
    const duration = 4500; // Nice and slow so user enjoys the plane
    const startTime = performance.now();

    this.zone.runOutsideAngular(() => {
      const animate = (now: number) => {
        const elapsed = now - startTime;
        const raw = Math.min(elapsed / duration, 1);
        const t = this.easeInOutCubic(raw);

        this.zone.run(() => {
          // Plane flies from bottom-left to top-right
          const planePos = -5 + t * 110; // -5% → 105%
          this.planeX.set(planePos);
          this.planeY.set(planePos);

          // Diagonal wipe that passes through the plane position.
          // The wipe line has slope=1 (perpendicular to the plane's path),
          // so it sweeps from bottom-left to top-right as pp increases.
          //
          // Line equation: y = x + (100 - 2*pp)
          // Dark region = above the line (toward top-right).
          //
          // 5 intersection points create a polygon that works for all pp values:
          const pp = planePos - 3; // plane leads by 3%
          const leftY  = 100 - 2 * pp;        // line meets left edge (x=0)
          const topX    = 2 * pp - 100;        // line meets top edge (y=0)
          const rightY  = 200 - 2 * pp;        // line meets right edge (x=100)
          const bottomX = 2 * pp;              // line meets bottom edge (y=100)

          this.overlayClip.set(
            `polygon(` +
              `0% ${leftY}%, ` +
              `${topX}% 0%, ` +
              `100% 0%, ` +
              `100% ${rightY}%, ` +
              `${bottomX}% 100%` +
            `)`
          );
        });

        if (raw < 1) {
          this.animFrameId = requestAnimationFrame(animate);
        } else {
          this.zone.run(() => {
            // Shrink dark to nothing (off top-right corner)
            this.overlayClip.set('polygon(0% -10%, 0% -10%, 100% -10%, 100% -10%, 110% -10%)');
            setTimeout(() => this.transition.finish(), 100);
          });
        }
      };

      this.animFrameId = requestAnimationFrame(animate);
    });
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}
