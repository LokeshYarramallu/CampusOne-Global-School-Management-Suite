'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { env } from '@/core/config/env';
import { ApiError } from '@/core/http/apiError';
import { login } from '../services/authApi';
import { REDIRECT_DELAY_MS, SUBMIT_BUTTON_CLASS } from '../constants';
import {
  fieldErrorsFromDetails,
  hasFieldErrors,
  validateLoginInput,
  type LoginFieldErrors,
} from '../utils/loginValidation';
import { StatusNotice } from '@/shared/components/StatusNotice';
import { TextField } from '@/shared/components/TextField';
import { LoginHero } from './LoginHero';

/**
 * One value, not three booleans. The previous `isSubmitting`/`isSuccess` pair
 * let the button re-enable during the success animation, because the `finally`
 * block read a stale `isSuccess` from its own closure and re-enabled the
 * control — a second click then opened a second session.
 */
type SubmitStatus = 'idle' | 'submitting' | 'success';

function ArrowIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h13M13 6l6 6-6 6" /></svg>;
}

function EyeIcon({ crossed }: { crossed: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5Z" /><circle cx="12" cy="12" r="2.5" />{crossed ? <path d="m4 4 16 16" /> : null}</svg>;
}

function SpinnerIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="campusone-spin h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="8" className="opacity-25" /><path d="M20 12a8 8 0 0 0-8-8" /></svg>;
}

function SuccessMark() {
  return <span className="campusone-success-mark" aria-hidden="true"><svg viewBox="0 0 30 30" className="campusone-success-ring" fill="none"><circle cx="15" cy="15" r="12" /></svg><svg viewBox="0 0 24 24" className="campusone-success-check" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6.5 12.5 3.7 3.7 7.6-8.1" /></svg></span>;
}

const BUTTON_LABELS: Record<SubmitStatus, string> = {
  idle: 'Sign in',
  submitting: 'Signing you in...',
  success: 'Workspace ready',
};

