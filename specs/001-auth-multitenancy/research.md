# Phase 0 Research: Authentication, Authorization & Multi-Tenant Isolation

**Date**: 2026-08-01 | **Feature**: `001-auth-multitenancy`

All Technical Context unknowns were resolved through interactive decisions with the user (no silent defaults). This file records each decision, its rationale, and alternatives considered, plus the integration patterns the implementation will follow. Open Decisions #1 and #2 are resolved by ADRs 0003 and 0002.

## R1 — Identity provider integration (Keycloak, single shared realm, headless)

**Decision**: Self-hosted Keycloak as OIDC IdP; OIDC Authorization Code + PKCE; single shared realm with `tenant_id` as a user attribute; application-branded login UI (Keycloak headless); biometrics app-side on mobile; magic-link via a Keycloak auth flow; MFA (TOTP + email) and SSO (Google/Microsoft/Apple) via Keycloak.

**Rationale**: Standards-based SSO/MFA/sessions without re-implementation; one user identity across tenants maps onto the unified parent identity (PRD §5.3); adapter boundary keeps Keycloak swappable (AGENTS.md → External Service Integration). See ADR 0002.

**Integration patterns**:
- `KeycloakIdentityAdapter` in `backend/src/infrastructure/keycloak/` wraps `@keycloak/admin-client` (user/realm/group management) and JWKS token validation. Business modules depend on an `IdentityProvider` interface, never on Keycloak APIs directly.
- Backend validates access tokens via Keycloak's JWKS endpoint (cached) on every request in a `JwtAuthGuard`; no session state in the app for authn.
- Frontend uses Auth.js v5 (`next-auth`) Keycloak provider for the OIDC dance, session, and token refresh (see R6).
- The active tenant is a **Keycloak session attribute** (see R2), not a client header.

**Alternatives considered**: managed IdP (rejected — data residency + per-tenant control); native NestJS auth (rejected — re-implementing SSO/WebAuthn/MFA is high-risk); one realm per tenant (rejected — breaks single parent identity). See ADR 0002.

## R2 — Active-tenant determination & session model

**Decision**: The active `tenant_id` is a **Keycloak session attribute**. The user switches active tenant via a dedicated endpoint that validates membership (the user must be authorized for that tenant) and writes the attribute into the Keycloak session server-side. The backend reads the active tenant from the validated session on every request. Session lifecycle (view/terminate, admin force sign-out, concurrent limits per role) is delegated to **Keycloak sessions**.

**Rationale**: Constitution requires tenant context to be server-derived, never from client input (body/query/header). A Keycloak session attribute is server-side state, consistent with delegating session management to Keycloak. Avoids a separate app session registry.

**Integration patterns**:
- `TenantContextService` (in `backend/src/core/tenant/`) reads the active tenant from the authenticated session and sets `SET LOCAL app.tenant_id = <uuid>` on the DB connection per request for RLS (ADR 0003).
- `SwitchActiveTenant` endpoint validates the requested tenant against the user's authorized tenants (from `RoleAssignment` / parent–school links) before writing the Keycloak session attribute.
- Concurrent session limits per role and force sign-out are enforced via Keycloak session policies / admin operations through the adapter.
- **Tension acknowledged and resolved**: "server-side session attribute" + "rely on Keycloak sessions" → the attribute lives in the Keycloak session, keyed by the Keycloak session id. No app-side session registry.

**Alternatives considered**: per-request header hint (rejected — violates constitution); server-issued token claim with token re-mint on switch (rejected — token-refresh-per-switch overhead, Keycloak session attribute is simpler); app session registry in DB (rejected — duplicates Keycloak sessions).

## R3 — Per-tenant password policy under a shared realm

**Decision**: **App-layer validation.** At password set/reset, the `identity` module validates the new password against the tenant's configured policy (complexity, rotation, reuse) before delegating the credential write to Keycloak. Keycloak stores the credential; the tenant owns the policy.

**Rationale**: Keycloak password policy is realm-wide; the single shared realm (ADR 0002) cannot express per-tenant policy natively. Validating in the app layer keeps per-tenant policy in tenant configuration (where it belongs) while Keycloak remains the credential store.

**Integration patterns**:
- Tenant password policy stored in `TenantConfiguration`; a `PasswordPolicyValidator` in the `identity` module enforces it on set/reset.
- The credential write to Keycloak happens only after validation passes.

**Alternatives considered**: Keycloak per-group policy (rejected — limited per-role/per-user variety); both app + Keycloak group baseline (rejected — unnecessary duplication for P1).

