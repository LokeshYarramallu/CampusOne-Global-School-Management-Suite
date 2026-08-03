export interface AuthUser {
  userId: string;
  email: string;
  roleKey: 'PLATFORM_SUPER_ADMIN';
  roleName: 'Platform Super Admin';
  authMode: 'local-dev' | 'keycloak';
}

export interface AuthSession {
  user: AuthUser;
  expiresInSeconds: number;
}
