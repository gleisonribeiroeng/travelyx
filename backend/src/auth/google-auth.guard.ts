import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  handleRequest<TUser = any>(err: any, user: TUser, info: any, context: ExecutionContext): TUser {
    if (err || !user) {
      console.error('[AUTH GUARD] Google auth failed:', {
        error: err?.message,
        stack: err?.stack,
        info: JSON.stringify(info),
        hasUser: !!user,
      });
      return null as any;
    }
    return user;
  }
}
