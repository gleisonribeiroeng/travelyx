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

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (!userId) {
      client.disconnect();
      return;
    }

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
    const userId = client.handshake.query.userId as string;
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
