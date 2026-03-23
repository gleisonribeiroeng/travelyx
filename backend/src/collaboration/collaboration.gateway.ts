import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { CollaborationService } from './collaboration.service';

@WebSocketGateway({ cors: true, namespace: '/collaboration' })
export class CollaborationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(CollaborationGateway.name);
  private readonly userSockets = new Map<string, Socket[]>();

  @WebSocketServer()
  server: Server;

  constructor(private readonly collaborationService: CollaborationService) {}

  private extractUserId(client: Socket): string | null {
    const token =
      (client.handshake.auth?.token as string) ||
      (client.handshake.query?.token as string);
    if (token) {
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        if (payload.sub && payload.exp && payload.exp > Date.now() / 1000) {
          return payload.sub;
        }
      } catch {
        /* invalid token */
      }
    }
    return (client.handshake.query.userId as string) || null;
  }

  handleConnection(client: Socket) {
    const userId = this.extractUserId(client);
    if (!userId) {
      client.disconnect();
      return;
    }
    (client as any)._userId = userId;

    const existing = this.userSockets.get(userId) || [];
    existing.push(client);
    this.userSockets.set(userId, existing);
    this.logger.log(`User ${userId} connected (${existing.length} sockets)`);
  }

  handleDisconnect(client: Socket) {
    const userId = (client as any)._userId as string;
    if (!userId) return;

    const sockets = this.userSockets.get(userId) || [];
    const filtered = sockets.filter((s) => s.id !== client.id);
    if (filtered.length > 0) {
      this.userSockets.set(userId, filtered);
    } else {
      this.userSockets.delete(userId);
    }

    // Leave all rooms on disconnect
    const rooms = Array.from(client.rooms).filter((r) => r.startsWith('trip:'));
    for (const room of rooms) {
      client.leave(room);
      this.server.to(room).emit('trip:user:left', { userId });
    }

    this.logger.log(`User ${userId} disconnected`);
  }

  @SubscribeMessage('trip:join')
  async handleTripJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tripId: string },
  ) {
    const userId = (client as any)._userId as string;
    if (!userId) return;

    const canAccess = await this.collaborationService.canAccessTrip(data.tripId, userId);
    if (!canAccess) {
      client.emit('error', { message: 'Sem acesso a esta viagem.' });
      return;
    }

    const room = `trip:${data.tripId}`;
    client.join(room);
    this.server.to(room).emit('trip:user:joined', { userId });
    this.logger.log(`User ${userId} joined room ${room}`);
  }

  @SubscribeMessage('trip:leave')
  handleTripLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tripId: string },
  ) {
    const userId = (client as any)._userId as string;
    if (!userId) return;

    const room = `trip:${data.tripId}`;
    client.leave(room);
    this.server.to(room).emit('trip:user:left', { userId });
    this.logger.log(`User ${userId} left room ${room}`);
  }

  @SubscribeMessage('trip:editing:start')
  handleEditingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tripId: string; itemId: string; userName: string },
  ) {
    const userId = (client as any)._userId as string;
    if (!userId) return;

    const room = `trip:${data.tripId}`;
    client.to(room).emit('trip:editing:start', {
      userId,
      itemId: data.itemId,
      userName: data.userName,
    });
  }

  @SubscribeMessage('trip:editing:stop')
  handleEditingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tripId: string; itemId: string },
  ) {
    const userId = (client as any)._userId as string;
    if (!userId) return;

    const room = `trip:${data.tripId}`;
    client.to(room).emit('trip:editing:stop', {
      userId,
      itemId: data.itemId,
    });
  }

  // ─── Server-side emission methods ──────────────────────────────────────────

  emitToTrip(tripId: string, event: string, data: any) {
    this.server.to(`trip:${tripId}`).emit(event, data);
  }

  emitItemAdded(tripId: string, item: any, userId: string) {
    this.emitToTrip(tripId, 'trip:item:added', { item, userId });
  }

  emitItemUpdated(tripId: string, itemId: string, changes: any, userId: string) {
    this.emitToTrip(tripId, 'trip:item:updated', { itemId, changes, userId });
  }

  emitItemRemoved(tripId: string, itemId: string, userId: string) {
    this.emitToTrip(tripId, 'trip:item:removed', { itemId, userId });
  }

  emitCollaboratorJoined(tripId: string, user: any) {
    this.emitToTrip(tripId, 'trip:collaborator:joined', { user });
  }

  emitCommentAdded(tripId: string, comment: any) {
    this.emitToTrip(tripId, 'trip:comment:added', { comment });
  }

  emitNotification(userId: string, notification: any) {
    const sockets = this.userSockets.get(userId) || [];
    for (const socket of sockets) {
      socket.emit('notification', notification);
    }
  }
}
