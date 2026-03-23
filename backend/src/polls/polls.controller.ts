import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TripAccessGuard, MinRole } from '../collaboration/collaboration.guard';
import { PollsService } from './polls.service';
import { CreatePollDto } from './dto/create-poll.dto';
import { VotePollDto } from './dto/vote-poll.dto';

@Controller('trips/:tripId/polls')
@UseGuards(JwtAuthGuard)
export class PollsController {
  constructor(private readonly pollsService: PollsService) {}

  @Post()
  @UseGuards(TripAccessGuard)
  @MinRole('EDITOR')
  create(
    @Param('tripId') tripId: string,
    @Body() body: CreatePollDto,
    @Req() req: any,
  ) {
    return this.pollsService.create(tripId, req.user.sub, body.question, body.options);
  }

  @Get()
  @UseGuards(TripAccessGuard)
  @MinRole('VIEWER')
  getPolls(
    @Param('tripId') tripId: string,
    @Req() req: any,
  ) {
    return this.pollsService.getByTrip(tripId, req.user.sub);
  }

  @Post(':pollId/vote')
  @UseGuards(TripAccessGuard)
  @MinRole('VIEWER')
  vote(
    @Param('pollId') pollId: string,
    @Body() body: VotePollDto,
    @Req() req: any,
  ) {
    return this.pollsService.vote(pollId, body.optionId, req.user.sub);
  }

  @Put(':pollId/close')
  @UseGuards(TripAccessGuard)
  @MinRole('EDITOR')
  close(
    @Param('pollId') pollId: string,
    @Req() req: any,
  ) {
    return this.pollsService.close(pollId, req.user.sub);
  }
}
