import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import type { AppConfig } from '../../core/config/configuration';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
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
      await this.warnIfRlsIsBypassed();
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.isTestEnvironment) {
      await this.$disconnect();
    }
  }

  /**
   * Reports whether the row-level security backstop is actually in force.
   *
   * The RLS policies added in `20260802000100_auth_rbac_foundation` are
   * silently inert if the connected role carries `SUPERUSER` or `BYPASSRLS` —
   * those override both the policy and the session variable. No application
   * code can grant itself the right property, so the only honest thing to do
   * is detect and report it (ADR 0005).
   *
   * This check exists because its absence is what let the backstop sit inert
   * through two migrations without anyone noticing.
   */
  private async warnIfRlsIsBypassed(): Promise<void> {
    try {
      const rows = await this.$queryRaw<
        Array<{ rolname: string; rolsuper: boolean; rolbypassrls: boolean }>
      >`SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`;

      const role = rows[0];
      if (!role) {
        this.logger.warn(
          'Could not determine the connected database role; RLS posture unverified',
        );
        return;
      }

      if (role.rolsuper || role.rolbypassrls) {
        this.logger.warn(
          `RLS BACKSTOP INACTIVE: database role "${role.rolname}" bypasses row-level security ` +
            `(rolsuper=${role.rolsuper}, rolbypassrls=${role.rolbypassrls}). ` +
            'Tenant isolation currently rests on application-layer scoping alone. ' +
            'Configure a role with neither attribute for the API connection — see ADR 0005.',
        );
        return;
      }

      this.logger.log(
        `RLS backstop active (database role "${role.rolname}" cannot bypass row-level security)`,
      );
    } catch (error) {
      // A failed posture check must not stop the application from booting, but
      // it must not pass silently either.
      this.logger.warn(
        `Could not verify the RLS posture of the database role: ${(error as Error).message}`,
      );
    }
  }
}
