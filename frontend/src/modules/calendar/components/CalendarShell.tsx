'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addMonths, subMonths } from 'date-fns';
import { motion } from 'motion/react';
import { ArrowLeft, CalendarPlus, LogOut } from 'lucide-react';
import { ApiError } from '@/core/http/apiError';
import { getCurrentUser, logout } from '@/modules/identity/services/authApi';
import type { AuthUser } from '@/modules/identity/types/auth';
import { useCalendar } from '../hooks/useCalendar';
import type { CalendarEvent, CreateEventRequest, UpdateEventRequest } from '../types/calendar';
import { CalendarGrid } from './CalendarGrid';
import { EventForm } from './EventForm';
import { EventList } from './EventList';

export function CalendarShell() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [month, setMonth] = useState(new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const year = month.getFullYear();
  const displayedMonth = month.getMonth() + 1;
  const { view, status, error, create, update, remove } = useCalendar(year, displayedMonth);

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.isUnauthenticated) {
          router.replace('/login');
        }
      })
      .finally(() => setIsLoadingUser(false));
  }, [router]);

  function handlePreviousMonth() {
    setMonth((m) => subMonths(m, 1));
  }

  function handleNextMonth() {
    setMonth((m) => addMonths(m, 1));
  }

  function handleSelectDate(date: Date) {
    setSelectedDate(date);
    if (date.getMonth() !== month.getMonth()) {
      setMonth(date);
    }
  }

  async function handleCreate(values: CreateEventRequest | UpdateEventRequest) {
    const event = await create(values as CreateEventRequest);
    if (event) setFormOpen(false);
  }

  async function handleUpdate(id: string, values: UpdateEventRequest) {
    const event = await update(id, values);
    if (event) setEditingEvent(null);
  }

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  if (isLoadingUser) {
    return (
      <div className='grid min-h-screen place-items-center bg-[#f7f7f8] text-sm text-[#70747a]'>
        Loading your calendar…
      </div>
    );
  }

  if (!user) return null;

  const canCreate = view?.canCreate ?? { school: false, class: false, personal: false };

  return (
    <main className='min-h-screen bg-[#f7f7f8] text-[#202226]'>
      <header className='border-b border-[#e6ebf2] bg-white px-4 py-4 sm:px-8'>
        <div className='mx-auto flex max-w-6xl items-center justify-between'>
          <div className='flex items-center gap-3'>
            <button
              type='button'
              onClick={() => router.push('/dashboard')}
              className='grid h-9 w-9 place-items-center rounded-xl bg-[#111214] text-white transition-transform hover:scale-105'
              aria-label='Back to dashboard'
            >
              <ArrowLeft className='h-4 w-4' />
            </button>
            <div>
              <p className='text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#a6a9ae]'>CampusOne</p>
              <h1 className='text-lg font-semibold leading-none text-[#202226]'>Calendar</h1>
            </div>
          </div>
          <div className='flex items-center gap-4'>
            <div className='hidden text-right sm:block'>
              <p className='text-[0.86rem] font-semibold'>{user.email}</p>
              <p className='text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-[#a6a9ae]'>{user.roleName}</p>
            </div>
            <button
              type='button'
              onClick={handleLogout}
              className='rounded-full bg-[#f7f7f8] p-2 text-[#5c5f64] transition-colors hover:bg-[#eceef0] hover:text-[#202226]'
              aria-label='Sign out'
            >
              <LogOut className='h-4 w-4' />
            </button>
          </div>
        </div>
      </header>

      <section className='mx-auto max-w-6xl px-4 py-6 sm:px-8'>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className='mb-5 rounded-[20px] border border-[#f3d4cf] bg-[#fff4f2] px-4 py-3 text-[0.86rem] text-[#a33b29]'
          >
            {error}
          </motion.div>
        )}

        {status === 'loading' && !view ? (
          <div className='grid min-h-[16rem] place-items-center rounded-[28px] border border-[#e6ebf2] bg-white'>
            <div className='flex items-center gap-2 text-[0.86rem] text-[#70747a]'>
              <CalendarPlus className='h-4 w-4 animate-pulse' />
              Loading calendar…
            </div>
          </div>
        ) : (
          <div className='grid gap-5 lg:grid-cols-[1.25fr_0.75fr]'>
            <CalendarGrid
              month={month}
              selectedDate={selectedDate}
              events={view?.events ?? []}
              onSelect={handleSelectDate}
              onPreviousMonth={handlePreviousMonth}
              onNextMonth={handleNextMonth}
            />
            <EventList
              selectedDate={selectedDate}
              events={view?.events ?? []}
              canCreatePersonal={canCreate.personal}
              canCreateSchool={canCreate.school}
              canCreateClass={canCreate.class}
              onCreate={() => {
                setEditingEvent(null);
                setFormOpen(true);
              }}
              onEdit={setEditingEvent}
              onDelete={remove}
              isDeleting={status === 'deleting'}
            />
          </div>
        )}
      </section>

      {(formOpen || editingEvent) && (
        <EventForm
          mode={editingEvent ? 'edit' : 'create'}
          event={editingEvent}
          selectedDate={selectedDate}
          canCreate={canCreate}
          onSubmit={editingEvent ? (values) => handleUpdate(editingEvent.id, values as UpdateEventRequest) : handleCreate}
          onClose={() => {
            setFormOpen(false);
            setEditingEvent(null);
          }}
          isSubmitting={status === 'creating' || status === 'updating'}
        />
      )}
    </main>
  );
}
