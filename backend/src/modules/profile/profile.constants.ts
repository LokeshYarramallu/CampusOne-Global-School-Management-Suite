/**
 * Stable identifiers owned by the profile module.
 *
 * Error codes are part of the public API contract — the frontend branches on
 * them, so renaming one is a breaking change.
 */

export const PROFILE_ERROR_CODES = {
  PROFILE_NOT_FOUND: 'PROFILE_NOT_FOUND',
  FIELD_NOT_EDITABLE: 'FIELD_NOT_EDITABLE',
  PREFERENCE_INVALID: 'PREFERENCE_INVALID',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
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
 * The single source of truth for who may change what.
 *
 * The service enforces this and the client renders from it. Two copies of this
 * rule would drift, and the drift would be invisible until someone edited a
 * field they should not have been able to.
 */
export const FIELD_EDITABILITY: Record<string, Editability> = {
  phone: EDITABILITY.SELF,
  language: EDITABILITY.SELF,
  appearance: EDITABILITY.SELF,
  notificationPreferences: EDITABILITY.SELF,
  // Deferred: needs a confirmation the platform cannot yet deliver (research R3).
  email: EDITABILITY.APPROVAL,
  // Deferred: PRD §7.2 requires an approval workflow with retained history.
  givenName: EDITABILITY.APPROVAL,
  familyName: EDITABILITY.APPROVAL,
  // School-maintained records.
  employeeNumber: EDITABILITY.SCHOOL_MANAGED,
  designation: EDITABILITY.SCHOOL_MANAGED,
  department: EDITABILITY.SCHOOL_MANAGED,
  admissionNumber: EDITABILITY.SCHOOL_MANAGED,
  classLabel: EDITABILITY.SCHOOL_MANAGED,
  sectionLabel: EDITABILITY.SCHOOL_MANAGED,
  rollNumber: EDITABILITY.SCHOOL_MANAGED,
  teachingAssignment: EDITABILITY.SCHOOL_MANAGED,
  roleAssignments: EDITABILITY.SCHOOL_MANAGED,
};

export function isSelfEditable(field: string): boolean {
  return FIELD_EDITABILITY[field] === EDITABILITY.SELF;
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
