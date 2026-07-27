import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../core/config/configuration';

export interface HealthStatus {
  status: 'ok';
  environment: AppConfig['nodeEnv'];
  /** Process uptime in whole seconds. */
  uptimeSeconds: number;
  timestamp: string;
}

@Injectable()
export class HealthService {
  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  check(): HealthStatus {
    return {
      status: 'ok',
      environment: this.config.get('nodeEnv', { infer: true }),
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
