# API Contracts: Authentication, Authorization & Multi-Tenant Isolation

**Date**: 2026-08-01 | **Feature**: `001-auth-multitenancy` | **Base path**: `/api/v1`

All endpoints use the standard error envelope (`{ error: { code, message, details } }`, `SCREAMING_SNAKE_CASE` codes — see `backend/src/core/http/api-error.ts`). All endpoints require authentication unless marked *Public*. Authorization is enforced on the backend on every request incl. scope. Every endpoint is behind `@FeatureGate`. Tenant context is derived server-side from the Keycloak session attribute (never client-supplied). This is the design-time contract; each module's `docs/API.md` is the authoritative per-module contract at implementation time.

Error codes introduced by this feature (in addition to the platform codes in `api-error.ts`): `TENANT_NOT_FOUND`, `TENANT_SUSPENDED`, `ROLE_NOT_FOUND`, `PERMISSION_DENIED`, `PARENT_IDENTITY_EXISTS`, `PARENT_LINK_PENDING`, `PARENT_LINK_REVOKED`, `FEATURE_DISABLED`, `MFA_REQUIRED`, `SESSION_NOT_FOUND`, `AUDIT_EXPORT_TOO_WIDE`, `NOTIFICATION_TEMPLATE_NOT_FOUND`.

## identity — auth, sessions, MFA, SSO, self-service

