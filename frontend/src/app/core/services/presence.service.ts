import { Injectable, signal, OnDestroy, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class PresenceService implements OnDestroy {
  private readonly auth = inject(AuthService);
  private socket: Socket | null = null;
  private readonly _onlineUserIds = signal<Set<string>>(new Set());

  readonly onlineUserIds = this._onlineUserIds.asReadonly();

  connect(): void {
    if (this.socket?.connected) return;

    const user = this.auth.user();
    if (!user) return;

    // Decode JWT to get the DB userId (sub field)
    const token = this.auth.getToken();
    if (!token) return;

    let userId: string;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.sub;
    } catch {
      return;
    }

    const baseUrl = environment.apiBaseUrl || window.location.origin;
    this.socket = io(`${baseUrl}/presence`, {
      query: { userId },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('user:online', (id: string) => {
      this._onlineUserIds.update(set => {
        const next = new Set(set);
        next.add(id);
        return next;
      });
    });

    this.socket.on('user:offline', (id: string) => {
      this._onlineUserIds.update(set => {
        const next = new Set(set);
        next.delete(id);
        return next;
      });
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this._onlineUserIds.set(new Set());
  }

  isOnline(userId: string): boolean {
    return this._onlineUserIds().has(userId);
  }

  /** Load the initial list of online users from the REST endpoint */
  loadOnlineUsers(ids: string[]): void {
    this._onlineUserIds.set(new Set(ids));
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
