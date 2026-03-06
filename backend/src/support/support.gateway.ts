import { WebSocketGateway, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Socket } from 'socket.io';

@WebSocketGateway({ cors: true, namespace: '/support' })
export class SupportGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(SupportGateway.name);
  private readonly userSockets = new Map<string, Socket[]>();

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (!userId) {
      client.disconnect();
      return;
    }

    const existing = this.userSockets.get(userId) || [];
    existing.push(client);
    this.userSockets.set(userId, existing);
    this.logger.log(`User ${userId} connected (${existing.length} sockets)`);
  }

  handleDisconnect(client: Socket) {
    const userId = client.handshake.query.userId as string;
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
