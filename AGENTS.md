# AGENTS.md

## Purpose
This repository implements **CampusOne** — the Unified School Management Platform (USMP) described in [PRD.md](PRD.md): a multi-tenant, enterprise-grade SaaS product for schools, built as a modular, maintainable, testable, production-oriented system with separate frontend and backend codebases, both feature-based.
**The PRD is the source of truth for product behaviour. This file is the source of truth for how that behaviour is built.**

## Stack
Stack selection is intentionally *not* specified by the PRD (Appendix B defers it to the HLD). These are this repo's actual choices. Do not introduce a competing framework, ORM, state library, or HTTP client without a decision recorded in `docs/`.
| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript (strict) |
| Frontend styling / tests | Tailwind CSS v4 / Vitest + Testing Library + jsdom |
| Backend | NestJS 11, TypeScript (strict), Express adapter |
| Backend validation | `class-validator` + `class-transformer` via global `ValidationPipe` |
| Backend config / tests | `@nestjs/config` (fail-fast) / Jest (unit + e2e) |
| Database / ORM | PostgreSQL with Prisma ORM |

### Open Decisions
Do not silently pick one while implementing a feature — raise it, decide it, record it in `docs/`. (Resolved: database/ORM = PostgreSQL + Prisma — see [docs/decisions/0001-postgres-prisma.md](docs/decisions/0001-postgres-prisma.md); auth provider = self-hosted Keycloak — see [docs/decisions/0002-keycloak-identity-provider.md](docs/decisions/0002-keycloak-identity-provider.md); tenant isolation = shared schema + discriminator with RLS backstop — see [docs/decisions/0003-tenant-isolation-shared-schema.md](docs/decisions/0003-tenant-isolation-shared-schema.md).)
1. ~~**Tenant isolation strategy** (shared schema + discriminator vs. schema-per-tenant vs. db-per-tenant). PRD Risk #9 rates cross-tenant exposure **Critical**; PRD §12.2 requires per-tenant data residency. Decide before the first persisted module.~~ **Resolved 2026-08-01**: shared schema + `tenant_id` discriminator with PostgreSQL RLS backstop — see [ADR 0003](docs/decisions/0003-tenant-isolation-shared-schema.md).
2. ~~**Auth provider** (self-hosted vs. managed IdP). PRD §5.1 requires SSO, MFA, biometric sign-in.~~ **Resolved 2026-08-01**: self-hosted Keycloak (single shared realm, branded headless login, OIDC) — see [ADR 0002](docs/decisions/0002-keycloak-identity-provider.md).
3. **Mobile application** (PRD §6 requires exactly one unified app for all roles). Not in this repo yet.

## Core Engineering Principles
1. Build features as independent modules; keep frontend and backend responsibilities separated.
2. Prefer reusable abstractions only when there is genuine shared use.
3. Every feature includes tests and documentation.
4. Schema changes go only through safe, sequential migrations.
5. No duplicate models, services, endpoints, schemas, utilities, or migrations.
6. Don't modify unrelated modules while implementing a feature; preserve existing behaviour unless the task requires changing it.
7. Prioritize correctness, readability, and maintainability over unnecessary abstraction.
8. **Every feature is behind a feature gate.** No feature is unconditionally available — each is toggleable per tenant (school/organization), so a feature can be enabled for one organization and disabled for another. Gate checks are enforced on the backend (never client-side) and are part of the feature's module from the first commit (PRD §5.2 module activation, §5.7 controlled rollout).

