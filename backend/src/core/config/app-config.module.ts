import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { loadConfiguration } from './configuration';
import { validateEnv } from './env.validation';

/**
 * Global configuration. Import once in AppModule; `ConfigService` is then
 * injectable everywhere without re-importing.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [loadConfiguration],
      validate: validateEnv,
      // .env.local overrides .env for machine-specific values.
      envFilePath: ['.env.local', '.env'],
    }),
  ],
})
export class AppConfigModule {}
