import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TripAccessGuard, MinRole } from '../collaboration/collaboration.guard';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ReactCommentDto } from './dto/react-comment.dto';

@Controller('trips/:tripId/comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @UseGuards(TripAccessGuard)
  @MinRole('EDITOR')
  create(
    @Param('tripId') tripId: string,
    @Body() body: CreateCommentDto,
    @Req() req: any,
  ) {
    return this.commentsService.create(
      tripId,
      req.user.sub,
      body.targetType,
      body.targetId,
      body.content,
      body.parentId,
    );
  }

  @Get()
  @UseGuards(TripAccessGuard)
  @MinRole('VIEWER')
  getComments(
    @Param('tripId') tripId: string,
    @Query('targetType') targetType?: string,
    @Query('targetId') targetId?: string,
  ) {
    if (targetType && targetId) {
      return this.commentsService.getByTarget(tripId, targetType, targetId);
    }
    return this.commentsService.getByTrip(tripId);
  }

  @Put(':commentId/react')
  @UseGuards(TripAccessGuard)
  @MinRole('VIEWER')
  toggleReaction(
    @Param('commentId') commentId: string,
    @Body() body: ReactCommentDto,
    @Req() req: any,
  ) {
    return this.commentsService.toggleReaction(commentId, req.user.sub, body.emoji);
  }

  @Delete(':commentId')
  @UseGuards(TripAccessGuard)
  @MinRole('EDITOR')
  remove(
    @Param('commentId') commentId: string,
    @Req() req: any,
  ) {
    return this.commentsService.remove(commentId, req.user.sub);
  }
}
