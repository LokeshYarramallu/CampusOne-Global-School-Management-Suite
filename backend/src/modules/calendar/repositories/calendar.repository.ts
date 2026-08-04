import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthPrincipal } from '../../../core/auth/auth.types';
import type { TenantContext } from '../../../core/auth/tenant-context';
import { TenantScopedPrisma } from '../../../infrastructure/prisma/tenant-scoped.client';
import { CALENDAR_FEATURE, type CalendarScope } from '../calendar.constants';
import { buildVisibilityWhere, resolveVisibleClasses } from '../visibility';

/**
 * Tenant-owned reads and writes for the calendar.
 *
 * Every query runs through `TenantScopedPrisma.run`, which sets the RLS tenant
 * for the transaction. The explicit `tenantId` in each `where` stays primary;
 * the row-level policy is the backstop for a forgotten predicate (ADR 0005).
 */

export interface CalendarEventRow {
  id: string;
  scope: string;
  classLabel: string | null;
  sectionLabel: string | null;
  ownerUserId: string;
  createdByRole: string;
  type: string;
  title: string;
  description: string | null;
  eventDate: Date;
  startTime: string | null;
  endTime: string | null;
}

const EVENT_SELECT = {
  id: true,
  scope: true,
  classLabel: true,
  sectionLabel: true,
  ownerUserId: true,
  createdByRole: true,
  type: true,
  title: true,
  description: true,
  eventDate: true,
  startTime: true,
  endTime: true,
} as const;

@Injectable()
export class CalendarRepository {
  constructor(private readonly scoped: TenantScopedPrisma) {}

  /** Whether the calendar is switched on for this school. Default on. */
  async isEnabled(context: TenantContext): Promise<boolean> {
    return this.scoped.run(context, async (client) => {
      const flag = await client.featureFlag.findFirst({
        where: { tenantId: context.tenantId!, feature: CALENDAR_FEATURE },
        select: { enabled: true },
      });
      return flag?.enabled ?? true;
    });
  }

  /** Events the principal may see in a date range — the membership predicate. */
  async findVisible(
    context: TenantContext,
    principal: AuthPrincipal,
    range: { from: Date; to: Date },
  ): Promise<CalendarEventRow[]> {
    return this.scoped.run(context, async (client) => {
      const classes = await resolveVisibleClasses(
        client,
        principal,
        context.tenantId!,
      );
      const where = buildVisibilityWhere(
        principal,
        context.tenantId!,
        classes,
        range,
      );
      return client.calendarEvent.findMany({
        where,
        select: EVENT_SELECT,
        orderBy: [{ eventDate: 'asc' }, { startTime: 'asc' }],
      });
    });
  }

  /** A single event, if the principal may see it. Reuses the same predicate. */
  async findVisibleById(
    context: TenantContext,
    principal: AuthPrincipal,
    id: string,
  ): Promise<CalendarEventRow | null> {
    return this.scoped.run(context, async (client) => {
      const classes = await resolveVisibleClasses(
        client,
        principal,
        context.tenantId!,
      );
      const where = buildVisibilityWhere(principal, context.tenantId!, classes);
      return client.calendarEvent.findFirst({
        where: { AND: [{ id }, where] },
        select: EVENT_SELECT,
      });
    });
  }

  /** Owner-only lookup — the edit/delete gate. */
  async findOwned(
    context: TenantContext,
    ownerUserId: string,
    id: string,
  ): Promise<CalendarEventRow | null> {
    return this.scoped.run(context, (client) =>
      client.calendarEvent.findFirst({
        where: { id, tenantId: context.tenantId!, ownerUserId },
        select: EVENT_SELECT,
      }),
    );
  }

  /** The teacher's assigned class pairs, for validating a CLASS create. */
  async assignedClasses(
    context: TenantContext,
    userId: string,
  ): Promise<Array<{ classLabel: string; sectionLabel: string }>> {
    return this.scoped.run(context, async (client) => {
      const staff = await client.staffProfile.findFirst({
        where: { tenantId: context.tenantId!, userIdentityId: userId },
        select: { id: true },
      });
      if (!staff) return [];
      return client.teachingAssignment.findMany({
        where: { tenantId: context.tenantId!, staffProfileId: staff.id },
        select: { classLabel: true, sectionLabel: true },
      });
    });
  }

  async create(
    context: TenantContext,
    data: {
      scope: CalendarScope;
      classLabel: string | null;
      sectionLabel: string | null;
      ownerUserId: string;
      createdByRole: string;
      type: string;
      title: string;
      description: string | null;
      eventDate: Date;
      startTime: string | null;
      endTime: string | null;
    },
  ): Promise<CalendarEventRow> {
    // `scope` and `type` are validated string unions from the DTO/service;
    // cast to Prisma's generated enum input at this one boundary.
    return this.scoped.run(context, (client) =>
      client.calendarEvent.create({
        data: {
          tenantId: context.tenantId!,
          ...data,
        } as Prisma.CalendarEventUncheckedCreateInput,
        select: EVENT_SELECT,
      }),
    );
  }

  async update(
    context: TenantContext,
    id: string,
    data: Partial<{
      type: string;
      title: string;
      description: string | null;
      eventDate: Date;
      startTime: string | null;
      endTime: string | null;
    }>,
  ): Promise<CalendarEventRow> {
    return this.scoped.run(context, (client) =>
      client.calendarEvent.update({
        where: { id },
        data: data as Prisma.CalendarEventUncheckedUpdateInput,
        select: EVENT_SELECT,
      }),
    );
  }

  async delete(context: TenantContext, id: string): Promise<void> {
    await this.scoped.run(context, (client) =>
      client.calendarEvent.delete({ where: { id } }),
    );
  }
}