## R4 — MFA enforcement under a shared realm

**Decision**: **Keycloak conditional authentication flow + app policy endpoint.** A Keycloak conditional flow calls an app policy endpoint at sign-in to decide required actions per user (based on tenant/role/user MFA policy), then steps up MFA in-band (TOTP or email code).

**Rationale**: Keeps SSO + MFA in one native Keycloak flow while the app owns the per-tenant/per-role/per-user policy logic. Avoids re-implementing MFA orchestration and avoids Keycloak per-group MFA's limited granularity.

**Integration patterns**:
- MFA policy stored in tenant/role/user configuration; an `MfaPolicyEndpoint` (in `identity`) returns required factors for a given user/tenant.
- Keycloak conditional flow invokes this endpoint; on a required factor, the flow steps up via Keycloak's built-in TOTP / email-code authenticators.
- MFA channels in scope: TOTP authenticator app + email codes (SMS and in-app push are out of scope for this feature).

**Alternatives considered**: app-driven step-up (rejected — re-implements MFA orchestration Keycloak has); Keycloak per-group MFA (rejected — granularity limits).

## R5 — Multi-tenant data isolation (shared schema + discriminator + RLS)

**Decision**: Single shared PostgreSQL schema; `tenant_id` on every tenant-owned table with a leading-column index; PostgreSQL RLS as a defense-in-depth backstop. See ADR 0003.

**Integration patterns**:
- Every Prisma tenant-owned model has `tenantId` + `@@index([tenantId, ...])`.
- `TenantContextService` sets `SET LOCAL app.tenant_id` per request; RLS policies restrict rows to that variable. RLS is **additive** to app-layer `where: { tenantId }`, never a replacement.
- Repositories inject tenant scope by default; cross-tenant methods are named explicitly and reachable only by an audited Platform Super Admin path.
- Platform-level entities (Tenant, Role/Permission catalog, UserIdentity, ParentIdentity, AuditRecord, NotificationTemplate defaults) are global or carry `tenant_id` as a scoping attribute where relevant; the parent identity and its links are the deliberate cross-tenant exception, guarded explicitly.

**Alternatives considered**: schema-per-tenant; database-per-tenant. See ADR 0003.

## R6 — Frontend OIDC (Auth.js v5)

**Decision**: Auth.js (next-auth) v5 with the Keycloak provider handles OIDC Authorization Code + PKCE, session management, and token refresh in the Next.js App Router.

**Integration patterns**:
- Auth config in `frontend/src/core/auth/` (the only place auth session logic lives); route handlers for `/api/auth/*` via Auth.js.
- Branded login UI is a Next.js route (`/login`) that initiates the Keycloak provider flow; Keycloak stays headless.
- `apiClient` attaches the access token to `/api/v1` calls; 401 → token refresh → retry → re-login.
- No secrets in `NEXT_PUBLIC_*`; only the Keycloak public issuer/client id is public.

**Alternatives considered**: custom OIDC client (rejected — more code to secure/maintain for no gain over Auth.js v5).

## R7 — Async processing (Redis + BullMQ)

**Decision**: Redis + BullMQ for notification delivery (retry/backoff, channel fallback, delivery tracking) and audit webhook delivery (SIEM streaming with retry).

**Integration patterns**:
- Queue registration in `backend/src/infrastructure/queue/`; producers in `notification-center` and `audit-log` modules; workers consume and call channel/webhook adapters.
- Jobs are tenant-scoped (payload includes `tenantId`); failures retry with backoff, then dead-letter; delivery status written back to the notification/audit records.
- Redis is additional infrastructure (docker-compose in dev).

**Alternatives considered**: PostgreSQL-as-queue (rejected — less suited to retry/backoff at delivery scale); defer (rejected — needed for P1 notification center).

## R8 — Notification providers & templates

**Decision**: Email/push **providers** are deferred to a tasks-stage ADR; the plan defines `EmailProvider` and `PushProvider` interfaces in `backend/src/infrastructure/` with multi-provider fallback per AGENTS.md. Templates use a **Handlebars-style** engine (DB-stored, server-side rendered, per-locale variants, sandboxed).

**Integration patterns**:
- `NotificationService` (in `notification-center`) builds a notification, selects channels by policy/preference, enqueues per-channel delivery jobs.
- Channel adapters (`EmailProvider`, `PushProvider`) implement send + status; a fallback chain is configurable per tenant.
- Templates stored as DB rows keyed by template-id + locale; rendered with a sandboxed Handlebars instance (no arbitrary code; variable substitution + conditional sections).
- Channels in scope: email, push, in-app feed. **Push and in-app-feed channels fully activate once the mobile/app shell exists (P2)**; email + notification infrastructure are P1.

