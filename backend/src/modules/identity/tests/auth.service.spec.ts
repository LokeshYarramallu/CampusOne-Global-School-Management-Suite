import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AppConfig } from '../../../core/config/configuration';
import { AuthService } from '../auth.service';

describe('AuthService', () => {
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, unknown> = {
        authMode: 'local-dev',
        devPlatformAdminEmail: 'platform-admin@campusone.local',
        devPlatformAdminPasswordHash:
          '$2b$12$Z7wzlqSHxF8PM1WsOjfyG.qjsKY3fiBCvhtH.4htCjaTKuqZffZV6',
        jwtExpiresInSeconds: 3600,
      };
      return values[key];
    }),
  } as unknown as ConfigService<AppConfig, true>;
  const jwt = {
    signAsync: jest.fn().mockResolvedValue('signed-token'),
    verifyAsync: jest.fn(),
  } as unknown as JwtService;

  beforeEach(() => jest.clearAllMocks());

  it('authenticates the sample Platform Super Admin', async () => {
    const service = new AuthService(config, jwt);

    await expect(
      service.login({
        email: 'platform-admin@campusone.local',
        password: 'CampusOneAdmin!2026',
      }),
    ).resolves.toMatchObject({
      token: 'signed-token',
      user: {
        roleKey: 'PLATFORM_SUPER_ADMIN',
        roleName: 'Platform Super Admin',
      },
    });
  });

  it('rejects an incorrect password', async () => {
    const service = new AuthService(config, jwt);

    await expect(
      service.login({
        email: 'platform-admin@campusone.local',
        password: 'wrong-password',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', status: 401 });
  });
});
