'use client';

import { CalendarPlus } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  message?: string;
}

export function EmptyState({
  title = 'No events',
  message = 'Select a day or add an event when you are allowed to create one.',
}: EmptyStateProps) {
  return (
    <div className='flex flex-col items-center justify-center rounded-[22px] border border-[#eceef0] bg-white px-6 py-12 text-center shadow-[0_10px_28px_rgba(17,18,20,0.04)]'>
      <div className='grid h-12 w-12 place-items-center rounded-full bg-[#f7f7f8] text-[#9b9ea4]'>
        <CalendarPlus className='h-5 w-5' />
      </div>
      <p className='mt-4 text-[0.92rem] font-semibold text-[#202226]'>{title}</p>
      <p className='mt-2 max-w-[16rem] text-[0.76rem] leading-5 text-[#70747a]'>{message}</p>
    </div>
  );
}
