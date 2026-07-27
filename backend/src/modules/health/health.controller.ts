import { Controller, Get } from '@nestjs/common';
import { HealthService, type HealthStatus } from './health.service';

/**
 * Liveness endpoint for load balancers, orchestrators, and uptime monitoring.
 *
 * Unauthenticated by design, so it must never expose configuration values,
 * dependency credentials, or anything tenant-specific.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  check(): HealthStatus {
    return this.healthService.check();
  }
}
