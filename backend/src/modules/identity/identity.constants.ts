/**
 * Stable identifiers owned by the identity module.
 *
 * Error codes are part of the public API contract — the frontend branches on
 * them, so renaming one is a breaking change (AGENTS.md, "API Contract Rules").
 */

export const AUTH_ERROR_CODES = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
} as const;

/** Written to `security_event.event_type`; queried by security reporting. */
export const SECURITY_EVENTS = {
  LOGIN_SUCCEEDED: 'LOGIN_SUCCEEDED',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGIN_BLOCKED: 'LOGIN_BLOCKED_LOCKED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  LOGOUT: 'LOGOUT',
} as const;

export type SecurityEventType =
  (typeof SECURITY_EVENTS)[keyof typeof SECURITY_EVENTS];

/**
 * Transport details the service records against an authentication attempt.
 * Derived server-side from the request — never from a client-supplied field.
 */
export interface AuthRequestContext {
  ipAddress?: string;
  userAgent?: string;
}

/** Cookie carrying the session token; httpOnly and never read by client JS. */
export const ACCESS_COOKIE = 'campusone_access_token';
