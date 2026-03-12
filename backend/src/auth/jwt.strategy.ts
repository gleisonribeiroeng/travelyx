import { Injectable, UnauthorizedException } from '@nestjs/common';
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
  role: string;
  plan: string;
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
    const user = await this.authService.ensureUserExists(payload);
    if (!user.isActive) {
      throw new UnauthorizedException('Conta desativada');
    }
    return {
      sub: user.id,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      role: user.role,
      plan: user.plan,
    };
  }
}