| Method | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/auth/login` | *Public* | Initiate OIDC sign-in (redirect to Keycloak via frontend Auth.js). |
| GET | `/auth/session` | *Authenticated* | Return current session: user, active tenant, available tenants, mfa-required flag. |
| POST | `/auth/switch-tenant` | *Authenticated* | Switch active tenant (validates membership); writes Keycloak session attribute. Body: `{ tenantId }`. |
| POST | `/auth/logout` | *Authenticated* | End the Keycloak session (terminate this session). |
| GET | `/auth/sessions` | *Authenticated* | List own active sessions. |
| DELETE | `/auth/sessions/:id` | *Authenticated* | Terminate one of own sessions. |
| POST | `/admin/sessions/:userId/terminate` | `identity:session:terminate:any` (School Admin) | Force sign-out a user. |
| POST | `/admin/sessions/terminate-all` | `identity:session:terminate:any` (School Admin) | Force sign-out all tenant users. |
| GET | `/me` | *Authenticated* | Current profile (data-minimized). |
| PATCH | `/me` | *Authenticated* | Update own email/phone. |
| POST | `/me/password` | *Authenticated* | Change password (app-layer tenant policy validation, then Keycloak write). |
| GET | `/me/mfa` | *Authenticated* | List own MFA methods. |
| POST | `/me/mfa` | *Authenticated* | Enrol an MFA method (TOTP / email). |
| DELETE | `/me/mfa/:id` | *Authenticated* | Remove an MFA method. |
| GET | `/auth/mfa-policy` | *Authenticated* | Return required MFA factors for the caller (used by Keycloak conditional flow). |
| POST | `/auth/sso/:provider/link` | *Authenticated* | Link a SSO provider (Google/Microsoft/Apple). |
| POST | `/auth/magic-link` | *Public* (P2) | Request a passwordless email magic link. |
| POST | `/auth/magic-link/verify` | *Public* (P2) | Verify a magic link and sign in. |
| POST | `/auth/biometric/enrol` | *Authenticated* (P2, mobile) | Enrol device biometrics (issue biometric-protected refresh credential). |

## rbac — roles, permissions, scope, custom roles

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/roles` | `rbac:role:read` | List roles available in the tenant (built-in + custom). |
| POST | `/roles` | `rbac:role:create` (School Admin) | Create a custom role. Body: `{ key, displayName, permissions: [...], inherits: [...] }`. |
| GET | `/roles/:id` | `rbac:role:read` | Role detail incl. effective permissions (with inheritance). |
| PATCH | `/roles/:id` | `rbac:role:update` (School Admin) | Adjust a custom role's permissions/inheritance (audited, before/after). |
| GET | `/permissions` | `rbac:permission:read` | List the permission catalog (Module/Feature/Action). |
| POST | `/role-assignments` | `rbac:assignment:manage` (School Admin) | Assign a role to a user with scope. Body: `{ userId, roleId, scope }`. |
| GET | `/role-assignments` | `rbac:assignment:read` (scope-respectd) | List assignments (scoped to caller's visibility). |
| DELETE | `/role-assignments/:id` | `rbac:assignment:manage` (School Admin) | Revoke an assignment (audited). |

## tenant-management — registration, config, platform admin

| Method | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/tenants` | *Public* | Self-register a new tenant. Body: `{ slug, displayName, owner: { email, ... } }`. Returns tenant + owner onboarding. |
| GET | `/tenant` | *Authenticated* | Current tenant's foundation configuration. |
| PUT | `/tenant/configuration` | `tenant:configuration:update` (School Owner/Admin) | Update foundation settings (timezone, currency, languages, moduleActivation, passwordPolicy, mfaPolicy, notificationPolicy). Versioned (P2 rollback). |
| GET | `/tenant/configuration/versions` | `tenant:configuration:read` (P2) | List configuration versions. |
| POST | `/tenant/configuration/rollback/:version` | `tenant:configuration:update` (P2) | Roll back to a prior version. |
| GET | `/tenant/campuses` | `tenant:campus:read` (P2) | List campuses. |
| POST | `/tenant/campuses` | `tenant:campus:manage` (P2) | Add a campus. |
| GET | `/platform/tenants` | `platform:tenant:read` (Platform Super Admin) | List all tenants (audited cross-tenant path). |
| POST | `/platform/tenants/:id/suspend` | `platform:tenant:suspend` (Platform Super Admin) | Suspend a tenant (audited). |
| GET | `/platform/health` | `platform:health:read` (Platform Super Admin) | Platform-wide tenant health. |

## parent-identity — global parent, linking, family, guardians

| Method | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/parents/invite` | `parent:invite` (Admission/School Admin) | School records parent contacts; creates invitation (new identity) or link request (existing). Body: `{ studentId, parent: { verifiedEmail, verifiedPhone, relationship } }`. |
| POST | `/parents/link-requests/:id/accept` | *Authenticated* (parent) | Parent accepts a consent-based school link. |
| POST | `/parents/link-requests/:id/reject` | *Authenticated* (parent) | Parent rejects a link. |
| GET | `/me/parent/children` | *Authenticated* (parent) | Unified children across all linked schools (per-school identity context). **Never reveals other schools to a school.** |
| POST | `/me/parent/guardians` | `parent:guardian:manage` (primary parent) | Invite a guardian with a scope. Body: `{ userIdentity, relationship, scope }`. |
| GET | `/me/parent/guardians` | `parent:guardian:manage` (primary parent) | List guardians and their scopes. |
| PATCH | `/me/parent/guardians/:id` | `parent:guardian:manage` (primary parent) | Update a guardian's scope. |
| DELETE | `/me/parent/guardians/:id` | `parent:guardian:manage` (primary parent) | Revoke a guardian (immediate effect). |

## feature-gating — per-tenant flags

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/tenant/features` | `feature:read` (School Admin) | List feature flags + state for the tenant. |
| PUT | `/tenant/features/:feature` | `feature:toggle` (School Owner/Admin) | Enable/disable a feature for the tenant. Disabled → unreachable via any path. |

## audit-log — records, search, export, streaming

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/audit` | `audit:read` (auditor/admin, scope-respected) | Filter/search audit records (date range, actor, action, target). |
| GET | `/audit/export` | `audit:export` (auditor/admin) | Export filtered records (spreadsheet/document/machine-readable). |
| GET | `/audit/webhook` | `audit:webhook:read` (School Admin) | Get SIEM webhook config. |
| PUT | `/audit/webhook` | `audit:webhook:manage` (School Admin) | Configure SIEM webhook endpoint (per-event delivery via BullMQ). |

## notification-center — feed, preferences, templates

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/notifications` | *Authenticated* | In-app feed (per-user, grouped by child/school where applicable). |
| PATCH | `/notifications/:id/read` | *Authenticated* | Mark read. |
| GET | `/me/notification-preferences` | *Authenticated* | Get preferences (channels, categories, quiet hours, caps). |
| PUT | `/me/notification-preferences` | *Authenticated* | Update preferences. |
| GET | `/notification-templates` | `notification:template:read` (School Admin) | List templates (defaults + overrides). |
| PUT | `/notification-templates/:key` | `notification:template:manage` (School Admin) | Override a template per tenant/locale. |

## Privacy endpoints (P2)

| Method | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/me/export` | *Authenticated* | Data-portability export of own identity data (machine-readable). |
| DELETE | `/me` | *Authenticated* (with verification) | Right-to-erasure deletion of own identity (audited; per policy). |

## Cross-cutting

- **401** `UNAUTHENTICATED` — no/invalid session; **403** `FORBIDDEN` / `PERMISSION_DENIED` / `FEATURE_DISABLED` — authz or feature-gate failure; **404** `..._NOT_FOUND`; **409** `..._CONFLICT` / `PARENT_IDENTITY_EXISTS`; **429** `RATE_LIMITED`; **422** `MFA_REQUIRED`; **502** `EXTERNAL_SERVICE_ERROR` (Keycloak/email/push).
- Audit events are emitted for every state-changing action (login, MFA change, role/permission change, tenant provisioning, session termination, parent link accept/reject, guardian revoke, feature toggle, config update).