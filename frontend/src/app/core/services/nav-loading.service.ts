import { Injectable, inject, signal, DestroyRef } from '@angular/core';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class NavLoadingService {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** True while a route navigation is in progress (lazy chunk loading, guards, etc.) */
  readonly loading = signal(false);

  /** Minimum display time to avoid flickering (ms) */
  private readonly MIN_DISPLAY = 200;
  private showTimestamp = 0;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.router.events
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        if (event instanceof NavigationStart) {
          if (this.hideTimer) {
            clearTimeout(this.hideTimer);
            this.hideTimer = null;
          }
          this.showTimestamp = Date.now();
          this.loading.set(true);
        }

        if (
          event instanceof NavigationEnd ||
          event instanceof NavigationCancel ||
          event instanceof NavigationError
        ) {
          const elapsed = Date.now() - this.showTimestamp;
          const remaining = Math.max(0, this.MIN_DISPLAY - elapsed);

          this.hideTimer = setTimeout(() => {
            this.loading.set(false);
            this.hideTimer = null;
          }, remaining);
        }
      });
  }
}
