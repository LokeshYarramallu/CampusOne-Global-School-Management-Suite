'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addMonths, subMonths } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
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
    setSelectedDate((d) => subMonths(d, 1));
  }

  function handleNextMonth() {
    setMonth((m) => addMonths(m, 1));
    setSelectedDate((d) => addMonths(d, 1));
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
      <div className='grid min-h-screen place-items-center bg-[#f4f5f6] text-sm text-[#70747a]'>
        Loading your calendar…
      </div>
    );
  }

  if (!user) return null;

  const canCreate = view?.canCreate ?? { school: false, class: false, personal: false };

  return (
    <main className='min-h-screen bg-[#f4f5f6] text-[#202226]'>
      <header className='border-b border-[#e8ebf1] bg-white/90 px-4 py-4 sm:px-8 backdrop-blur-md'>
        <div className='mx-auto flex max-w-6xl items-center justify-between'>
          <div className='flex items-center gap-3'>
            <button
              type='button'
              onClick={() => router.push('/dashboard')}
              className='grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-[#111214] to-[#2c2e32] text-white transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:scale-105 active:scale-95 shadow-[0_6px_18px_rgba(17,18,20,0.18)]'
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
              className='rounded-full bg-white p-2 text-[#5b6066] shadow-sm ring-1 ring-[#eef0f2] transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-[#f4f5f6] hover:text-[#202226] hover:scale-110 active:scale-95 hover:shadow-md'
              aria-label='Sign out'
            >
              <LogOut className='h-4 w-4' />
            </button>
          </div>
        </div>
      </header>

      <section className='mx-auto max-w-6xl px-4 py-6 sm:px-8'>
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className='mb-5 rounded-[18px] border border-[#f3d4cf] bg-[#fff4f2] px-4 py-3 text-[0.86rem] text-[#a33b29]'
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {status === 'loading' && !view ? (
          <div className='grid min-h-[16rem] place-items-center rounded-[26px] border border-[#e6ebf2] bg-white'>
            <div className='flex items-center gap-2 text-[0.86rem] text-[#70747a]'>
              <CalendarPlus className='h-4 w-4 animate-pulse' />
              Loading calendar…
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease: [0.23, 1, 0.32, 1] }}
            className='grid gap-5 lg:grid-cols-[1.25fr_0.75fr]'
          >
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
          </motion.div>
        )}
      </section>

      <AnimatePresence>
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
      </AnimatePresence>
    </main>
  );
}