import { Controller, Get, Logger, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService, GoogleUser } from './auth.service';
import { GoogleAuthGuard } from './google-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
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
        this.logger.warn('No user from Google callback');
        res.redirect(`${this.frontendUrl}/landing?auth_error=true`);
        return;
      }
      const dbUser = await this.authService.validateGoogleUser(user);
      const token = this.authService.generateJwt(user, dbUser);
      this.logger.log(`User ${dbUser.id} authenticated`);
      res.redirect(`${this.frontendUrl}/auth/callback?token=${token}`);
    } catch (error) {
      this.logger.error('Google callback error', (error as Error).stack);
      res.redirect(`${this.frontendUrl}/landing?auth_error=true`);
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: Request) {
    return req.user;
  }

  /**
   * POST /api/auth/refresh-token — issue a fresh JWT with current plan/role from DB.
   * Used after Stripe checkout completes to update the frontend token.
   */
  @Get('refresh-token')
  @UseGuards(JwtAuthGuard)
  async refreshToken(@Req() req: Request) {
    const user = req.user as any;
    const dbUser = await this.authService.ensureUserExists(user);
    const token = this.authService.generateJwt(
      { googleId: user.googleId, email: user.email, name: user.name, firstName: '', lastName: '', picture: user.picture },
      dbUser,
    );
    return { token };
  }
}
