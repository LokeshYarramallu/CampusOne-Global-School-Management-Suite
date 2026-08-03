export interface AuthPrincipal {
  userId: string;
  email: string;
  roleKey: string;
  roleName: string;
  tenantId?: string;
  scope?: unknown;
  authMode: 'local-dev' | 'keycloak';
}

export interface JwtClaims {
  sub: string;
  email: string;
  roleKey: string;
  roleName: string;
  tenantId?: string;
  scope?: unknown;
  authMode: AuthPrincipal['authMode'];
}