## Spec-Driven Development
Spec Kit is installed in this repo: the `specify` CLI, `.specify/` (templates + constitution), and the `/speckit-*` skills in `.claude/skills/`. **Full features are spec-first; ad-hoc tasks are exempt.** A task is a full feature if it changes product behaviour, a contract, or a data shape; small fixes, tweaks, and refactors within an existing feature are ad-hoc.
Run the skills in order: `/speckit-constitution` (once — base the principles on this file) → `/speckit-specify` (creates `specs/NNN-<short-name>/spec.md` + a quality checklist) → `/speckit-clarify` (optional) → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`. The active feature directory is tracked in `.specify/feature.json`.
Specs describe **what and why only** — no languages, frameworks, libraries, APIs, or endpoint definitions; the spec quality checklist rejects implementation details. Technology choices (stack, Prisma models, endpoints) belong to `/speckit-plan`, not the spec. If a `/speckit-*` skill was just installed, restart Claude Code in this directory so the skills load before invoking them.

## Feature-Based Modular Architecture
Every major feature lives in its own module, named after the PRD's module names, in `kebab-case` (e.g. `attendance/`, `fee-management/`, `student-information/`, `examination/`, `parent-identity/`). A module contains everything primarily owned by that feature. Group code by feature, not by technical type.
Frontend modules: `components/` (Server Components by default), `hooks/`, `services/`, `stores/`, `types/`, `schemas/`, `utils/`, `tests/`, `docs/`, `constants.ts`, `index.ts` (public API) — create only the folders the module needs. Backend modules: `<name>.module.ts` (composition root; `exports` is the public API), `<name>.controller.ts` (thin), `<name>.service.ts`, `domain/`, `repositories/`, `dto/`, `schemas/`, `events/`, `tests/`, `docs/`.

### Frontend Rules
- `src/app/` holds routing only — thin, no business logic; render a module component.
- Shared UI in `src/shared/components`; shared hooks in `src/shared/hooks`.
- API calls live only in a module's `services/` and go through `src/core/http/apiClient.ts`. Never `fetch` from a component.
- Validate API responses at the module boundary using `schemas/`.
- Import only from a module's root, not its internals; modules expose their API via `index.ts`.
- Default to Server Components; add `"use client"` only where needed, pushed as far down the tree as possible.
- Never read `process.env` outside `src/core/config/env.ts`; never put secrets in `NEXT_PUBLIC_*`.
- Define empty, loading, and error states for every list/dashboard/detail view before build (PRD §11).

### Backend Rules
- Controllers stay thin: validate, delegate, map to response. Business logic lives in services/domain.
- Database access only through repositories. Map ORM models to explicit response types; no business logic in models.
- Request DTOs use `class-validator`; global `ValidationPipe` runs `whitelist: true`, `forbidNonWhitelisted: true`.
- No cross-module imports of internals; communicate via exported services, events, or interfaces. No circular deps — don't use `forwardRef()` to paper over boundary violations.
- Shared infrastructure in `backend/src/infrastructure`; business-neutral utils in `backend/src/shared`.
- Never read `process.env` directly; inject `ConfigService` or typed config from `src/core/config`.
- Register every new module in `app.module.ts`; expose `docs/README.md` and, if it has endpoints, `docs/API.md`.

## Multi-Tenancy Rules
Cross-tenant data exposure is rated **Critical** in the PRD (Risk #9). Treat tenant isolation as an architectural invariant.
- Every tenant-owned table carries a tenant identifier; every query against it is scoped by it. No exceptions for "internal"/"admin" queries.
- Tenant context is derived server-side from the authenticated session — never from request body, query, header, or any client input.
- A repo method that returns rows across tenants must be named explicitly (e.g. `findAcrossTenantsForPlatformAdmin`) and reachable only by an audited Platform Super Admin path.
- The unified parent identity (PRD §4.2) is the one deliberate cross-tenant entity. A school must never enumerate which other schools a parent is linked to. Guard this explicitly.
- Every module persisting tenant data includes a test proving tenant A cannot read or mutate tenant B's records.
- Cache keys, queue payloads, storage paths, and search indexes must include the tenant identifier — a collision is a cross-tenant leak.
- Feature gates are evaluated per tenant on the backend: a disabled feature for a tenant is unreachable through any endpoint, job, or UI path — not merely hidden in the UI (see Core Principle 8).

## Authorization Rules
- Authorization is enforced on the backend, on every request. Frontend role checks are presentation only.
- Never trust client-provided IDs, roles, scores, permissions, or ownership.
- PRD §3.6: RBAC is `Module → Feature → Action → Scope`, 400+ permissions. The initial implementation seeds seven roles; specialized roles can be added later. Checks must include **scope** ("a teacher may read attendance *for their assigned classes*").
- One person may hold multiple roles across schools under one identity. Never merge permissions across role views — Parent View gets exactly the Parent set, never a union with Teacher.
- Every permission change is written to the audit log with actor, timestamp, before/after state.

## Student Data Privacy
The platform holds children's personal, health, academic, and family financial data under FERPA, GDPR, COPPA (PRD §12).
- Data minimization: return only the fields the caller needs.
- Personal data never appears in logs, error messages, analytics events, or URL query strings.
- Deletion and export paths are real, not stubbed (PRD §12.1).
- Retention is configurable per tenant; don't hardcode retention periods.

## Module Boundaries
Each module defines a clear public interface (frontend: `index.ts`; backend: `exports` of `@Module()`). Depend only on that public API — never on internals, private helpers, private state, or private service methods. Expose only the minimum; don't import deeply into another module without a documented architectural reason.

## Tests
Each module has its own `tests` folder. At minimum test: primary success flow, input validation, error handling, authorization including scope, **tenant isolation** (required for every module touching tenant data), key edge cases, state transitions, external-API failure, and transaction behaviour where applicable. Tests are order-independent, use isolated fixtures/mocks/factories, never touch production data, and are never deleted to make the suite pass. A bug fix includes a regression test when practical.
```
frontend:  npm run lint | npm run typecheck | npm run test | npm run build
backend:   npm run lint | npm run typecheck | npm run test | npm run test:e2e | npm run build
```

## Module Documentation
Every module has a `docs` folder with `README.md`, plus `API.md` for backend modules exposing endpoints. `README.md` covers purpose, responsibilities, what it owns and doesn't, public interfaces, dependencies, main flows, key decisions, testing, limitations. `API.md` documents each endpoint: path, method, required permission, request/response schemas, error responses, worked examples. Update docs in the same change that alters behaviour, contracts, or architecture.

## Database Migration Rules
All schema changes go through Prisma migrations (`backend/prisma/migrations/`, single migration head). No direct manual changes to shared/staging/prod databases. Before creating one: inspect existing migrations and the current `schema.prisma`; confirm the table/column/index/constraint/enum doesn't already exist and no other migration implements the same change; confirm it's based on the latest head; check for parallel branches. Each migration is safe on a populated database, preserves data unless removal is explicit, and runs in a transaction where supported. Any new tenant-owned table must include its tenant identifier column and an index leading with it in the same migration — a tenant-owned table without a tenant-scoped index is an isolation and performance defect. Don't create duplicate migrations, don't edit an already-applied migration (create a corrective one), and don't rename/remove/alter columns without checking prod data, usage, API deps, indexes, FKs, and rollback. Keep large data migrations separate from schema changes: idempotent, batched, retryable, observable, lock-avoiding.

## API Contract Rules
Every endpoint defines request type, response type, validation rules, error structure, and auth requirements. All endpoints live under `/api/v1`. Errors use one envelope produced by the global exception filter:
```json
{ "error": { "code": "STUDENT_NOT_FOUND", "message": "Student was not found", "details": null } }
```
Error codes are `SCREAMING_SNAKE_CASE` and stable (part of the contract). Never return arbitrary error shapes; never leak stack traces or internal ids in `message`. Document breaking changes explicitly. Don't duplicate backend response types across frontend modules — prefer OpenAPI generation or a shared contract package.

## Shared Code Rules
Code moves into a shared folder only when used by ≥2 modules, not feature-specific, with a clear purpose, and without creating hidden coupling. No generic `utils/helpers.ts`, `utils/common.ts`, `utils/misc.ts` — use focused files like `shared/currency/formatFeeAmount.ts`. Shared code with meaningful logic includes tests and docs.

## Configuration and Environment Variables
Env vars are documented, validated at startup, grouped by responsibility, never hardcoded, never committed with real secrets. Backend: `backend/src/core/config/` (fail-fast, exit with a clear message on missing/malformed). Frontend: `frontend/src/core/config/env.ts` (the only place `process.env` is read). Both ship a committed `.env.example` with safe placeholders; `.env`/`.env.local` are gitignored. When you add a variable, update `.env.example`, the validation schema, and the app README in the same change.

## External Service Integration
Every external integration is isolated behind a service/adapter in `backend/src/infrastructure/`. Business modules never depend directly on provider SDKs. Prefer `PaymentService`, `NotificationService`, `StorageService`, `LocationService`. External calls include timeouts, error handling, retry-with-backoff, structured logging, rate-limit handling, and defined fallback. PRD Risk #11 requires multi-provider fallback for payments, messaging, tracking — design adapters so a second provider can be added without touching business modules. Never log secrets, tokens, credentials, or student data.

## Logging, Errors & Security
- Structured logging: request id, tenant id, module, operation, duration, error code; user id only where appropriate and never alongside sensitive data. No `console.log("here")`. Never log passwords, tokens, auth headers, student data, or private messages. Instrument PRD-committed flows numerically: attendance submission time, notification latency (≤30s), API p95 (<200ms), notification delivery success rate.
- Errors are explicit, typed, logged at the correct layer, converted to the standard envelope; never silently ignored, never leak stack traces to users. Frontend errors give a clear message, retry path, and fallback UI.
- Every feature considers auth, input validation, output sanitization, rate limiting, upload restrictions, secret management, CORS, injection, and tenant boundaries. File uploads validate type/size, never execute, and are stored under tenant-scoped paths with permission-mediated access — never by unguessable URL alone.

## Naming Conventions
Use domain names from the PRD glossary (§17): `tenant`, `unified parent identity`, `role view`, `guardian`, `academic term`, `fee installment`, `admission pipeline`. Avoid `data`, `temp`, `helper`, `manager2`, `misc`.
| Thing | Convention | Example |
|---|---|---|
| Directories | kebab-case | `fee-management/` |
| React components | PascalCase | `AttendanceRoster.tsx` |
| Hooks | camelCase, `use` prefix | `useAttendanceRoster.ts` |
| NestJS files | kebab-case, dotted suffix | `attendance.service.ts` |
| Classes | PascalCase | `AttendanceService` |
| DB tables/columns | snake_case | `fee_installment` |
| Error codes | SCREAMING_SNAKE_CASE | `FEE_ALREADY_PAID` |

## Do / Don't and Finishing a Task
**Do:** spec full features via Spec Kit (`/speckit-specify` → `/speckit-plan` → `/speckit-tasks`) before coding; place code in the correct module; preserve module boundaries; enforce backend authorization incl. scope; enforce and test tenant isolation; return errors in the standard envelope; add unit + relevant integration/API tests; update module/API docs; keep migrations conflict-free; verify the full user flow. Before declaring done, run lint/typecheck/tests/build/migrations and verify fresh + existing DB migrations, frontend build, backend start, and that contracts match frontend usage.
**Don't:** put features in one huge file; create unrelated global util files; duplicate services/schemas; put business logic in routes/controllers/UI; access the DB from frontend; query tenant data without a tenant scope; derive tenant/role from client input; add schema changes without migrations or create conflicting heads; edit applied migrations; commit secrets or put them in `NEXT_PUBLIC_*`; ignore failing tests or remove tests to pass; catch exceptions without handling/logging; log student data; add deps without need; modify unrelated modules mid-task; leave undocumented public APIs or temp mocks in production paths.
Never claim a task is fully tested when tests were not executed; if a command can't be run, state which, why, and what remains unverified.
