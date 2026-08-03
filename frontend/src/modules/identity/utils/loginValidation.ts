/**
 * Sign-in input rules, mirroring the backend `LoginDto`.
 *
 * The backend remains the authority — this only saves a round-trip for input
 * that could never succeed, and gives the field a message before submit.
 */

import {
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../constants';

export interface LoginFieldErrors {
  email?: string;
  password?: string;
}

/** Deliberately permissive: the server owns the authoritative check. */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLoginInput(
  email: string,
  password: string,
): LoginFieldErrors {
  const errors: LoginFieldErrors = {};
  const trimmedEmail = email.trim();

  if (trimmedEmail.length === 0) {
    errors.email = 'Enter your email address.';
  } else if (trimmedEmail.length > EMAIL_MAX_LENGTH) {
    errors.email = `Email addresses cannot be longer than ${EMAIL_MAX_LENGTH} characters.`;
  } else if (!EMAIL_SHAPE.test(trimmedEmail)) {
    errors.email = 'Enter a valid email address, for example you@school.com.';
  }

  if (password.length === 0) {
    errors.password = 'Enter your password.';
  } else if (password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Passwords are at least ${PASSWORD_MIN_LENGTH} characters.`;
  } else if (password.length > PASSWORD_MAX_LENGTH) {
    errors.password = `Passwords cannot be longer than ${PASSWORD_MAX_LENGTH} characters.`;
  }

  return errors;
}

export function hasFieldErrors(errors: LoginFieldErrors): boolean {
  return Boolean(errors.email ?? errors.password);
}

/**
 * Maps the `details` array a VALIDATION_FAILED response carries onto the field
 * that produced it, so a server-side rule lands on the input instead of in a
 * generic banner.
 *
 * The backend sends `class-validator` messages, which are prefixed with the
 * property name: "email must be an email".
 */
export function fieldErrorsFromDetails(details: unknown): LoginFieldErrors {
  if (!Array.isArray(details)) return {};

  const errors: LoginFieldErrors = {};
  for (const entry of details) {
    if (typeof entry !== 'string') continue;

    if (entry.startsWith('email ')) {
      errors.email ??= sentenceCase(entry);
    } else if (entry.startsWith('password ')) {
      errors.password ??= sentenceCase(entry);
    }
  }

  return errors;
}

function sentenceCase(message: string): string {
  const trimmed = message.trim();
  const text = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return text.endsWith('.') ? text : `${text}.`;
}
