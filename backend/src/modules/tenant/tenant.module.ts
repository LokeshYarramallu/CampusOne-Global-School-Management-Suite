import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';

/** Public API: `TenantService` only. No controller — this module exposes no routes yet. */
@Module({
  providers: [TenantService],
  exports: [TenantService],
})
export class TenantModule {}
