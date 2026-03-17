import { WebSocketGateway, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Socket } from 'socket.io';

@WebSocketGateway({ cors: true, namespace: '/support' })
export class SupportGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(SupportGateway.name);
  private readonly userSockets = new Map<string, Socket[]>();

  private extractUserId(client: Socket): string | null {
    const token = (client.handshake.auth?.token as string) || (client.handshake.query?.token as string);
    if (token) {
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        if (payload.sub && payload.exp && payload.exp > Date.now() / 1000) {
          return payload.sub;
        }
      } catch { /* invalid token */ }
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
    const filtered = sockets.filter(s => s.id !== client.id);
    if (filtered.length > 0) {
      this.userSockets.set(userId, filtered);
    } else {
      this.userSockets.delete(userId);
    }
    this.logger.log(`User ${userId} disconnected`);
  }

  sendToUser(userId: string, message: any): void {
    const sockets = this.userSockets.get(userId) || [];
    for (const socket of sockets) {
      socket.emit('support:reply', message);
    }
  }
}