**Alternatives considered**: managed providers chosen at plan time (rejected — defer to ADR with provider comparison); self-hosted SMTP + direct push (rejected — defer); custom template syntax (rejected — Handlebars is sufficient and familiar).

## R9 — Audit tamper-evidence, storage, and SIEM streaming

**Decision**: Audit records in the **shared schema with a `tenant_id` leading-column index**; **append-only** (no UPDATE/DELETE at the DB role level) **plus hash chaining** (each record stores a hash of the previous record + its own content); SIEM streaming via **per-event webhooks** delivered through the BullMQ queue with retry.

**Integration patterns**:
- `audit_log` table: `id`, `tenantId`, `actorId`, `action`, `targetType`, `targetId`, `occurredAt`, `deviceContext`, `before`, `after`, `prevHash`, `hash`. `@@index([tenantId, occurredAt])`.
- A `AuditWriter` computes `hash = sha256(prevHash || canonicalJson(record fields))` inside the same transaction as the audited change; append-only enforced by DB grants + a guard that no update path exists.
- Filter/search/export via `audit-log` module endpoints (authorized roles only); export in spreadsheet/document/machine-readable formats.
- Per-event webhook: on audit write, enqueue a webhook delivery job to the customer-configured endpoint (with signed payloads + retry/backoff via BullMQ).
- Retention configurable per tenant with a 7-year minimum; a retention job prunes only after the configured period.
- Reads of the audit log are themselves audited.

**Alternatives considered**: append-only only (rejected — no chain verification); external immutable store (rejected for P1 — more infra; can be added later as an additional sink).

## R10 — Permission catalog & scope evaluation

**Decision**: **DB-stored** permission catalog (Module → Feature → Action tuples, seeded), with role-permission and custom-role mappings in the DB. Scope (the `Scope` dimension) is evaluated at query time via scope rules.

**Integration patterns**:
- `permission` catalog table seeded with Module/Feature/Action tuples; `role` and `role_permission` tables hold the seven initial built-in roles and future custom roles. Role inheritance is deferred until specialized roles are introduced.
- `role_assignment` binds a user to a role within a tenant with a scope (e.g. assigned class/section ids) where applicable.
- A `PermissionsGuard` (in `core/auth`) evaluates the required permission on every request; a `ScopeResolver` narrows queries by the assignment's scope.
- **Consistency guard**: permissions referenced in code (`@RequirePermission('...')`) must exist in the catalog — a startup/test check asserts this to prevent drift between code and DB catalog.

**Alternatives considered**: code-defined catalog with DB mappings (rejected — user chose DB-stored for runtime flexibility); the consistency guard mitigates the drift risk.

## R11 — Feature gating

**Decision**: Per-tenant, backend-evaluated on/off feature flags now; full controlled-rollout (percentage, groups, experiments) deferred to the §5.7 feature.

**Integration patterns**:
- `feature_flag` table: per-tenant flag state; core capabilities on by default, optional off.
- `@FeatureGate('module')` guard on endpoints/jobs; a disabled flag for the tenant throws `FORBIDDEN` (feature unreachable, not hidden). UI also reflects flags but the backend is the authority.

## R12 — Prisma setup (prerequisite)

**Decision**: Prisma is not yet installed. The first tasks install Prisma, create `backend/prisma/schema.prisma`, add a `PrismaService` (wrapping `PrismaClient`) in `backend/src/infrastructure/prisma/`, wire `DATABASE_URL` into the typed config + env validation + `.env.example`, and create the first migration establishing the foundation tables with `tenant_id` + leading indexes + RLS.

**Rationale**: ADR 0001 committed to Prisma; the repo has a placeholder `backend/migrations/` (empty) which is superseded by `backend/prisma/migrations/`.

## Open items deferred to `/speckit-tasks` or a tasks-stage ADR

- Email/push provider selection (R8) — ADR during tasks.
- Exact RLS session-variable + Prisma interaction (`SET LOCAL app.tenant_id` per connection/request) — finalized in tasks.
- Dev `docker-compose` for Keycloak + Postgres + Redis — tasks.
- Final numeric defaults for lockout/idle-timeout/concurrent-limits — tasks (spec gives ~5/~30 min/per-role starting points).
- i18n library choice for frontend template localization — tasks.
