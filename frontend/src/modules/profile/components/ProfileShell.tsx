'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/core/http/apiError';
import { StatusNotice } from '@/shared/components/StatusNotice';
import { TextField } from '@/shared/components/TextField';
import { SECONDARY_BUTTON_CLASS } from '@/shared/components/fieldStyles';
import { getAccountProfile, updateProfile } from '../services/profileApi';
import type { AccountProfile } from '../types/profile';
import { ManagedField } from './ManagedField';
import { PanelSection } from './PanelSection';
import { RolePanel } from './panels/RolePanel';

type LoadState = 'loading' | 'ready' | 'error';
type SaveState = 'idle' | 'saving';

/**
 * The account page.
 *
 * A **shared core** identical in every role view, plus **exactly one role
 * panel** the server chose from the active role. A person holding two roles
 * sees one panel at a time — never a blend (FR-013, FR-014).
 *
 * Every area defines its empty, loading, and error state before build
 * (PRD §11); there is no path that renders a blank region.
 */
export function ProfileShell() {
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);

  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [banner, setBanner] = useState<{
    tone: 'error' | 'info';
    text: string;
  } | null>(null);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    getAccountProfile()
      .then((loaded) => {
        if (cancelled) return;
        setProfile(loaded);
        setPhone(loaded.identity.phone ?? '');
        setLoadState('ready');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(
          error instanceof ApiError
            ? error.message
            : 'We could not load your account. Please try again.',
        );
        setLoadState('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (banner) bannerRef.current?.focus();
  }, [banner]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saveState === 'saving') return;

    setPhoneError(undefined);
    setBanner(null);

    const trimmed = phone.trim();
    if (trimmed.length > 0 && !/^[+0-9 ()-]{6,32}$/.test(trimmed)) {
      setPhoneError(
        'Enter a phone number using digits and the characters + ( ) - only.',
      );
      return;
    }

    setSaveState('saving');
    try {
      const updated = await updateProfile({ phone: trimmed });
      setProfile(updated);
      setBanner({ tone: 'info', text: 'Your details were saved.' });
    } catch (error) {
      if (error instanceof ApiError && Array.isArray(error.details)) {
        const message = error.details.find(
          (entry): entry is string =>
            typeof entry === 'string' && entry.startsWith('phone '),
        );
        if (message) {
          setPhoneError(`${message.charAt(0).toUpperCase()}${message.slice(1)}.`);
          setSaveState('idle');
          return;
        }
      }
      setBanner({
        tone: 'error',
        text:
          error instanceof ApiError
            ? error.message
            : 'We could not save your details. Please try again.',
      });
    } finally {
      setSaveState('idle');
    }
  }

  if (loadState === 'loading') {
    return (
      <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
        <p className="text-sm text-[#4a4f54]" aria-live="polite">
          Loading your account…
        </p>
      </main>
    );
  }

  if (loadState === 'error' || !profile) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[#202226]">
          Your account
        </h1>
        <div className="mt-6">
          <StatusNotice tone="error" eyebrow="Could not load" role="alert">
            {loadError}
          </StatusNotice>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className={`${SECONDARY_BUTTON_CLASS} mt-5`}
        >
          Try again
        </button>
      </main>
    );
  }

  const { identity, activeContext, security, editability } = profile;

  return (
    <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
      <header className="mb-8 flex flex-wrap items-center gap-5 border-b border-[#e4e7e9] pb-7">
        <div
          aria-hidden="true"
          className="grid h-16 w-16 shrink-0 place-items-center rounded-[22px_6px_22px_6px] bg-[#111214] text-lg font-bold text-white"
        >
          {identity.avatarInitials}
        </div>
        <div className="min-w-0">
          {/* The document's only h1, present at every breakpoint. */}
          <h1 className="text-[1.9rem] font-semibold leading-tight tracking-[-0.04em] text-[#202226]">
            {identity.displayName}
          </h1>
          <p className="mt-1 text-sm text-[#4a4f54]">
            {activeContext.roleName}
            {activeContext.schoolName ? ` · ${activeContext.schoolName}` : ''}
          </p>
        </div>
        {activeContext.hasMultipleRoles ? (
          <p className="w-full text-xs leading-5 text-[#5f6469]">
            You hold more than one role. This page shows the details for{' '}
            <strong className="font-semibold text-[#202226]">
              {activeContext.roleName}
            </strong>
            .
          </p>
        ) : null}
      </header>

      {banner ? (
        <div className="mb-6">
          <StatusNotice
            ref={bannerRef}
            tone={banner.tone}
            eyebrow={banner.tone === 'error' ? 'Could not save' : 'Saved'}
            role={banner.tone === 'error' ? 'alert' : 'status'}
          >
            {banner.text}
          </StatusNotice>
        </div>
      ) : null}

      <div className="space-y-5">
        <PanelSection
          title="Your details"
          description="Your name and email follow you across every school."
        >
          <form onSubmit={handleSave} aria-busy={saveState === 'saving'}>
            <dl>
              <ManagedField
                label="Full name"
                value={`${identity.givenName} ${identity.familyName}`}
                editability={editability.givenName ?? 'APPROVAL'}
              />
              <ManagedField
                label="Email address"
                value={identity.email}
                editability={editability.email ?? 'APPROVAL'}
              />
            </dl>

            <div className="mt-5 max-w-sm">
              <TextField
                id="phone"
                type="tel"
                label="Phone number"
                autoComplete="tel"
                placeholder="+91 98000 00000"
                value={phone}
                error={phoneError}
                disabled={saveState === 'saving'}
                onChange={(event) => setPhone(event.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={saveState === 'saving'}
              className={`${SECONDARY_BUTTON_CLASS} mt-4`}
            >
              {saveState === 'saving' ? 'Saving…' : 'Save changes'}
            </button>
            <p role="status" aria-live="polite" className="sr-only">
              {saveState === 'saving' ? 'Saving your details.' : ''}
            </p>
          </form>
        </PanelSection>

        <RolePanel panel={profile.panel} />

        <PanelSection
          title="Security"
          description="How this account is protected."
        >
          <dl>
            <ManagedField
              label="Password last changed"
              value={
                security.passwordChangedAt
                  ? new Date(security.passwordChangedAt).toLocaleDateString()
                  : null
              }
              editability="SELF"
              placeholder="Never changed"
            />
            <ManagedField
              label="Additional sign-in factors"
              value={
                security.mfaFactors.length > 0
                  ? security.mfaFactors.map((f) => f.factorType).join(', ')
                  : null
              }
              editability="SELF"
              placeholder="None enrolled"
            />
            <ManagedField
              label="Active sessions"
              value={String(security.activeSessionCount)}
              editability="SELF"
            />
          </dl>
        </PanelSection>
      </div>

      <p className="mt-8 border-t border-[#e4e7e9] pt-5 text-[0.7rem] leading-5 text-[#5f6469]">
        Photo upload, email change, and additional sign-in factors are not
        available yet.
      </p>
    </main>
  );
}
