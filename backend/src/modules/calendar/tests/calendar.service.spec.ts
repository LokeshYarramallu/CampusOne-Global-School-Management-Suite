import type { AuthPrincipal } from '../../../core/auth/auth.types';
import type { TenantContext } from '../../../core/auth/tenant-context';
import { PermissionEvaluatorService } from '../../rbac/permission-evaluator.service';
import type {
  PermissionQuery,
  ScopeKind,
} from '../../rbac/permission-evaluator.service';
import { CalendarService } from '../calendar.service';
import {
  CALENDAR_ERROR_CODES,
  SCOPE_CREATE_PERMISSION,
} from '../calendar.constants';
import type { CreateEventDto } from '../dto/create-event.dto';
import {
  CalendarRepository,
  type CalendarEventRow,
} from '../repositories/calendar.repository';

const TENANT = '11111111-1111-1111-1111-111111111111';
const OTHER_TENANT = '22222222-2222-2222-2222-222222222222';

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

function baseEvent(
  overrides: Partial<CalendarEventRow> = {},
): CalendarEventRow {
  return {
    id: 'event-1',
    scope: 'SCHOOL',
    classLabel: null,
    sectionLabel: null,
    ownerUserId: 'user-1',
    createdByRole: 'SCHOOL_ADMIN_OFFICE',
    type: 'HOLIDAY',
    title: 'Founders Day',
    description: null,
    eventDate: new Date('2026-08-10T00:00:00.000Z'),
    startTime: null,
    endTime: null,
    ...overrides,
  };
}

function createDto(overrides: Partial<CreateEventDto> = {}): CreateEventDto {
  return {
    scope: 'PERSONAL',
    type: 'NOTICE',
    title: 'My note',
    eventDate: '2026-08-05',
    ...overrides,
  };
}

