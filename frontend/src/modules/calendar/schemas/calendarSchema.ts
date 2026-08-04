import { CALENDAR_EVENT_TYPES, CALENDAR_SCOPES } from '../constants';
import type {
  CalendarEvent,
  CalendarMonthView,
  CreateEventRequest,
  UpdateEventRequest,
} from '../types/calendar';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCalendarScope(value: unknown): value is (typeof CALENDAR_SCOPES)[number] {
  return typeof value === 'string' && (CALENDAR_SCOPES as readonly string[]).includes(value);
}

function isCalendarEventType(value: unknown): value is (typeof CALENDAR_EVENT_TYPES)[number] {
  return typeof value === 'string' && (CALENDAR_EVENT_TYPES as readonly string[]).includes(value);
}

function isStringOrNull(value: unknown): value is string | null {
  return typeof value === 'string' || value === null;
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function parseCalendarEvent(value: unknown): CalendarEvent {
  if (!isRecord(value)) throw new Error('Invalid calendar event.');

  if (
    typeof value.id !== 'string' ||
    !isCalendarScope(value.scope) ||
    !isStringOrNull(value.classLabel) ||
    !isStringOrNull(value.sectionLabel) ||
    !isCalendarEventType(value.type) ||
    typeof value.title !== 'string' ||
    !isStringOrNull(value.description) ||
    typeof value.eventDate !== 'string' ||
    !isStringOrNull(value.startTime) ||
    !isStringOrNull(value.endTime) ||
    typeof value.createdByRole !== 'string' ||
    !isBoolean(value.canManage)
  ) {
    throw new Error('The server returned an invalid calendar event.');
  }

  return value as unknown as CalendarEvent;
}

export function parseCalendarMonthView(value: unknown): CalendarMonthView {
  if (!isRecord(value)) throw new Error('Invalid calendar view.');

  const canCreate = value.canCreate;
  if (
    !isRecord(canCreate) ||
    !isBoolean(canCreate.school) ||
    !isBoolean(canCreate.class) ||
    !isBoolean(canCreate.personal)
  ) {
    throw new Error('The server returned an invalid calendar view.');
  }

  if (!Array.isArray(value.events)) {
    throw new Error('The server returned an invalid calendar event list.');
  }

  return {
    canCreate: canCreate as CalendarMonthView['canCreate'],
    events: value.events.map(parseCalendarEvent),
  };
}

export function parseCalendarEventResponse(value: unknown): CalendarEvent {
  return parseCalendarEvent(value);
}

export function validateCreateEvent(body: CreateEventRequest): void {
  if (!isCalendarScope(body.scope)) throw invalid('scope');
  if (!isCalendarEventType(body.type)) throw invalid('type');
  if (typeof body.title !== 'string' || body.title.trim() === '') throw invalid('title');
  if (typeof body.eventDate !== 'string' || !ISO_DATE.test(body.eventDate)) throw invalid('eventDate');
  if (body.scope === 'CLASS' && (!body.classLabel || !body.sectionLabel)) {
    throw new Error('Class events require a class and section label.');
  }
  if (body.startTime !== undefined && !TIME.test(body.startTime)) throw invalid('startTime');
  if (body.endTime !== undefined && !TIME.test(body.endTime)) throw invalid('endTime');
}

export function validateUpdateEvent(body: UpdateEventRequest): void {
  if (body.type !== undefined && !isCalendarEventType(body.type)) throw invalid('type');
  if (body.title !== undefined && (typeof body.title !== 'string' || body.title.trim() === '')) {
    throw invalid('title');
  }
  if (body.eventDate !== undefined && !ISO_DATE.test(body.eventDate)) throw invalid('eventDate');
  if (body.startTime !== undefined && !TIME.test(body.startTime)) throw invalid('startTime');
  if (body.endTime !== undefined && !TIME.test(body.endTime)) throw invalid('endTime');
}

function invalid(field: string): Error {
  return new Error(`The submitted ${field} is not valid.`);
}

