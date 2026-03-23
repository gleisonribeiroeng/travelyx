import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TripAccessGuard, MinRole } from './collaboration.guard';
import { CollaborationService } from './collaboration.service';
import { InviteDto } from './dto/invite.dto';
import { ChangeRoleDto } from './dto/change-role.dto';

// ─── Trip-scoped endpoints ────────────────────────────────────────────────────

@Controller('trips/:tripId/collaboration')
@UseGuards(JwtAuthGuard)
export class CollaborationTripController {
  constructor(private readonly collaborationService: CollaborationService) {}

  @Post('invite')
  @UseGuards(TripAccessGuard)
  @MinRole('OWNER')
  invite(
    @Param('tripId') tripId: string,
    @Body() body: InviteDto,
    @Req() req: any,
  ) {
    return this.collaborationService.invite(tripId, req.user.sub, body.email, body.role);
  }

  @Get('collaborators')
  @UseGuards(TripAccessGuard)
  getCollaborators(@Param('tripId') tripId: string) {
    return this.collaborationService.getCollaborators(tripId);
  }

  @Put('collaborators/:collabId/role')
  @UseGuards(TripAccessGuard)
  @MinRole('OWNER')
  changeRole(
    @Param('tripId') tripId: string,
    @Param('collabId') collabId: string,
    @Body() body: ChangeRoleDto,
    @Req() req: any,
  ) {
    return this.collaborationService.changeRole(tripId, collabId, body.role, req.user.sub);
  }

  @Delete('collaborators/:collabId')
  @UseGuards(TripAccessGuard)
  @MinRole('OWNER')
  removeCollaborator(
    @Param('tripId') tripId: string,
    @Param('collabId') collabId: string,
    @Req() req: any,
  ) {
    return this.collaborationService.removeCollaborator(tripId, collabId, req.user.sub);
  }

  @Post('share-link')
  @UseGuards(TripAccessGuard)
  @MinRole('OWNER')
  toggleShareLink(@Param('tripId') tripId: string, @Req() req: any) {
    return this.collaborationService.generateShareLink(tripId, req.user.sub);
  }
}

// ─── Non-trip-scoped endpoints ────────────────────────────────────────────────

@Controller()
export class CollaborationInviteController {
  constructor(private readonly collaborationService: CollaborationService) {}

  @Post('invites/:token/accept')
  @UseGuards(JwtAuthGuard)
  acceptInvite(@Param('token') token: string, @Req() req: any) {
    return this.collaborationService.acceptInvite(token, req.user.sub);
  }

  @Post('invites/:token/reject')
  @UseGuards(JwtAuthGuard)
  rejectInvite(@Param('token') token: string, @Req() req: any) {
    return this.collaborationService.rejectInvite(token, req.user.sub);
  }

  @Get('invites/pending')
  @UseGuards(JwtAuthGuard)
  getPendingInvites(@Req() req: any) {
    return this.collaborationService.getPendingInvitesForUser(req.user.email);
  }

  @Get('v/:slug')
  getPublicTrip(@Param('slug') slug: string) {
    return this.collaborationService.getPublicTrip(slug);
  }
}
