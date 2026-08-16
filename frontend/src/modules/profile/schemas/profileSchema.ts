/**
 * Validates API responses at the module boundary.
 *
 * Response shapes are not trusted (AGENTS.md, "Frontend Rules"). The panel is a
 * discriminated union, so the check that matters most is that `panel.kind` is
 * one we know how to render — an unrecognised kind must fail loudly here rather
 * than render as a blank region.
 */

import type {
  AccountProfile,
  ActiveSession,
  ActivityEntry,
  Preferences,
  ProfilePanel,
} from '../types/profile';

const PANEL_KINDS = [
  'PLATFORM',
  'STAFF',
  'TEACHER',
  'STUDENT',
  'PARENT',
  'UNAVAILABLE',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPanel(value: unknown): value is ProfilePanel {
  if (!isRecord(value)) return false;
  return PANEL_KINDS.includes(value.kind as (typeof PANEL_KINDS)[number]);
}

export function parseAccountProfile(value: unknown): AccountProfile {
  if (!isRecord(value)) throw invalid();

  const { identity, activeContext, security, account, editability, panel } =
    value;

  if (
    !isRecord(identity) ||
    typeof identity.userId !== 'string' ||
    typeof identity.email !== 'string' ||
    typeof identity.displayName !== 'string' ||
    typeof identity.avatarInitials !== 'string'
  ) {
    throw invalid();
  }

  if (
    !isRecord(activeContext) ||
    typeof activeContext.roleKey !== 'string' ||
    typeof activeContext.hasMultipleRoles !== 'boolean'
  ) {
    throw invalid();
  }

  if (
    !isRecord(security) ||
    !isRecord(account) ||
    !isRecord(editability) ||
    !isPanel(panel)
  ) {
    throw invalid();
  }

  return value as unknown as AccountProfile;
}

export function parsePreferences(value: unknown): Preferences {
  if (
    !isRecord(value) ||
    typeof value.language !== 'string' ||
    typeof value.appearance !== 'string'
  ) {
    throw new Error('The server returned invalid preferences.');
  }
  return value as unknown as Preferences;
}

export function parseSessions(value: unknown): ActiveSession[] {
  if (!Array.isArray(value)) throw new Error('The server returned invalid sessions.');
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.id !== 'string') {
      throw new Error('The server returned invalid sessions.');
    }
  }
  return value as ActiveSession[];
}

export function parseActivity(value: unknown): ActivityEntry[] {
  if (!Array.isArray(value)) throw new Error('The server returned invalid activity.');
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.eventType !== 'string') {
      throw new Error('The server returned invalid activity.');
    }
  }
  return value as ActivityEntry[];
}

function invalid(): Error {
  return new Error('The server returned an invalid account profile.');
}
