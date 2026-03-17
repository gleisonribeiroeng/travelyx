import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './google.strategy';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { PlanGuard } from './plan.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret && process.env.NODE_ENV === 'production') {
          throw new Error('JWT_SECRET must be set in production');
        }
        return {
          secret: secret || 'triply-jwt-secret-dev-only',
          signOptions: { expiresIn: '24h' },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy, JwtStrategy, JwtAuthGuard, RolesGuard, PlanGuard],
  exports: [AuthService, JwtAuthGuard, RolesGuard, PlanGuard],
})
export class AuthModule {}
