/**
 * The only sanctioned way to read or write a tenant-owned table.
 *
 * Every tenant-owned query runs inside an interactive transaction that first
 * issues `SET LOCAL app.tenant_id`, which is what the row-level security
 * policies created in `20260802000100_auth_rbac_foundation` compare against.
 *
 * `SET LOCAL` — not `SET` — is the whole point. It reverts when the
 * transaction ends, so a pooled connection cannot carry one request's tenant
 * into the next request. A plain `SET` would persist on the connection and
 * leak across tenants (ADR 0005).
 *
 * Application-layer `where: { tenantId }` scoping remains primary. This is the
 * backstop that catches a forgotten predicate, not a replacement for writing
 * one.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppException } from '../../core/http/api-error';
import {
  hasTenantScope,
  type TenantContext,
} from '../../core/auth/tenant-context';
import { PrismaService } from './prisma.service';

/** The subset of the client available inside a tenant-scoped transaction. */
export type TenantScopedClient = Omit<
  PrismaService,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'
>;

@Injectable()
export class TenantScopedPrisma {
  private readonly logger = new Logger(TenantScopedPrisma.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Runs `work` with the tenant GUC set for the duration of one transaction.
   *
   * Throws when the context carries no tenant. It deliberately does **not**
   * return an empty result: an empty list is indistinguishable from "this
   * tenant genuinely has no rows", and that ambiguity is exactly what let the
   * missing tenant context survive unnoticed through two migrations.
   */
  async run<T>(
    context: TenantContext,
    work: (client: TenantScopedClient) => Promise<T>,
  ): Promise<T> {
    if (!hasTenantScope(context)) {
      this.logger.error(
        `Tenant-owned access attempted without tenant context (role=${context.roleKey})`,
      );
      throw new AppException({
        code: 'TENANT_CONTEXT_MISSING',
        message: 'Something went wrong. Please try again.',
        status: 500,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      // Parameterised via Prisma.sql so the tenant id can never be
      // concatenated into SQL, even though it originates server-side.
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${context.tenantId}, true)`;
      return work(tx as unknown as TenantScopedClient);
    });
  }

  /**
   * The audited cross-tenant path. Named so it cannot be reached by accident
   * and shows up in review (AGENTS.md, "Multi-Tenancy Rules").
   *
   * Callers must justify themselves: a Platform Super Admin operation, or the
   * unified parent identity, which is the one deliberate cross-tenant entity
   * in the platform (PRD §5.3).
   */
  async runAcrossTenantsForAuditedPath<T>(
    reason: string,
    work: (client: TenantScopedClient) => Promise<T>,
  ): Promise<T> {
    this.logger.log(`Cross-tenant access: ${reason}`);
    return work(this.prisma);
  }
}

/** Re-exported so repositories can type a transaction parameter. */
export type { Prisma };
