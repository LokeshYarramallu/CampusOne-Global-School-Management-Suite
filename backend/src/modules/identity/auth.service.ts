import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, createHmac } from 'node:crypto';
import type { AppConfig } from '../../core/config/configuration';
import type { AuthPrincipal, JwtClaims } from '../../core/auth/auth.types';
import { AppException } from '../../core/http/api-error';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import type { LoginDto } from './dto/login.dto';
import {
  AUTH_ERROR_CODES,
  SECURITY_EVENTS,
  type AuthRequestContext,
  type SecurityEventType,
} from './identity.constants';

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

/** The identity fields `login` needs; narrower than the full Prisma model. */
type IdentityRecord = {
  id: string;
  email: string;
  passwordHash: string | null;
  status: string;
  failedLoginCount: number;
  lockedUntil: Date | null;
  roleAssignments: RoleAssignment[];
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly config: ConfigService<AppConfig, true>,
    private readonly jwt: JwtService,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  /**
   * Prisma is optional so unit tests can exercise the config-backed sample
   * account without a database. Returning `null` also stands in for the test
   * environment, where persistence is deliberately skipped.
   */
  private get database(): PrismaService | null {
    if (!this.prisma) return null;
    return this.config.get('nodeEnv', { infer: true }) === 'test'
      ? null
      : this.prisma;
  }

  async login(
    credentials: LoginDto,
    context: AuthRequestContext = {},
  ): Promise<AuthSessionResponse> {
    const email = credentials.email.trim().toLowerCase();
    const authMode = this.config.get('authMode', { infer: true });

    if (authMode !== 'local-dev') {
      throw AppException.unauthenticated(
        'The configured identity provider is not available.',
      );
    }

    const databaseUser = await this.findIdentity(email);
    const passwordHash =
      databaseUser?.passwordHash ??
      this.config.get('devPlatformAdminPasswordHash', { infer: true });
    const effectiveEmail =
      databaseUser?.email ??
      this.config.get('devPlatformAdminEmail', { infer: true });

    if (!passwordHash) {
      await this.recordSecurityEvent(
        SECURITY_EVENTS.LOGIN_FAILED,
        null,
        context,
      );
      throw AuthService.invalidCredentials();
    }

    // The hash is always compared, even when the address does not match, so a
    // wrong email and a wrong password cost the same wall-clock time.
    const passwordMatches = await bcrypt.compare(
      credentials.password,
      passwordHash,
    );
    const lockedUntil = databaseUser?.lockedUntil ?? null;
    const isLocked = lockedUntil !== null && lockedUntil > new Date();
    const isBlockedStatus =
      databaseUser?.status === 'SUSPENDED' ||
      databaseUser?.status === 'DELETED';

    if (email !== effectiveEmail || !passwordMatches || isBlockedStatus) {
      await this.registerFailedAttempt(databaseUser, isLocked, context);
      throw AuthService.invalidCredentials();
    }

    // Only a caller who already proved the password learns that the account is
    // locked. Disclosing it earlier would turn the endpoint into an account
    // enumeration oracle.
    if (isLocked) {
      await this.recordSecurityEvent(
        SECURITY_EVENTS.LOGIN_BLOCKED,
        databaseUser?.id ?? null,
        context,
      );
      throw new AppException({
        code: AUTH_ERROR_CODES.ACCOUNT_LOCKED,
        message: `Too many failed sign-in attempts. Try again in ${minutesUntil(lockedUntil)} minutes, or contact your school administrator.`,
        status: 401,
      });
    }

    const assignment = databaseUser?.roleAssignments[0];
    const role =
      assignment?.role ??
      (this.database
        ? await this.database.role.findUnique({
            where: { key: 'PLATFORM_SUPER_ADMIN' },
          })
        : { key: 'PLATFORM_SUPER_ADMIN', displayName: 'Platform Super Admin' });
    if (!role) throw AuthService.invalidCredentials();

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

    const database = this.database;
    if (databaseUser && database) {
      await database.userIdentity.update({
        where: { id: databaseUser.id },
        data: {
          failedLoginCount: 0,
          lockedUntil: null,
          lastLoginAt: new Date(),
        },
      });
      await database.authSession.create({
        data: {
          userIdentityId: databaseUser.id,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
        },
      });
    }

    await this.recordSecurityEvent(
      SECURITY_EVENTS.LOGIN_SUCCEEDED,
      databaseUser?.id ?? null,
      context,
    );

    return { user, expiresInSeconds, token };
  }

  async verifyAccessToken(token: string | undefined): Promise<AuthPrincipal> {
    if (!token) throw AppException.unauthenticated();

    try {
      const claims = await this.jwt.verifyAsync<JwtClaims>(token);
      const database = this.database;
      if (database) {
        const session = await database.authSession.findUnique({
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
          (await database.role.findUnique({
            where: { key: 'PLATFORM_SUPER_ADMIN' },
          }));
        if (
          !role ||
          role.key !== claims.roleKey ||
          role.displayName !== claims.roleName
        )
          throw new Error('Role is no longer active');
        await database.authSession.update({
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

  async revokeAccessToken(
    token: string | undefined,
    context: AuthRequestContext = {},
  ): Promise<void> {
    const database = this.database;
    if (!token || !database) return;

    const tokenHash = hashToken(token);
    const session = await database.authSession.findUnique({
      where: { tokenHash },
      select: { id: true, userIdentityId: true, revokedAt: true },
    });
    if (!session || session.revokedAt) return;

    await database.authSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    await this.recordSecurityEvent(
      SECURITY_EVENTS.LOGOUT,
      session.userIdentityId,
      context,
    );
  }

  /** Looks the identity up, converting an infrastructure fault into a 500. */
  private async findIdentity(email: string): Promise<IdentityRecord | null> {
    const database = this.database;
    if (!database) return null;

    try {
      return await database.userIdentity.findUnique({
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
      // The email is deliberately absent: identifiers never reach the logs
      // (AGENTS.md, "Student Data Privacy").
      this.logger.error(
        'Database identity lookup failed',
        JSON.stringify({
          name: (error as { name?: string }).name,
          code: (error as { code?: string }).code,
        }),
      );
      throw new AppException({
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong. Please try again.',
        status: 500,
      });
    }
  }

  /**
   * Counts the failure and locks the account once the threshold is crossed.
   * The counter is incremented atomically so concurrent attempts cannot race
   * past the limit.
   */
  private async registerFailedAttempt(
    user: IdentityRecord | null,
    alreadyLocked: boolean,
    context: AuthRequestContext,
  ): Promise<void> {
    const database = this.database;
    if (!user || !database || alreadyLocked) {
      await this.recordSecurityEvent(
        SECURITY_EVENTS.LOGIN_FAILED,
        user?.id ?? null,
        context,
      );
      return;
    }

    const maxAttempts = this.config.get('loginMaxFailedAttempts', {
      infer: true,
    });
    const lockoutMinutes = this.config.get('loginLockoutMinutes', {
      infer: true,
    });
    const shouldLock = user.failedLoginCount + 1 >= maxAttempts;

    await database.userIdentity.update({
      where: { id: user.id },
      data: {
        failedLoginCount: { increment: 1 },
        ...(shouldLock
          ? { lockedUntil: new Date(Date.now() + lockoutMinutes * 60_000) }
          : {}),
      },
    });

    await this.recordSecurityEvent(
      shouldLock
        ? SECURITY_EVENTS.ACCOUNT_LOCKED
        : SECURITY_EVENTS.LOGIN_FAILED,
      user.id,
      context,
    );
  }

  /**
   * Appends to the security audit trail. Never throws: losing an audit row is
   * bad, but failing a sign-in because the audit write failed is worse.
   *
   * The IP address is stored as a keyed hash — enough to correlate attempts
   * from one source, not enough to recover the address from the table.
   */
  private async recordSecurityEvent(
    eventType: SecurityEventType,
    userIdentityId: string | null,
    context: AuthRequestContext,
  ): Promise<void> {
    const database = this.database;
    if (!database) return;

    try {
      await database.securityEvent.create({
        data: {
          userIdentityId,
          eventType,
          ipHash: this.hashIpAddress(context.ipAddress),
          userAgent: context.userAgent?.slice(0, 255) ?? null,
        },
      });
    } catch {
      this.logger.warn(`Could not record security event ${eventType}`);
    }
  }

  private hashIpAddress(ipAddress: string | undefined): string | null {
    if (!ipAddress) return null;
    return createHmac('sha256', this.config.get('jwtSecret', { infer: true }))
      .update(ipAddress)
      .digest('hex');
  }

  private static invalidCredentials(): AppException {
    return new AppException({
      code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
      message: 'The email or password is incorrect.',
      status: 401,
    });
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function minutesUntil(instant: Date): number {
  return Math.max(1, Math.ceil((instant.getTime() - Date.now()) / 60_000));
}
