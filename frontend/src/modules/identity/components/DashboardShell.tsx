'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/core/http/apiError';
import { getCurrentUser, logout } from '../services/authApi';
import type { AuthUser } from '../types/auth';

export function DashboardShell() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.isUnauthenticated) router.replace('/login');
      })
      .finally(() => setIsLoading(false));
  }, [router]);

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  if (isLoading) return <div className="grid min-h-screen place-items-center bg-[#f3f6f8] text-sm text-[#63737b]">Loading your workspace…</div>;
  if (!user) return null;

  return (
    <main className="min-h-screen bg-[#f3f6f8] text-[#12212b]">
      <header className="border-b border-[#dce5e8] bg-white px-6 py-5 sm:px-10"><div className="mx-auto flex max-w-6xl items-center justify-between"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#102e3a] text-sm font-black text-[#83d8c6]">C</div><span className="font-semibold tracking-tight">CampusOne</span></div><button onClick={handleLogout} className="rounded-lg px-3 py-2 text-sm font-semibold text-[#52706f] hover:bg-[#edf8f5]">Sign out</button></div></header>
      <section className="mx-auto max-w-6xl px-6 py-12 sm:px-10"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#438d83]">Platform workspace</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">Good to see you.</h1><div className="mt-8 rounded-3xl border border-[#dce5e8] bg-white p-7 shadow-[0_20px_60px_rgba(25,53,64,0.07)]"><p className="text-sm text-[#63737b]">Signed in as</p><p className="mt-2 text-lg font-semibold">{user.email}</p><span className="mt-4 inline-flex rounded-full bg-[#e9f7f3] px-3 py-1.5 text-xs font-bold text-[#32776f]">{user.roleName}</span><p className="mt-6 max-w-xl text-sm leading-6 text-[#63737b]">The authentication foundation is active. This is the starting point for the Platform Super Admin screens and tenant management workflows.</p></div></section>
    </main>
  );
}
