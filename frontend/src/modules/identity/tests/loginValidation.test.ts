import { describe, expect, it } from 'vitest';
import {
  fieldErrorsFromDetails,
  hasFieldErrors,
  validateLoginInput,
} from '../utils/loginValidation';

describe('validateLoginInput', () => {
  it('accepts a well-formed email and password', () => {
    expect(validateLoginInput('teacher@school.com', 'a-good-password')).toEqual(
      {},
    );
  });

  it('requires an email address', () => {
    expect(validateLoginInput('   ', 'a-good-password').email).toBe(
      'Enter your email address.',
    );
  });

  it('rejects an address that is not an email', () => {
    expect(validateLoginInput('teacher-at-school', 'a-good-password').email).toMatch(
      /valid email address/,
    );
  });

  it('rejects an address beyond the length the API accepts', () => {
    const email = `${'a'.repeat(250)}@school.com`;

    expect(validateLoginInput(email, 'a-good-password').email).toMatch(
      /cannot be longer than 254/,
    );
  });

  it('requires a password', () => {
    expect(validateLoginInput('teacher@school.com', '').password).toBe(
      'Enter your password.',
    );
  });

  it('rejects a password shorter than the API minimum', () => {
    expect(validateLoginInput('teacher@school.com', 'short').password).toMatch(
      /at least 8 characters/,
    );
  });

  it('rejects a password beyond the API maximum', () => {
    expect(
      validateLoginInput('teacher@school.com', 'x'.repeat(129)).password,
    ).toMatch(/cannot be longer than 128/);
  });

  it('reports every field at once rather than one at a time', () => {
    const errors = validateLoginInput('nope', 'short');

    expect(errors.email).toBeDefined();
    expect(errors.password).toBeDefined();
  });
});

describe('hasFieldErrors', () => {
  it('is false for an empty result', () => {
    expect(hasFieldErrors({})).toBe(false);
  });

  it('is true when any field failed', () => {
    expect(hasFieldErrors({ password: 'Enter your password.' })).toBe(true);
  });
});

describe('fieldErrorsFromDetails', () => {
  it('routes a class-validator message to its field', () => {
    expect(
      fieldErrorsFromDetails([
        'email must be an email',
        'password must be longer than or equal to 8 characters',
      ]),
    ).toEqual({
      email: 'Email must be an email.',
      password: 'Password must be longer than or equal to 8 characters.',
    });
  });

  it('keeps the first message when a field fails more than one rule', () => {
    expect(
      fieldErrorsFromDetails([
        'password should not be empty',
        'password must be a string',
      ]).password,
    ).toBe('Password should not be empty.');
  });

  it('ignores messages for fields the form does not render', () => {
    expect(fieldErrorsFromDetails(['tenantId should not exist'])).toEqual({});
  });

  it('tolerates a details payload that is not an array of strings', () => {
    expect(fieldErrorsFromDetails(null)).toEqual({});
    expect(fieldErrorsFromDetails('email must be an email')).toEqual({});
    expect(fieldErrorsFromDetails([42, { email: 'bad' }])).toEqual({});
  });
});
