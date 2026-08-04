import { describe, expect, it } from 'vitest';
import { parseAuthSession, parseAuthUser } from '../schemas/authSchema';

const validUser = {
  userId: 'user-1',
  email: 'platform-admin@campusone.local',
  roleKey: 'PLATFORM_SUPER_ADMIN',
  roleName: 'Platform Super Admin',
  authMode: 'local-dev',
};

describe('parseAuthUser', () => {
  it('accepts a well-formed principal', () => {
    expect(parseAuthUser(validUser)).toEqual(validUser);
  });

  it.each([
    ['a missing userId', { ...validUser, userId: undefined }],
    ['a non-string email', { ...validUser, email: 42 }],
    ['an unknown role key', { ...validUser, roleKey: 'NOT_A_ROLE' }],
    ['an unknown auth mode', { ...validUser, authMode: 'saml' }],
    ['a null body', null],
    ['a primitive body', 'ok'],
  ])('rejects %s', (_label, value) => {
    expect(() => parseAuthUser(value)).toThrow(/invalid user session/i);
  });

  it('does not trust a role name that contradicts the role key', () => {
    expect(() =>
      parseAuthUser({ ...validUser, roleName: 'School Administrator' }),
    ).toThrow();
  });
});

describe('parseAuthSession', () => {
  it('accepts a session carrying a principal and an expiry', () => {
    const session = { user: validUser, expiresInSeconds: 3600 };

    expect(parseAuthSession(session)).toEqual(session);
  });

  it('rejects a session with no expiry', () => {
    expect(() => parseAuthSession({ user: validUser })).toThrow(
      /invalid authentication response/i,
    );
  });

  it('rejects a session whose expiry is not a number', () => {
    expect(() =>
      parseAuthSession({ user: validUser, expiresInSeconds: '3600' }),
    ).toThrow(/invalid authentication response/i);
  });

  it('rejects a session whose principal is malformed', () => {
    expect(() =>
      parseAuthSession({
        user: { ...validUser, roleKey: 'PARENT' },
        expiresInSeconds: 3600,
      }),
    ).toThrow(/invalid authentication response/i);
  });
});

