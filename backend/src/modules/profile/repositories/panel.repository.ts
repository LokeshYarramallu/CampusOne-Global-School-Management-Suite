import { Injectable } from '@nestjs/common';
import type { TenantContext } from '../../../core/auth/tenant-context';
import { TenantScopedPrisma } from '../../../infrastructure/prisma/tenant-scoped.client';

/**
 * Tenant-owned reads for the role panels.
 *
 * Every query here goes through `TenantScopedPrisma.run`, which sets
 * `app.tenant_id` for the transaction so the row-level policies apply. The
 * explicit `where: { tenantId }` is still present and still primary — RLS is
 * the backstop for a forgotten predicate, not a substitute for writing one
 * (ADR 0005).
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

@Injectable()
export class PanelRepository {
  constructor(private readonly scoped: TenantScopedPrisma) {}

  async findStaffRecord(
    context: TenantContext,
    userId: string,
  ): Promise<StaffRecord | null> {
    return this.scoped.run(context, (client) =>
      client.staffProfile.findFirst({
        where: { tenantId: context.tenantId!, userIdentityId: userId },
        select: {
          employeeNumber: true,
          designation: true,
          department: true,
          joinedOn: true,
        },
      }),
    );
  }

  async findTeachingAssignments(
    context: TenantContext,
    userId: string,
  ): Promise<TeachingAssignmentRecord[]> {
    return this.scoped.run(context, async (client) => {
      const staff = await client.staffProfile.findFirst({
        where: { tenantId: context.tenantId!, userIdentityId: userId },
        select: { id: true },
      });
      if (!staff) return [];

      return client.teachingAssignment.findMany({
        where: { tenantId: context.tenantId!, staffProfileId: staff.id },
        select: {
          subjectLabel: true,
          classLabel: true,
          sectionLabel: true,
          isClassTeacher: true,
        },
        orderBy: [{ classLabel: 'asc' }, { sectionLabel: 'asc' }],
      });
    });
  }

  async findEnrollment(
    context: TenantContext,
    userId: string,
  ): Promise<EnrollmentRecord | null> {
    return this.scoped.run(context, (client) =>
      client.studentEnrollment.findFirst({
        where: { tenantId: context.tenantId!, userIdentityId: userId },
        select: {
          admissionNumber: true,
          classLabel: true,
          sectionLabel: true,
          rollNumber: true,
          admittedOn: true,
        },
      }),
    );
  }

  /** Whether a capability is switched on for this school (FR-038). */
  async isFeatureEnabled(
    context: TenantContext,
    feature: string,
  ): Promise<boolean> {
    return this.scoped.run(context, async (client) => {
      const flag = await client.featureFlag.findFirst({
        where: { tenantId: context.tenantId!, feature },
        select: { enabled: true },
      });
      // Absent means "not configured". Core capabilities are on by default
      // (constitution Principle II); an optional capability that must default
      // off has to say so with an explicit row.
      return flag?.enabled ?? true;
    });
  }
}
