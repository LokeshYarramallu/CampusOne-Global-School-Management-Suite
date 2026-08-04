import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppConfigModule } from './core/config/app-config.module';
import type { AppConfig } from './core/config/configuration';
import { RateLimitGuard, skipUnlessStrict } from './core/http/rate-limit.guard';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { IdentityModule } from './modules/identity/identity.module';
import { ProfileModule } from './modules/profile/profile.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { TenantModule } from './modules/tenant/tenant.module';

/**
 * Composition root. Every feature module is registered here.
 *
 * Keep this file a list of imports — it must not accumulate controllers,
 * providers, or business logic of its own.
 */
@Module({
  imports: [
    // Core
    AppConfigModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        throttlers: [
          // Inherited by every endpoint: a backstop against runaway clients.
          { name: 'default', ttl: 60_000, limit: 120 },
          // Applied only to handlers marked @StrictRateLimit().
          {
            name: 'strict',
            ttl:
              config.get('loginRateLimitWindowSeconds', { infer: true }) * 1000,
            limit: config.get('loginRateLimitAttempts', { infer: true }),
            skipIf: skipUnlessStrict,
          },
        ],
      }),
    }),
    PrismaModule,
    RbacModule,
    IdentityModule,
    TenantModule,

    // Feature modules
    HealthModule,
    ProfileModule,
    CalendarModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: RateLimitGuard }],
})
export class AppModule {}
