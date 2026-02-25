import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

export interface GoogleUser {
  googleId: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  picture: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async validateGoogleUser(googleUser: GoogleUser) {
    const user = await this.prisma.user.upsert({
      where: { googleId: googleUser.googleId },
      update: {
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
      },
      create: {
        googleId: googleUser.googleId,
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
      },
    });
    return user;
  }

  generateJwt(user: GoogleUser, dbUserId: string): string {
    const payload = {
      sub: dbUserId,
      googleId: user.googleId,
      email: user.email,
      name: user.name,
      picture: user.picture,
    };
    return this.jwtService.sign(payload);
  }

  async ensureUserExists(payload: { sub: string; googleId?: string; email: string; name: string; picture: string }): Promise<string> {
    // Check if user exists by ID
    const existing = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (existing) return existing.id;

    // User doesn't exist (DB was recreated) — recreate via googleId or email
    if (payload.googleId) {
      const user = await this.prisma.user.upsert({
        where: { googleId: payload.googleId },
        update: { email: payload.email, name: payload.name, picture: payload.picture },
        create: { id: payload.sub, googleId: payload.googleId, email: payload.email, name: payload.name, picture: payload.picture },
      });
      return user.id;
    }

    // No googleId in token — create with email as fallback googleId
    const user = await this.prisma.user.upsert({
      where: { email: payload.email },
      update: { name: payload.name, picture: payload.picture },
      create: { id: payload.sub, googleId: `legacy-${payload.email}`, email: payload.email, name: payload.name, picture: payload.picture },
    });
    return user.id;
  }
}
