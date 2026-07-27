import { Module } from '@nestjs/common';
import { AppConfigModule } from './core/config/app-config.module';
import { HealthModule } from './modules/health/health.module';

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

    // Feature modules
    HealthModule,
  ],
})
export class AppModule {}
