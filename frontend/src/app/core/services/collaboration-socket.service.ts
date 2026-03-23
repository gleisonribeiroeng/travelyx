import { Injectable, signal, OnDestroy, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { TripStateService } from './trip-state.service';
import { CollaborationService } from './collaboration.service';

@Injectable({ providedIn: 'root' })
export class CollaborationSocketService implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly tripState = inject(TripStateService);
  private readonly collaboration = inject(CollaborationService);
  private socket: Socket | null = null;
  private currentTripId: string | null = null;

  // ── State ──
  readonly editingUsers = signal<Map<string, { userId: string; name: string; picture: string }>>(new Map());
  readonly connectedCollaborators = signal<string[]>([]);

  // ---------------------------------------------------------------------------
  // Connect to the collaboration WebSocket namespace
  // ---------------------------------------------------------------------------

  connect(): void {
    if (this.socket?.connected) return;

    const user = this.auth.user();
    if (!user) return;

    const token = this.auth.getToken();
    if (!token) return;

    const baseUrl = environment.apiBaseUrl || window.location.origin;
    this.socket = io(`${baseUrl}/collaboration`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.setupListeners();
  }

  // ---------------------------------------------------------------------------
  // Disconnect
  // ---------------------------------------------------------------------------

  disconnect(): void {
    if (this.currentTripId) {
      this.leaveTrip();
    }
    this.socket?.disconnect();
    this.socket = null;
    this.editingUsers.set(new Map());
    this.connectedCollaborators.set([]);
  }

  // ---------------------------------------------------------------------------
  // Join a trip room
  // ---------------------------------------------------------------------------

  joinTrip(tripId: string): void {
    if (this.currentTripId) {
      this.leaveTrip();
    }
    this.currentTripId = tripId;
    this.socket?.emit('trip:join', { tripId });
  }

  // ---------------------------------------------------------------------------
  // Leave the current trip room
  // ---------------------------------------------------------------------------

  leaveTrip(): void {
    if (!this.currentTripId) return;
    this.socket?.emit('trip:leave', { tripId: this.currentTripId });
    this.currentTripId = null;
    this.editingUsers.set(new Map());
    this.connectedCollaborators.set([]);
  }

  // ---------------------------------------------------------------------------
  // Editing indicators
  // ---------------------------------------------------------------------------

  startEditing(itemId: string): void {
    this.socket?.emit('item:editing:start', { tripId: this.currentTripId, itemId });
  }

  stopEditing(itemId: string): void {
    this.socket?.emit('item:editing:stop', { tripId: this.currentTripId, itemId });
  }

  // ---------------------------------------------------------------------------
  // Internal: set up event listeners
  // ---------------------------------------------------------------------------

  private setupListeners(): void {
    if (!this.socket) return;

    // Collaborator presence
    this.socket.on('trip:users', (userIds: string[]) => {
      this.connectedCollaborators.set(userIds);
    });

    this.socket.on('trip:user:joined', (userId: string) => {
      this.connectedCollaborators.update(ids =>
        ids.includes(userId) ? ids : [...ids, userId]
      );
    });

    this.socket.on('trip:user:left', (userId: string) => {
      this.connectedCollaborators.update(ids => ids.filter(id => id !== userId));
    });

    // Editing indicators
    this.socket.on('item:editing:started', (data: { itemId: string; userId: string; name: string; picture: string }) => {
      this.editingUsers.update(map => {
        const next = new Map(map);
        next.set(data.itemId, { userId: data.userId, name: data.name, picture: data.picture });
        return next;
      });
    });

    this.socket.on('item:editing:stopped', (data: { itemId: string }) => {
      this.editingUsers.update(map => {
        const next = new Map(map);
        next.delete(data.itemId);
        return next;
      });
    });

    // Real-time trip updates
    this.socket.on('trip:item:added', (item: any) => {
      this.tripState.addItineraryItem(item);
    });

    this.socket.on('trip:item:updated', (data: { itemId: string; changes: any }) => {
      const currentItems = this.tripState.itineraryItems();
      const existing = currentItems.find(i => i.id === data.itemId);
      if (existing) {
        this.tripState.updateItineraryItem({ ...existing, ...data.changes });
      }
    });

    this.socket.on('trip:item:removed', (data: { itemId: string }) => {
      this.tripState.removeItineraryItem(data.itemId);
    });

    // Collaborator changes
    this.socket.on('trip:collaborator:joined', () => {
      if (this.currentTripId) {
        this.collaboration.loadCollaborators(this.currentTripId);
      }
    });

    this.socket.on('trip:collaborator:left', () => {
      if (this.currentTripId) {
        this.collaboration.loadCollaborators(this.currentTripId);
      }
    });
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
