import { Injectable } from '@nestjs/common';
import type { AuthPrincipal } from '../../core/auth/auth.types';
import { tenantContextFrom } from '../../core/auth/tenant-context';
import { PermissionEvaluatorService } from '../rbac/permission-evaluator.service';
import { PANEL_KINDS } from './profile.constants';
import { PanelRepository } from './repositories/panel.repository';
import {
  ParentLinkRepository,
  type LinkedChild,
} from './repositories/parent-link.repository';

/**
 * Chooses and populates exactly one role panel.
 *
 * The panel follows the role the person is **currently acting in**, taken from
 * the session. A client cannot ask for a panel, and data belonging to a role
 * the caller is not currently acting in is never assembled — let alone
 * returned (FR-013, FR-014). Hiding it in the UI would not be enough.
 */

interface EmptyReason {
  emptyReason: string;
}

export type ProfilePanel =
  | ({ kind: typeof PANEL_KINDS.PLATFORM } & {
      scopeNote: string;
      auditNote: string;
    })
  | ({ kind: typeof PANEL_KINDS.STAFF } & StaffPanelBody)
  | ({ kind: typeof PANEL_KINDS.TEACHER } & StaffPanelBody & {
        assignments: Array<{
          subject: string;
          classLabel: string;
          sectionLabel: string;
          isClassTeacher: boolean;
        }>;
      })
  | ({ kind: typeof PANEL_KINDS.STUDENT } & {
      enrollment: {
        admissionNumber: string;
        classLabel: string;
        sectionLabel: string;
        rollNumber: string | null;
        admittedOn: string;
      } | null;
      guardians: Array<{ name: string; relationship: string }>;
    } & Partial<EmptyReason>)
  | ({ kind: typeof PANEL_KINDS.PARENT } & {
      schools: Array<{
        schoolId: string;
        schoolName: string;
        children: Array<{
          name: string;
          relationship: string;
          classLabel: string | null;
          sectionLabel: string | null;
          isPrimaryContact: boolean;
          hasBillingResponsibility: boolean;
        }>;
      }>;
    } & Partial<EmptyReason>)
  | ({ kind: typeof PANEL_KINDS.UNAVAILABLE } & { reason: string });

interface StaffPanelBody {
  staff: {
    employeeNumber: string;
    designation: string;
    department: string | null;
    joinedOn: string;
  } | null;
  scopeSummary: string[];
  /** Stated boundaries, not just granted permissions (PRD §3.5). */
  boundaries: string[];
  emptyReason?: string;
}

const STAFF_ROLES = new Set([
  'SCHOOL_ADMIN_OFFICE',
  'PRINCIPAL',
  'ACCOUNTANT',
  'TEACHER',
]);

@Injectable()
export class PanelResolverService {
  constructor(
    private readonly panels: PanelRepository,
    private readonly parentLinks: ParentLinkRepository,
    private readonly permissions: PermissionEvaluatorService,
  ) {}

  async resolve(principal: AuthPrincipal): Promise<ProfilePanel> {
    const context = tenantContextFrom(principal);

    if (principal.roleKey === 'PLATFORM_SUPER_ADMIN') {
      return {
        kind: PANEL_KINDS.PLATFORM,
        scopeNote:
          'Platform-wide. This account operates the service itself and is not affiliated with any school.',
        auditNote:
          'Access to any school’s data is restricted to support and compliance purposes and is fully audited.',
      };
    }

    // Every remaining panel reads tenant-owned rows, so a school is required.
    if (context.tenantId === null) {
      return {
        kind: PANEL_KINDS.UNAVAILABLE,
        reason:
          'This role is not currently associated with a school, so there is nothing to show yet.',
      };
    }

    if (principal.roleKey === 'PARENT_GUARDIAN') {
      if (!(await this.panels.isFeatureEnabled(context, 'parent-identity'))) {
        return this.unavailable('Family access');
      }
      return this.parentPanel(principal);
    }

    if (principal.roleKey === 'STUDENT') {
      return this.studentPanel(principal);
    }

    if (STAFF_ROLES.has(principal.roleKey)) {
      return this.staffOrTeacherPanel(principal);
    }

    return {
      kind: PANEL_KINDS.UNAVAILABLE,
      reason: 'There is no profile panel defined for this role yet.',
    };
  }

  private unavailable(capability: string): ProfilePanel {
    return {
      kind: PANEL_KINDS.UNAVAILABLE,
      reason: `${capability} is not enabled for your school.`,
    };
  }

