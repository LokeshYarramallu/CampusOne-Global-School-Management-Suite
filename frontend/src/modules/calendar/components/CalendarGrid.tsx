'use client';

import { format, isSameDay, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayFlag, DayPicker, SelectionState, UI } from 'react-day-picker';
import type { CalendarEvent } from '../types/calendar';
import { cn } from '../utils/cn';

interface CalendarGridProps {
  month: Date;
  selectedDate: Date;
  events: CalendarEvent[];
  onSelect: (date: Date) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
}

export function CalendarGrid({
  month,
  selectedDate,
  events,
  onSelect,
  onPreviousMonth,
  onNextMonth,
}: CalendarGridProps) {
  return (
    <section className='rounded-[28px] border border-[#e8ebf1] bg-white/90 p-5 shadow-[0_18px_46px_rgba(15,23,42,0.04)] backdrop-blur-sm sm:p-6'>
      <div className='mb-5 flex items-center justify-between'>
        <div>
          <p className='text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#a6a9ae]'>Calendar</p>
          <h2 className='mt-1 text-xl font-semibold text-[#202226]'>{format(month, 'MMMM yyyy')}</h2>
        </div>
        <div className='flex items-center gap-2'>
          <button
            type='button'
            onClick={onPreviousMonth}
            className='rounded-full bg-white p-2 text-[#4d5055] shadow-sm ring-1 ring-[#eef0f2] transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-[#f4f5f6] hover:scale-110 active:scale-95 hover:text-[#202226] hover:shadow-md'
            aria-label='Previous month'
          >
            <ChevronLeft className='h-4 w-4' />
          </button>
          <button
            type='button'
            onClick={onNextMonth}
            className='rounded-full bg-white p-2 text-[#4d5055] shadow-sm ring-1 ring-[#eef0f2] transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-[#f4f5f6] hover:scale-110 active:scale-95 hover:text-[#202226] hover:shadow-md'
            aria-label='Next month'
          >
            <ChevronRight className='h-4 w-4' />
          </button>
        </div>
      </div>

      <DayPicker
        mode='single'
        selected={selectedDate}
        onSelect={(date) => date && onSelect(date)}
        month={month}
        onMonthChange={onSelect}
        hideNavigation
        showOutsideDays
        className='pointer-events-auto select-none'
        classNames={{
          [UI.Months]: 'flex flex-col',
          [UI.Month]: 'space-y-3',
          [UI.MonthCaption]: 'hidden',
          [UI.Nav]: 'hidden',
          [UI.PreviousMonthButton]: 'hidden',
          [UI.NextMonthButton]: 'hidden',
          [UI.Chevron]: 'hidden',
          [UI.MonthGrid]: 'w-full border-collapse',
          [UI.Weekdays]: 'flex',
          [UI.Weekday]: 'w-full rounded-lg text-[0.68rem] font-medium uppercase tracking-[0.08em] text-[#b8babf]',
          [UI.Week]: 'mt-1 flex w-full',
          [UI.Day]: 'relative h-10 w-full p-0 text-center sm:h-12',
          [UI.DayButton]: cn(
            'h-10 w-full rounded-[14px] p-0 text-[0.8rem] font-medium text-[#5c5f64] transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]',
            'hover:bg-[#f4f5f6] hover:scale-[1.03] active:scale-95 sm:h-12',
            'aria-selected:opacity-100',
          ),
          [SelectionState.selected]: 'bg-[#111214] text-white shadow-[0_8px_18px_rgba(58,60,64,0.18)]',
          [DayFlag.today]: 'bg-[#fff4ec] text-[#f97316] ring-1 ring-[#ffd6b8]',
          [DayFlag.outside]: 'text-[#d6d7da] opacity-100',
          [DayFlag.disabled]: 'text-[#e0e1e4]',
          [SelectionState.range_middle]: 'bg-[#f4f5f6] text-[#3a3c40]',
          [DayFlag.hidden]: 'invisible',
        }}
        components={{
          Nav: () => <div className='hidden' />,
          PreviousMonthButton: () => <button className='hidden' type='button' />,
          NextMonthButton: () => <button className='hidden' type='button' />,
          Chevron: () => <span className='hidden' />,
          Day: (props) => {
            const date = props.day.date;
            const dayEvents = events.filter((e) => isSameDay(parseISO(e.eventDate), date));
            return (
              <button
                type='button'
                onClick={() => onSelect(date)}
                className={cn(props.className, 'flex flex-col items-center justify-center gap-0.5')}
                aria-label={format(date, 'PPP')}
              >
                <span>{date.getDate()}</span>
                {dayEvents.length > 0 && (
                  <span className='h-1.5 w-1.5 rounded-full bg-[#f97316] ring-2 ring-white shadow-sm' aria-hidden='true' />
                )}
              </button>
            );
          },
        }}
      />
    </section>
  );
}
