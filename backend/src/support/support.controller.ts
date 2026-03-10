import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SupportService } from './support.service';
import { DiscordBotService } from './discord-bot.service';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('support')
export class SupportController {
  constructor(
    private readonly supportService: SupportService,
    private readonly discordBot: DiscordBotService,
  ) {}

  @Post('messages')
  @UseGuards(JwtAuthGuard)
  sendMessage(@Body() dto: SendMessageDto, @Req() req: any) {
    return this.supportService.sendMessage(dto, req.user);
  }

  @Get('messages')
  @UseGuards(JwtAuthGuard)
  getHistory(@Req() req: any) {
    return this.supportService.getHistory(req.user.sub);
  }

  // Temporary test endpoint — remove after debugging
  @Get('test-thread')
  async testThread() {
    const threadId = await this.discordBot.createThread('test-user', 'Test User', 'test@test.com');
    return { threadId };
  }
}
