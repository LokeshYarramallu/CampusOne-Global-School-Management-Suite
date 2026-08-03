import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

/**
 * Read-only access to a school's identity.
 *
 * Deliberately minimal. School provisioning, configuration editing, and the
 * Platform Super Admin's cross-tenant management surface all belong to the
 * tenant-management feature (spec 001, FR-024 to FR-030). This module exists
 * so other modules can put a school's name and configured languages on screen
 * without reaching into the `tenant` table themselves.
 */

export interface TenantSummary {
  id: string;
  slug: string;
  displayName: string;
  isActive: boolean;
  /** Languages this school permits; used to validate a language preference. */
  languages: string[];
}

@Injectable()
export class TenantService {
  constructor(@Optional() private readonly prisma?: PrismaService) {}

  /**
   * `tenant` is a platform-level table, not tenant-owned — it *is* the tenant —
   * so it carries no row-level policy and needs no tenant-scoped client.
   */
  async findById(tenantId: string): Promise<TenantSummary | null> {
    if (!this.prisma) return null;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        slug: true,
        displayName: true,
        status: true,
        configuration: { select: { languages: true } },
      },
    });

    if (!tenant) return null;

    return {
      id: tenant.id,
      slug: tenant.slug,
      displayName: tenant.displayName,
      isActive: tenant.status === 'ACTIVE',
      languages: tenant.configuration?.languages ?? ['en'],
    };
  }
}
