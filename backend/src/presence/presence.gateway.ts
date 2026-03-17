import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true, namespace: '/presence' })
export class PresenceGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(PresenceGateway.name);
  private readonly userSockets = new Map<string, Set<string>>();

  @WebSocketServer()
  server: Server;

  private extractUserId(client: Socket): string | null {
    // Security: prefer auth token over query param
    const token = (client.handshake.auth?.token as string) || (client.handshake.query?.token as string);
    if (token) {
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        // Basic structure validation (expiry check)
        if (payload.sub && payload.exp && payload.exp > Date.now() / 1000) {
          return payload.sub;
        }
      } catch { /* invalid token */ }
    }
    // Fallback: legacy userId query param (will be removed in future)
    return (client.handshake.query.userId as string) || null;
  }

  handleConnection(client: Socket) {
    const userId = this.extractUserId(client);
    if (!userId) {
      client.disconnect();
      return;
    }
    // Store userId on socket for disconnect handler
    (client as any)._userId = userId;

    const wasOnline = this.userSockets.has(userId);
    const sockets = this.userSockets.get(userId) || new Set();
    sockets.add(client.id);
    this.userSockets.set(userId, sockets);

    if (!wasOnline) {
      this.server.emit('user:online', userId);
      this.logger.log(`User ${userId} is now online`);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client as any)._userId as string;
    if (!userId) return;

    const sockets = this.userSockets.get(userId);
    if (!sockets) return;

    sockets.delete(client.id);
    if (sockets.size === 0) {
      this.userSockets.delete(userId);
      this.server.emit('user:offline', userId);
      this.logger.log(`User ${userId} is now offline`);
    }
  }

  getOnlineUserIds(): string[] {
    return Array.from(this.userSockets.keys());
  }
}
