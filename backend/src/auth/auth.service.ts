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

  generateJwt(user: GoogleUser): string {
    const payload = {
      sub: user.googleId,
      email: user.email,
      name: user.name,
      picture: user.picture,
    };
    return this.jwtService.sign(payload);
  }
}
