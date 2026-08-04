import { describe, expect, it } from 'vitest';
import {
  parseCalendarEvent,
  parseCalendarMonthView,
  validateCreateEvent,
  validateUpdateEvent,
} from '../schemas/calendarSchema';
import type { CalendarEvent } from '../types/calendar';

const validEvent: CalendarEvent = {
  id: 'event-1',
  scope: 'SCHOOL',
  classLabel: null,
  sectionLabel: null,
  type: 'HOLIDAY',
  title: 'Founders Day',
  description: null,
  eventDate: '2026-08-10',
  startTime: null,
  endTime: null,
  createdByRole: 'SCHOOL_ADMIN_OFFICE',
  canManage: false,
};

describe('parseCalendarEvent', () => {
  it('accepts a well-formed event', () => {
    expect(parseCalendarEvent(validEvent)).toEqual(validEvent);
  });

  it.each([
    ['a missing id', { ...validEvent, id: undefined }],
    ['an invalid scope', { ...validEvent, scope: 'DISTRICT' }],
    ['an invalid type', { ...validEvent, type: 'PARTY' }],
    ['a non-string title', { ...validEvent, title: 123 }],
    ['a null body', null],
    ['a primitive body', 'event'],
  ])('rejects %s', (_label, value) => {
    expect(() => parseCalendarEvent(value)).toThrow(/invalid calendar event/i);
  });
});

describe('parseCalendarMonthView', () => {
  it('accepts a well-formed month view', () => {
    const view = {
      canCreate: { school: true, class: false, personal: true },
      events: [validEvent],
    };
    expect(parseCalendarMonthView(view)).toEqual(view);
  });

  it('rejects a missing canCreate block', () => {
    expect(() =>
      parseCalendarMonthView({ events: [validEvent] }),
    ).toThrow(/invalid calendar view/i);
  });

  it('rejects events that are not an array', () => {
    expect(() =>
      parseCalendarMonthView({ canCreate: { school: true, class: false, personal: false }, events: validEvent }),
    ).toThrow(/invalid calendar event list/i);
  });
});

describe('validateCreateEvent', () => {
  it('accepts a valid personal event', () => {
    expect(() =>
      validateCreateEvent({
        scope: 'PERSONAL',
        type: 'NOTICE',
        title: 'My note',
        eventDate: '2026-08-05',
      }),
    ).not.toThrow();
  });

  it('requires classLabel and sectionLabel for CLASS scope', () => {
    expect(() =>
      validateCreateEvent({
        scope: 'CLASS',
        type: 'EXAM',
        title: 'Math test',
        eventDate: '2026-08-05',
      }),
    ).toThrow(/class and section label/i);
  });

  it('rejects an invalid time', () => {
    expect(() =>
      validateCreateEvent({
        scope: 'PERSONAL',
        type: 'NOTICE',
        title: 'My note',
        eventDate: '2026-08-05',
        startTime: '25:00',
      }),
    ).toThrow(/startTime/i);
  });
});

describe('validateUpdateEvent', () => {
  it('accepts a partial update', () => {
    expect(() => validateUpdateEvent({ title: 'New title' })).not.toThrow();
  });

  it('rejects an invalid date', () => {
    expect(() => validateUpdateEvent({ eventDate: 'not-a-date' })).toThrow(/eventDate/i);
  });
});

