import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

/**
 * Reference implementation of the module structure described in AGENTS.md.
 *
 * The `exports` array is this module's public API — everything not listed is
 * internal to it.
 */
@Module({
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
