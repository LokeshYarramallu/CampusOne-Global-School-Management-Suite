export type AuthRoleKey =
  | 'PLATFORM_SUPER_ADMIN'
  | 'SCHOOL_ADMIN_OFFICE'
  | 'PRINCIPAL'
  | 'ACCOUNTANT'
  | 'TEACHER'
  | 'STUDENT'
  | 'PARENT_GUARDIAN';

export interface AuthUser {
  userId: string;
  email: string;
  roleKey: AuthRoleKey;
  roleName: string;
  tenantId?: string;
  authMode: 'local-dev' | 'keycloak';
}

export interface AuthSession {
  user: AuthUser;
  expiresInSeconds: number;
}
