import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  // Routes supply their own title; `template` frames it. Without this every
  // page inherited "Sign in · CampusOne", including the dashboard.
  title: {
    default: 'CampusOne',
    template: '%s · CampusOne',
  },
  description: 'Secure access to the CampusOne school management platform.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
