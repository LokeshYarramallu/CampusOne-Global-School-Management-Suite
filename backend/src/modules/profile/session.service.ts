import { Injectable, Optional } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { AuthPrincipal } from '../../core/auth/auth.types';
import {
  tokenFromRequest,
  type AuthenticatedRequest,
} from '../../core/auth/jwt-auth.guard';
import { AppException } from '../../core/http/api-error';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PROFILE_ERROR_CODES } from './profile.constants';
import { UserProfileRepository } from './repositories/user-profile.repository';

export interface SessionView {
  id: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
  isCurrent: boolean;
}

/**
 * Session listing and self-termination — the half of feature 001's User Story 4
 * that was specified and never built.
 *
 * `auth_session` is keyed to a person, not a school, so this is identity-level
 * and needs no tenant scoping.
 */
@Injectable()
export class SessionService {
  constructor(
    private readonly profiles: UserProfileRepository,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  private get db(): PrismaService {
    if (!this.prisma) throw new Error('Database is not available');
    return this.prisma;
  }

  async listForPrincipal(
    request: AuthenticatedRequest,
  ): Promise<SessionView[]> {
    const currentHash = SessionService.hashOf(tokenFromRequest(request));
    const sessions = await this.profiles.findActiveSessions(
      request.user.userId,
    );

    // Identify the current session by its token hash rather than by asking the
    // client which one it is.
    const current = currentHash
      ? await this.db.authSession.findUnique({
          where: { tokenHash: currentHash },
          select: { id: true },
        })
      : null;

    return sessions.map((session) => ({
      id: session.id,
      createdAt: session.createdAt.toISOString(),
      lastUsedAt: session.lastUsedAt?.toISOString() ?? null,
      expiresAt: session.expiresAt.toISOString(),
      isCurrent: current?.id === session.id,
    }));
  }

  /**
   * Ends one of the caller's own sessions.
   *
   * A session id belonging to someone else yields exactly the same error as one
   * that does not exist. Distinguishing them would turn this into an
   * enumeration oracle for other people's sessions.
   */
  async endOwnSession(
    principal: AuthPrincipal,
    sessionId: string,
  ): Promise<void> {
    const session = await this.db.authSession.findFirst({
      where: {
        id: sessionId,
        userIdentityId: principal.userId,
        revokedAt: null,
      },
      select: { id: true },
    });

    if (!session) {
      throw new AppException({
        code: PROFILE_ERROR_CODES.SESSION_NOT_FOUND,
        message: 'That session was not found.',
        status: 404,
      });
    }

    await this.db.authSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    await this.db.securityEvent.create({
      data: {
        userIdentityId: principal.userId,
        eventType: 'SESSION_TERMINATED_BY_USER',
      },
    });
  }

  private static hashOf(token: string | undefined): string | null {
    return token ? createHash('sha256').update(token).digest('hex') : null;
  }
}
