import type { CalendarEventType, CalendarScope } from '../constants';

export type { CalendarEventType, CalendarScope } from '../constants';

export interface CalendarEvent {
  id: string;
  scope: CalendarScope;
  classLabel: string | null;
  sectionLabel: string | null;
  type: CalendarEventType;
  title: string;
  description: string | null;
  eventDate: string;
  startTime: string | null;
  endTime: string | null;
  createdByRole: string;
  canManage: boolean;
}

export interface CalendarMonthView {
  canCreate: {
    school: boolean;
    class: boolean;
    personal: boolean;
  };
  events: CalendarEvent[];
}

export interface CreateEventRequest {
  scope: CalendarScope;
  classLabel?: string;
  sectionLabel?: string;
  type: CalendarEventType;
  title: string;
  description?: string;
  eventDate: string;
  startTime?: string;
  endTime?: string;
}

export interface UpdateEventRequest {
  type?: CalendarEventType;
  title?: string;
  description?: string;
  eventDate?: string;
  startTime?: string;
  endTime?: string;
}
