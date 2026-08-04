'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  createEvent,
  deleteEvent,
  getCalendarMonth,
  updateEvent,
} from '../services/calendarApi';
import type {
  CalendarEvent,
  CalendarMonthView,
  CreateEventRequest,
  UpdateEventRequest,
} from '../types/calendar';

export type CalendarStatus = 'idle' | 'loading' | 'creating' | 'updating' | 'deleting' | 'error';

export interface UseCalendarResult {
  view: CalendarMonthView | null;
  status: CalendarStatus;
  error: string | null;
  refetch: () => Promise<void>;
  create: (body: CreateEventRequest) => Promise<CalendarEvent | null>;
  update: (id: string, body: UpdateEventRequest) => Promise<CalendarEvent | null>;
  remove: (id: string) => Promise<boolean>;
}

export function useCalendar(year: number, month: number): UseCalendarResult {
  const [view, setView] = useState<CalendarMonthView | null>(null);
  const [status, setStatus] = useState<CalendarStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const controller = new AbortController();
    setStatus('loading');
    setError(null);
    try {
      const data = await getCalendarMonth(year, month, controller.signal);
      setView(data);
      setStatus('idle');
    } catch (cause) {
      if ((cause as Error)?.name !== 'AbortError') {
        setError(cause instanceof Error ? cause.message : 'Could not load the calendar.');
        setStatus('error');
      }
    }
  }, [year, month]);

  useEffect(() => {
    const controller = new AbortController();
    getCalendarMonth(year, month, controller.signal)
      .then((data) => {
        setView(data);
        setStatus('idle');
      })
      .catch((cause) => {
        if (cause.name !== 'AbortError') {
          setError(cause instanceof Error ? cause.message : 'Could not load the calendar.');
          setStatus('error');
        }
      });
    return () => controller.abort();
  }, [year, month]);

  const create = useCallback(
    async (body: CreateEventRequest): Promise<CalendarEvent | null> => {
      setStatus('creating');
      try {
        const event = await createEvent(body);
        await load();
        return event;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not create the event.');
        setStatus('error');
        return null;
      }
    },
    [load],
  );

  const update = useCallback(
    async (id: string, body: UpdateEventRequest): Promise<CalendarEvent | null> => {
      setStatus('updating');
      try {
        const event = await updateEvent(id, body);
        await load();
        return event;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not update the event.');
        setStatus('error');
        return null;
      }
    },
    [load],
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      setStatus('deleting');
      try {
        await deleteEvent(id);
        await load();
        return true;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not delete the event.');
        setStatus('error');
        return false;
      }
    },
    [load],
  );

  return { view, status, error, refetch: load, create, update, remove };
}