function repository(
  overrides: Partial<CalendarRepository> = {},
): CalendarRepository {
  return {
    isEnabled: jest.fn().mockResolvedValue(true),
    findVisible: jest.fn().mockResolvedValue([]),
    findOwned: jest.fn().mockResolvedValue(null),
    assignedClasses: jest.fn().mockResolvedValue([]),
    create: jest
      .fn()
      .mockImplementation(
        (
          _ctx: TenantContext,
          data: Omit<CalendarEventRow, 'id' | 'createdAt' | 'updatedAt'>,
        ) =>
          Promise.resolve({
            ...data,
            id: 'event-new',
            createdAt: new Date(),
            updatedAt: new Date(),
          } as CalendarEventRow),
      ),
    update: jest
      .fn()
      .mockImplementation(
        (
          _ctx: TenantContext,
          id: string,
          data: Partial<
            Omit<CalendarEventRow, 'id' | 'createdAt' | 'updatedAt'>
          >,
        ) =>
          Promise.resolve({
            ...baseEvent(),
            id,
            ...data,
          }),
      ),
    delete: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as CalendarRepository;
}

/**
 * Returns a permission evaluator whose `can` answer is driven by a map of
 * `${roleKey}:${scope}` to a boolean. This keeps the tests focused on the
 * service logic rather than on the real role catalog.
 */
function evaluator(
  allowed: Set<string> = new Set(),
): PermissionEvaluatorService {
  const entries = Object.entries(SCOPE_CREATE_PERMISSION) as Array<
    [string, { module: string; feature: string; action: string }]
  >;

  const can = jest.fn<boolean, [string, PermissionQuery]>((roleKey, query) => {
    const scope = entries.find(
      ([, value]) =>
        value.module === query.module &&
        value.feature === query.feature &&
        value.action === query.action,
    )?.[0];
    return scope ? allowed.has(`${roleKey}:${scope}`) : false;
  });

  return {
    can,
    scopeFor: jest.fn<ScopeKind | null, [string, PermissionQuery]>(),
    permissionsOf: jest.fn<ReadonlyArray<readonly string[]>, [string]>(),
  } as unknown as PermissionEvaluatorService;
}

function allow(
  roleKey: string,
  scope: 'SCHOOL' | 'CLASS' | 'PERSONAL',
): string {
  return `${roleKey}:${scope}`;
}

describe('CalendarService', () => {
  describe('getMonth', () => {
    it('returns visible events with canManage=true for the owner', async () => {
      const events = [
        baseEvent({ id: 'owned', ownerUserId: 'user-1' }),
        baseEvent({ id: 'other', ownerUserId: 'user-2' }),
      ];
      const calendar = new CalendarService(
        repository({ findVisible: jest.fn().mockResolvedValue(events) }),
        evaluator(new Set([allow('STUDENT', 'PERSONAL')])),
      );

      const view = await calendar.getMonth(principal(), 2026, 8);

      expect(view.events).toHaveLength(2);
      expect(view.events.find((e) => e.id === 'owned')?.canManage).toBe(true);
      expect(view.events.find((e) => e.id === 'other')?.canManage).toBe(false);
    });

    it('reports what scopes the role may create', async () => {
      const calendar = new CalendarService(
        repository(),
        evaluator(new Set([allow('STUDENT', 'PERSONAL')])),
      );

      const view = await calendar.getMonth(
        principal({ roleKey: 'STUDENT' }),
        2026,
        8,
      );

      expect(view.canCreate).toEqual({
        school: false,
        class: false,
        personal: true,
      });
    });

    it('rejects the request when the feature is disabled', async () => {
      const calendar = new CalendarService(
        repository({ isEnabled: jest.fn().mockResolvedValue(false) }),
        evaluator(),
      );

      await expect(
        calendar.getMonth(principal(), 2026, 8),
      ).rejects.toMatchObject({
        code: CALENDAR_ERROR_CODES.CALENDAR_UNAVAILABLE,
      });
    });

    it('rejects a platform admin with no tenant context', async () => {
      const calendar = new CalendarService(repository(), evaluator());

      await expect(
        calendar.getMonth(
          principal({ roleKey: 'PLATFORM_SUPER_ADMIN', tenantId: undefined }),
          2026,
          8,
        ),
      ).rejects.toMatchObject({
        code: CALENDAR_ERROR_CODES.CALENDAR_UNAVAILABLE,
      });
    });
  });

  describe('create', () => {
    it('creates a school event when the role has school manage permission', async () => {
      const calendar = new CalendarService(
        repository(),
        evaluator(new Set([allow('SCHOOL_ADMIN_OFFICE', 'SCHOOL')])),
      );

      const result = await calendar.create(
        principal({
          roleKey: 'SCHOOL_ADMIN_OFFICE',
          roleName: 'School Admin Office',
        }),
        createDto({ scope: 'SCHOOL', type: 'MEETING', title: 'Staff meeting' }),
      );

      expect(result.scope).toBe('SCHOOL');
      expect(result.title).toBe('Staff meeting');
    });

    it('creates a personal event when the role has self manage permission', async () => {
      const calendar = new CalendarService(
        repository(),
        evaluator(new Set([allow('STUDENT', 'PERSONAL')])),
      );

      const result = await calendar.create(principal(), createDto());

      expect(result.scope).toBe('PERSONAL');
      expect(result.createdByRole).toBe('STUDENT');
    });

    it('prevents a student from creating a school event', async () => {
      const calendar = new CalendarService(
        repository(),
        evaluator(new Set([allow('STUDENT', 'PERSONAL')])),
      );

      await expect(
        calendar.create(principal(), createDto({ scope: 'SCHOOL' })),
      ).rejects.toMatchObject({
        code: CALENDAR_ERROR_CODES.CALENDAR_SCOPE_FORBIDDEN,
      });
    });

    it('prevents an accountant from creating any event', async () => {
      const calendar = new CalendarService(repository(), evaluator(new Set()));

      await expect(
        calendar.create(
          principal({ roleKey: 'ACCOUNTANT', roleName: 'Accountant' }),
          createDto(),
        ),
      ).rejects.toMatchObject({
        code: CALENDAR_ERROR_CODES.CALENDAR_SCOPE_FORBIDDEN,
      });
    });

    it('lets a teacher create a class event only for an assigned class', async () => {
      const calendar = new CalendarService(
        repository({
          assignedClasses: jest
            .fn()
            .mockResolvedValue([{ classLabel: '8', sectionLabel: 'B' }]),
        }),
        evaluator(
          new Set([allow('TEACHER', 'CLASS'), allow('TEACHER', 'PERSONAL')]),
        ),
      );

      const result = await calendar.create(
        principal({ roleKey: 'TEACHER', roleName: 'Teacher' }),
        createDto({ scope: 'CLASS', classLabel: '8', sectionLabel: 'B' }),
      );

      expect(result.scope).toBe('CLASS');
      expect(result.classLabel).toBe('8');
    });

    it('rejects a class event for a class the teacher is not assigned to', async () => {
      const calendar = new CalendarService(
        repository({
          assignedClasses: jest
            .fn()
            .mockResolvedValue([{ classLabel: '8', sectionLabel: 'B' }]),
        }),
        evaluator(new Set([allow('TEACHER', 'CLASS')])),
      );

      await expect(
        calendar.create(
          principal({ roleKey: 'TEACHER', roleName: 'Teacher' }),
          createDto({ scope: 'CLASS', classLabel: '9', sectionLabel: 'A' }),
        ),
      ).rejects.toMatchObject({
        code: CALENDAR_ERROR_CODES.CLASS_NOT_ASSIGNED,
      });
    });

    it('uses the principal tenant, never a client-supplied one', async () => {
      const findVisible = jest.fn().mockResolvedValue([]);
      const calendar = new CalendarService(
        repository({ findVisible }),
        evaluator(new Set([allow('STUDENT', 'PERSONAL')])),
      );

      await calendar.getMonth(principal({ tenantId: OTHER_TENANT }), 2026, 8);

      expect(findVisible).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: OTHER_TENANT }),
        expect.anything(),
        expect.anything(),
      );
    });
  });

  describe('update', () => {
    it('updates the event when the caller owns it', async () => {
      const calendar = new CalendarService(
        repository({
          findOwned: jest
            .fn()
            .mockResolvedValue(
              baseEvent({ id: 'event-1', ownerUserId: 'user-1' }),
            ),
        }),
        evaluator(),
      );

      const result = await calendar.update(principal(), 'event-1', {
        title: 'Updated title',
      });

      expect(result.title).toBe('Updated title');
    });

    it('reports EVENT_NOT_FOUND when the caller does not own the event', async () => {
      const calendar = new CalendarService(
        repository({ findOwned: jest.fn().mockResolvedValue(null) }),
        evaluator(),
      );

      await expect(
        calendar.update(principal({ userId: 'user-2' }), 'event-1', {
          title: 'Hijack',
        }),
      ).rejects.toMatchObject({
        code: CALENDAR_ERROR_CODES.EVENT_NOT_FOUND,
      });
    });
  });

  describe('remove', () => {
    it('deletes the event when the caller owns it', async () => {
      const repo = repository({
        findOwned: jest
          .fn()
          .mockResolvedValue(baseEvent({ ownerUserId: 'user-1' })),
      });
      const calendar = new CalendarService(repo, evaluator());

      await calendar.remove(principal(), 'event-1');

      expect(repo.delete).toHaveBeenCalledWith(expect.anything(), 'event-1');
    });

    it('reports EVENT_NOT_FOUND when the caller does not own the event', async () => {
      const calendar = new CalendarService(
        repository({ findOwned: jest.fn().mockResolvedValue(null) }),
        evaluator(),
      );

      await expect(
        calendar.remove(principal({ userId: 'user-2' }), 'event-1'),
      ).rejects.toMatchObject({
        code: CALENDAR_ERROR_CODES.EVENT_NOT_FOUND,
      });
    });
  });
});
