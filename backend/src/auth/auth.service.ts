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

export interface ValidatedUser {
  id: string;
  role: string;
  isActive: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async validateGoogleUser(googleUser: GoogleUser) {
    // First try to find by googleId
    const byGoogleId = await this.prisma.user.findUnique({ where: { googleId: googleUser.googleId } });
    if (byGoogleId) {
      return this.prisma.user.update({
        where: { id: byGoogleId.id },
        data: { email: googleUser.email, name: googleUser.name, picture: googleUser.picture },
      });
    }

    // User may exist with same email but different googleId (created by ensureUserExists fallback)
    const byEmail = await this.prisma.user.findUnique({ where: { email: googleUser.email } });
    if (byEmail) {
      return this.prisma.user.update({
        where: { id: byEmail.id },
        data: { googleId: googleUser.googleId, name: googleUser.name, picture: googleUser.picture },
      });
    }

    // New user — create
    return this.prisma.user.create({
      data: {
        googleId: googleUser.googleId,
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
      },
    });
  }

  generateJwt(user: GoogleUser, dbUser: { id: string; role: string }): string {
    const payload = {
      sub: dbUser.id,
      googleId: user.googleId,
      email: user.email,
      name: user.name,
      picture: user.picture,
      role: dbUser.role,
    };
    return this.jwtService.sign(payload);
  }

  async ensureUserExists(payload: { sub: string; googleId?: string; email: string; name: string; picture: string }): Promise<ValidatedUser> {
    // Check if user exists by ID
    const existing = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (existing) return { id: existing.id, role: existing.role, isActive: existing.isActive };

    // User doesn't exist (DB was recreated) — recreate via googleId or email
    if (payload.googleId) {
      const user = await this.prisma.user.upsert({
        where: { googleId: payload.googleId },
        update: { email: payload.email, name: payload.name, picture: payload.picture },
        create: { id: payload.sub, googleId: payload.googleId, email: payload.email, name: payload.name, picture: payload.picture },
      });
      return { id: user.id, role: user.role, isActive: user.isActive };
    }

    // No googleId in token — create with email as fallback googleId
    const user = await this.prisma.user.upsert({
      where: { email: payload.email },
      update: { name: payload.name, picture: payload.picture },
      create: { id: payload.sub, googleId: `legacy-${payload.email}`, email: payload.email, name: payload.name, picture: payload.picture },
    });
    return { id: user.id, role: user.role, isActive: user.isActive };
  }
}
