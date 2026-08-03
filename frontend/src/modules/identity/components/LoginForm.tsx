'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { env } from '@/core/config/env';
import { ApiError } from '@/core/http/apiError';
import { login } from '../services/authApi';
import { StatusNotice } from './StatusNotice';

const DEMO_EMAIL = 'platform-admin@campusone.local';
const DEMO_PASSWORD = 'CampusOneAdmin!2026';

function ArrowIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h13M13 6l6 6-6 6" /></svg>;
}

function EyeIcon({ crossed }: { crossed: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5Z" /><circle cx="12" cy="12" r="2.5" />{crossed ? <path d="m4 4 16 16" /> : null}</svg>;
}

function SuccessMark() {
  return <span className="campusone-success-mark" aria-hidden="true"><svg viewBox="0 0 30 30" className="campusone-success-ring" fill="none"><circle cx="15" cy="15" r="12" /></svg><svg viewBox="0 0 24 24" className="campusone-success-check" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6.5 12.5 3.7 3.7 7.6-8.1" /></svg></span>;
}

export function LoginForm() {
  const router = useRouter();
  const heroRef = useRef<HTMLElement>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const heroElement = hero;

    function handlePointerMove(event: PointerEvent) {
      const bounds = heroElement.getBoundingClientRect();
      if (!bounds) return;
      const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
      const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
      heroElement.style.setProperty('--campusone-orb-x', `${x * 12}px`);
      heroElement.style.setProperty('--campusone-orb-y', `${y * 10}px`);
    }

    function resetPointer() {
      heroElement.style.setProperty('--campusone-orb-x', '0px');
      heroElement.style.setProperty('--campusone-orb-y', '0px');
    }

    hero.addEventListener('pointermove', handlePointerMove);
    hero.addEventListener('pointerleave', resetPointer);
    return () => {
      hero.removeEventListener('pointermove', handlePointerMove);
      hero.removeEventListener('pointerleave', resetPointer);
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      setIsSuccess(true);
      window.setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 900);
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthenticated) {
        setErrorMessage('The email or password is incorrect.');
      } else if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('We could not sign you in. Please try again.');
      }
    } finally {
      if (!isSuccess) setIsSubmitting(false);
    }
  }

  function fillDemoCredentials() {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setErrorMessage(null);
  }

  return (
    <main className="min-h-screen bg-[#f4f5f6] p-3 text-[#202226] sm:p-5 lg:grid lg:grid-cols-[minmax(380px,0.92fr)_1.08fr] lg:gap-5">
      <section ref={heroRef} className="campusone-enter campusone-orb-field relative flex min-h-[218px] flex-col justify-between overflow-hidden rounded-[40px_12px_40px_12px] bg-[#f85001] px-6 py-6 sm:px-9 sm:py-8 lg:min-h-[calc(100vh-40px)] lg:p-11 xl:p-14">
        <div className="campusone-orb campusone-orb-one pointer-events-none absolute -right-28 -top-24 h-[430px] w-[430px] rounded-full border border-[#111214]/15" />
        <div className="campusone-orb campusone-orb-two pointer-events-none absolute -bottom-48 -left-28 h-[520px] w-[520px] rounded-full bg-[#de4700]" />
        <div className="campusone-orb campusone-orb-three pointer-events-none absolute left-[38%] top-[18%] h-24 w-24 rounded-full bg-[#ff8b4d]/35 blur-[1px]" />
        <div className="campusone-orbit campusone-orbit-one pointer-events-none absolute left-[18%] top-[28%] h-44 w-44 rounded-full border border-[#111214]/10" />
        <div className="campusone-orbit campusone-orbit-two pointer-events-none absolute left-[18%] top-[28%] h-44 w-44 rounded-full border border-[#ffd0b8]/25" />
        <span className="campusone-glint pointer-events-none absolute left-[30%] top-[31%] h-2 w-2 rounded-full bg-[#ffe6d8]/80" />
        <div className="pointer-events-none absolute -bottom-28 right-0 select-none text-[22rem] font-bold leading-none tracking-[-0.16em] text-[#111214]/[0.08] lg:-right-10 lg:text-[30rem]">C</div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-[16px_5px_16px_5px] bg-[#111214] text-base font-bold text-white shadow-[0_8px_18px_rgba(17,18,20,0.14)]">C</div>
          <span className="text-[1.05rem] font-bold uppercase tracking-[0.16em] text-[#111214]">CampusOne</span>
        </div>

        <div className="relative z-10 hidden max-w-[430px] pb-10 lg:block">
          <p className="mb-5 text-[0.66rem] font-bold uppercase tracking-[0.25em] text-[#111214]/65">Academic operations workspace</p>
          <h1 className="max-w-[390px] text-[3.7rem] font-semibold leading-[0.98] tracking-[-0.065em] text-[#111214] xl:text-[4.5rem]">Every school day starts here.</h1>
          <p className="mt-6 max-w-[330px] text-sm leading-6 text-[#111214]/70">One calm place for the people, decisions, and details that keep your school moving.</p>
        </div>

        <div className="relative z-10 flex items-center justify-between gap-4 text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-[#111214]/60">
          <span>CampusOne / Access desk</span>
          <span className="flex items-center gap-2 normal-case tracking-normal"><span className="h-1.5 w-1.5 rounded-full bg-[#111214]" /> Secure workspace</span>
        </div>
      </section>

      <section className="campusone-enter campusone-enter-delay flex min-h-[calc(100vh-218px)] items-center justify-center rounded-[12px_40px_12px_40px] bg-[#f9fafb] px-5 py-10 sm:px-10 lg:min-h-[calc(100vh-40px)] lg:px-12 xl:px-20">
        <div className="w-full max-w-[470px]">
          <div className="mb-9 flex items-center justify-between border-b border-[#e4e7e9] pb-5">
            <p className="text-[0.66rem] font-bold uppercase tracking-[0.2em] text-[#8b8d90]">CampusOne access</p>
            <span className="flex items-center gap-2 text-[0.66rem] font-medium text-[#8b8d90]"><span className="h-1.5 w-1.5 rounded-full bg-[#5c9b74]" /> Online</span>
          </div>

          <div className="mb-8">
            <h2 className="text-[2.1rem] font-semibold leading-tight tracking-[-0.055em] text-[#202226]">Welcome back</h2>
            <p className="mt-3 max-w-[360px] text-sm leading-6 text-[#5b5e62]">Sign in to continue to your school operations workspace.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <label className="block">
              <span className="mb-2.5 block text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#72777c]">Email address</span>
              <input required autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@school.com" className="h-[54px] w-full rounded-[16px_6px_16px_6px] border border-[#e0e3e5] bg-white px-4 text-sm text-[#202226] shadow-[0_4px_16px_rgba(17,18,20,0.025)] outline-none transition-[border-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] placeholder:text-[#a6a9ae] focus:-translate-y-px focus:border-[#f85001] focus:shadow-[0_8px_24px_rgba(248,80,1,0.10)]" />
            </label>

            <label className="block">
              <span className="mb-2.5 block text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#72777c]">Password</span>
              <span className="relative block">
                <input required autoComplete="current-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" className="h-[54px] w-full rounded-[16px_6px_16px_6px] border border-[#e0e3e5] bg-white px-4 pr-14 text-sm text-[#202226] shadow-[0_4px_16px_rgba(17,18,20,0.025)] outline-none transition-[border-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] placeholder:text-[#a6a9ae] focus:-translate-y-px focus:border-[#f85001] focus:shadow-[0_8px_24px_rgba(248,80,1,0.10)]" />
                <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} title={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-[#8b8d90] transition-colors hover:bg-[#f1f2f3] hover:text-[#111214] focus:outline-none focus:ring-2 focus:ring-[#f85001]/30"><EyeIcon crossed={showPassword} /></button>
              </span>
            </label>

            {errorMessage ? <StatusNotice tone="error" eyebrow="Sign-in issue" role="alert" action={<button type="button" aria-label="Dismiss sign-in issue" title="Dismiss" onClick={() => setErrorMessage(null)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#a74640] transition-colors hover:bg-[#ffe8e5] focus:outline-none focus:ring-2 focus:ring-[#f85001]/30"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="m7 7 10 10M17 7 7 17" /></svg></button>}>{errorMessage}</StatusNotice> : null}

            <button type="submit" disabled={isSubmitting} className={`group flex h-[54px] w-full items-center justify-between rounded-[18px_6px_18px_6px] bg-[#111214] px-5 text-[0.76rem] font-bold uppercase tracking-[0.12em] text-white shadow-[0_12px_24px_rgba(17,18,20,0.12)] transition-[transform,background-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:bg-[#202226] hover:shadow-[0_16px_30px_rgba(17,18,20,0.18)] active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-[#f85001]/20 disabled:cursor-not-allowed disabled:opacity-60 ${isSuccess ? 'campusone-success-button' : ''}`}><span>{isSuccess ? 'Workspace ready' : isSubmitting ? 'Signing you in...' : 'Sign in'}</span><span className="transition-transform duration-200 group-hover:translate-x-1">{isSubmitting ? <svg aria-hidden="true" viewBox="0 0 24 24" className="campusone-spin h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="8" className="opacity-25" /><path d="M20 12a8 8 0 0 0-8-8" /></svg> : isSuccess ? <SuccessMark /> : <ArrowIcon />}</span></button>

            {!env.isProduction ? <StatusNotice tone="warning" eyebrow="Local environment" action={<button type="button" aria-label="Fill demo credentials" title="Fill demo credentials" onClick={fillDemoCredentials} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[#a95313] shadow-[0_3px_10px_rgba(169,83,19,0.10)] transition-[transform,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:shadow-[0_6px_14px_rgba(169,83,19,0.16)] focus:outline-none focus:ring-2 focus:ring-[#f85001]/25"><ArrowIcon /></button>}>A Platform Super Admin demo account is available for local testing.</StatusNotice> : null}
          </form>

          <p className="mt-8 border-t border-[#e4e7e9] pt-5 text-[0.66rem] leading-5 text-[#a6a9ae]">Access is protected by role-aware authentication and secure session controls.</p>
        </div>
      </section>
    </main>
  );
}
