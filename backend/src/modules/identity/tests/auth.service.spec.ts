import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AppConfig } from '../../../core/config/configuration';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { AuthService } from '../auth.service';
import { SECURITY_EVENTS } from '../identity.constants';

/** bcrypt hash of the sample password below. */
const SAMPLE_HASH =
  '$2b$12$Z7wzlqSHxF8PM1WsOjfyG.qjsKY3fiBCvhtH.4htCjaTKuqZffZV6';
const SAMPLE_EMAIL = 'platform-admin@campusone.local';
const SAMPLE_PASSWORD = 'CampusOneAdmin!2026';

function createConfig(
  overrides: Record<string, unknown> = {},
): ConfigService<AppConfig, true> {
  const values: Record<string, unknown> = {
    authMode: 'local-dev',
    // Not 'test': persistence is deliberately skipped in the test environment,
    // and these cases are about what gets persisted.
    nodeEnv: 'development',
    devPlatformAdminEmail: SAMPLE_EMAIL,
    devPlatformAdminPasswordHash: SAMPLE_HASH,
    jwtExpiresInSeconds: 3600,
    jwtSecret: 'test-only-jwt-secret',
    loginMaxFailedAttempts: 5,
    loginLockoutMinutes: 15,
    ...overrides,
  };
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService<AppConfig, true>;
}

const jwt = {
  signAsync: jest.fn().mockResolvedValue('signed-token'),
  verifyAsync: jest.fn(),
} as unknown as JwtService;

type IdentityRow = {
  id: string;
  email: string;
  passwordHash: string | null;
  status: string;
  failedLoginCount: number;
  lockedUntil: Date | null;
  roleAssignments: unknown[];
};

function identity(overrides: Partial<IdentityRow> = {}): IdentityRow {
  return {
    id: 'user-1',
    email: SAMPLE_EMAIL,
    passwordHash: SAMPLE_HASH,
    status: 'ACTIVE',
    failedLoginCount: 0,
    lockedUntil: null,
    roleAssignments: [],
    ...overrides,
  };
}

