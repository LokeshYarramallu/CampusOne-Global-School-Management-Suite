import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import {
  TenantScopedPrisma,
  type TenantScopedClient,
} from '../../../infrastructure/prisma/tenant-scoped.client';
import type { TenantContext } from '../../../core/auth/tenant-context';

/**
 * The unified parent identity — the one deliberate cross-tenant entity in the
 * platform (PRD §5.3), and the single easiest place to leak one school's
 * existence to another.
 *
 * There are exactly two ways to read a parent's children, and they are named so
 * the difference cannot be missed in review:
 *
 *   findLinkedChildrenForParentAcrossTenants — the parent's own view. Every
 *     school. Callable only when the principal *is* that parent.
 *
 *   findLinkedChildrenWithinTenant — every school-side caller. That school's
 *     links only, and nothing from which another school could be inferred.
 *
 * "Inferred" is the operative word. Returning one row while disclosing a total
 * of two still tells school A that school B exists. No count, total, ordering
 * position, or paging cursor derived from the cross-tenant set may cross the
 * boundary (FR-029).
 */

export interface LinkedChild {
  childUserId: string;
  givenName: string;
  familyName: string;
  relationship: string;
  isPrimaryContact: boolean;
  hasBillingResponsibility: boolean;
  accessScope: unknown;
  schoolId: string;
  schoolName: string;
  classLabel: string | null;
  sectionLabel: string | null;
}

@Injectable()
export class ParentLinkRepository {
  constructor(
    private readonly scoped: TenantScopedPrisma,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  private get db(): PrismaService {
    if (!this.prisma) throw new Error('Database is not available');
    return this.prisma;
  }

  async findParentIdentityId(userId: string): Promise<string | null> {
    const identity = await this.db.parentIdentity.findUnique({
      where: { userIdentityId: userId },
      select: { id: true },
    });
    return identity?.id ?? null;
  }

  /**
   * The parent's own view: every school that has linked them.
   *
   * Runs on the audited cross-tenant path because that is exactly what it is.
   * The caller must already have established that the principal is this parent
   * — this method cannot check that for itself, which is why its name says so.
   */
  async findLinkedChildrenForParentAcrossTenants(
    parentIdentityId: string,
  ): Promise<LinkedChild[]> {
    return this.scoped.runAcrossTenantsForAuditedPath(
      'unified parent identity — parent viewing their own children',
      async (client) => {
        const grants = await client.familyAccessGrant.findMany({
          where: { parentIdentityId, revokedAt: null },
          select: {
            userIdentityId: true,
            relationship: true,
            scope: true,
          },
        });
        if (grants.length === 0) return [];

        const links = await client.parentSchoolLink.findMany({
          where: { parentIdentityId, status: 'ACCEPTED' },
          select: { tenantId: true, tenant: { select: { displayName: true } } },
        });

        return this.assemble(client, grants, links);
      },
    );
  }

  /**
   * Every school-side caller. Scoped to the caller's own school, and carrying
   * nothing from which another school could be inferred.
   */
  async findLinkedChildrenWithinTenant(
    context: TenantContext,
    parentIdentityId: string,
  ): Promise<LinkedChild[]> {
    return this.scoped.run(context, async (client) => {
      const link = await client.parentSchoolLink.findFirst({
        where: {
          parentIdentityId,
          tenantId: context.tenantId!,
          status: 'ACCEPTED',
        },
        select: { tenantId: true, tenant: { select: { displayName: true } } },
      });
      if (!link) return [];

      // Restricted to children enrolled at *this* school. A grant for a child
      // at another school is simply not reachable from here.
      const enrolled = await client.studentEnrollment.findMany({
        where: { tenantId: context.tenantId! },
        select: { userIdentityId: true },
      });
      const enrolledIds = new Set(enrolled.map((row) => row.userIdentityId));

      const grants = await client.familyAccessGrant.findMany({
        where: {
          parentIdentityId,
          revokedAt: null,
          userIdentityId: { in: [...enrolledIds] },
        },
        select: { userIdentityId: true, relationship: true, scope: true },
      });

      return this.assemble(client, grants, [link]);
    });
  }

  /** Shared shaping. Only ever sees rows the caller was already allowed. */
  private async assemble(
    client: TenantScopedClient,
    grants: Array<{
      userIdentityId: string;
      relationship: string;
      scope: unknown;
    }>,
    links: Array<{ tenantId: string; tenant: { displayName: string } | null }>,
  ): Promise<LinkedChild[]> {
    const childIds = grants.map((grant) => grant.userIdentityId);
    const tenantIds = links.map((link) => link.tenantId);

    const [profiles, enrollments] = await Promise.all([
      client.userProfile.findMany({
        where: { userIdentityId: { in: childIds } },
        select: { userIdentityId: true, givenName: true, familyName: true },
      }),
      client.studentEnrollment.findMany({
        where: {
          userIdentityId: { in: childIds },
          tenantId: { in: tenantIds },
        },
        select: {
          userIdentityId: true,
          tenantId: true,
          classLabel: true,
          sectionLabel: true,
        },
      }),
    ]);

    const profileByUser = new Map(profiles.map((p) => [p.userIdentityId, p]));
    const schoolNameById = new Map(
      links.map((link) => [link.tenantId, link.tenant?.displayName ?? '']),
    );

    return enrollments.flatMap((enrollment) => {
      const grant = grants.find(
        (candidate) => candidate.userIdentityId === enrollment.userIdentityId,
      );
      const profile = profileByUser.get(enrollment.userIdentityId);
      if (!grant || !profile) return [];

      const scope = (grant.scope ?? {}) as Record<string, unknown>;
      return [
        {
          childUserId: enrollment.userIdentityId,
          givenName: profile.givenName,
          familyName: profile.familyName,
          relationship: grant.relationship,
          isPrimaryContact: scope.primaryContact === true,
          hasBillingResponsibility: scope.billing === true,
          accessScope: grant.scope,
          schoolId: enrollment.tenantId,
          schoolName: schoolNameById.get(enrollment.tenantId) ?? '',
          classLabel: enrollment.classLabel,
          sectionLabel: enrollment.sectionLabel,
        },
      ];
    });
  }
}
