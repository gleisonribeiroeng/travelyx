import { Module } from '@nestjs/common';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { DiscordBotService } from './discord-bot.service';
import { SupportGateway } from './support.gateway';

@Module({
  controllers: [SupportController],
  providers: [SupportService, DiscordBotService, SupportGateway],
})
export class SupportModule {}
