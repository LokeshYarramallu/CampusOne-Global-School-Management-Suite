import type { AuthPrincipal } from '../../../core/auth/auth.types';
import type { TenantScopedClient } from '../../../infrastructure/prisma/tenant-scoped.client';
import { buildVisibilityWhere, resolveVisibleClasses } from '../visibility';

const TENANT = '11111111-1111-1111-1111-111111111111';

function principal(overrides: Partial<AuthPrincipal> = {}): AuthPrincipal {
  return {
    userId: 'user-1',
    email: 'person@school.test',
    roleKey: 'STUDENT',
    roleName: 'Student',
    tenantId: TENANT,
    authMode: 'local-dev',
    ...overrides,
  };
}

/** A minimal client stub exposing only what visibility.ts reaches for. */
function client(over: Record<string, unknown> = {}): TenantScopedClient {
  return {
    studentEnrollment: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    staffProfile: { findFirst: jest.fn().mockResolvedValue(null) },
    teachingAssignment: { findMany: jest.fn().mockResolvedValue([]) },
    parentIdentity: { findUnique: jest.fn().mockResolvedValue(null) },
    familyAccessGrant: { findMany: jest.fn().mockResolvedValue([]) },
    ...over,
  } as unknown as TenantScopedClient;
}

describe('resolveVisibleClasses', () => {
  it('gives a student their own enrolled class', async () => {
    const c = client({
      studentEnrollment: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ classLabel: '8', sectionLabel: 'B' }),
        findMany: jest.fn(),
      },
    });

    const classes = await resolveVisibleClasses(c, principal(), TENANT);

    expect(classes).toEqual([{ classLabel: '8', sectionLabel: 'B' }]);
  });

  it('gives a teacher their assigned classes, de-duplicated', async () => {
    const c = client({
      staffProfile: {
        findFirst: jest.fn().mockResolvedValue({ id: 'staff-1' }),
      },
      teachingAssignment: {
        findMany: jest.fn().mockResolvedValue([
          { classLabel: '8', sectionLabel: 'B' },
          { classLabel: '8', sectionLabel: 'B' },
          { classLabel: '9', sectionLabel: 'A' },
        ]),
      },
    });

    const classes = await resolveVisibleClasses(
      c,
      principal({ roleKey: 'TEACHER' }),
      TENANT,
    );

    expect(classes).toEqual([
      { classLabel: '8', sectionLabel: 'B' },
      { classLabel: '9', sectionLabel: 'A' },
    ]);
  });

  it("gives a parent their children's classes in this tenant", async () => {
    const c = client({
      parentIdentity: {
        findUnique: jest.fn().mockResolvedValue({ id: 'p-1' }),
      },
      familyAccessGrant: {
        findMany: jest.fn().mockResolvedValue([{ userIdentityId: 'child-1' }]),
      },
      studentEnrollment: {
        findFirst: jest.fn(),
        findMany: jest
          .fn()
          .mockResolvedValue([{ classLabel: '8', sectionLabel: 'B' }]),
      },
    });

    const classes = await resolveVisibleClasses(
      c,
      principal({ roleKey: 'PARENT_GUARDIAN' }),
      TENANT,
    );

    expect(classes).toEqual([{ classLabel: '8', sectionLabel: 'B' }]);
  });

  it.each([
    'SCHOOL_ADMIN_OFFICE',
    'PRINCIPAL',
    'ACCOUNTANT',
    'PLATFORM_SUPER_ADMIN',
  ])('gives %s no class membership at all', async (roleKey) => {
    const classes = await resolveVisibleClasses(
      client(),
      principal({ roleKey }),
      TENANT,
    );

    expect(classes).toEqual([]);
  });

  it('returns nothing for a student with no enrolment', async () => {
    expect(await resolveVisibleClasses(client(), principal(), TENANT)).toEqual(
      [],
    );
  });
});

describe('buildVisibilityWhere', () => {
  it('always includes school events and the caller own events', () => {
    const where = buildVisibilityWhere(principal(), TENANT, []);

    expect(where.tenantId).toBe(TENANT);
    expect(where.OR).toEqual([{ scope: 'SCHOOL' }, { ownerUserId: 'user-1' }]);
  });

  it('adds a class branch only when the caller has class membership', () => {
    const where = buildVisibilityWhere(principal(), TENANT, [
      { classLabel: '8', sectionLabel: 'B' },
    ]);

    expect(where.OR).toContainEqual({
      scope: 'CLASS',
      OR: [{ classLabel: '8', sectionLabel: 'B' }],
    });
  });

  it('omits the class branch entirely for a member-less role', () => {
    // This is the membership rule at the predicate level: an admin with no
    // class membership can never match a CLASS event they did not create.
    const where = buildVisibilityWhere(
      principal({ roleKey: 'SCHOOL_ADMIN_OFFICE' }),
      TENANT,
      [],
    );

    const hasClassBranch = where.OR.some((clause) => clause.scope === 'CLASS');
    expect(hasClassBranch).toBe(false);
  });

  it('scopes to a date range when given one', () => {
    const from = new Date('2026-08-01');
    const to = new Date('2026-08-31');

    const where = buildVisibilityWhere(principal(), TENANT, [], { from, to });

    expect(where.eventDate).toEqual({ gte: from, lte: to });
  });
});
