import type { Metadata } from 'next';
import { DashboardShell } from '@/modules/identity';

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  return <DashboardShell />;
}
