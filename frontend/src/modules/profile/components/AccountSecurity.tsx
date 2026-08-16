'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ApiError } from '@/core/http/apiError';
import { TextField } from '@/shared/components/TextField';
import { SECONDARY_BUTTON_CLASS } from '@/shared/components/fieldStyles';
import {
  changePassword,
  endSession,
  getActivity,
  getSessions,
} from '../services/profileApi';
import type { AccountProfile, ActiveSession, ActivityEntry } from '../types/profile';
import { Card, DataGrid, Field } from './Primitives';

/**
 * Account provenance, password, devices, and recent activity.
 *
 * These matter more here than on a product where people sign themselves up.
 * Every account on this platform is provisioned from above — the platform
 * registers a school, the school creates staff and learners, and enrolling a
 * learner brings their guardian's account into being. So the holder starts
 * with a credential somebody else chose, and "change my password" is the first
 * thing they need, not a settings afterthought.
 */

const EVENT_LABELS: Record<string, string> = {
  LOGIN_SUCCEEDED: 'Signed in',
  LOGIN_FAILED: 'Failed sign-in attempt',
  ACCOUNT_LOCKED: 'Account locked',
  LOGIN_BLOCKED_LOCKED: 'Sign-in blocked while locked',
  LOGOUT: 'Signed out',
  PASSWORD_CHANGED: 'Password changed',
  SESSION_TERMINATED_BY_USER: 'Device signed out',
};

export function AccountSecurity({ profile }: { profile: AccountProfile }) {
  const { account, security } = profile;

  return (
    <>
      <Card title="Account" hint="How this account came to exist">
        <DataGrid>
          <Field label="Status" value={titleCase(account.status)} />
          <Field label="Created" value={formatDate(account.createdAt)} />
          <Field label="Created by" value={account.provisionedBy} />
          <Field
            label="Last sign-in"
            value={formatDateTime(account.lastLoginAt)}
            placeholder="This is your first"
          />
        </DataGrid>
      </Card>

      <PasswordCard passwordChangedAt={security.passwordChangedAt} />
      <SessionsCard />
      <ActivityCard />
    </>
  );
}

function PasswordCard({ passwordChangedAt }: { passwordChangedAt: string | null }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const found: Record<string, string> = {};
    if (current.length === 0) found.current = 'Enter your current password.';
    if (next.length < 8) found.next = 'Use at least 8 characters.';
    // Checked here as well as by the API: a mismatch is the user's typo, and
    // a round trip to learn that is a round trip wasted.
    if (next !== confirm) found.confirm = 'The two passwords do not match.';
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      await changePassword({ currentPassword: current, newPassword: next });
      setDone(true);
      setOpen(false);
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (error) {
      setErrors({
        form:
          error instanceof ApiError
            ? error.message
            : 'We could not change your password. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card
      title="Password"
      hint={
        passwordChangedAt
          ? `Last changed ${formatDate(passwordChangedAt)}`
          : 'Never changed'
      }
      action={
        !open ? (
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setDone(false);
            }}
            className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[#a95313] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f85001]/40"
          >
            Change
          </button>
        ) : null
      }
    >
      {open ? (
        <form onSubmit={submit} aria-busy={saving} className="space-y-4">
          <TextField
            id="current-password"
            type="password"
            label="Current password"
            autoComplete="current-password"
            value={current}
            error={errors.current}
            disabled={saving}
            onChange={(e) => setCurrent(e.target.value)}
          />
          <TextField
            id="new-password"
            type="password"
            label="New password"
            autoComplete="new-password"
            value={next}
            error={errors.next}
            disabled={saving}
            onChange={(e) => setNext(e.target.value)}
          />
          <TextField
            id="confirm-password"
            type="password"
            label="Confirm new password"
            autoComplete="new-password"
            value={confirm}
            error={errors.confirm}
            disabled={saving}
            onChange={(e) => setConfirm(e.target.value)}
          />

          {errors.form ? (
            <p role="alert" className="text-xs leading-5 text-[#a74640]">
              {errors.form}
            </p>
          ) : null}

          <div className="flex gap-2">
            <button type="submit" disabled={saving} className={SECONDARY_BUTTON_CLASS}>
              {saving ? 'Saving…' : 'Update password'}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setOpen(false);
                setErrors({});
              }}
              className="px-3 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-[#5f6469] hover:text-[#202226]"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <p className="text-xs leading-5 text-[#5f6469]">
          {done
            ? 'Your password was changed.'
            : 'Choose a password only you know. Your school set the one you signed in with.'}
        </p>
      )}
    </Card>
  );
}

function SessionsCard() {
  const [sessions, setSessions] = useState<ActiveSession[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ending, setEnding] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    getSessions()
      .then((rows) => live && setSessions(rows))
      .catch(() => live && setError('Could not load your devices.'));
    return () => {
      live = false;
    };
  }, []);

  async function end(id: string) {
    setEnding(id);
    try {
      await endSession(id);
      setSessions((rows) => rows?.filter((row) => row.id !== id) ?? null);
    } catch {
      setError('That device could not be signed out.');
    } finally {
      setEnding(null);
    }
  }

  return (
    <Card
      title="Devices"
      hint="Where this account is signed in"
      empty={
        error ??
        (sessions !== null && sessions.length === 0
          ? 'No other devices are signed in.'
          : undefined)
      }
    >
      {sessions === null ? (
        <p className="text-xs text-[#5f6469]">Loading…</p>
      ) : (
        <ul className="-my-2.5">
          {sessions.map((session) => (
            <li
              key={session.id}
              className="flex items-center justify-between gap-3 border-b border-[#eef1f2] py-2.5 last:border-b-0"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm text-[#202226]">
                  {session.isCurrent ? 'This device' : 'Signed-in device'}
                </span>
                <span className="block text-[0.7rem] text-[#5f6469]">
                  Since {formatDateTime(session.createdAt)}
                </span>
              </span>
              {session.isCurrent ? (
                <span className="shrink-0 rounded-sm bg-[#eef1f2] px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-[#4a4f54]">
                  Current
                </span>
              ) : (
                <button
                  type="button"
                  disabled={ending === session.id}
                  onClick={() => void end(session.id)}
                  className="shrink-0 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[#a74640] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f85001]/40 disabled:opacity-60"
                >
                  {ending === session.id ? 'Ending…' : 'Sign out'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ActivityCard() {
  const [entries, setEntries] = useState<ActivityEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    getActivity()
      .then((rows) => live && setEntries(rows))
      .catch(() => live && setError('Could not load recent activity.'));
    return () => {
      live = false;
    };
  }, []);

  return (
    <Card
      title="Recent activity"
      hint="Sign-ins and security events on this account"
      span={2}
      empty={
        error ??
        (entries !== null && entries.length === 0
          ? 'Nothing recorded yet. Sign-ins and security events will appear here.'
          : undefined)
      }
    >
      {entries === null ? (
        <p className="text-xs text-[#5f6469]">Loading…</p>
      ) : (
        <ul className="-my-2">
          {entries.slice(0, 8).map((entry, index) => (
            <li
              key={`${entry.occurredAt}-${index}`}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-[#eef1f2] py-2 last:border-b-0"
            >
              <span className="text-sm text-[#202226]">
                {EVENT_LABELS[entry.eventType] ?? titleCase(entry.eventType)}
              </span>
              <span className="text-[0.7rem] text-[#5f6469]">
                {entry.device} · {formatDateTime(entry.occurredAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? null
    : parsed.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
}

function formatDateTime(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? null
    : parsed.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
}
