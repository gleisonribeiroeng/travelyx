import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';

export interface JwtPayload {
  sub: string; // internal DB user ID
  googleId?: string;
  email: string;
  name: string;
  picture: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'triply-jwt-secret-change-me',
    });
  }

  async validate(payload: JwtPayload) {
    const userId = await this.authService.ensureUserExists(payload);
    return {
      sub: userId,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };
  }
}
