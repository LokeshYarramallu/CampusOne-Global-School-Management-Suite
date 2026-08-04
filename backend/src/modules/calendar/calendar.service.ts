import { Injectable } from '@nestjs/common';
import type { AuthPrincipal } from '../../core/auth/auth.types';
import { tenantContextFrom } from '../../core/auth/tenant-context';
import { AppException } from '../../core/http/api-error';
import { PermissionEvaluatorService } from '../rbac/permission-evaluator.service';
import {
  CALENDAR_ERROR_CODES,
  SCOPE_CREATE_PERMISSION,
  type CalendarScope,
} from './calendar.constants';
import {
  CalendarRepository,
  type CalendarEventRow,
} from './repositories/calendar.repository';
import type { CreateEventDto } from './dto/create-event.dto';
import type { UpdateEventDto } from './dto/update-event.dto';

export interface CalendarEventView {
  id: string;
  scope: string;
  classLabel: string | null;
  sectionLabel: string | null;
  type: string;
  title: string;
  description: string | null;
  eventDate: string;
  startTime: string | null;
  endTime: string | null;
  createdByRole: string;
  /** Server-computed: only the creator may edit or delete (FR — creator-only). */
  canManage: boolean;
}

export interface CalendarView {
  /** What scopes this role may create, so the client shows only those. */
  canCreate: { school: boolean; class: boolean; personal: boolean };
  events: CalendarEventView[];
}

@Injectable()
export class CalendarService {
  constructor(
    private readonly repo: CalendarRepository,
    private readonly permissions: PermissionEvaluatorService,
  ) {}

  /**
   * Events visible to the principal in a month, plus what they may create.
   *
   * The subject and tenant come from the session. A `year`/`month` frames the
   * window; anything outside it is simply not fetched.
   */
  async getMonth(
    principal: AuthPrincipal,
    year: number,
    month: number,
  ): Promise<CalendarView> {
    const context = tenantContextFrom(principal);
    await this.ensureAvailable(context);

    // Pad by a week each side so the grid's leading/trailing days carry their
    // events too.
    const from = new Date(Date.UTC(year, month - 1, 1));
    from.setUTCDate(from.getUTCDate() - 7);
    const to = new Date(Date.UTC(year, month, 0));
    to.setUTCDate(to.getUTCDate() + 7);

    const rows = await this.repo.findVisible(context, principal, { from, to });

    return {
      canCreate: this.creatableScopes(principal.roleKey),
      events: rows.map((row) => this.toView(row, principal)),
    };
  }

  async create(
    principal: AuthPrincipal,
    dto: CreateEventDto,
  ): Promise<CalendarEventView> {
    const context = tenantContextFrom(principal);
    await this.ensureAvailable(context);

    const scope = dto.scope as CalendarScope;

    // May this role create at this scope at all?
    if (
      !this.permissions.can(principal.roleKey, SCOPE_CREATE_PERMISSION[scope])
    ) {
      throw new AppException({
        code: CALENDAR_ERROR_CODES.CALENDAR_SCOPE_FORBIDDEN,
        message: 'You are not allowed to create this kind of event.',
        status: 403,
      });
    }

    let classLabel: string | null = null;
    let sectionLabel: string | null = null;

    if (scope === 'CLASS') {
      classLabel = dto.classLabel ?? null;
      sectionLabel = dto.sectionLabel ?? null;

      // A teacher may target only a class they are assigned to — the scope
      // dimension of the permission, not just the action.
      const assigned = await this.repo.assignedClasses(
        context,
        principal.userId,
      );
      const matches = assigned.some(
        (a) => a.classLabel === classLabel && a.sectionLabel === sectionLabel,
      );
      if (!matches) {
        throw new AppException({
          code: CALENDAR_ERROR_CODES.CLASS_NOT_ASSIGNED,
          message:
            'You can only create events for a class you are assigned to.',
          status: 403,
        });
      }
    }

    const row = await this.repo.create(context, {
      scope,
      classLabel,
      sectionLabel,
      ownerUserId: principal.userId,
      createdByRole: principal.roleKey,
      type: dto.type,
      title: dto.title.trim(),
      description: dto.description?.trim() ?? null,
      eventDate: new Date(`${dto.eventDate}T00:00:00.000Z`),
      startTime: dto.startTime ?? null,
      endTime: dto.endTime ?? null,
    });

    return this.toView(row, principal);
  }

  async update(
    principal: AuthPrincipal,
    id: string,
    dto: UpdateEventDto,
  ): Promise<CalendarEventView> {
    const context = tenantContextFrom(principal);
    await this.ensureAvailable(context);

    // Creator-only. An event the caller does not own is reported as not found,
    // so the endpoint cannot probe for others' events.
    const owned = await this.repo.findOwned(context, principal.userId, id);
    if (!owned) throw CalendarService.notFound();

    const row = await this.repo.update(context, id, {
      ...(dto.type !== undefined ? { type: dto.type } : {}),
      ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description.trim() || null }
        : {}),
      ...(dto.eventDate !== undefined
        ? { eventDate: new Date(`${dto.eventDate}T00:00:00.000Z`) }
        : {}),
      ...(dto.startTime !== undefined ? { startTime: dto.startTime } : {}),
      ...(dto.endTime !== undefined ? { endTime: dto.endTime } : {}),
    });

    return this.toView(row, principal);
  }

  async remove(principal: AuthPrincipal, id: string): Promise<void> {
    const context = tenantContextFrom(principal);
    await this.ensureAvailable(context);

    const owned = await this.repo.findOwned(context, principal.userId, id);
    if (!owned) throw CalendarService.notFound();

    await this.repo.delete(context, id);
  }

  private async ensureAvailable(
    context: ReturnType<typeof tenantContextFrom>,
  ): Promise<void> {
    // The platform admin has no school, so no calendar.
    if (context.tenantId === null) {
      throw new AppException({
        code: CALENDAR_ERROR_CODES.CALENDAR_UNAVAILABLE,
        message: 'The calendar is not available for this account.',
        status: 404,
      });
    }
    if (!(await this.repo.isEnabled(context))) {
      throw new AppException({
        code: CALENDAR_ERROR_CODES.CALENDAR_UNAVAILABLE,
        message: 'The calendar is not enabled for your school.',
        status: 404,
      });
    }
  }

  private creatableScopes(roleKey: string): CalendarView['canCreate'] {
    const can = (scope: CalendarScope) =>
      this.permissions.can(roleKey, SCOPE_CREATE_PERMISSION[scope]);
    return {
      school: can('SCHOOL'),
      class: can('CLASS'),
      personal: can('PERSONAL'),
    };
  }

  private toView(
    row: CalendarEventRow,
    principal: AuthPrincipal,
  ): CalendarEventView {
    return {
      id: row.id,
      scope: row.scope,
      classLabel: row.classLabel,
      sectionLabel: row.sectionLabel,
      type: row.type,
      title: row.title,
      description: row.description,
      eventDate: row.eventDate.toISOString().slice(0, 10),
      startTime: row.startTime,
      endTime: row.endTime,
      createdByRole: row.createdByRole,
      canManage: row.ownerUserId === principal.userId,
    };
  }

  private static notFound(): AppException {
    return new AppException({
      code: CALENDAR_ERROR_CODES.EVENT_NOT_FOUND,
      message: 'That event was not found.',
      status: 404,
    });
  }
}
