import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { AllExceptionsFilter } from './../src/core/http/all-exceptions.filter';
import type { ApiErrorBody } from './../src/core/http/api-error';
import type { HealthStatus } from './../src/modules/health/health.service';

describe('API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Mirrors main.ts so e2e exercises the real request pipeline. Keep the
    // two in step — a difference here means tests pass against a pipeline
    // that does not exist in production.
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/health', () => {
    it('returns the liveness payload', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);
      const body = response.body as HealthStatus;

      expect(body).toMatchObject({ status: 'ok' });
      expect(typeof body.uptimeSeconds).toBe('number');
      expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
    });
  });

  describe('error contract', () => {
    it('returns the standard envelope for an unknown route', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/does-not-exist')
        .expect(404);

      const body = response.body as ApiErrorBody;

      expect(body.error.code).toBe('NOT_FOUND');
      expect(typeof body.error.message).toBe('string');
      expect(body.error.details).toBeNull();
      expect(Object.keys(body)).toEqual(['error']);
    });

    it('serves nothing outside the /api/v1 prefix', async () => {
      await request(app.getHttpServer()).get('/health').expect(404);
    });
  });

  describe('development authentication', () => {
    it('logs in the sample Platform Super Admin and sets an httpOnly cookie', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'platform-admin@campusone.local',
          password: 'CampusOneAdmin!2026',
        })
        .expect(201);

      const loginBody = response.body as {
        user: { roleKey: string; roleName: string };
      };
      expect(loginBody.user).toMatchObject({
        roleKey: 'PLATFORM_SUPER_ADMIN',
        roleName: 'Platform Super Admin',
      });
      expect(response.headers['set-cookie'][0]).toContain(
        'campusone_access_token=',
      );
      expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
    });

    it('rejects invalid credentials and protects the current-user endpoint', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'platform-admin@campusone.local',
          password: 'incorrect-password',
        })
        .expect(401)
        .expect(({ body }: { body: unknown }) => {
          expect((body as ApiErrorBody).error.code).toBe('INVALID_CREDENTIALS');
        });

      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401)
        .expect(({ body }: { body: unknown }) => {
          expect((body as ApiErrorBody).error.code).toBe('UNAUTHENTICATED');
        });
    });
  });
  describe('Calendar endpoints', () => {});

  describe('Calendar endpoints', () => {
    it('rejects unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/calendar')
        .expect(401)
        .expect(({ body }: { body: unknown }) => {
          expect((body as ApiErrorBody).error.code).toBe('UNAUTHENTICATED');
        });
    });

    it('rejects the platform admin because the calendar permission is missing', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'platform-admin@campusone.local',
          password: 'CampusOneAdmin!2026',
        })
        .expect(201);

      const cookies = loginResponse.headers['set-cookie'] as unknown as
        string[] | undefined;
      if (!cookies || cookies.length === 0) {
        throw new Error('Platform admin login did not set a cookie');
      }

      await request(app.getHttpServer())
        .get('/api/v1/calendar')
        .set('Cookie', cookies[0])
        .expect(403)
        .expect(({ body }: { body: unknown }) => {
          expect((body as ApiErrorBody).error.code).toBe('FORBIDDEN');
        });
    });
  });
});
