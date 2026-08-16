import type { AuthPrincipal } from '../../../core/auth/auth.types';
import { PermissionEvaluatorService } from '../../rbac/permission-evaluator.service';
import { PanelResolverService } from '../panel-resolver.service';
import { PANEL_KINDS } from '../profile.constants';
import type { PanelRepository } from '../repositories/panel.repository';
import type { ParentLinkRepository } from '../repositories/parent-link.repository';

const TENANT_A = '11111111-1111-1111-1111-111111111111';
const TENANT_B = '22222222-2222-2222-2222-222222222222';

function principal(overrides: Partial<AuthPrincipal> = {}): AuthPrincipal {
  return {
    userId: 'user-1',
    email: 'person@school.test',
    roleKey: 'TEACHER',
    roleName: 'Teacher',
    tenantId: TENANT_A,
    authMode: 'local-dev',
    ...overrides,
  };
}

function createResolver(
  panelOverrides: Partial<PanelRepository> = {},
  parentOverrides: Partial<ParentLinkRepository> = {},
) {
  const panels = {
    loadStaffPanel: jest.fn().mockResolvedValue({
      featureEnabled: true,
      staff: {
        employeeNumber: 'EMP-0004',
        designation: 'Senior Teacher',
        department: 'Mathematics',
        joinedOn: new Date('2024-06-01'),
      },
      assignments: [
        {
          subjectLabel: 'Mathematics',
          classLabel: '8',
          sectionLabel: 'B',
          isClassTeacher: true,
        },
      ],
    }),
    loadStudentPanel: jest.fn().mockResolvedValue({
      featureEnabled: true,
      enrollment: {
        admissionNumber: '2024-0417',
        classLabel: '8',
        sectionLabel: 'B',
        rollNumber: '17',
        admittedOn: new Date('2024-06-10'),
      },
    }),
    isFeatureEnabled: jest.fn().mockResolvedValue(true),
    ...panelOverrides,
  } as unknown as PanelRepository;

  const parentLinks = {
    findParentIdentityId: jest.fn().mockResolvedValue('parent-1'),
    findLinkedChildrenForParentAcrossTenants: jest.fn().mockResolvedValue([]),
    findLinkedChildrenWithinTenant: jest.fn().mockResolvedValue([]),
    ...parentOverrides,
  } as unknown as ParentLinkRepository;

  return {
    resolver: new PanelResolverService(
      panels,
      parentLinks,
      new PermissionEvaluatorService(),
    ),
    panels,
    parentLinks,
  };
}

