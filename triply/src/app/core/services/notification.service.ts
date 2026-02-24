import { Injectable, signal, computed } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ToastVariant = 'minimal' | 'bold';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
  duration: number;
  dismissible: boolean;
  /** 'entering' → 'visible' → 'leaving' lifecycle for animation */
  state: 'entering' | 'visible' | 'leaving';
}

export interface ToastOptions {
  duration?: number;
  dismissible?: boolean;
}

const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 3000,
  error: 5000,
  warning: 4000,
  info: 3500,
};

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private nextId = 0;
  private readonly _toasts = signal<Toast[]>([]);
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  /** Design variant — persisted across the session */
  readonly variant = signal<ToastVariant>('minimal');

  readonly toasts = computed(() => this._toasts());

  success(message: string, options?: ToastOptions): void {
    this.add('success', message, options);
  }

  error(message: string, options?: ToastOptions): void {
    this.add('error', message, options);
  }

  warning(message: string, options?: ToastOptions): void {
    this.add('warning', message, options);
  }

  info(message: string, options?: ToastOptions): void {
    this.add('info', message, options);
  }

  dismiss(id: number): void {
    this.startLeaving(id);
  }

  setVariant(v: ToastVariant): void {
    this.variant.set(v);
  }

  private add(type: ToastType, message: string, options?: ToastOptions): void {
    const id = this.nextId++;
    const duration = options?.duration ?? DEFAULT_DURATIONS[type];
    const dismissible = options?.dismissible ?? true;

    const toast: Toast = { id, type, message, duration, dismissible, state: 'entering' };
    this._toasts.update(list => [...list, toast]);

    // Transition to 'visible' after enter animation completes
    setTimeout(() => {
      this._toasts.update(list =>
        list.map(t => t.id === id && t.state === 'entering' ? { ...t, state: 'visible' } : t)
      );
    }, 50);

    // Auto-dismiss after duration
    if (duration > 0) {
      const timer = setTimeout(() => this.startLeaving(id), duration);
      this.timers.set(id, timer);
    }
  }

  private startLeaving(id: number): void {
    // Clear auto-dismiss timer if manually dismissed
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    this._toasts.update(list =>
      list.map(t => t.id === id ? { ...t, state: 'leaving' } : t)
    );

    // Remove from DOM after exit animation
    setTimeout(() => {
      this._toasts.update(list => list.filter(t => t.id !== id));
    }, 300);
  }
}
