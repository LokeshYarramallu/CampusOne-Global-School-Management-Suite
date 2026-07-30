# Avunta Constitution

Governing principles for all spec-driven development on the Unified School Management Platform (USMP). The [PRD](../../PRD.md) is the source of truth for product behaviour; [AGENTS.md](../../AGENTS.md) is the runtime engineering guidance that elaborates these principles. Specs and plans must comply with this constitution.

## Core Principles

### I. Spec-Driven

Every full feature starts as a Spec Kit spec describing **what and why only** — no languages, frameworks, APIs, or endpoint definitions — before `/speckit-plan`, `/speckit-tasks`, and implementation. Technology choices belong to the plan. Ad-hoc tasks (small fixes, tweaks, refactors within an existing feature that do not change behaviour, contracts, or data shape) are exempt.

### II. Feature-Gated (NON-NEGOTIABLE)

Every feature is behind a per-tenant (school/organization) feature gate enforced on the backend. A disabled feature for a tenant is unreachable through any endpoint, job, or UI path — not merely hidden in the UI. Core capabilities are on by default; optional ones are off until a tenant enables them.

### III. Tenant Isolation (NON-NEGOTIABLE)

Cross-tenant data exposure is rated **Critical**. Every tenant-owned table carries a tenant identifier with an index leading with it; every query against it is scoped by tenant. Tenant context is derived server-side from the authenticated session — never from request body, query, header, or any client input. Every module that persists tenant data ships a test proving tenant A cannot read or mutate tenant B's records. The unified parent identity is the one deliberate cross-tenant entity and must be guarded explicitly.

### IV. Module-Bounded

Features are independent, feature-based modules (grouped by feature, not by technical type), named after the PRD's modules in `kebab-case`. Each module exposes a minimal public API (frontend `index.ts`; backend `@Module()` `exports`) and depends only on other modules' public APIs — never on internals, private state, or private methods. No deep imports into another module's internals; no circular dependencies.

### V. Secure & Private by Design

Authorization is enforced on the backend on every request, including the **scope** dimension (`Module → Feature → Action → Scope`); frontend role checks are presentation only. Never trust client-provided IDs, roles, or ownership. Apply data minimization; never put personal data, secrets, tokens, or credentials in logs, error messages, analytics, or URLs. The platform holds children's data under FERPA, GDPR, and COPPA — deletion and export paths are real, not stubbed.

### VI. Test-Including

Every module ships tests: primary success flow, input validation, error handling, authorization with scope, **tenant isolation**, key edge cases, state transitions, external-API failure, and transaction behaviour where applicable. Tests are order-independent, use isolated fixtures, never touch production data, and are never deleted to make the suite pass. A bug fix includes a regression test when practical.

### VII. Safe Evolution

Schema changes go only through Prisma migrations (`backend/prisma/migrations/`, single head, forward-only, tenant-indexed). Never edit an already-applied migration — create a corrective one. Do not introduce a competing framework, ORM, state library, or HTTP client, or resolve an Open Decision, without a recorded ADR in `docs/decisions/`.

## Architectural Invariants & Security

- **Fixed stack:** Next.js 16 / React 19 / TypeScript (strict) on the frontend; NestJS 11 / TypeScript (strict) on the backend; PostgreSQL + Prisma ORM. A competing choice requires an ADR.
- **API contract:** all endpoints under `/api/v1`; one standard error envelope; `SCREAMING_SNAKE_CASE` error codes that are part of the contract; ORM models never returned directly as API contracts.
- **External integrations** (payments, messaging, tracking, storage, identity) are isolated behind adapters in `backend/src/infrastructure/` with timeouts, retry/backoff, and multi-provider fallback; business modules never depend on provider SDKs directly.
- **Observability:** structured logging with request id, tenant id, module, operation, duration, error code; instrument PRD-committed flows numerically (attendance time, notification latency ≤ 30s, API p95 < 200ms).
- **File uploads** validate type/size, never execute, and are stored under tenant-scoped paths with permission-mediated access — never by unguessable URL alone.

## Development Workflow & Quality Gates

- **Spec Kit order:** `/speckit-constitution` (this file) → `/speckit-specify` → `/speckit-clarify` (optional) → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`. The active feature directory is tracked in `.specify/feature.json`.
- **Definition of Done:** the feature works end-to-end; code is in the correct module with boundaries preserved; input validation, backend authorization (with scope), tenant isolation (proven by test), and the standard error envelope are in place; unit + relevant integration/API tests added; module/API docs updated; migrations conflict-free; lint, typecheck, tests, and build pass; no secrets or temporary debugging code committed; no duplicate implementation introduced.
- **Validation before declaring done:** run the frontend and backend lint/typecheck/test/build commands and verify fresh + existing migrations, frontend build, backend start, and that contracts match frontend usage. Never claim a task is fully tested when the tests were not executed; if a command cannot be run, state which, why, and what remains unverified.

## Governance

This constitution supersedes informal practices and is the authority checked by specs and plans. `/speckit-plan` must not contradict these invariants — e.g., no client-side-only gating, no unscoped tenant queries, no ORM models as API contracts, no schema change without a migration. Complexity beyond these principles must be justified. Amendments require a recorded change with rationale and a migration note for affected in-flight specs; update the version and Last Amended date below.

**Version**: 1.0.0 | **Ratified**: 2026-07-30 | **Last Amended**: 2026-07-30