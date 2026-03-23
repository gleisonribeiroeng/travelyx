import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CollaborationService } from './collaboration.service';

export const MIN_ROLE_KEY = 'minRole';
export const MinRole = (role: string) => SetMetadata(MIN_ROLE_KEY, role);

@Injectable()
export class TripAccessGuard implements CanActivate {
  constructor(
    private readonly collaborationService: CollaborationService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub;
    if (!userId) return false;

    const tripId = request.params.tripId || request.params.id;
    if (!tripId) return false;

    const role = await this.collaborationService.getTripRole(tripId, userId);
    if (!role) return false;

    // Store role on request for downstream use
    request.tripRole = role;

    // Check minimum role if decorator is present
    const minRole = this.reflector.get<string>(MIN_ROLE_KEY, context.getHandler());
    if (minRole && !CollaborationService.meetsMinRole(role, minRole)) {
      throw new ForbiddenException('Permissao insuficiente para esta acao.');
    }

    return true;
  }
}
