import { redirect } from 'next/navigation';

/**
 * CampusOne has no public landing page — the root is an entry point, not a
 * destination. `proxy.ts` normally handles this based on the session cookie;
 * this is the fallback for a request that reaches the route directly.
 */
export default function Home() {
  redirect('/login');
}
