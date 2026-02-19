import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService, GoogleUser } from './auth.service';
import { GoogleAuthGuard } from './google-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  private readonly frontendUrl: string;

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4200';
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth() {
    // Guard redirects to Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    try {
      const user = req.user as GoogleUser;
      if (!user) {
        console.error('[AUTH] No user from Google callback');
        res.redirect(`${this.frontendUrl}/landing?auth_error=true`);
        return;
      }
      console.log('[AUTH] Google callback user:', user.email);
      const dbUser = await this.authService.validateGoogleUser(user);
      console.log('[AUTH] User validated in DB');
      const token = this.authService.generateJwt(user, dbUser.id);
      console.log('[AUTH] JWT generated, redirecting to frontend');
      res.redirect(`${this.frontendUrl}/auth/callback?token=${token}`);
    } catch (error) {
      console.error('[AUTH] Google callback error:', error);
      res.redirect(`${this.frontendUrl}/landing?auth_error=true`);
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: Request) {
    return req.user;
  }
}
