/**
 * Stable identifiers owned by the profile module.
 *
 * Error codes are part of the public API contract — the frontend branches on
 * them, so renaming one is a breaking change.
 */

/**
 * Selectable portraits.
 *
 * A **key**, never a URL. If the client could send a path, it could point the
 * image at anything — another origin, a tracking pixel, a `javascript:` URI.
 * The server maps a key from this fixed set to a path it controls, so the
 * worst a malicious client can do is choose a different one of our drawings.
 *
 * Real photo upload needs the storage adapter (PRD §5.8) and lands with it;
 * this is the facility until then, not a placeholder for one.
 */
export const AVATAR_KEYS = [
  'avatar-01',
  'avatar-02',
  'avatar-03',
  'avatar-04',
  'avatar-05',
  'avatar-06',
  'avatar-07',
  'avatar-08',
] as const;

export type AvatarKey = (typeof AVATAR_KEYS)[number];

export function isAvatarKey(value: string): value is AvatarKey {
  return (AVATAR_KEYS as readonly string[]).includes(value);
}

/** Keys become paths only here. */
export function avatarPathFor(key: string): string {
  return `/avatars/${key}.svg`;
}

export const PROFILE_ERROR_CODES = {
  PROFILE_NOT_FOUND: 'PROFILE_NOT_FOUND',
  FIELD_NOT_EDITABLE: 'FIELD_NOT_EDITABLE',
  PREFERENCE_INVALID: 'PREFERENCE_INVALID',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  AVATAR_UNKNOWN: 'AVATAR_UNKNOWN',
  CURRENT_PASSWORD_INCORRECT: 'CURRENT_PASSWORD_INCORRECT',
} as const;

/**
 * How a field may be changed. Returned to the client so the read-only
 * affordance has a real source and cannot drift from what the API accepts.
 */
export const EDITABILITY = {
  /** Saves immediately. */
  SELF: 'SELF',
  /** Requires confirming the new value before it takes effect. */
  VERIFICATION: 'VERIFICATION',
  /** Needs an administrator's approval (workflow deferred — read-only today). */
  APPROVAL: 'APPROVAL',
  /** Maintained by the school; the person can only request a correction. */
  SCHOOL_MANAGED: 'SCHOOL_MANAGED',
} as const;

export type Editability = (typeof EDITABILITY)[keyof typeof EDITABILITY];

/**
 * Who may change what — and it depends on the role.
 *
 * Accounts here are provisioned from above: the platform registers a school,
 * the school creates staff and learners, and enrolling a learner brings the
 * guardian's account into being. Two consequences follow.
 *
 * **Names are fixed at creation.** They come from the record the school
 * entered, and letting a person rename themselves would decouple the account
 * from the roll. Corrections go through the school.
 *
 * **A person edits their own contact details, nobody else's.** A learner may
 * change their own phone and portrait, but not the family address and not a
 * guardian's details — those belong to the household record the school holds.
 * An adult (staff, parent, guardian) owns their address outright.
 *
 * The whole map is returned to the client, so the interface renders from the
 * same rules the API enforces and the two cannot drift.
 */
const BASE_EDITABILITY: Record<string, Editability> = {
  // Everyone's own, always.
  phone: EDITABILITY.SELF,
  avatarKey: EDITABILITY.SELF,
  language: EDITABILITY.SELF,
  appearance: EDITABILITY.SELF,
  notificationPreferences: EDITABILITY.SELF,

  // Set when the account was created; corrections go through the school.
  givenName: EDITABILITY.SCHOOL_MANAGED,
  familyName: EDITABILITY.SCHOOL_MANAGED,

  // Needs a confirmation the platform cannot yet deliver (research R3).
  email: EDITABILITY.APPROVAL,

  // School records.
  employeeNumber: EDITABILITY.SCHOOL_MANAGED,
  designation: EDITABILITY.SCHOOL_MANAGED,
  department: EDITABILITY.SCHOOL_MANAGED,
  admissionNumber: EDITABILITY.SCHOOL_MANAGED,
  classLabel: EDITABILITY.SCHOOL_MANAGED,
  sectionLabel: EDITABILITY.SCHOOL_MANAGED,
  rollNumber: EDITABILITY.SCHOOL_MANAGED,
  teachingAssignment: EDITABILITY.SCHOOL_MANAGED,
  roleAssignments: EDITABILITY.SCHOOL_MANAGED,

  // Family data. A learner never edits this; see below.
  guardians: EDITABILITY.SCHOOL_MANAGED,
  children: EDITABILITY.SCHOOL_MANAGED,
};

/** Address fields, grouped because they are always granted together. */
const ADDRESS_FIELDS = [
  'addressLine',
  'addressCity',
  'addressPostcode',
] as const;

export function editabilityFor(roleKey: string): Record<string, Editability> {
  const map = { ...BASE_EDITABILITY };

  // A learner's address is the household's, held by the school. Everyone else
  // owns theirs. This is the limitation that stops a student editing family
  // data, and it is enforced server-side rather than hidden in the interface.
  const tier =
    roleKey === 'STUDENT' ? EDITABILITY.SCHOOL_MANAGED : EDITABILITY.SELF;
  for (const field of ADDRESS_FIELDS) map[field] = tier;

  return map;
}

export function isSelfEditable(roleKey: string, field: string): boolean {
  return editabilityFor(roleKey)[field] === EDITABILITY.SELF;
}

/** Panel discriminators. Exactly one is returned per request. */
export const PANEL_KINDS = {
  PLATFORM: 'PLATFORM',
  STAFF: 'STAFF',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
  PARENT: 'PARENT',
  /** The owning capability is switched off for this school (FR-038). */
  UNAVAILABLE: 'UNAVAILABLE',
} as const;

export type PanelKind = (typeof PANEL_KINDS)[keyof typeof PANEL_KINDS];

export const APPEARANCES = ['system', 'light', 'dark'] as const;
export type Appearance = (typeof APPEARANCES)[number];

/** Recent security activity is a bounded window, not an audit export. */
export const ACTIVITY_WINDOW_LIMIT = 20;
