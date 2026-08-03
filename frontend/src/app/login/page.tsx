import type { Metadata } from 'next';
import { LoginForm } from '@/modules/identity';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your CampusOne school operations workspace.',
  // A sign-in page has nothing to offer a crawler and should not be indexed.
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <LoginForm />;
}
