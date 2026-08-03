import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import type { AppConfig } from '../../core/config/configuration';
import type { AuthPrincipal, JwtClaims } from '../../core/auth/auth.types';
import { AppException } from '../../core/http/api-error';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import type { LoginDto } from './dto/login.dto';

export interface AuthSessionResponse {
  user: AuthPrincipal;
  expiresInSeconds: number;
  token: string;
}

type RoleAssignment = {
  tenantId: string;
  scope: unknown;
  role: { key: string; displayName: string };
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly config: ConfigService<AppConfig, true>,
    private readonly jwt: JwtService,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  async login(credentials: LoginDto): Promise<AuthSessionResponse> {
    const email = credentials.email.trim().toLowerCase();
    const authMode = this.config.get('authMode', { infer: true });

    if (authMode !== 'local-dev') {
      throw AppException.unauthenticated(
        'The configured identity provider is not available.',
      );
    }

    const configuredEmail = this.config.get('devPlatformAdminEmail', {
      infer: true,
    });
    const databaseAuthEnabled =
      this.prisma && this.config.get('nodeEnv', { infer: true }) !== 'test';
    let databaseUser = null;
    if (databaseAuthEnabled) {
      try {
        databaseUser = await this.prisma.userIdentity.findUnique({
          where: { email },
          include: {
            roleAssignments: {
              include: { role: true },
              orderBy: { createdAt: 'asc' },
              take: 1,
            },
          },
        });
      } catch (error) {
        this.logger.error(
          'Database identity lookup failed',
          JSON.stringify({
            name: (error as { name?: string }).name,
            code: (error as { code?: string }).code,
            message: (error as { message?: string }).message,
            meta: (error as { meta?: unknown }).meta,
            cause: (error as { cause?: unknown }).cause,
          }),
        );
        throw new AppException({
          code: 'INTERNAL_ERROR',
          message: 'Something went wrong. Please try again.',
          status: 500,
        });
      }
    }
    const passwordHash =
      databaseUser?.passwordHash ??
      this.config.get('devPlatformAdminPasswordHash', { infer: true });
    const effectiveEmail = databaseUser?.email ?? configuredEmail;
    const isLocked =
      databaseUser?.lockedUntil && databaseUser.lockedUntil > new Date();
    if (!passwordHash) throw AppException.unauthenticated();
    const passwordMatches = await bcrypt.compare(
      credentials.password,
      passwordHash,
    );

    if (
      isLocked ||
      email !== effectiveEmail ||
      !passwordMatches ||
      databaseUser?.status === 'SUSPENDED' ||
      databaseUser?.status === 'DELETED'
    ) {
      if (databaseUser && databaseAuthEnabled && !isLocked) {
        await this.prisma.userIdentity.update({
          where: { id: databaseUser.id },
          data: { failedLoginCount: { increment: 1 } },
        });
      }
      throw new AppException({
        code: 'INVALID_CREDENTIALS',
        message: 'The email or password is incorrect.',
        status: 401,
      });
    }

    const assignment = databaseUser?.roleAssignments[0] as
      RoleAssignment | undefined;
    const role =
      assignment?.role ??
      (databaseAuthEnabled
        ? await this.prisma.role.findUnique({
            where: { key: 'PLATFORM_SUPER_ADMIN' },
          })
        : { key: 'PLATFORM_SUPER_ADMIN', displayName: 'Platform Super Admin' });
    if (!role)
      throw AppException.unauthenticated('The email or password is incorrect.');

    const user: AuthPrincipal = {
      userId: databaseUser?.id ?? 'dev-platform-super-admin',
      email: effectiveEmail,
      roleKey: role.key,
      roleName: role.displayName,
      ...(assignment
        ? { tenantId: assignment.tenantId, scope: assignment.scope }
        : {}),
      authMode,
    };
    const expiresInSeconds = this.config.get('jwtExpiresInSeconds', {
      infer: true,
    });
    const token = await this.jwt.signAsync({
      sub: user.userId,
      email: user.email,
      roleKey: user.roleKey,
      roleName: user.roleName,
      tenantId: user.tenantId,
      scope: user.scope,
      authMode: user.authMode,
    } satisfies JwtClaims);

    if (databaseUser && databaseAuthEnabled) {
      await this.prisma.userIdentity.update({
        where: { id: databaseUser.id },
        data: {
          failedLoginCount: 0,
          lockedUntil: null,
          lastLoginAt: new Date(),
        },
      });
      await this.prisma.authSession.create({
        data: {
          userIdentityId: databaseUser.id,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
        },
      });
    }

    return { user, expiresInSeconds, token };
  }

  async verifyAccessToken(token: string | undefined): Promise<AuthPrincipal> {
    if (!token) throw AppException.unauthenticated();

    try {
      const claims = await this.jwt.verifyAsync<JwtClaims>(token);
      if (this.prisma && this.config.get('nodeEnv', { infer: true }) !== 'test') {
        const session = await this.prisma.authSession.findUnique({
          where: { tokenHash: hashToken(token) },
          include: {
            user: {
              include: {
                roleAssignments: {
                  include: { role: true },
                  orderBy: { createdAt: 'asc' },
                  take: 1,
                },
              },
            },
          },
        });
        if (
          !session ||
          session.revokedAt ||
          session.expiresAt <= new Date() ||
          session.user.status !== 'ACTIVE'
        )
          throw new Error('Session is not active');
        const assignment = session.user.roleAssignments[0] as
          RoleAssignment | undefined;
        const role =
          assignment?.role ??
          (await this.prisma.role.findUnique({
            where: { key: 'PLATFORM_SUPER_ADMIN' },
          }));
        if (
          !role ||
          role.key !== claims.roleKey ||
          role.displayName !== claims.roleName
        )
          throw new Error('Role is no longer active');
        await this.prisma.authSession.update({
          where: { id: session.id },
          data: { lastUsedAt: new Date() },
        });
      }
      if (claims.authMode !== 'local-dev')
        throw new Error('Unsupported principal');
      return {
        userId: claims.sub,
        email: claims.email,
        roleKey: claims.roleKey,
        roleName: claims.roleName,
        tenantId: claims.tenantId,
        scope: claims.scope,
        authMode: claims.authMode,
      };
    } catch {
      throw AppException.unauthenticated();
    }
  }

  async revokeAccessToken(token: string | undefined): Promise<void> {
    if (!token || !this.prisma || this.config.get('nodeEnv', { infer: true }) === 'test') return;
    await this.prisma.authSession.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
