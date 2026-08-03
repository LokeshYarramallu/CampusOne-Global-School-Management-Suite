/**
 * The active tenant for a request.
 *
 * Derived exclusively from the authenticated principal. Never from a request
 * body, query parameter, header, or any other client-controlled input
 * (constitution Principle III, NON-NEGOTIABLE; ADR 0005).
 *
 * A principal may legitimately have no tenant — the Platform Super Admin
 * operates above any single school. That is represented as `null`, which is a
 * different thing from "we forgot to work out the tenant": the former is a
 * valid state, the latter raises `TENANT_CONTEXT_MISSING` at the point a
 * tenant-owned table is touched.
 */

import type { AuthPrincipal } from './auth.types';

export interface TenantContext {
  /** `null` for principals that operate above any single tenant. */
  tenantId: string | null;
  userId: string;
  roleKey: string;
}

export function tenantContextFrom(principal: AuthPrincipal): TenantContext {
  return {
    tenantId: principal.tenantId ?? null,
    userId: principal.userId,
    roleKey: principal.roleKey,
  };
}

/** True when this context may read tenant-owned tables. */
export function hasTenantScope(
  context: TenantContext,
): context is TenantContext & { tenantId: string } {
  return context.tenantId !== null;
}
