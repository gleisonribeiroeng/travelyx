import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DiscordBotService } from './discord-bot.service';
import { SendMessageDto } from './dto/send-message.dto';

interface JwtUser {
  sub: string;
  email: string;
  name: string;
  picture: string;
}

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly discordBot: DiscordBotService,
  ) {}

  async sendMessage(dto: SendMessageDto, user: JwtUser) {
    // Find or create conversation
    let conversation = await this.prisma.supportConversation.findFirst({
      where: { userId: user.sub },
    });

    if (!conversation) {
      conversation = await this.prisma.supportConversation.create({
        data: { userId: user.sub },
      });
    }

    // Create Discord thread if needed
    if (!conversation.discordThreadId) {
      const threadId = await this.discordBot.createThread(user.sub, user.name, user.email);
      if (threadId) {
        conversation = await this.prisma.supportConversation.update({
          where: { id: conversation.id },
          data: { discordThreadId: threadId },
        });
      }
    }

    // Save message to database
    const message = await this.prisma.supportMessage.create({
      data: {
        conversationId: conversation.id,
        content: dto.message,
        fromUser: true,
      },
    });

    // Send to Discord thread
    if (conversation.discordThreadId) {
      await this.discordBot.sendToThread(conversation.discordThreadId, dto.message, user.name);
    }

    this.logger.log(`Support message from ${user.email} saved and forwarded`);

    return {
      success: true,
      message: {
        id: message.id,
        content: message.content,
        fromUser: true,
        createdAt: message.createdAt.toISOString(),
      },
    };
  }

  async getHistory(userId: string) {
    const conversation = await this.prisma.supportConversation.findFirst({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
      },
    });

    if (!conversation) return { messages: [] };

    return {
      messages: conversation.messages.map(m => ({
        id: m.id,
        content: m.content,
        fromUser: m.fromUser,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }
}
