import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly _count = signal(0);

  /** True whenever at least one HTTP request is in flight. */
  readonly isLoading = computed(() => this._count() > 0);

  /** Called by loadingInterceptor when a request starts. */
  increment(): void {
    this._count.update(c => c + 1);
  }

  /** Called by loadingInterceptor when a request finishes (success or error). Never goes below 0. */
  decrement(): void {
    this._count.update(c => Math.max(0, c - 1));
  }
}