/** Announced to assistive technology; the visual state is not enough on its own. */
const STATUS_ANNOUNCEMENTS: Record<SubmitStatus, string> = {
  idle: '',
  submitting: 'Signing you in.',
  success: 'Signed in. Taking you to your workspace.',
};

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const errorRef = useRef<HTMLDivElement>(null);
  const redirectTimer = useRef<number | undefined>(undefined);

  // Leaving the timer running would push a route after the component is gone.
  useEffect(() => () => window.clearTimeout(redirectTimer.current), []);

  // A banner nobody is looking at is a banner nobody reads.
  useEffect(() => {
    if (formError) errorRef.current?.focus();
  }, [formError]);

  const isBusy = status !== 'idle';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isBusy) return;

    setFormError(null);

    const inputErrors = validateLoginInput(email, password);
    if (hasFieldErrors(inputErrors)) {
      setFieldErrors(inputErrors);
      return;
    }
    setFieldErrors({});
    setStatus('submitting');

    try {
      await login(email.trim(), password);
      // Stays 'success' until the route changes, so the control never returns
      // to an enabled state with a live session already open.
      setStatus('success');
      redirectTimer.current = window.setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, REDIRECT_DELAY_MS);
    } catch (error) {
      setStatus('idle');
      applyError(error);
    }
  }

  function applyError(error: unknown) {
    if (!(error instanceof ApiError)) {
      setFormError('We could not sign you in. Please try again.');
      return;
    }

    // The API returns per-field messages as `details` on a validation failure;
    // showing them on the input beats a generic "data is not valid" banner.
    const serverFieldErrors = fieldErrorsFromDetails(error.details);
    if (hasFieldErrors(serverFieldErrors)) {
      setFieldErrors(serverFieldErrors);
      setFormError('Check the highlighted fields and try again.');
      return;
    }

    // Every remaining case — INVALID_CREDENTIALS, ACCOUNT_LOCKED,
    // RATE_LIMITED, a transport failure — already carries a message written
    // for an end user, so it is shown as sent rather than re-worded here.
    setFormError(error.message);
  }

  function fillDemoEmail() {
    if (!env.devAdminEmail) return;
    setEmail(env.devAdminEmail);
    setFieldErrors((current) => ({ ...current, email: undefined }));
    setFormError(null);
  }

  return (
    <main className="min-h-screen bg-[#f4f5f6] p-3 text-[#202226] sm:p-5 lg:grid lg:grid-cols-[minmax(380px,0.92fr)_1.08fr] lg:gap-5">
      <LoginHero />

      <section className="campusone-enter campusone-enter-delay flex min-h-[calc(100vh-218px)] items-center justify-center rounded-[12px_40px_12px_40px] bg-[#f9fafb] px-5 py-10 sm:px-10 lg:min-h-[calc(100vh-40px)] lg:px-12 xl:px-20">
        <div className="w-full max-w-[470px]">
          <div className="mb-9 flex items-center justify-between border-b border-[#e4e7e9] pb-5">
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[#5f6469]">CampusOne access</p>
            <span className="flex items-center gap-2 text-[0.7rem] font-medium text-[#5f6469]"><span className="h-1.5 w-1.5 rounded-full bg-[#3f7a55]" /> Online</span>
          </div>

          <div className="mb-8">
            {/* The document's only h1, and present at every breakpoint — the
                hero headline it replaces is hidden below lg. */}
            <h1 className="text-[2.1rem] font-semibold leading-tight tracking-[-0.055em] text-[#202226]">Welcome back</h1>
            <p className="mt-3 max-w-[360px] text-sm leading-6 text-[#4a4f54]">Sign in to continue to your school operations workspace.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate aria-busy={status === 'submitting'} className="space-y-6">
            <TextField
              id="email"
              type="email"
              label="Email address"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="next"
              placeholder="you@school.com"
              value={email}
              error={fieldErrors.email}
              disabled={isBusy}
              onChange={(event) => setEmail(event.target.value)}
            />

            <TextField
              id="password"
              type={showPassword ? 'text' : 'password'}
              label="Password"
              autoComplete="current-password"
              enterKeyHint="go"
              placeholder="Enter your password"
              value={password}
              error={fieldErrors.password}
              disabled={isBusy}
              onChange={(event) => setPassword(event.target.value)}
              trailing={
                <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} title={showPassword ? 'Hide password' : 'Show password'} disabled={isBusy} onClick={() => setShowPassword((value) => !value)} className="grid h-9 w-9 place-items-center rounded-full text-[#5f6469] transition-colors hover:bg-[#f1f2f3] hover:text-[#111214] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f85001]/40 disabled:cursor-not-allowed">
                  <EyeIcon crossed={showPassword} />
                </button>
              }
            />

            {formError ? (
              <StatusNotice
                ref={errorRef}
                tone="error"
                eyebrow="Sign-in issue"
                role="alert"
                action={
                  <button type="button" aria-label="Dismiss sign-in issue" title="Dismiss" onClick={() => setFormError(null)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#a74640] transition-colors hover:bg-[#ffe8e5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f85001]/40">
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="m7 7 10 10M17 7 7 17" /></svg>
                  </button>
                }
              >
                {formError}
              </StatusNotice>
            ) : null}

            <button type="submit" disabled={isBusy} className={`${SUBMIT_BUTTON_CLASS} ${status === 'success' ? 'campusone-success-button' : ''}`}>
              <span>{BUTTON_LABELS[status]}</span>
              <span className="transition-transform duration-200 group-hover:translate-x-1">
                {status === 'submitting' ? <SpinnerIcon /> : status === 'success' ? <SuccessMark /> : <ArrowIcon />}
              </span>
            </button>

            {/* Progress is otherwise conveyed only by the button's own label,
                which a screen reader will not re-announce on its own. */}
            <p role="status" aria-live="polite" className="sr-only">{STATUS_ANNOUNCEMENTS[status]}</p>

            {env.devAdminEmail ? (
              <StatusNotice
                tone="warning"
                eyebrow="Local environment"
                action={
                  <button type="button" aria-label={`Fill the demo email ${env.devAdminEmail}`} title="Fill demo email" onClick={fillDemoEmail} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[#a95313] shadow-[0_3px_10px_rgba(169,83,19,0.10)] transition-[transform,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:shadow-[0_6px_14px_rgba(169,83,19,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f85001]/40">
                    <ArrowIcon />
                  </button>
                }
              >
                Demo account <span className="font-semibold">{env.devAdminEmail}</span>. The password is in <code>backend/.env.example</code> — it is never sent to the browser.
              </StatusNotice>
            ) : null}
          </form>

          <p className="mt-8 border-t border-[#e4e7e9] pt-5 text-[0.7rem] leading-5 text-[#5f6469]">Access is protected by role-aware authentication and secure session controls.</p>
        </div>
      </section>
    </main>
  );
}
