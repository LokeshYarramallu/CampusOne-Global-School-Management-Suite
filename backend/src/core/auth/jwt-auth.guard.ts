import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../../modules/identity/auth.service';
import { ACCESS_COOKIE } from '../../modules/identity/identity.constants';
import type { AuthPrincipal } from './auth.types';

export type AuthenticatedRequest = Request & { user: AuthPrincipal };

export function tokenFromRequest(request: Request): string | undefined {
  const prefix = `${ACCESS_COOKIE}=`;
  const cookieHeader = request.headers.cookie ?? '';
  const cookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  if (cookie) {
    return decodeURIComponent(cookie.slice(prefix.length));
  }

  const authorization = request.headers.authorization;
  return authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : undefined;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    request.user = await this.authService.verifyAccessToken(
      tokenFromRequest(request),
    );
    return true;
  }
}
