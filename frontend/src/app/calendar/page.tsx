import type { Metadata } from 'next';
import { CalendarShell } from '@/modules/calendar';

export const metadata: Metadata = {
  title: 'Calendar',
  robots: { index: false, follow: false },
};

export default function CalendarPage() {
  return <CalendarShell />;
}
