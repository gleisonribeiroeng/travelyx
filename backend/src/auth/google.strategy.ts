import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID') || 'PLACEHOLDER';
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET') || 'PLACEHOLDER';
    const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL') || 'http://localhost:3000/api/auth/google/callback';
    console.log('[GOOGLE STRATEGY] Config:', {
      clientID: clientID.substring(0, 20) + '...',
      clientSecret: clientSecret.substring(0, 8) + '...',
      callbackURL,
    });
    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
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
    };
    done(null, user);
  }
}
