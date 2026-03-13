import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TransitionService {
  /** Whether the plane wipe overlay is active */
  readonly active = signal(false);

  /** Progress 0→1 of the animation, driven by the component */
  readonly progress = signal(0);

  start(): void {
    this.progress.set(0);
    this.active.set(true);
  }

  finish(): void {
    this.active.set(false);
    this.progress.set(0);
  }
}
