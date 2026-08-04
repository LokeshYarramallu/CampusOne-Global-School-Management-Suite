'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { TYPE_ACCENT, SCOPE_ACCENT } from '../constants';
import type { CalendarEvent } from '../types/calendar';
import { cn } from '../utils/cn';

interface EventCardProps {
  item: CalendarEvent;
  onEdit?: (item: CalendarEvent) => void;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
}

function formatTime(item: Pick<CalendarEvent, 'startTime' | 'endTime'>): string {
  if (item.startTime && item.endTime) return `${item.startTime} – ${item.endTime}`;
  if (item.startTime) return item.startTime;
  return 'All day';
}

function scopeIcon(scope: CalendarEvent['scope']) {
  if (scope === 'SCHOOL') return '🏛';
  if (scope === 'CLASS') return '🏫';
  return '👤';
}

export function EventDateBlock({ dateString }: { dateString: string }) {
  const date = new Date(`${dateString}T00:00:00`);
  const day = Number.isNaN(date.getTime()) ? '--' : date.getDate();
  const month = Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleString('en-US', { month: 'short' }).toUpperCase();

  return (
    <div className='flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-[18px] bg-white/80 shadow-[0_2px_12px_rgba(17,18,20,0.06)] backdrop-blur-sm ring-1 ring-white/50'>
      <span className='text-[1.05rem] font-bold leading-none text-[#202226]'>{day}</span>
      <span className='mt-1 text-[0.55rem] font-bold uppercase tracking-[0.14em] text-[#8f949b]'>{month}</span>
    </div>
  );
}

export function EventCard({ item, onEdit, onDelete, isDeleting }: EventCardProps) {
  const aura = TYPE_ACCENT[item.type];
  const scope = SCOPE_ACCENT[item.scope];
  const showActions = item.canManage && (onEdit || onDelete);

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
      className={cn(
        'group relative overflow-hidden rounded-[24px] border px-4 py-4',
        'transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]',
        'hover:-translate-y-1 hover:shadow-[0_18px_44px_rgba(17,18,20,0.08)]',
        isDeleting && 'pointer-events-none opacity-60',
      )}
      style={{
        backgroundColor: aura.surface,
        borderColor: aura.border,
        backgroundImage: aura.wash,
      }}
    >
      {/* Soft top edge glow */}
      <div
        className='pointer-events-none absolute inset-x-0 top-0 h-px opacity-60'
        style={{ background: `linear-gradient(90deg, transparent, ${aura.dot}40, transparent)` }}
      />

      <div className='flex h-full items-start justify-between gap-4'>
        <div className='flex min-w-0 flex-1 items-start gap-3'>
          <EventDateBlock dateString={item.eventDate} />
          <div className='flex min-w-0 flex-1 flex-col'>
            <div className='flex flex-wrap items-center gap-2'>
              <span
                className='rounded-full px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.16em]'
                style={{ backgroundColor: aura.badgeBg, color: aura.badgeText }}
              >
                {item.type}
              </span>
              <span
                className='inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-[0.6rem] font-semibold text-[#4e5257] backdrop-blur-sm'
              >
                <span aria-hidden='true'>{scopeIcon(item.scope)}</span>
                {item.scope === 'CLASS' && item.classLabel
                  ? `Class ${item.classLabel}-${item.sectionLabel}`
                  : scope.label}
              </span>
            </div>
            <p className='mt-3 line-clamp-2 text-[0.95rem] font-semibold leading-snug text-[#1f2124]'>
              {item.title}
            </p>
            <div className='mt-2 flex items-center gap-2 text-[0.72rem] text-[#5f646b]'>
              <span
                className='inline-block h-1.5 w-1.5 rounded-full'
                style={{ backgroundColor: aura.dot }}
                aria-hidden='true'
              />
              <span className='font-medium'>{formatTime(item)}</span>
            </div>
            {item.description && (
              <p className='mt-3 line-clamp-3 text-[0.76rem] leading-6 text-[#5f646b]'>{item.description}</p>
            )}
          </div>
        </div>

        {showActions && (
          <div className='flex shrink-0 items-center gap-2 self-start'>
            {onEdit && (
              <button
                type='button'
                onClick={() => onEdit(item)}
                className='rounded-full bg-white/85 p-2 text-[#5b6066] shadow-sm backdrop-blur-sm transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:scale-110 active:scale-95 hover:bg-white hover:text-[#202226] hover:shadow-md'
                aria-label={`Edit ${item.title}`}
              >
                <Pencil className='h-3.5 w-3.5' />
              </button>
            )}
            {onDelete && (
              <button
                type='button'
                onClick={() => onDelete(item.id)}
                className='rounded-full bg-white/85 p-2 text-[#b45309] shadow-sm backdrop-blur-sm transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:scale-110 active:scale-95 hover:bg-[#fff1e8] hover:text-[#92400e] hover:shadow-md'
                aria-label={`Delete ${item.title}`}
              >
                <Trash2 className='h-3.5 w-3.5' />
              </button>
            )}
          </div>
        )}
      </div>
    </motion.article>
  );
}