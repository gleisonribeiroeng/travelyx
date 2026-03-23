import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/notifications`;

  private readonly _notifications = signal<AppNotification[]>([]);
  private readonly _unreadCount = signal(0);

  readonly notifications = this._notifications.asReadonly();
  readonly unreadCount = this._unreadCount.asReadonly();
  readonly hasUnread = computed(() => this._unreadCount() > 0);

  load(): void {
    this.http.get<AppNotification[]>(this.baseUrl).subscribe({
      next: (items) => {
        this._notifications.set(items);
        this._unreadCount.set(items.filter(n => !n.read).length);
      },
    });
  }

  refreshUnreadCount(): void {
    this.http.get<{ count: number }>(`${this.baseUrl}/unread-count`).subscribe({
      next: (res) => this._unreadCount.set(res.count),
    });
  }

  markAsRead(id: string): void {
    this.http.patch(`${this.baseUrl}/${id}/read`, {}).subscribe({
      next: () => {
        this._notifications.update(list =>
          list.map(n => n.id === id ? { ...n, read: true } : n)
        );
        this._unreadCount.update(c => Math.max(0, c - 1));
      },
    });
  }

  markAllAsRead(): void {
    this.http.patch(`${this.baseUrl}/read-all`, {}).subscribe({
      next: () => {
        this._notifications.update(list => list.map(n => ({ ...n, read: true })));
        this._unreadCount.set(0);
      },
    });
  }

  /** Called when a real-time notification arrives via WebSocket */
  addFromWebSocket(notification: AppNotification): void {
    this._notifications.update(list => [notification, ...list]);
    this._unreadCount.update(c => c + 1);
  }
}
