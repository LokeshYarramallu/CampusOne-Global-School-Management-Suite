# Implementation Plan: Role-Aware Account Profile

**Branch**: `002-account-profile` | **Date**: 2026-08-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-account-profile/spec.md`

## Summary

One account page per person, shared across all their roles, composed of a **shared core** (identity, contact details, credentials, sessions, security activity, preferences) plus **exactly one role panel** chosen by the role they are currently acting in.

Phase 0 research turned up a blocker that reorders the work: **the RLS backstop promised by ADR 0003 is inert, and tenant context is never set**. The connected database role carries `BYPASSRLS`, and nothing in the application ever issues `SET LOCAL app.tenant_id`. This has gone unnoticed only because no tenant exists yet. This feature is the first to seed role assignments and read tenant-owned rows, so it hits both defects immediately. Tenant context propagation therefore becomes the first substantive work, ahead of anything user-visible.

Photo upload and email change are deferred (no storage adapter, no notification adapter); both are rendered honestly rather than half-built. See [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.7 (strict) throughout

**Primary Dependencies**: NestJS 11 (Express adapter), Prisma 7 + `@prisma/adapter-pg`, `class-validator`/`class-transformer`, Next.js 16 (App Router), React 19, Tailwind CSS v4. No new runtime dependency is introduced by this feature.

**Storage**: PostgreSQL (Neon). Shared schema with `tenant_id` discriminator and RLS backstop per [ADR 0003](../../docs/decisions/0003-tenant-isolation-shared-schema.md).

**Testing**: Jest (backend unit + e2e), Vitest + Testing Library + jsdom (frontend)

**Target Platform**: Web (server-rendered Next.js against a NestJS API). The unified mobile app is not in this repository.

**Project Type**: Web application — separate `frontend/` and `backend/`, both feature-module based

**Performance Goals**: API p95 < 200 ms (AGENTS.md). Account page interactive well inside SC-001's one-minute task target.

**Constraints**: WCAG 2.1 AA (FR-035); no personal data in logs, URLs, or error messages; tenant context server-derived only; `SET LOCAL` requires an interactive transaction, which constrains how tenant-scoped repository calls are written.

**Scale/Scope**: 7 roles, ~6 new tables, ~8 endpoints, 1 new frontend route. 38 functional requirements, of which 4 are explicitly deferred by research.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Initial | Post-design | Notes |
|---|---|---|---|
| I. Spec-Driven | PASS | PASS | Spec written and validated before this plan; no technology named in the spec |
| II. Feature-Gated (NON-NEGOTIABLE) | **JUSTIFIED DEVIATION** | **JUSTIFIED DEVIATION** | FR-037 exempts the shared core as authentication foundation; FR-038 gates every role panel. Recorded in Complexity Tracking; **requires an ADR before the gating is built** (Principle VII) |
| III. Tenant Isolation (NON-NEGOTIABLE) | **FAIL** | PASS after Phase A | Research R1: RLS inert, tenant context never set. Phase A exists to close this. No tenant-owned read may ship before it |
| IV. Module-Bounded | PASS | PASS | New `profile` and `tenant` backend modules; new `profile` frontend module. Shared UI promoted to `src/shared` only once it has two consumers |
| V. Secure & Private by Design | PASS | PASS | FR-012 (no raw IP), FR-024/025 (unoffered fields rejected), FR-026/028 (scope, session-derived subject), FR-029 (parent privacy). Photo upload deferred rather than half-secured |
| VI. Test-Including | PASS | PASS | Tenant isolation and parent cross-school privacy each get dedicated tests, not general ones |
| VII. Safe Evolution | PASS | PASS | Single migration head; forward-only; every tenant-owned table gets `tenant_id` + leading index in its creating migration. Two ADRs required (below) |

**ADRs this feature must produce**

1. **Foundation surfaces are exempt from per-tenant gating** — justifies the FR-037 deviation from a NON-NEGOTIABLE principle.
2. **Tenant context propagation mechanism** — closes the open item ADR 0003 deferred, and records the non-bypassing-role requirement.

## Project Structure

### Documentation (this feature)

```text
specs/002-account-profile/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
backend/
├── prisma/
│   ├── migrations/<ts>_account_profile/   # 1 migration: tables + indexes + RLS policies
│   └── seed.ts                            # two tenants, one user per role in each
└── src/
    ├── core/
    │   ├── auth/
    │   │   ├── require-permission.guard.ts    # @RequirePermission + scope resolution
    │   │   └── tenant-context.ts              # server-derived active tenant
    │   └── config/                            # + storage/notification absence flags
    ├── infrastructure/prisma/
    │   ├── prisma.service.ts                  # + startup BYPASSRLS check
    │   └── tenant-scoped.client.ts            # SET LOCAL app.tenant_id in a transaction
    └── modules/
        ├── tenant/            # minimal, read-only: resolve a school, expose context
        ├── rbac/              # + permission-evaluation service beside role-catalog.ts
        └── profile/           # controller, service, repositories, dto, docs, tests

