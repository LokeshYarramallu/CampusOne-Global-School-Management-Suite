# Implementation Plan: Authentication, Authorization & Multi-Tenant Isolation

**Branch**: `001-auth-multitenancy` | **Date**: 2026-08-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-auth-multitenancy/spec.md`

## Summary

This feature is the platform foundation: authentication via a self-hosted Keycloak IdP (OIDC, single shared realm, branded headless login — ADR 0002), authorization via a DB-stored RBAC catalog (Module → Feature → Action → Scope), multi-tenant isolation via a shared PostgreSQL schema with a `tenant_id` discriminator and RLS backstop (ADR 0003), the cross-tenant unified parent identity, per-tenant backend-enforced feature gating, a full notification center (Redis + BullMQ; provider adapters deferred to a tasks-stage ADR), and a tamper-evident append-only audit log with hash chaining and per-event webhook SIEM streaming. It is decomposed into seven backend modules with matching frontend modules. Delivery is priority-tiered: P1 web-first foundation, P2 mobile/multi-role/multi-campus/magic-link/identity-deletion.

Technical decisions were made interactively with the user (no silent defaults). Open Decisions #1 and #2 are now resolved by ADRs 0003 and 0002.

## Technical Context

**Language/Version**: TypeScript (strict) — NestJS 11 backend, Next.js 16 (App Router) / React 19 frontend.

**Primary Dependencies**:
- Backend: NestJS 11 (Express adapter), `@nestjs/config` (fail-fast), `class-validator` + `class-transformer` (global `ValidationPipe`, `whitelist`/`forbidNonWhitelisted`), Prisma ORM (**to install** — not yet in the repo), `@keycloak/keycloak-admin-client` (identity adapter), `keycloak-js`/JWKS validation, BullMQ + ioredis (queue), Handlebars (notification templates).
- Frontend: Next.js 16, React 19, Auth.js (next-auth) v5 with Keycloak provider, Tailwind CSS v4, Vitest + Testing Library + jsdom.
- External services (self-hosted): Keycloak (OIDC IdP), PostgreSQL, Redis. Email/push **providers** are deferred to a tasks-stage ADR; only adapter interfaces are defined here.

**Storage**: PostgreSQL — single shared schema, `tenant_id` discriminator on every tenant-owned table, leading-column `tenant_id` indexes, PostgreSQL RLS backstop (ADR 0003). Redis — BullMQ queue for notification delivery + audit webhook delivery. Migrations live in `backend/prisma/migrations/` (single head) — the existing empty `backend/migrations/` placeholder is superseded.

**Testing**: Jest (backend unit + e2e), Vitest + Testing Library + jsdom (frontend). Every module ships a tenant-isolation test (constitution Principle III/VI).

**Target Platform**: Node.js server (backend); web browser (frontend, P1); mobile (P2, depends on the unified mobile app — Open Decision #3, not in repo).

**Project Type**: web-service (frontend + backend), feature-based modular monolith.

**Performance Goals**: API p95 < 200 ms (PRD §10); web sign-in with MFA < 10 s; mobile biometric sign-in < 3 s (P2); notification delivery success ≥ 99.5% within SLA; audit export for any date range < 5 min; permission change visible in audit < 1 min; tenant self-registration + foundation config < 30 min; parent additional-school link < 1 min.

**Constraints**: Cross-tenant exposure is **Critical** (PRD Risk #9) — tenant context server-derived only, never from client input; FERPA/GDPR/COPPA — no personal data in logs/errors/URLs, data minimization, real deletion/export paths; all endpoints under `/api/v1`; one standard error envelope (`AppException`); ORM models never returned as API contracts; every feature behind a per-tenant backend gate.

**Scale/Scope**: Thousands of tenants; 19 roles + custom roles; 400+ permissions; 7 backend modules + 7 frontend modules.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|---|---|---|
| I. Spec-Driven | ✅ Pass | Spec written and validated before this plan; plan holds tech choices only. |
| II. Feature-Gated (NON-NEGOTIABLE) | ✅ Pass | `feature-gating` module is part of this feature; every endpoint guarded by `@FeatureGate`; disabled feature unreachable via any path. |
| III. Tenant Isolation (NON-NEGOTIABLE) | ✅ Pass | ADR 0003: shared schema + `tenant_id` + leading indexes + RLS backstop; active tenant from Keycloak session attribute (server-side); per-module isolation tests required. |
| IV. Module-Bounded | ✅ Pass | 7 backend modules, each with minimal `exports` public API; no cross-module internal imports; communication via exported services/events. |
| V. Secure & Private by Design | ✅ Pass | Backend authorization on every request incl. scope; client IDs/roles never trusted; data minimization; no PII in logs; deletion/export paths real. |
| VI. Test-Including | ✅ Pass | Tests required for success flow, validation, errors, authz+scope, tenant isolation, edge cases, external-API failure, transactions. |
| VII. Safe Evolution | ✅ Pass | Prisma migrations (to install), single head, forward-only, tenant-indexed; ADRs 0002/0003 record the Open Decisions resolved. |

**Post-design re-check**: performed after Phase 1 — data model enforces `tenant_id` + leading indexes + RLS on every tenant-owned table; contracts are under `/api/v1` with the standard envelope; no ORM models leak as contracts; feature gates guard endpoints. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-auth-multitenancy/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API contracts per module)
└── tasks.md             # /speckit-tasks output (not created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
├── prisma/
│   ├── schema.prisma              # NEW — Prisma source of truth (ADR 0001)
│   └── migrations/                # NEW — single-head, forward-only, tenant-indexed
├── src/
│   ├── core/
│   │   ├── config/                # existing — add KEYCLOAK/REDIS/DATABASE_URL vars
│   │   ├── http/                  # existing — AllExceptionsFilter, AppException (reused)
│   │   ├── auth/                  # NEW — OIDC token validation, JwtAuthGuard, TenantContext guard/middleware, PermissionsGuard, scope helpers
│   │   └── tenant/                # NEW — TenantContext service (reads Keycloak session attr), RLS session-var setter
│   ├── infrastructure/
│   │   ├── prisma/                # NEW — PrismaService (wraps PrismaClient), PrismaModule
│   │   ├── keycloak/              # NEW — KeycloakIdentityAdapter (admin client + JWKS), implements IdentityProvider interface
│   │   ├── queue/                 # NEW — BullMQ queue registration (notification delivery, audit webhook)
│   │   ├── email/                 # NEW — EmailProvider interface + (deferred) adapters
│   │   └── push/                  # NEW — PushProvider interface + (deferred) adapters
│   ├── shared/                    # existing — business-neutral utils (add audit hash-chain helper, template render helper)
│   └── modules/
│       ├── health/                # existing
│       ├── identity/              # NEW — auth, sessions (Keycloak-rooted), MFA policy, SSO, self-service credentials, biometrics(P2)/magic-link(P2)
│       ├── rbac/                  # NEW — roles (19 + custom), DB-stored permission catalog, scope evaluation, inheritance, permission-change audit events
│       ├── tenant-management/     # NEW — self-registration, foundation config, platform-admin tenant mgmt, multi-campus(P2), config versioning(P2)
│       ├── parent-identity/       # NEW — global parent identity, invitation + consent-link flows, family structures, guardian scope + revocation, privacy boundary
│       ├── feature-gating/        # NEW — per-tenant feature flags, backend evaluation, @FeatureGate guard
│       ├── audit-log/             # NEW — append-only + hash-chained records, 7-yr retention, filter/search/export, per-event webhook SIEM streaming
│       └── notification-center/   # NEW — templates (Handlebars) + localization, channels (email/push/in-app), delivery tracking + retry/fallback (BullMQ), preferences + quiet hours + caps, emergency override
└── test/                          # e2e (jest-e2e) incl. tenant-isolation + authz-scope e2e

frontend/
├── src/
│   ├── core/
│   │   ├── config/env.ts          # existing — add NEXT_PUBLIC_KEYCLOAK/AUTH vars (no secrets in NEXT_PUBLIC_*)
│   │   ├── http/apiClient.ts      # existing — auth-aware API client
│   │   └── auth/                  # NEW — Auth.js v5 config (Keycloak provider), session, active-tenant switching
│   ├── app/                       # existing — routing only (thin): /login, /callback, /dashboard, /admin/*
│   ├── shared/                    # existing — components/hooks
│   └── modules/
│       ├── identity/              # NEW — login UI, session management, self-service credentials/MFA
│       ├── rbac/                  # NEW — role/permission/scope admin UI, custom-role editor
│       ├── tenant-management/     # NEW — self-registration, foundation config wizard, platform-admin console
│       ├── parent-identity/       # NEW — parent onboarding, school-link acceptance, family/guardian scope management
│       ├── feature-gating/        # NEW — feature-flag admin UI (per-tenant toggles)
│       ├── audit-log/             # NEW — audit search/filter/export UI
│       └── notification-center/   # NEW — in-app feed, preferences, quiet hours
└── tests/
```

**Structure Decision**: Feature-based modular monolith per AGENTS.md — 7 backend NestJS modules + 7 matching frontend modules, each with a minimal public API (`exports` / `index.ts`). Shared infrastructure (Prisma, Keycloak adapter, queue, email/push adapters) lives in `backend/src/infrastructure/`. Cross-cutting auth/tenant guards live in `backend/src/core/auth` and `backend/src/core/tenant`. Modules communicate only via exported services/events; no internal imports, no `forwardRef`.

## Complexity Tracking

> No constitution violations to justify. The 7-module split and the adapter/queue infrastructure are justified by AGENTS.md's feature-based architecture and external-integration rules, not by rule violations.