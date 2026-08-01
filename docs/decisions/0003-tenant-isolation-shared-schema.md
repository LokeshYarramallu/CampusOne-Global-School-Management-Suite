# ADR 0003: Tenant isolation via shared schema + tenant discriminator (with RLS backstop)

- **Status:** Accepted
- **Date:** 2026-08-01
- **Resolves:** Open Decision #1 (tenant isolation strategy) in [AGENTS.md](../../AGENTS.md)

## Context

AGENTS.md Open Decision #1 requires the tenant isolation strategy to be decided before the first persisted module. PRD Risk #9 rates cross-tenant data exposure **Critical**, and PRD §12.2 requires per-tenant data residency. The constitution (Principle III, NON-NEGOTIABLE) mandates that every tenant-owned table carries a tenant identifier with an index leading with it, every query is scoped by tenant, tenant context is derived server-side, and every module ships a tenant-isolation test.

This decision governs how every tenant-owned table (in this feature and all future modules — SIS, attendance, fees, etc.) is structured and queried. ADR 0001 (PostgreSQL + Prisma) and ADR 0002 (Keycloak, single shared realm) are already accepted; this ADR must be compatible with both. The unified parent identity (PRD §5.3) is the one deliberate cross-tenant entity and lives in a platform-level area outside per-tenant scoping.

## Decision

Use **one shared PostgreSQL schema with a tenant discriminator column** (`tenant_id`) on every tenant-owned table, with **PostgreSQL row-level security (RLS) as a defense-in-depth backstop**.

- **Single schema, single database.** All tenants share the same tables. Every tenant-owned row carries `tenant_id` (UUID), and every tenant-owned table has an index whose leading column is `tenant_id` (AGENTS.md → Database Migration Rules).
- **Application-layer scoping is primary.** Repositories add `where: { tenantId }` to every tenant-owned query. A cross-tenant query method must be named explicitly (e.g. `findAcrossTenantsForPlatformAdmin`) and reachable only by an audited Platform Super Admin path (AGENTS.md → Multi-Tenancy Rules).
- **RLS backstop.** Each tenant-owned table gets a PostgreSQL RLS policy that restricts rows to the session's `tenant_id` (set via a session variable per request). This does not replace app-layer scoping or the required isolation tests; it prevents a missed `where` from leaking rows if a query bypasses the repository boundary. RLS policies are enforced in addition to, never instead of, application scoping.
- **Tenant context source.** The active `tenant_id` is derived server-side from the authenticated Keycloak session attribute (per the plan for `001-auth-multitenancy`) — never from request body, query, header, or client input.
- **Platform-level entities** (Tenant, TenantConfiguration, UserIdentity, ParentIdentity, Role/Permission catalog, FeatureFlag definitions, AuditRecord, NotificationTemplate defaults) are not tenant-owned in the same way; they either are global (catalog), own the tenant (Tenant), or carry `tenant_id` as a scoping attribute where relevant (RoleAssignment, FeatureFlag state, NotificationPreference, audit records). The unified parent identity and its parent–school links are the deliberate cross-tenant exception, guarded explicitly.

## Alternatives Considered

- **Schema-per-tenant.** Each school gets its own PostgreSQL schema in one DB. Stronger isolation by construction and per-school backup/restore; but migrations must apply across all schemas, requests must route to the correct schema, thousands of schemas strain tooling and connection management, and platform-wide reporting becomes a cross-schema fan-out. The cross-tenant parent identity would still require a shared platform schema. Rejected: the operational complexity and migration fan-out are not justified given app-layer scoping + RLS + isolation tests already provide strong isolation guarantees.
- **Database-per-tenant.** Each school gets its own database. Strongest isolation and easiest per-tenant data residency; but provisioning and migrating thousands of databases, connection pooling across databases, and near-impossible platform-wide reporting make it disproportionate for this product. Rejected as the default strategy; per-tenant data residency (PRD §12.2) can be addressed for specific tenants via dedicated deployment partitions if a future enterprise requirement demands it, without changing the default.

## Consequences

**Positive**

- One schema to migrate and reason about; Prisma's single `schema.prisma` stays the source of truth (ADR 0001).
- `where: { tenantId }` scoping is straightforward in Prisma and easy to review.
- Platform-wide reporting and the audited Platform Super Admin cross-tenant path are simple (single schema).
- RLS provides defense-in-depth without the operational cost of schema/db-per-tenant.
- The unified parent identity maps cleanly onto a platform-level area alongside tenant-owned tables.

**Negative / Trade-offs**

- **Isolation rests primarily on app-layer discipline.** A forgotten `where: { tenantId }` could leak across tenants. Mitigated by: RLS backstop, a repository boundary that injects tenant scope by default, lint/review guardrails, and the mandatory per-module tenant-isolation test (constitution Principle III, VI).
- **RLS is an additional thing to configure and test** per tenant-owned table and per migration. It must be enabled consistently; a table created without RLS is a gap. Mitigated by a migration checklist requiring RLS on every tenant-owned table.
- **Per-tenant data residency (PRD §12.2) is not physical.** All tenant data shares one DB by default. If a specific tenant legally requires physical isolation, it must be handled as a dedicated deployment exception, not via this default strategy. This is an accepted limitation for the default; enterprise-tier residency is a future concern.
- **Tenant-owned tables without a `tenant_id`-leading index, or without RLS, are defects** (AGENTS.md → Database Migration Rules). The migration process must enforce both.

**Open items this does not decide**

- The exact RLS session-variable mechanism and Prisma integration (setting `SET LOCAL app.tenant_id` per request) is finalized in the implementation tasks for `001-auth-multitenancy`.
- Enterprise-tier physical data residency for specific tenants (if ever required) would be a separate ADR; this ADR fixes the default strategy only.