frontend/
├── src/
│   ├── app/profile/
│   │   ├── page.tsx
│   │   └── loading.tsx                        # skeleton mirroring the real layout
│   ├── proxy.ts                               # + /profile in the matcher
│   ├── shared/components/                     # TextField, StatusNotice promoted here
│   └── modules/profile/
│       ├── components/
│       │   ├── ProfileShell.tsx               # shared core
│       │   └── panels/                        # one component per role
│       ├── services/ schemas/ types/ utils/
│       ├── constants.ts  docs/  tests/
│       └── index.ts
```

**Structure Decision**: Web application layout, matching the existing `identity` module on both sides. `profile` is a new feature module on each side; `tenant` is a new backend module deliberately limited to read-only context resolution, because school provisioning belongs to a separate feature. Tenant-context plumbing lives in `core/` and `infrastructure/` rather than in a feature module, since every future module depends on it.

## Implementation Phases

Ordered by dependency. Phases A and B produce no user-visible screen.

| Phase | Work | Gate |
|---|---|---|
| **A. Tenant context** | `SET LOCAL app.tenant_id` inside an interactive transaction; non-bypassing role documented; startup check warning when the connected role carries `BYPASSRLS`; ADR. Regression test proving a tenant-owned query returns nothing without context | Constitution III moves FAIL → PASS |
| **B. Permission + scope** | `@RequirePermission` and the `self` / `linked` / `assigned` / `school` / `platform` strategies in `rbac` | Scope enforced in one place |
| **C. Data + seed** | One migration: identity-level profile and preferences; tenant-owned staff record, learner record, teaching assignment. Every tenant-owned table gets `tenant_id`, a leading index, and an RLS policy in the same migration. Seed two tenants × seven roles | Fresh and existing DB both migrate |
| **D. Backend profile module** | Endpoints per [contracts/](./contracts/); role panel resolved from the active role; parent cross-school guard as an explicitly named repository method | Contract tests pass |
| **E. Shared UI promotion** | Move `TextField`, `StatusNotice`, field tokens to `src/shared/components` with their tests — its own step, not tangled into the profile UI | Identity module still green |
| **F. Frontend profile module** | Shared core plus one panel component per role; empty, loading, and error states defined before build | Accessibility parity with sign-in |
| **G. Verify** | Isolation, parent privacy, role separation, scope; docs; full gate on both apps | Definition of Done |

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| **Principle II** — shared core not behind a per-tenant gate (FR-037) | Gating exists so a school can choose which capabilities it offers, not so it can revoke its own users' access to their own credentials. A school able to disable password change and session review creates a security problem, not a configuration option | *Gate everything, default on*: leaves a switch that locks users out of their credentials when misconfigured. *Gate with core pinned on*: a gate that cannot be closed is not a gate, and encodes the exception in a default where it is easy to change by accident. The exemption is clearer stated in architecture than hidden in a default value |
| **Phase A** — infrastructure work inside a user-facing feature | The RLS backstop is inert and tenant context absent. This feature is the first to read tenant-owned rows, so it cannot ship correctly without it. Deferring means shipping a feature that violates a NON-NEGOTIABLE principle | *Do it as its own feature first*: identical work, later, with this feature blocked meanwhile. *Rely on repository `where` clauses alone*: contradicts ADR 0003 and removes defense-in-depth exactly where PRD Risk #9 is rated Critical |
| **Two deferred spec requirements** (photo upload, email change) | Each depends on an infrastructure adapter that does not exist — storage (PRD §5.8) and notification (PRD §5.9). Both are subsystems, not fields | *Build a local-disk storage adapter*: fails on multi-instance deployment and would be rewritten. *Ship a confirmation flow whose email never sends*: worse than an honest read-only field |
