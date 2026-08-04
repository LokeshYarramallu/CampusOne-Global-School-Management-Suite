'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { CALENDAR_EVENT_TYPES, SCOPE_LABELS } from '../constants';
import type { CalendarEvent, CalendarEventType, CalendarScope, CreateEventRequest, UpdateEventRequest } from '../types/calendar';
import { cn } from '../utils/cn';

interface EventFormProps {
  mode: 'create' | 'edit';
  event?: CalendarEvent | null;
  selectedDate: Date;
  canCreate: { school: boolean; class: boolean; personal: boolean };
  assignedClasses?: Array<{ classLabel: string; sectionLabel: string }>;
  onSubmit: (values: CreateEventRequest | UpdateEventRequest) => void;
  onClose: () => void;
  isSubmitting?: boolean;
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function EventForm({
  mode,
  event,
  selectedDate,
  canCreate,
  assignedClasses = [],
  onSubmit,
  onClose,
  isSubmitting,
}: EventFormProps) {
  const isEdit = mode === 'edit' && event;

  const allowedScopes: CalendarScope[] = (['SCHOOL', 'CLASS', 'PERSONAL'] as CalendarScope[]).filter((scope) => {
    if (scope === 'SCHOOL') return canCreate.school;
    if (scope === 'CLASS') return canCreate.class;
    return canCreate.personal;
  });

  const [scope, setScope] = useState<CalendarScope>(
    isEdit ? event.scope : allowedScopes[0] ?? 'PERSONAL',
  );
  const [classLabel, setClassLabel] = useState(event?.classLabel ?? assignedClasses[0]?.classLabel ?? '');
  const [sectionLabel, setSectionLabel] = useState(event?.sectionLabel ?? assignedClasses[0]?.sectionLabel ?? '');
  const [type, setType] = useState<CalendarEventType>(event?.type ?? 'NOTICE');
  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [eventDate, setEventDate] = useState(event?.eventDate ?? toDateInputValue(selectedDate));
  const [startTime, setStartTime] = useState(event?.startTime ?? '');
  const [endTime, setEndTime] = useState(event?.endTime ?? '');

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isEdit) {
      const update: UpdateEventRequest = {
        ...(title !== event.title ? { title: title.trim() } : {}),
        ...(description !== (event.description ?? '') ? { description: description.trim() || undefined } : {}),
        ...(eventDate !== event.eventDate ? { eventDate } : {}),
        ...(startTime !== (event.startTime ?? '') ? { startTime: startTime || undefined } : {}),
        ...(endTime !== (event.endTime ?? '') ? { endTime: endTime || undefined } : {}),
        ...(type !== event.type ? { type } : {}),
      };
      onSubmit(update);
    } else {
      const create: CreateEventRequest = {
        scope,
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        eventDate,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
      };
      if (scope === 'CLASS') {
        create.classLabel = classLabel.trim();
        create.sectionLabel = sectionLabel.trim();
      }
      onSubmit(create);
    }
  }

  return (
    <AnimatePresence>
      <div
        className='fixed inset-0 z-50 flex items-center justify-center bg-[rgba(17,18,20,0.28)] backdrop-blur-sm p-4'
        onClick={onClose}
        role='dialog'
        aria-modal='true'
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          className='w-full max-w-md rounded-[26px] border border-[#e8ebf1] bg-white/96 p-6 shadow-[0_30px_80px_rgba(17,18,20,0.18)] backdrop-blur-md'
        >
          <div className='flex items-center justify-between'>
            <h3 className='text-lg font-semibold text-[#202226]'>{isEdit ? 'Edit event' : 'New event'}</h3>
            <button
              type='button'
              onClick={onClose}
              className='rounded-full bg-[#f7f7f8] p-2 text-[#6c7076] transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:scale-105 active:scale-95 hover:bg-[#eceef0]'
              aria-label='Close'
            >
              <X className='h-4 w-4' />
            </button>
          </div>

          <form onSubmit={handleSubmit} className='mt-5 space-y-4'>
            {!isEdit && allowedScopes.length > 1 && (
              <div className='grid grid-cols-3 gap-2'>
                {allowedScopes.map((s) => (
                  <button
                    key={s}
                    type='button'
                    onClick={() => setScope(s)}
                    className={cn(
                      'rounded-full px-3.5 py-2.5 text-[0.76rem] font-semibold transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:scale-105 active:scale-95',
                      scope === s
                        ? 'bg-[#111214] text-white'
                        : 'bg-white text-[#5c5f64] ring-1 ring-[#e8ebf1] hover:bg-[#f4f5f6] hover:text-[#202226] hover:ring-[#d9dde3]',
                    )}
                  >
                    {SCOPE_LABELS[s]}
                  </button>
                ))}
              </div>
            )}

            {!isEdit && scope === 'CLASS' && (
              <div className='grid grid-cols-2 gap-3'>
                <label className='block'>
                  <span className='text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[#70747a]'>Class</span>
                  <select
                    value={classLabel}
                    onChange={(e) => {
                      const cls = assignedClasses.find((c) => c.classLabel === e.target.value);
                      setClassLabel(cls?.classLabel ?? '');
                      setSectionLabel(cls?.sectionLabel ?? '');
                    }}
                    className='mt-1 block w-full rounded-[16px] border border-[#e4e6e9] bg-white px-3 py-2 text-[0.86rem] text-[#202226] outline-none ring-1 ring-transparent transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] focus:border-[#f97316] focus:ring-[#f97316]/15 focus:shadow-[0_4px_12px_rgba(249,115,22,0.08)]'
                  >
                    {assignedClasses.map((c) => (
                      <option key={`${c.classLabel}-${c.sectionLabel}`} value={c.classLabel}>
                        {c.classLabel}-{c.sectionLabel}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            <label className='block'>
              <span className='text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[#70747a]'>Type</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as CalendarEventType)}
                className='mt-1 block w-full rounded-[16px] border border-[#e4e6e9] bg-white px-3 py-2 text-[0.86rem] text-[#202226] outline-none ring-1 ring-transparent transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] focus:border-[#f97316] focus:ring-[#f97316]/15 focus:shadow-[0_4px_12px_rgba(249,115,22,0.08)]'
              >
                {CALENDAR_EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <label className='block'>
              <span className='text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[#70747a]'>Title</span>
              <input
                type='text'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder='Event title'
                required
                className='mt-1 block w-full rounded-[16px] border border-[#e2e3e6] bg-white px-3 py-2 text-[0.86rem] text-[#202226] outline-none placeholder:text-[#a6a9ae] focus:border-[#f97316]'
              />
            </label>

            <label className='block'>
              <span className='text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[#70747a]'>Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder='Optional description'
                rows={3}
                className='mt-1 block w-full resize-none rounded-[16px] border border-[#e2e3e6] bg-white px-3 py-2 text-[0.86rem] text-[#202226] outline-none placeholder:text-[#a6a9ae] focus:border-[#f97316]'
              />
            </label>

            <div className='grid grid-cols-3 gap-3'>
              <label className='block'>
                <span className='text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[#70747a]'>Date</span>
                <input
                  type='date'
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  required
                  className='mt-1 block w-full rounded-[16px] border border-[#e4e6e9] bg-white px-3 py-2 text-[0.86rem] text-[#202226] outline-none ring-1 ring-transparent transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] focus:border-[#f97316] focus:ring-[#f97316]/15 focus:shadow-[0_4px_12px_rgba(249,115,22,0.08)]'
                />
              </label>
              <label className='block'>
                <span className='text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[#70747a]'>Start</span>
                <input
                  type='time'
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className='mt-1 block w-full rounded-[16px] border border-[#e4e6e9] bg-white px-3 py-2 text-[0.86rem] text-[#202226] outline-none ring-1 ring-transparent transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] focus:border-[#f97316] focus:ring-[#f97316]/15 focus:shadow-[0_4px_12px_rgba(249,115,22,0.08)]'
                />
              </label>
              <label className='block'>
                <span className='text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[#70747a]'>End</span>
                <input
                  type='time'
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className='mt-1 block w-full rounded-[16px] border border-[#e4e6e9] bg-white px-3 py-2 text-[0.86rem] text-[#202226] outline-none ring-1 ring-transparent transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] focus:border-[#f97316] focus:ring-[#f97316]/15 focus:shadow-[0_4px_12px_rgba(249,115,22,0.08)]'
                />
              </label>
            </div>

            <div className='flex items-center justify-end gap-3 pt-2'>
              <button
                type='button'
                onClick={onClose}
                className='rounded-full px-4 py-2 text-[0.8rem] font-semibold text-[#5c5f64] ring-1 ring-transparent transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-[#f4f5f6] hover:scale-105 active:scale-95'
              >
                Cancel
              </button>
              <button
                type='submit'
                disabled={isSubmitting || !title.trim()}
                className='rounded-full bg-[#f97316] px-5 py-2 text-[0.8rem] font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100'
              >
                {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create event'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