describe('PanelResolverService', () => {
  describe('one panel per role', () => {
    it.each([
      ['PLATFORM_SUPER_ADMIN', PANEL_KINDS.PLATFORM, undefined],
      ['SCHOOL_ADMIN_OFFICE', PANEL_KINDS.STAFF, TENANT_A],
      ['PRINCIPAL', PANEL_KINDS.STAFF, TENANT_A],
      ['ACCOUNTANT', PANEL_KINDS.STAFF, TENANT_A],
      ['TEACHER', PANEL_KINDS.TEACHER, TENANT_A],
      ['STUDENT', PANEL_KINDS.STUDENT, TENANT_A],
      ['PARENT_GUARDIAN', PANEL_KINDS.PARENT, TENANT_A],
    ])('%s gets the %s panel', async (roleKey, expectedKind, tenantId) => {
      const { resolver } = createResolver();

      const panel = await resolver.resolve(
        principal({ roleKey, tenantId, roleName: roleKey }),
      );

      expect(panel.kind).toBe(expectedKind);
    });

    it('gives the Platform Super Admin no school-shaped content at all', async () => {
      const { resolver, panels } = createResolver();

      const panel = await resolver.resolve(
        principal({ roleKey: 'PLATFORM_SUPER_ADMIN', tenantId: undefined }),
      );

      expect(panel).toMatchObject({ kind: PANEL_KINDS.PLATFORM });
      expect(JSON.stringify(panel)).not.toContain('employeeNumber');
      // No tenant-owned table is even consulted.
      expect(panels.loadStaffPanel).not.toHaveBeenCalled();
    });

    it('does not include another role panel fields', async () => {
      const { resolver } = createResolver();

      const panel = await resolver.resolve(principal({ roleKey: 'STUDENT' }));

      expect(JSON.stringify(panel)).not.toContain('assignments');
      expect(JSON.stringify(panel)).not.toContain('employeeNumber');
    });

    it('states the Accountant boundary rather than only their grants', async () => {
      const { resolver } = createResolver();

      const panel = await resolver.resolve(
        principal({ roleKey: 'ACCOUNTANT', roleName: 'Accountant' }),
      );

      expect(JSON.stringify(panel)).toMatch(/cannot modify academic records/i);
    });

    it('names the teacher scope as a limit, not a feature', async () => {
      const { resolver } = createResolver();

      const panel = await resolver.resolve(principal({ roleKey: 'TEACHER' }));

      expect(JSON.stringify(panel)).toMatch(/limited to your assigned/i);
    });
  });

  describe('empty states (FR-033)', () => {
    it('explains an absent staff record rather than rendering blank', async () => {
      const { resolver } = createResolver({
        loadStaffPanel: jest.fn().mockResolvedValue({
          featureEnabled: true,
          staff: null,
          assignments: [],
        }),
      });

      const panel = await resolver.resolve(
        principal({ roleKey: 'PRINCIPAL', roleName: 'Principal' }),
      );

      expect(panel).toMatchObject({ kind: PANEL_KINDS.STAFF, staff: null });
      expect((panel as { emptyReason?: string }).emptyReason).toMatch(
        /school administrator/i,
      );
    });

    it('explains an absent teaching assignment', async () => {
      const { resolver } = createResolver({
        loadStaffPanel: jest.fn().mockResolvedValue({
          featureEnabled: true,
          staff: {
            employeeNumber: 'EMP-0004',
            designation: 'Senior Teacher',
            department: 'Mathematics',
            joinedOn: new Date('2024-06-01'),
          },
          assignments: [],
        }),
      });

      const panel = await resolver.resolve(principal({ roleKey: 'TEACHER' }));

      expect((panel as { emptyReason?: string }).emptyReason).toMatch(
        /no classes are assigned/i,
      );
    });

    it('explains an absent enrolment', async () => {
      const { resolver } = createResolver({
        loadStudentPanel: jest.fn().mockResolvedValue({
          featureEnabled: true,
          enrollment: null,
        }),
      });

      const panel = await resolver.resolve(principal({ roleKey: 'STUDENT' }));

      expect((panel as { emptyReason?: string }).emptyReason).toMatch(
        /school office/i,
      );
    });

    it('explains a parent with no linked children', async () => {
      const { resolver } = createResolver(
        {},
        { findParentIdentityId: jest.fn().mockResolvedValue(null) },
      );

      const panel = await resolver.resolve(
        principal({ roleKey: 'PARENT_GUARDIAN' }),
      );

      expect(panel).toMatchObject({ kind: PANEL_KINDS.PARENT, schools: [] });
      expect((panel as { emptyReason?: string }).emptyReason).toMatch(
        /no children are linked/i,
      );
    });
  });

  describe('feature gating (FR-038)', () => {
    it('makes a gated-off panel unavailable', async () => {
      const { resolver } = createResolver({
        loadStudentPanel: jest
          .fn()
          .mockResolvedValue({ featureEnabled: false, enrollment: null }),
      });

      const panel = await resolver.resolve(principal({ roleKey: 'STUDENT' }));

      expect(panel).toMatchObject({ kind: PANEL_KINDS.UNAVAILABLE });
    });

    it('does not read the underlying data when gated off', async () => {
      const { resolver } = createResolver({
        loadStudentPanel: jest
          .fn()
          .mockResolvedValue({ featureEnabled: false, enrollment: null }),
      });

      const panel = await resolver.resolve(principal({ roleKey: 'STUDENT' }));

      // Unreachable, not merely hidden: the repository short circuits on the
      // flag and never selects the enrolment row.
      expect(panel).toMatchObject({ kind: PANEL_KINDS.UNAVAILABLE });
      expect(JSON.stringify(panel)).not.toContain('admissionNumber');
    });
  });

  describe('tenant requirement', () => {
    it('will not assemble a tenant-owned panel without a school', async () => {
      const { resolver, panels } = createResolver();

      const panel = await resolver.resolve(
        principal({ roleKey: 'TEACHER', tenantId: undefined }),
      );

      expect(panel.kind).toBe(PANEL_KINDS.UNAVAILABLE);
      expect(panels.loadStaffPanel).not.toHaveBeenCalled();
    });

    it('reads with the principal own tenant, never a supplied one', async () => {
      const { resolver, panels } = createResolver();

      await resolver.resolve(
        principal({ roleKey: 'TEACHER', tenantId: TENANT_B }),
      );

      expect(panels.loadStaffPanel).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: TENANT_B }),
        'user-1',
        true,
      );
    });
  });
});
