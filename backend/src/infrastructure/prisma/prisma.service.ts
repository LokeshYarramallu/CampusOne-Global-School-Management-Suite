import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import type { AppConfig } from '../../core/config/configuration';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly isTestEnvironment: boolean;

  constructor(config: ConfigService<AppConfig, true>) {
    const databaseUrl = config.get('databaseUrl', { infer: true });
    const adapter = new PrismaPg({ connectionString: databaseUrl });

    super({ adapter });
    this.isTestEnvironment = config.get('nodeEnv', { infer: true }) === 'test';
  }

  async onModuleInit(): Promise<void> {
    if (!this.isTestEnvironment) {
      await this.$connect();
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.isTestEnvironment) {
      await this.$disconnect();
    }
  }
}
