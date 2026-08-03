import { Module } from '@nestjs/common';
import { AppConfigModule } from './core/config/app-config.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { IdentityModule } from './modules/identity/identity.module';
import { RbacModule } from './modules/rbac/rbac.module';

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
    PrismaModule,
    RbacModule,
    IdentityModule,

    // Feature modules
    HealthModule,
  ],
})
export class AppModule {}
