/**
 * Identity-specific presentation values.
 *
 * The form control tokens that used to live here moved to
 * `@/shared/components/fieldStyles` once the profile module became a second
 * consumer — the threshold AGENTS.md sets for shared code. They are re-exported
 * below so the login route's loading skeleton keeps one import path.
 */

export {
  BUTTON_RADIUS,
  FIELD_HEIGHT,
  FIELD_RADIUS,
  FIELD_LABEL_CLASS,
  fieldInputClass,
  PRIMARY_BUTTON_CLASS as SUBMIT_BUTTON_CLASS,
} from '@/shared/components/fieldStyles';

/** Panel surfaces used by the sign-in screen. */
export const SURFACE_PAGE = '#f4f5f6';
export const SURFACE_FORM = '#f9fafb';
export const BRAND_ORANGE = '#f85001';
export const INK = '#111214';

/** Pause between the success state and the redirect, so the state is legible. */
export const REDIRECT_DELAY_MS = 900;

/** Mirrors the backend LoginDto so the round-trip is skipped for known-bad input. */
export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
