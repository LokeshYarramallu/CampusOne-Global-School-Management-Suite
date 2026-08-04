import { apiClient } from '@/core/http/apiClient';
import type {
  CalendarEvent,
  CalendarMonthView,
  CreateEventRequest,
  UpdateEventRequest,
} from '../types/calendar';
import {
  parseCalendarEventResponse,
  parseCalendarMonthView,
  validateCreateEvent,
  validateUpdateEvent,
} from '../schemas/calendarSchema';

export function getCalendarMonth(
  year: number,
  month: number,
  signal?: AbortSignal,
): Promise<CalendarMonthView> {
  return apiClient.get<CalendarMonthView>('/calendar', {
    query: { year, month },
    parse: parseCalendarMonthView,
    signal,
  });
}

export function createEvent(body: CreateEventRequest): Promise<CalendarEvent> {
  validateCreateEvent(body);
  return apiClient.post<CalendarEvent>('/calendar', {
    body,
    parse: parseCalendarEventResponse,
  });
}

export function updateEvent(
  id: string,
  body: UpdateEventRequest,
): Promise<CalendarEvent> {
  validateUpdateEvent(body);
  return apiClient.patch<CalendarEvent>(`/calendar/${id}`, {
    body,
    parse: parseCalendarEventResponse,
  });
}

export function deleteEvent(id: string): Promise<{ success: true }> {
  return apiClient.delete<{ success: true }>(`/calendar/${id}`);
}
