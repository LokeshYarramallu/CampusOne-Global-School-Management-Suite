'use client';

import { format, isSameDay, isToday, parseISO } from 'date-fns';
import { motion } from 'motion/react';
import { Plus } from 'lucide-react';
import type { CalendarEvent } from '../types/calendar';
import { EmptyState } from './EmptyState';
import { EventCard } from './EventCard';

interface EventListProps {
  selectedDate: Date;
  events: CalendarEvent[];
  canCreatePersonal: boolean;
  canCreateSchool: boolean;
  canCreateClass: boolean;
  onCreate: () => void;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

export function EventList({
  selectedDate,
  events,
  canCreatePersonal,
  canCreateSchool,
  canCreateClass,
  onCreate,
  onEdit,
  onDelete,
  isDeleting,
}: EventListProps) {
  const canCreateAnything = canCreatePersonal || canCreateSchool || canCreateClass;
  const dayEvents = events.filter((e) => isSameDay(parseISO(e.eventDate), selectedDate));

  return (
    <section className='flex h-full min-h-0 flex-col rounded-[28px] border border-[#e6ebf2] bg-white p-5 shadow-[0_16px_44px_rgba(15,23,42,0.06)] sm:p-6'>
      <div className='flex items-center justify-between gap-4'>
        <div>
          <p className='text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#a6a9ae]'>
            {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE')}
          </p>
          <h2 className='mt-2 text-xl font-semibold text-[#202226]'>{format(selectedDate, 'MMMM d, yyyy')}</h2>
        </div>
        {canCreateAnything && (
          <button
            type='button'
            onClick={onCreate}
            className='inline-flex items-center gap-2 rounded-full bg-[#111214] px-4 py-2 text-[0.76rem] font-semibold text-white transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]'
          >
            <Plus className='h-3.5 w-3.5' />
            Add event
          </button>
        )}
      </div>

      <div className='mt-5 min-h-0 flex-1 overflow-y-auto pr-1'>
        {dayEvents.length > 0 ? (
          <motion.div
            initial='hidden'
            animate='visible'
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.05 } },
            }}
            className='grid grid-cols-1 gap-4'
          >
            {dayEvents.map((item) => (
              <EventCard
                key={item.id}
                item={item}
                onEdit={onEdit}
                onDelete={onDelete}
                isDeleting={isDeleting}
              />
            ))}
          </motion.div>
        ) : (
          <EmptyState
            title='No events this day'
            message={
              canCreateAnything
                ? 'Add an event for this day if you want to keep track of it.'
                : 'Events posted for your scope will appear here.'
            }
          />
        )}
      </div>
    </section>
  );
}
