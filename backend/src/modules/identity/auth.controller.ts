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
import { StrictRateLimit } from '../../core/http/rate-limit.guard';
import {
  JwtAuthGuard,
  type AuthenticatedRequest,
} from '../../core/auth/jwt-auth.guard';
import { tokenFromRequest } from '../../core/auth/jwt-auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ACCESS_COOKIE, type AuthRequestContext } from './identity.constants';

/**
 * Transport facts about the caller, taken from the request itself. Nothing
 * here may come from the body or a client-controlled header that the caller
 * could forge to evade the audit trail.
 */
function requestContext(request: Request): AuthRequestContext {
  return {
    ipAddress: request.ip,
    userAgent: request.get('user-agent'),
  };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  /**
   * Rate limited per IP on top of the per-account lockout in `AuthService`:
   * the throttle stops one source hammering many accounts, the lockout stops
   * many sources hammering one account.
   */
  @Post('login')
  @StrictRateLimit()
  async login(
    @Body() credentials: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.authService.login(
      credentials,
      requestContext(request),
    );
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
    await this.authService.revokeAccessToken(
      tokenFromRequest(request),
      requestContext(request),
    );
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
