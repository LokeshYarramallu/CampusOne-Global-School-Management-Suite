import type { AuthSession, AuthUser } from '../types/auth';

function isAuthUser(value: unknown): value is AuthUser {
  if (typeof value !== 'object' || value === null) return false;
  const user = value as Record<string, unknown>;
  return (
    typeof user.userId === 'string' &&
    typeof user.email === 'string' &&
    user.roleKey === 'PLATFORM_SUPER_ADMIN' &&
    user.roleName === 'Platform Super Admin' &&
    (user.authMode === 'local-dev' || user.authMode === 'keycloak')
  );
}

export function parseAuthSession(value: unknown): AuthSession {
  if (
    typeof value !== 'object' ||
    value === null ||
    !isAuthUser((value as Record<string, unknown>).user) ||
    typeof (value as Record<string, unknown>).expiresInSeconds !== 'number'
  ) {
    throw new Error('The server returned an invalid authentication response.');
  }

  return value as AuthSession;
}

export function parseAuthUser(value: unknown): AuthUser {
  if (!isAuthUser(value)) {
    throw new Error('The server returned an invalid user session.');
  }
  return value;
}
