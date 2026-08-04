'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { TYPE_ACCENT } from '../constants';
import type { CalendarEvent } from '../types/calendar';
import { cn } from '../utils/cn';

interface EventCardProps {
  item: CalendarEvent;
  onEdit?: (item: CalendarEvent) => void;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
}

function formatTime(item: Pick<CalendarEvent, 'startTime' | 'endTime'>): string {
  if (item.startTime && item.endTime) return `${item.startTime} - ${item.endTime}`;
  if (item.startTime) return item.startTime;
  return 'Time not added';
}

export function EventDateBlock({ dateString }: { dateString: string }) {
  const date = new Date(`${dateString}T00:00:00`);
  const day = Number.isNaN(date.getTime()) ? '--' : date.getDate();
  const month = Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleString('en-US', { month: 'short' }).toUpperCase();

  return (
    <div className='flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-[14px] bg-white shadow-[0_2px_10px_rgba(17,18,20,0.08)]'>
      <span className='text-[1rem] font-semibold leading-none text-[#202226]'>{day}</span>
      <span className='mt-1 text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-[#9b9ea4]'>{month}</span>
    </div>
  );
}

export function EventCard({ item, onEdit, onDelete, isDeleting }: EventCardProps) {
  const accent = TYPE_ACCENT[item.type];
  const showActions = item.canManage && (onEdit || onDelete);

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'group rounded-[22px] border px-4 py-4 shadow-[0_10px_28px_rgba(17,18,20,0.05)]',
        'transition-[transform,box-shadow,border-color] duration-300 ease-out',
        'hover:-translate-y-[2px] hover:shadow-[0_18px_40px_rgba(17,18,20,0.08)]',
        isDeleting && 'pointer-events-none opacity-60',
      )}
      style={{ backgroundColor: accent.tint, borderColor: accent.borderColor }}
    >
      <div className='flex h-full items-start justify-between gap-4'>
        <div className='flex min-w-0 flex-1 items-start gap-3'>
          <EventDateBlock dateString={item.eventDate} />
          <div className='flex min-w-0 flex-1 flex-col'>
            <div className='flex flex-wrap items-center gap-2'>
              <span
                className='rounded-full px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em]'
                style={{ backgroundColor: accent.badgeBg, color: accent.badgeText }}
              >
                {item.type}
              </span>
              {item.scope === 'CLASS' && item.classLabel && (
                <span className='rounded-full bg-white/85 px-2.5 py-1 text-[0.62rem] font-semibold text-[#5e6167]'>
                  Class {item.classLabel}-{item.sectionLabel}
                </span>
              )}
              {item.scope === 'SCHOOL' && (
                <span className='rounded-full bg-white/85 px-2.5 py-1 text-[0.62rem] font-semibold text-[#5e6167]'>
                  School
                </span>
              )}
              {item.scope === 'PERSONAL' && (
                <span className='rounded-full bg-white/85 px-2.5 py-1 text-[0.62rem] font-semibold text-[#5e6167]'>
                  Personal
                </span>
              )}
            </div>
            <p className='mt-3 line-clamp-2 min-h-[2.5rem] text-[0.96rem] font-semibold text-[#202226]'>
              {item.title}
            </p>
            <p className='mt-1 text-[0.72rem] text-[#6d7278]'>{formatTime(item)}</p>
            {item.description && (
              <p className='mt-3 line-clamp-3 text-[0.76rem] leading-6 text-[#70747a]'>{item.description}</p>
            )}
          </div>
        </div>
        {showActions && (
          <div className='flex shrink-0 items-center gap-2 self-start'>
            {onEdit && (
              <button
                type='button'
                onClick={() => onEdit(item)}
                className='rounded-full bg-white p-2 text-[#5f6368] transition-colors hover:bg-[#f7f7f8] hover:text-[#202226]'
                aria-label={`Edit ${item.title}`}
              >
                <Pencil className='h-3.5 w-3.5' />
              </button>
            )}
            {onDelete && (
              <button
                type='button'
                onClick={() => onDelete(item.id)}
                className='rounded-full bg-white p-2 text-[#c16012] transition-colors hover:bg-[#fff1e8] hover:text-[#9a410d]'
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
