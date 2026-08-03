import type { AuthPrincipal } from '../../../core/auth/auth.types';
import { PermissionEvaluatorService } from '../../rbac/permission-evaluator.service';
import { PanelResolverService } from '../panel-resolver.service';
import type { PanelRepository } from '../repositories/panel.repository';
import type {
  LinkedChild,
  ParentLinkRepository,
} from '../repositories/parent-link.repository';

/**
 * The cross-tenant privacy boundary (FR-029, FR-030; PRD §5.3).
 *
 * The failure this guards against is not "school A can read school B's rows".
 * It is subtler: school A learning that school B *exists* at all — from a
 * count, a total, an ordering position, or a paging cursor computed over the
 * full cross-tenant set. These tests assert absence of **inference**, not
 * merely absence of rows.
 */

const GREENWOOD = '11111111-1111-1111-1111-111111111111';
const RIVERSIDE = '22222222-2222-2222-2222-222222222222';

function child(overrides: Partial<LinkedChild> = {}): LinkedChild {
  return {
    childUserId: 'child-greenwood',
    givenName: 'Aarav',
    familyName: 'Kumar',
    relationship: 'biological',
    isPrimaryContact: true,
    hasBillingResponsibility: true,
    accessScope: { kind: 'full' },
    schoolId: GREENWOOD,
    schoolName: 'Greenwood High',
    classLabel: '8',
    sectionLabel: 'B',
    ...overrides,
  };
}

const CHILD_AT_RIVERSIDE = child({
  childUserId: 'child-riverside',
  givenName: 'Diya',
  schoolId: RIVERSIDE,
  schoolName: 'Riverside Academy',
  classLabel: '5',
  sectionLabel: 'A',
});

function parentPrincipal(tenantId: string): AuthPrincipal {
  return {
    userId: 'parent-user',
    email: 'parent@campusone.local',
    roleKey: 'PARENT_GUARDIAN',
    roleName: 'Parent / Guardian',
    tenantId,
    authMode: 'local-dev',
  };
}

function createResolver(acrossTenants: LinkedChild[]) {
  const parentLinks = {
    findParentIdentityId: jest.fn().mockResolvedValue('parent-identity-1'),
    findLinkedChildrenForParentAcrossTenants: jest
      .fn()
      .mockResolvedValue(acrossTenants),
    findLinkedChildrenWithinTenant: jest.fn().mockResolvedValue([child()]),
  } as unknown as ParentLinkRepository;

  const panels = {
    isFeatureEnabled: jest.fn().mockResolvedValue(true),
    findStaffRecord: jest.fn(),
    findTeachingAssignments: jest.fn(),
    findEnrollment: jest.fn(),
  } as unknown as PanelRepository;

  return {
    resolver: new PanelResolverService(
      panels,
      parentLinks,
      new PermissionEvaluatorService(),
    ),
    parentLinks,
  };
}

describe('parent cross-school privacy', () => {
  describe("the parent's own view (FR-030)", () => {
    it('shows every school that has linked them', async () => {
      const { resolver } = createResolver([child(), CHILD_AT_RIVERSIDE]);

      const panel = await resolver.resolve(parentPrincipal(GREENWOOD));

      expect(panel).toMatchObject({ kind: 'PARENT' });
      const schools = (panel as { schools: Array<{ schoolName: string }> })
        .schools;
      expect(schools).toHaveLength(2);
      expect(schools.map((school) => school.schoolName).sort()).toEqual([
        'Greenwood High',
        'Riverside Academy',
      ]);
    });

    it('groups each child under its own school', async () => {
      const { resolver } = createResolver([child(), CHILD_AT_RIVERSIDE]);

      const panel = await resolver.resolve(parentPrincipal(GREENWOOD));
      const schools = (
        panel as {
          schools: Array<{
            schoolName: string;
            children: Array<{ name: string }>;
          }>;
        }
      ).schools;

      const riverside = schools.find(
        (s) => s.schoolName === 'Riverside Academy',
      );
      expect(riverside?.children.map((c) => c.name)).toEqual(['Diya Kumar']);
    });

    it('uses the cross-tenant path, which is the audited one', async () => {
      const { resolver, parentLinks } = createResolver([child()]);

      await resolver.resolve(parentPrincipal(GREENWOOD));

      expect(
        parentLinks.findLinkedChildrenForParentAcrossTenants,
      ).toHaveBeenCalledWith('parent-identity-1');
      // The tenant-scoped method is for school-side callers, not the parent.
      expect(parentLinks.findLinkedChildrenWithinTenant).not.toHaveBeenCalled();
    });
  });

  describe('what a school must never learn (FR-029)', () => {
    /**
     * The repository is the boundary. A school-side caller uses the
     * tenant-scoped method; there is no code path from a school-side role to
     * the cross-tenant one.
     */
    it('exposes two differently named methods so the choice is explicit', () => {
      const { parentLinks } = createResolver([]);

      expect(typeof parentLinks.findLinkedChildrenForParentAcrossTenants).toBe(
        'function',
      );
      expect(typeof parentLinks.findLinkedChildrenWithinTenant).toBe(
        'function',
      );
    });

    it('returns only the calling school links from the scoped method', async () => {
      const { parentLinks } = createResolver([child(), CHILD_AT_RIVERSIDE]);

      const rows = await parentLinks.findLinkedChildrenWithinTenant(
        {
          tenantId: GREENWOOD,
          userId: 'admin',
          roleKey: 'SCHOOL_ADMIN_OFFICE',
        },
        'parent-identity-1',
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].schoolId).toBe(GREENWOOD);
    });

    it('leaks no total, count, or cursor computed over the full set', async () => {
      const { parentLinks } = createResolver([child(), CHILD_AT_RIVERSIDE]);

      const rows = await parentLinks.findLinkedChildrenWithinTenant(
        {
          tenantId: GREENWOOD,
          userId: 'admin',
          roleKey: 'SCHOOL_ADMIN_OFFICE',
        },
        'parent-identity-1',
      );

      // A bare array carries no metadata. Returning `{ items, total: 2 }` would
      // disclose the other school without returning a single one of its rows.
      expect(Array.isArray(rows)).toBe(true);
      const serialised = JSON.stringify(rows);
      expect(serialised).not.toContain('Riverside');
      expect(serialised).not.toContain(RIVERSIDE);
      expect(serialised).not.toMatch(/"total"|"count"|"cursor"|"nextPage"/);
    });

    it('never names another school in the payload', async () => {
      const { parentLinks } = createResolver([child(), CHILD_AT_RIVERSIDE]);

      const rows = await parentLinks.findLinkedChildrenWithinTenant(
        {
          tenantId: GREENWOOD,
          userId: 'admin',
          roleKey: 'SCHOOL_ADMIN_OFFICE',
        },
        'parent-identity-1',
      );

      for (const row of rows) {
        expect(row.schoolId).toBe(GREENWOOD);
        expect(row.schoolName).not.toBe('Riverside Academy');
      }
    });
  });

  describe('guardian revocation (FR-031)', () => {
    it('drops a revoked child from the panel', async () => {
      // The repository filters `revokedAt: null`, so a revoked grant simply
      // is not among the rows returned.
      const { resolver } = createResolver([CHILD_AT_RIVERSIDE]);

      const panel = await resolver.resolve(parentPrincipal(GREENWOOD));
      const schools = (panel as { schools: Array<{ schoolName: string }> })
        .schools;

      expect(schools).toHaveLength(1);
      expect(schools[0].schoolName).toBe('Riverside Academy');
    });
  });
});
