import type { Metadata } from 'next';
import { ProfileShell } from '@/modules/profile';

export const metadata: Metadata = {
  title: 'Your account',
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  return <ProfileShell />;
}
