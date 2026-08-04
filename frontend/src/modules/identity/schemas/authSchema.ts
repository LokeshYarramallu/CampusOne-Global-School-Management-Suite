import type { AuthRoleKey, AuthSession, AuthUser } from '../types/auth';

const AUTH_ROLE_KEYS: AuthRoleKey[] = [
  'PLATFORM_SUPER_ADMIN',
  'SCHOOL_ADMIN_OFFICE',
  'PRINCIPAL',
  'ACCOUNTANT',
  'TEACHER',
  'STUDENT',
  'PARENT_GUARDIAN',
];

const ROLE_DISPLAY_NAMES: Record<AuthRoleKey, string> = {
  PLATFORM_SUPER_ADMIN: 'Platform Super Admin',
  SCHOOL_ADMIN_OFFICE: 'School Admin Office',
  PRINCIPAL: 'Principal',
  ACCOUNTANT: 'Accountant',
  TEACHER: 'Teacher',
  STUDENT: 'Student',
  PARENT_GUARDIAN: 'Parent / Guardian',
};

function isAuthUser(value: unknown): value is AuthUser {
  if (typeof value !== 'object' || value === null) return false;
  const user = value as Record<string, unknown>;

  if (
    typeof user.userId !== 'string' ||
    typeof user.email !== 'string' ||
    typeof user.roleKey !== 'string' ||
    !AUTH_ROLE_KEYS.includes(user.roleKey as AuthRoleKey) ||
    typeof user.roleName !== 'string' ||
    user.roleName !== ROLE_DISPLAY_NAMES[user.roleKey as AuthRoleKey] ||
    (user.tenantId !== undefined && typeof user.tenantId !== 'string') ||
    (user.authMode !== 'local-dev' && user.authMode !== 'keycloak')
  ) {
    return false;
  }

  return true;
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
