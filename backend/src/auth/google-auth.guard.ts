import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  private readonly logger = new Logger(GoogleAuthGuard.name);

  handleRequest<TUser = any>(err: any, user: TUser, info: any, context: ExecutionContext): TUser {
    if (err || !user) {
      this.logger.warn(`Google auth failed: ${err?.message || 'No user returned'}`);
      return null as any;
    }
    return user;
  }
}
