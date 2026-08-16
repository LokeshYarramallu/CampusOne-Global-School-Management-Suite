'use client';

import { useEffect, useState } from 'react';
import { ApiError } from '@/core/http/apiError';
import { StatusNotice } from '@/shared/components/StatusNotice';
import { SECONDARY_BUTTON_CLASS } from '@/shared/components/fieldStyles';
import { getAccountProfile } from '../services/profileApi';
import type { AccountProfile } from '../types/profile';
import { StatTiles } from './Primitives';
import { AccountSecurity } from './AccountSecurity';
import { ContactCard } from './ContactCard';
import { ProfileHeader } from './ProfileHeader';
import { RolePanel, statsFor } from './panels/RolePanel';

type LoadState = 'loading' | 'ready' | 'error';

/**
 * The account page.
 *
 * Layout follows what professional profile surfaces actually do: a cover band
 * anchoring the portrait and name, a row of headline facts, then a fixed
 * identity rail beside a content grid. The earlier single tall column made
 * every role's page look the same and forced the eye through everything.
 *
 * A **shared core** identical in every role view, plus **exactly one role
 * panel** the server chose from the active role (FR-013, FR-014).
 */
export function ProfileShell() {
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    // Aborting on cleanup, not just ignoring the result: React runs effects
    // twice in development, and two in-flight requests each open a database
    // transaction that competes with the other.
    const controller = new AbortController();

    getAccountProfile(controller.signal)
      .then((loaded) => {
        if (controller.signal.aborted) return;
        setProfile(loaded);
        setLoadState('ready');
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError(
          error instanceof ApiError
            ? error.message
            : 'We could not load your account. Please try again.',
        );
        setLoadState('error');
      });

    return () => controller.abort();
  }, []);

  if (loadState === 'loading') {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="text-sm text-[#4a4f54]" aria-live="polite">
          Loading your account…
        </p>
      </main>
    );
  }

  if (loadState === 'error' || !profile) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[#202226]">
          Your account
        </h1>
        <div className="mt-6 max-w-xl">
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

  const { identity, activeContext, panel } = profile;
  const subtitle = subtitleFor(profile);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <ProfileHeader
        name={identity.displayName}
        initials={identity.avatarInitials}
        photoUrl={identity.photoUrl}
        subtitle={subtitle}
        roleName={activeContext.roleName}
        schoolName={activeContext.schoolName}
      />

      <div className="mt-4">
        <StatTiles stats={statsFor(panel)} />
      </div>

      {/* Identity rail beside the content grid — the two-column arrangement a
          reference surface needs. Stacks on mobile. */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
        <aside className="space-y-4 lg:sticky lg:top-6">
          <ContactCard profile={profile} onUpdated={setProfile} />

          {activeContext.hasMultipleRoles ? (
            <p className="border border-[#e0e4e6] bg-[#fbfcfc] px-4 py-3 text-[0.7rem] leading-5 text-[#5f6469]">
              You hold more than one role. This page shows{' '}
              <strong className="font-semibold text-[#202226]">
                {activeContext.roleName}
              </strong>
              .
            </p>
          ) : null}
        </aside>

        <div className="grid content-start gap-4 lg:grid-cols-2">
          <RolePanel panel={panel} />
          <AccountSecurity profile={profile} />
        </div>
      </div>

      <p className="mt-6 text-[0.7rem] leading-5 text-[#5f6469]">
        Two-step sign-in arrives with the identity provider. Photo upload from
        your device replaces the portrait picker once file storage is in place.
      </p>
    </main>
  );
}

/** The line under a name: job title for staff, class for a student. */
function subtitleFor(profile: AccountProfile): string | null {
  const { panel } = profile;
  if (panel.kind === 'STAFF' || panel.kind === 'TEACHER') {
    return panel.staff?.designation ?? null;
  }
  if (panel.kind === 'STUDENT' && panel.enrollment) {
    return `Class ${panel.enrollment.classLabel}-${panel.enrollment.sectionLabel} · Admission ${panel.enrollment.admissionNumber}`;
  }
  if (panel.kind === 'PARENT') {
    const children = panel.schools.reduce((n, s) => n + s.children.length, 0);
    return children > 0
      ? `${children} ${children === 1 ? 'child' : 'children'} across ${panel.schools.length} ${panel.schools.length === 1 ? 'school' : 'schools'}`
      : null;
  }
  if (panel.kind === 'PLATFORM') return 'Platform operations';
  return null;
}
