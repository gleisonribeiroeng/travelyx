import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, GatewayIntentBits, TextChannel, ThreadChannel, EmbedBuilder } from 'discord.js';
import { PrismaService } from '../prisma/prisma.service';
import { SupportGateway } from './support.gateway';

@Injectable()
export class DiscordBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DiscordBotService.name);
  private client: Client;
  private channelId: string;
  private ready = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => SupportGateway))
    private readonly gateway: SupportGateway,
  ) {}

  async onModuleInit() {
    const token = this.configService.get<string>('DISCORD_BOT_TOKEN');
    this.channelId = this.configService.get<string>('DISCORD_CHANNEL_ID') || '';

    if (!token) {
      this.logger.warn('DISCORD_BOT_TOKEN not set — bot disabled');
      return;
    }

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.client.on('ready', () => {
      this.ready = true;
      this.logger.log(`Discord bot logged in as ${this.client.user?.tag}`);
    });

    // Listen for admin replies in threads
    this.client.on('messageCreate', async (message) => {
      try {
        // Ignore bot's own messages
        if (message.author.bot) return;

        // Only handle messages in threads
        if (!message.channel.isThread()) return;

        const thread = message.channel as ThreadChannel;

        // Only handle threads in our support channel
        if (thread.parentId !== this.channelId) return;

        // Find conversation by thread ID
        const conversation = await this.prisma.supportConversation.findUnique({
          where: { discordThreadId: thread.id },
        });
        if (!conversation) return;

        // Save admin message to database
        const saved = await this.prisma.supportMessage.create({
          data: {
            conversationId: conversation.id,
            content: message.content,
            fromUser: false,
          },
        });

        // Push to user via WebSocket
        this.gateway.sendToUser(conversation.userId, {
          id: saved.id,
          content: saved.content,
          fromUser: false,
          createdAt: saved.createdAt.toISOString(),
        });

        this.logger.log(`Admin reply forwarded to user ${conversation.userId}`);
      } catch (error) {
        this.logger.error('Error handling Discord message', error?.message);
      }
    });

    try {
      await this.client.login(token);
    } catch (error) {
      this.logger.error('Failed to login Discord bot', error?.message);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      this.client.destroy();
    }
  }

  async createThread(userId: string, userName: string, userEmail: string): Promise<string | null> {
    if (!this.ready || !this.channelId) return null;

    try {
      const channel = await this.client.channels.fetch(this.channelId) as TextChannel;
      if (!channel) return null;

      const thread = await channel.threads.create({
        name: `🎫 ${userName}`,
        reason: `Support thread for ${userEmail}`,
      });

      // Send intro embed
      const embed = new EmbedBuilder()
        .setTitle('Nova conversa de suporte')
        .setColor(0x7c4dff)
        .addFields(
          { name: 'Usuário', value: userName, inline: true },
          { name: 'Email', value: userEmail, inline: true },
        )
        .setTimestamp();

      await thread.send({ embeds: [embed] });

      return thread.id;
    } catch (error) {
      this.logger.error('Failed to create Discord thread', error?.message);
      return null;
    }
  }

  async sendToThread(threadId: string, content: string, userName?: string): Promise<void> {
    if (!this.ready) return;

    try {
      const thread = await this.client.channels.fetch(threadId) as ThreadChannel;
      if (!thread) return;

      await thread.send(`**${userName || 'Usuário'}:** ${content}`);
    } catch (error) {
      this.logger.error('Failed to send to Discord thread', error?.message);
    }
  }
}
