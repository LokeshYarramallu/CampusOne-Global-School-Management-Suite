import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../../modules/identity/auth.service';
import type { AuthPrincipal } from './auth.types';

export type AuthenticatedRequest = Request & { user: AuthPrincipal };

export function tokenFromRequest(request: Request): string | undefined {
  const cookieHeader = request.headers.cookie ?? '';
  const cookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('campusone_access_token='));

  if (cookie) {
    return decodeURIComponent(cookie.slice('campusone_access_token='.length));
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