  /**
   * One database round trip for the whole panel — see the note in
   * `PanelRepository` on why this is not several concurrent transactions.
   */
  private async staffOrTeacherPanel(
    principal: AuthPrincipal,
  ): Promise<ProfilePanel> {
    const isTeacher = principal.roleKey === 'TEACHER';
    const data = await this.panels.loadStaffPanel(
      tenantContextFrom(principal),
      principal.userId,
      isTeacher,
    );

    if (!data.featureEnabled) return this.unavailable('Staff records');

    const body: StaffPanelBody = {
      staff: data.staff
        ? {
            employeeNumber: data.staff.employeeNumber,
            designation: data.staff.designation,
            department: data.staff.department,
            joinedOn: data.staff.joinedOn.toISOString().slice(0, 10),
          }
        : null,
      scopeSummary: this.scopeSummary(principal.roleKey),
      boundaries: PanelResolverService.boundariesFor(principal.roleKey),
      ...(data.staff
        ? {}
        : {
            emptyReason:
              'Your staff record has not been created yet. Your school administrator maintains it.',
          }),
    };

    if (!isTeacher) return { kind: PANEL_KINDS.STAFF, ...body };

    return {
      kind: PANEL_KINDS.TEACHER,
      ...body,
      assignments: data.assignments.map((assignment) => ({
        subject: assignment.subjectLabel,
        classLabel: assignment.classLabel,
        sectionLabel: assignment.sectionLabel,
        isClassTeacher: assignment.isClassTeacher,
      })),
      ...(data.assignments.length === 0 && data.staff
        ? {
            emptyReason:
              'No classes are assigned to you yet. Your school administrator sets teaching assignments.',
          }
        : {}),
    };
  }

  private async studentPanel(principal: AuthPrincipal): Promise<ProfilePanel> {
    const data = await this.panels.loadStudentPanel(
      tenantContextFrom(principal),
      principal.userId,
    );

    if (!data.featureEnabled) return this.unavailable('Student records');

    const { enrollment } = data;
    return {
      kind: PANEL_KINDS.STUDENT,
      enrollment: enrollment
        ? {
            admissionNumber: enrollment.admissionNumber,
            classLabel: enrollment.classLabel,
            sectionLabel: enrollment.sectionLabel,
            rollNumber: enrollment.rollNumber,
            admittedOn: enrollment.admittedOn.toISOString().slice(0, 10),
          }
        : null,
      guardians: [],
      ...(enrollment
        ? {}
        : {
            emptyReason:
              'Your enrolment record has not been created yet. Your school office maintains it.',
          }),
    };
  }

  private async parentPanel(principal: AuthPrincipal): Promise<ProfilePanel> {
    const parentIdentityId = await this.parentLinks.findParentIdentityId(
      principal.userId,
    );

    if (!parentIdentityId) {
      return {
        kind: PANEL_KINDS.PARENT,
        schools: [],
        emptyReason:
          'No children are linked to your account yet. A school links a child when it records you as their parent or guardian.',
      };
    }

    // The principal *is* this parent, so they see every school that linked
    // them (FR-030). A school-side caller would use the tenant-scoped method.
    const children =
      await this.parentLinks.findLinkedChildrenForParentAcrossTenants(
        parentIdentityId,
      );

    return {
      kind: PANEL_KINDS.PARENT,
      schools: PanelResolverService.groupBySchool(children),
      ...(children.length === 0
        ? {
            emptyReason:
              'No children are linked to your account yet. A school links a child when it records you as their parent or guardian.',
          }
        : {}),
    };
  }

  private static groupBySchool(children: LinkedChild[]) {
    const bySchool = new Map<
      string,
      { schoolId: string; schoolName: string; children: LinkedChild[] }
    >();

    for (const child of children) {
      const existing = bySchool.get(child.schoolId);
      if (existing) {
        existing.children.push(child);
      } else {
        bySchool.set(child.schoolId, {
          schoolId: child.schoolId,
          schoolName: child.schoolName,
          children: [child],
        });
      }
    }

    return [...bySchool.values()].map((school) => ({
      schoolId: school.schoolId,
      schoolName: school.schoolName,
      children: school.children.map((child) => ({
        name: `${child.givenName} ${child.familyName}`,
        relationship: child.relationship,
        classLabel: child.classLabel,
        sectionLabel: child.sectionLabel,
        isPrimaryContact: child.isPrimaryContact,
        hasBillingResponsibility: child.hasBillingResponsibility,
      })),
    }));
  }

  private scopeSummary(roleKey: string): string[] {
    return this.permissions
      .permissionsOf(roleKey)
      .map(([module, feature, action]) => `${action} ${feature} ${module}`);
  }

  /**
   * What a role explicitly may **not** do. Worth stating: a person seeing only
   * their grants cannot tell the difference between a boundary and an omission.
   */
  private static boundariesFor(roleKey: string): string[] {
    if (roleKey === 'ACCOUNTANT') {
      return [
        'Cannot modify academic records such as marks, grades, or attendance.',
        'Cannot change user permissions or role assignments.',
      ];
    }
    if (roleKey === 'TEACHER') {
      return [
        'Access is limited to your assigned subjects, classes, and students.',
      ];
    }
    if (roleKey === 'PRINCIPAL') {
      return [
        'Read access across the school; changes go through their owners.',
      ];
    }
    return [];
  }
}