function createPrisma(user: IdentityRow | null) {
  const securityEvents: Array<Record<string, unknown>> = [];
  const identityUpdates: Array<Record<string, unknown>> = [];

  const prisma = {
    userIdentity: {
      findUnique: jest.fn().mockResolvedValue(user),
      update: jest.fn((args: { data: Record<string, unknown> }) => {
        identityUpdates.push(args.data);
        return Promise.resolve({});
      }),
    },
    role: {
      findUnique: jest.fn().mockResolvedValue({
        key: 'PLATFORM_SUPER_ADMIN',
        displayName: 'Platform Super Admin',
      }),
    },
    authSession: {
      create: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    securityEvent: {
      create: jest.fn((args: { data: Record<string, unknown> }) => {
        securityEvents.push(args.data);
        return Promise.resolve({});
      }),
    },
  } as unknown as PrismaService;

  return { prisma, securityEvents, identityUpdates };
}

describe('AuthService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('without a database (config-backed sample account)', () => {
    it('authenticates the sample Platform Super Admin', async () => {
      const service = new AuthService(createConfig(), jwt);

      await expect(
        service.login({ email: SAMPLE_EMAIL, password: SAMPLE_PASSWORD }),
      ).resolves.toMatchObject({
        token: 'signed-token',
        user: {
          roleKey: 'PLATFORM_SUPER_ADMIN',
          roleName: 'Platform Super Admin',
        },
      });
    });

    it('rejects an incorrect password', async () => {
      const service = new AuthService(createConfig(), jwt);

      await expect(
        service.login({ email: SAMPLE_EMAIL, password: 'wrong-password' }),
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', status: 401 });
    });
  });

  describe('account lockout', () => {
    it('locks the account when the final permitted attempt fails', async () => {
      const { prisma, identityUpdates } = createPrisma(
        identity({ failedLoginCount: 4 }),
      );
      const service = new AuthService(createConfig(), jwt, prisma);

      await expect(
        service.login({ email: SAMPLE_EMAIL, password: 'wrong-password' }),
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });

      expect(identityUpdates).toHaveLength(1);
      expect(identityUpdates[0].failedLoginCount).toEqual({ increment: 1 });
      expect(identityUpdates[0].lockedUntil).toBeInstanceOf(Date);
    });

    it('counts a failure without locking below the threshold', async () => {
      const { prisma, identityUpdates } = createPrisma(
        identity({ failedLoginCount: 1 }),
      );
      const service = new AuthService(createConfig(), jwt, prisma);

      await expect(
        service.login({ email: SAMPLE_EMAIL, password: 'wrong-password' }),
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });

      expect(identityUpdates[0]).not.toHaveProperty('lockedUntil');
    });

    it('reports the lock only to a caller who knows the password', async () => {
      const lockedUntil = new Date(Date.now() + 10 * 60_000);
      const { prisma } = createPrisma(identity({ lockedUntil }));
      const service = new AuthService(createConfig(), jwt, prisma);

      await expect(
        service.login({ email: SAMPLE_EMAIL, password: SAMPLE_PASSWORD }),
      ).rejects.toMatchObject({ code: 'ACCOUNT_LOCKED', status: 401 });
    });

    it('does not reveal the lock to a caller guessing the password', async () => {
      const lockedUntil = new Date(Date.now() + 10 * 60_000);
      const { prisma, identityUpdates } = createPrisma(
        identity({ lockedUntil }),
      );
      const service = new AuthService(createConfig(), jwt, prisma);

      await expect(
        service.login({ email: SAMPLE_EMAIL, password: 'wrong-password' }),
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });

      // An already-locked account must not have its lock extended by further
      // guesses, or an attacker could keep the owner out indefinitely.
      expect(identityUpdates).toHaveLength(0);
    });

    it('clears the counter and the lock on a successful sign-in', async () => {
      const { prisma, identityUpdates } = createPrisma(
        identity({ failedLoginCount: 3 }),
      );
      const service = new AuthService(createConfig(), jwt, prisma);

      await service.login({ email: SAMPLE_EMAIL, password: SAMPLE_PASSWORD });

      expect(identityUpdates[0]).toMatchObject({
        failedLoginCount: 0,
        lockedUntil: null,
      });
    });

    it('expires the lock once the window has passed', async () => {
      const { prisma } = createPrisma(
        identity({ lockedUntil: new Date(Date.now() - 60_000) }),
      );
      const service = new AuthService(createConfig(), jwt, prisma);

      await expect(
        service.login({ email: SAMPLE_EMAIL, password: SAMPLE_PASSWORD }),
      ).resolves.toMatchObject({ token: 'signed-token' });
    });
  });

  describe('security events', () => {
    it('records a success with a hashed IP, never the address itself', async () => {
      const { prisma, securityEvents } = createPrisma(identity());
      const service = new AuthService(createConfig(), jwt, prisma);

      await service.login(
        { email: SAMPLE_EMAIL, password: SAMPLE_PASSWORD },
        { ipAddress: '203.0.113.7', userAgent: 'Mozilla/5.0' },
      );

      expect(securityEvents).toHaveLength(1);
      expect(securityEvents[0]).toMatchObject({
        eventType: SECURITY_EVENTS.LOGIN_SUCCEEDED,
        userIdentityId: 'user-1',
        userAgent: 'Mozilla/5.0',
      });
      expect(securityEvents[0].ipHash).not.toContain('203.0.113.7');
      expect(securityEvents[0].ipHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('records a lockout distinctly from an ordinary failure', async () => {
      const { prisma, securityEvents } = createPrisma(
        identity({ failedLoginCount: 4 }),
      );
      const service = new AuthService(createConfig(), jwt, prisma);

      await expect(
        service.login({ email: SAMPLE_EMAIL, password: 'wrong-password' }),
      ).rejects.toThrow();

      expect(securityEvents[0]).toMatchObject({
        eventType: SECURITY_EVENTS.ACCOUNT_LOCKED,
      });
    });

    it('truncates an oversized user agent rather than rejecting the sign-in', async () => {
      const { prisma, securityEvents } = createPrisma(identity());
      const service = new AuthService(createConfig(), jwt, prisma);

      await service.login(
        { email: SAMPLE_EMAIL, password: SAMPLE_PASSWORD },
        { userAgent: 'x'.repeat(500) },
      );

      expect(securityEvents[0].userAgent).toHaveLength(255);
    });

    it('completes the sign-in even when the audit write fails', async () => {
      const { prisma } = createPrisma(identity());
      (prisma.securityEvent.create as unknown as jest.Mock).mockRejectedValue(
        new Error('audit table unavailable'),
      );
      const service = new AuthService(createConfig(), jwt, prisma);

      await expect(
        service.login({ email: SAMPLE_EMAIL, password: SAMPLE_PASSWORD }),
      ).resolves.toMatchObject({ token: 'signed-token' });
    });
  });

  describe('suspended identities', () => {
    it('rejects a suspended account as invalid credentials', async () => {
      const { prisma } = createPrisma(identity({ status: 'SUSPENDED' }));
      const service = new AuthService(createConfig(), jwt, prisma);

      await expect(
        service.login({ email: SAMPLE_EMAIL, password: SAMPLE_PASSWORD }),
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    });
  });
});
