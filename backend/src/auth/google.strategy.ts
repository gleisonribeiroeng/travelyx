import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || 'PLACEHOLDER',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || 'PLACEHOLDER',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || 'http://localhost:3000/api/auth/google/callback',
      scope: ['email', 'profile'],
    } as any);
  }

  override authenticate(req: any, options?: any): void {
    super.authenticate(req, {
      ...options,
      accessType: 'offline',
      prompt: 'consent',
    });
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const user = {
      googleId: profile.id,
      email: profile.emails?.[0]?.value || '',
      name: profile.displayName || '',
      firstName: profile.name?.givenName || '',
      lastName: profile.name?.familyName || '',
      picture: profile.photos?.[0]?.value || '',
      accessToken,
      refreshToken,
    };
    done(null, user);
  }
}
