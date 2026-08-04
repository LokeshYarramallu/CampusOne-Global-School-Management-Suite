/**
 * Stable identifiers owned by the calendar module.
 *
 * Error codes are part of the public API contract — the frontend branches on
 * them, so renaming one is a breaking change.
 */

export const CALENDAR_ERROR_CODES = {
  EVENT_NOT_FOUND: 'EVENT_NOT_FOUND',
  CALENDAR_SCOPE_FORBIDDEN: 'CALENDAR_SCOPE_FORBIDDEN',
  CLASS_NOT_ASSIGNED: 'CLASS_NOT_ASSIGNED',
  CALENDAR_UNAVAILABLE: 'CALENDAR_UNAVAILABLE',
} as const;

export const CALENDAR_SCOPES = ['SCHOOL', 'CLASS', 'PERSONAL'] as const;
export type CalendarScope = (typeof CALENDAR_SCOPES)[number];

export const CALENDAR_EVENT_TYPES = [
  'ACADEMIC',
  'CULTURAL',
  'EXAM',
  'HOLIDAY',
  'MEETING',
  'NOTICE',
] as const;
export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number];

/** The per-tenant feature flag guarding the whole module. */
export const CALENDAR_FEATURE = 'calendar';

/**
 * Which permission a create at each scope demands. The guard proves the caller
 * is a calendar participant; the service proves they may create at *this*
 * scope, using these tuples (constitution Principle V — authorization with
 * scope, enforced on the backend).
 */
export const SCOPE_CREATE_PERMISSION: Record<
  CalendarScope,
  { module: string; feature: string; action: string }
> = {
  SCHOOL: { module: 'calendar', feature: 'school', action: 'manage' },
  CLASS: { module: 'calendar', feature: 'assigned', action: 'manage' },
  PERSONAL: { module: 'calendar', feature: 'self', action: 'manage' },
};
