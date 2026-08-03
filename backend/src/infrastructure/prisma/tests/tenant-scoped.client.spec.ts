import { tenantContextFrom } from '../../../core/auth/tenant-context';
import type { AuthPrincipal } from '../../../core/auth/auth.types';
import { PrismaService } from '../prisma.service';
import { TenantScopedPrisma } from '../tenant-scoped.client';

const TENANT_A = '11111111-1111-1111-1111-111111111111';
const TENANT_B = '22222222-2222-2222-2222-222222222222';

function principal(overrides: Partial<AuthPrincipal> = {}): AuthPrincipal {
  return {
    userId: 'user-1',
    email: 'teacher@school.test',
    roleKey: 'TEACHER',
    roleName: 'Teacher',
    tenantId: TENANT_A,
    authMode: 'local-dev',
    ...overrides,
  };
}

/**
 * Records the statements a transaction issues, so the test can assert that the
 * tenant GUC is set *before* any query runs rather than merely at some point.
 */
function createPrisma() {
  const statements: string[] = [];
  const rowsByTenant: Record<string, string[]> = {
    [TENANT_A]: ['a-row-1', 'a-row-2'],
    [TENANT_B]: ['b-row-1'],
  };
  let activeTenant: string | null = null;

  const tx = {
    $executeRaw: jest.fn(
      (strings: TemplateStringsArray, ...values: unknown[]) => {
        statements.push(strings.join('?'));
        activeTenant = values[0] as string;
        return Promise.resolve(1);
      },
    ),
    // Stands in for a tenant-owned table: returns only what the GUC allows,
    // which is what the real RLS policy does.
    staffProfile: {
      findMany: jest.fn(() =>
        Promise.resolve(activeTenant ? (rowsByTenant[activeTenant] ?? []) : []),
      ),
    },
  };

  const prisma = {
    $transaction: jest.fn(
      async (fn: (client: typeof tx) => Promise<unknown>) => {
        const result = await fn(tx);
        // SET LOCAL reverts at transaction end — model that, because it is the
        // property the whole design depends on.
        activeTenant = null;
        return result;
      },
    ),
  } as unknown as PrismaService;

  return { prisma, tx, statements, getActiveTenant: () => activeTenant };
}

describe('TenantScopedPrisma', () => {
  it('sets the tenant GUC before running the caller work', async () => {
    const { prisma, tx, statements } = createPrisma();
    const scoped = new TenantScopedPrisma(prisma);

    await scoped.run(tenantContextFrom(principal()), async (client) => {
      await client.staffProfile.findMany({});
      return null;
    });

    expect(statements).toHaveLength(1);
    expect(statements[0]).toContain('set_config');
    expect(statements[0]).toContain('app.tenant_id');
    // The GUC statement must be issued before the table is touched.
    expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.staffProfile.findMany.mock.invocationCallOrder[0],
    );
  });

  it('passes the tenant id as a bound parameter, never as interpolated SQL', async () => {
    const { prisma, tx } = createPrisma();
    const scoped = new TenantScopedPrisma(prisma);

    await scoped.run(tenantContextFrom(principal()), () =>
      Promise.resolve(null),
    );

    const [strings, ...values] = tx.$executeRaw.mock.calls[0];
    expect(values).toEqual([TENANT_A]);
    expect(strings.join('')).not.toContain(TENANT_A);
  });

  it('returns only the active tenant rows', async () => {
    const { prisma } = createPrisma();
    const scoped = new TenantScopedPrisma(prisma);

    const rows = await scoped.run(tenantContextFrom(principal()), (client) =>
      client.staffProfile.findMany({}),
    );

    expect(rows).toEqual(['a-row-1', 'a-row-2']);
  });

  it('does not return another tenant rows', async () => {
    const { prisma } = createPrisma();
    const scoped = new TenantScopedPrisma(prisma);

    const rows = await scoped.run(
      tenantContextFrom(principal({ tenantId: TENANT_B })),
      (client) => client.staffProfile.findMany({}),
    );

    expect(rows).toEqual(['b-row-1']);
    expect(rows).not.toContain('a-row-1');
  });

  /**
   * The reason `SET LOCAL` was chosen over `SET`. A pooled connection must not
   * carry one request's tenant into the next.
   */
  it('does not leak the tenant into a later transaction on the same connection', async () => {
    const { prisma, getActiveTenant } = createPrisma();
    const scoped = new TenantScopedPrisma(prisma);

    await scoped.run(tenantContextFrom(principal()), () =>
      Promise.resolve(null),
    );
    expect(getActiveTenant()).toBeNull();

    const rows = await scoped.run(
      tenantContextFrom(principal({ tenantId: TENANT_B })),
      (client) => client.staffProfile.findMany({}),
    );
    expect(rows).toEqual(['b-row-1']);
  });

  /**
   * Regression guard for the defect this whole mechanism exists to fix: an
   * empty result is indistinguishable from "this tenant has no rows", which is
   * how the missing tenant context went unnoticed through two migrations.
   */
  it('raises rather than returning empty when there is no tenant context', async () => {
    const { prisma } = createPrisma();
    const scoped = new TenantScopedPrisma(prisma);
    const platformAdmin = principal({
      roleKey: 'PLATFORM_SUPER_ADMIN',
      tenantId: undefined,
    });

    await expect(
      scoped.run(tenantContextFrom(platformAdmin), (client) =>
        client.staffProfile.findMany({}),
      ),
    ).rejects.toMatchObject({ code: 'TENANT_CONTEXT_MISSING', status: 500 });
  });

  it('never opens a transaction when context is missing', async () => {
    const { prisma } = createPrisma();
    const scoped = new TenantScopedPrisma(prisma);

    await expect(
      scoped.run(tenantContextFrom(principal({ tenantId: undefined })), () =>
        Promise.resolve(null),
      ),
    ).rejects.toThrow();

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not leak the tenant id in the error shown to a caller', async () => {
    const { prisma } = createPrisma();
    const scoped = new TenantScopedPrisma(prisma);

    await expect(
      scoped.run(tenantContextFrom(principal({ tenantId: undefined })), () =>
        Promise.resolve(null),
      ),
    ).rejects.toMatchObject({
      message: 'Something went wrong. Please try again.',
    });
  });

  describe('the audited cross-tenant path', () => {
    it('runs without tenant scoping when explicitly justified', async () => {
      const { prisma } = createPrisma();
      const scoped = new TenantScopedPrisma(prisma);

      const result = await scoped.runAcrossTenantsForAuditedPath(
        'unified parent identity — parent viewing their own children',
        () => Promise.resolve('ran'),
      );

      expect(result).toBe('ran');
      // Deliberately outside the tenant transaction; the name is the guard.
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});

describe('tenantContextFrom', () => {
  it('takes the tenant from the principal, not from any input', () => {
    expect(tenantContextFrom(principal())).toEqual({
      tenantId: TENANT_A,
      userId: 'user-1',
      roleKey: 'TEACHER',
    });
  });

  it('represents a principal above any tenant as null rather than undefined', () => {
    expect(
      tenantContextFrom(principal({ tenantId: undefined })).tenantId,
    ).toBeNull();
  });
});
