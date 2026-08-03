import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import type { AppConfig } from '../../core/config/configuration';
import type { AuthPrincipal } from '../../core/auth/auth.types';
import {
  JwtAuthGuard,
  type AuthenticatedRequest,
} from '../../core/auth/jwt-auth.guard';
import { tokenFromRequest } from '../../core/auth/jwt-auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

const ACCESS_COOKIE = 'campusone_access_token';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  @Post('login')
  async login(
    @Body() credentials: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.authService.login(credentials);
    response.cookie(ACCESS_COOKIE, session.token, {
      httpOnly: true,
      secure: this.config.get('isProduction', { infer: true }),
      sameSite: 'lax',
      maxAge: session.expiresInSeconds * 1000,
      path: '/',
    });

    return {
      user: session.user,
      expiresInSeconds: session.expiresInSeconds,
    };
  }

  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ success: true }> {
    await this.authService.revokeAccessToken(tokenFromRequest(request));
    response.clearCookie(ACCESS_COOKIE, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() request: AuthenticatedRequest): AuthPrincipal {
    return request.user;
  }
}
