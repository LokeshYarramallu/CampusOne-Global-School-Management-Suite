import { Injectable } from '@nestjs/common';
import type { TenantContext } from '../../../core/auth/tenant-context';
import { TenantScopedPrisma } from '../../../infrastructure/prisma/tenant-scoped.client';

/**
 * Tenant-owned reads for the role panels.
 *
 * **One transaction per panel, not one per query.** An interactive transaction
 * holds a connection for its whole duration, so a method-per-query design that
 * the caller then runs through `Promise.all` opens several at once and
 * exhausts the pool — which shows up as a slow request that eventually fails,
 * not as an obvious error. Each `load*` method below therefore does all of its
 * work inside a single `scoped.run`.
 *
 * That also matches what ADR 0005 describes: one tenant context established per
 * request, not re-established per query.
 *
 * The explicit `where: { tenantId }` is still present and still primary. RLS is
 * the backstop for a forgotten predicate, not a substitute for writing one.
 */

export interface StaffRecord {
  employeeNumber: string;
  designation: string;
  department: string | null;
  joinedOn: Date;
}

export interface TeachingAssignmentRecord {
  subjectLabel: string;
  classLabel: string;
  sectionLabel: string;
  isClassTeacher: boolean;
}

export interface EnrollmentRecord {
  admissionNumber: string;
  classLabel: string;
  sectionLabel: string;
  rollNumber: string | null;
  admittedOn: Date;
}

export interface StaffPanelData {
  featureEnabled: boolean;
  staff: StaffRecord | null;
  assignments: TeachingAssignmentRecord[];
}

export interface StudentPanelData {
  featureEnabled: boolean;
  enrollment: EnrollmentRecord | null;
}

const STAFF_SELECT = {
  employeeNumber: true,
  designation: true,
  department: true,
  joinedOn: true,
} as const;

@Injectable()
export class PanelRepository {
  constructor(private readonly scoped: TenantScopedPrisma) {}

  /**
   * Everything a staff or teacher panel needs, in one transaction.
   *
   * `includeAssignments` exists so the non-teacher staff roles do not pay for a
   * lookup they will not render. The feature check happens first and short
   * circuits the rest: a gated-off capability must leave its data unread, not
   * merely unrendered (FR-038).
   */
  async loadStaffPanel(
    context: TenantContext,
    userId: string,
    includeAssignments: boolean,
  ): Promise<StaffPanelData> {
    return this.scoped.run(context, async (client) => {
      const tenantId = context.tenantId!;

      const flag = await client.featureFlag.findFirst({
        where: { tenantId, feature: 'staff-records' },
        select: { enabled: true },
      });
      if (flag?.enabled === false) {
        return { featureEnabled: false, staff: null, assignments: [] };
      }

      const staff = await client.staffProfile.findFirst({
        where: { tenantId, userIdentityId: userId },
        select: { ...STAFF_SELECT, id: true },
      });

      if (!staff || !includeAssignments) {
        return {
          featureEnabled: true,
          staff: staff ? stripId(staff) : null,
          assignments: [],
        };
      }

      const assignments = await client.teachingAssignment.findMany({
        where: { tenantId, staffProfileId: staff.id },
        select: {
          subjectLabel: true,
          classLabel: true,
          sectionLabel: true,
          isClassTeacher: true,
        },
        orderBy: [{ classLabel: 'asc' }, { sectionLabel: 'asc' }],
      });

      return { featureEnabled: true, staff: stripId(staff), assignments };
    });
  }

  async loadStudentPanel(
    context: TenantContext,
    userId: string,
  ): Promise<StudentPanelData> {
    return this.scoped.run(context, async (client) => {
      const tenantId = context.tenantId!;

      const flag = await client.featureFlag.findFirst({
        where: { tenantId, feature: 'student-information' },
        select: { enabled: true },
      });
      if (flag?.enabled === false) {
        return { featureEnabled: false, enrollment: null };
      }

      const enrollment = await client.studentEnrollment.findFirst({
        where: { tenantId, userIdentityId: userId },
        select: {
          admissionNumber: true,
          classLabel: true,
          sectionLabel: true,
          rollNumber: true,
          admittedOn: true,
        },
      });

      return { featureEnabled: true, enrollment };
    });
  }

  /**
   * Whether a capability is switched on for this school (FR-038).
   *
   * Absent means "not configured". Core capabilities are on by default
   * (constitution Principle II); an optional capability that must default off
   * needs an explicit row saying so.
   */
  async isFeatureEnabled(
    context: TenantContext,
    feature: string,
  ): Promise<boolean> {
    return this.scoped.run(context, async (client) => {
      const flag = await client.featureFlag.findFirst({
        where: { tenantId: context.tenantId!, feature },
        select: { enabled: true },
      });
      return flag?.enabled ?? true;
    });
  }
}

/** The staff row is selected with its id so assignments can be looked up; the
 *  id is internal and does not belong in the panel payload. */
function stripId(staff: StaffRecord & { id: string }): StaffRecord {
  return {
    employeeNumber: staff.employeeNumber,
    designation: staff.designation,
    department: staff.department,
    joinedOn: staff.joinedOn,
  };
}
