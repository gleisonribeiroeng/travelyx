import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  handleRequest<TUser = any>(err: any, user: TUser, info: any, context: ExecutionContext): TUser {
    if (err || !user) {
      console.error('[AUTH GUARD] Google auth failed:', err?.message || 'No user returned');
      return null as any;
    }
    return user;
  }
}
