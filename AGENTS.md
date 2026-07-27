# AGENTS.md

## Purpose

This repository implements **Avunta** — the Unified School Management Platform (USMP) described in [PRD.pdf](PRD.pdf). It is a multi-tenant, enterprise-grade SaaS product for schools.

It must be developed as a modular, maintainable, testable, and production-oriented system. All contributors and AI coding agents must follow the architectural and engineering rules defined in this file.

The application contains separate frontend and backend codebases. Both must follow feature-based modular architecture.

**The PRD is the source of truth for product behaviour. This file is the source of truth for how that behaviour is built.**

---

## Stack

Stack selection is intentionally *not* specified by the PRD (see PRD Appendix B — it defers technology choice to the HLD). The choices below are this repository's actual stack. Do not introduce a competing framework, ORM, state library, or HTTP client without an explicit decision recorded in `docs/`.

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript (strict) |
| Frontend styling | Tailwind CSS v4 |
| Frontend tests | Vitest + Testing Library + jsdom |
| Backend | NestJS 11, TypeScript (strict), Express adapter |
| Backend validation | `class-validator` + `class-transformer` via global `ValidationPipe` |
| Backend config | `@nestjs/config` with fail-fast startup validation |
| Backend tests | Jest (unit + e2e) |
| Database / ORM | **Not yet selected** — see "Open Decisions" below |

### Open Decisions

These are unresolved. Do not silently pick one while implementing a feature — raise it, decide it, record it in `docs/`.

1. **Database and ORM** (Prisma vs. TypeORM vs. Drizzle). This determines the concrete shape of `backend/migrations/`. The migration *rules* in this document apply regardless of choice.
2. **Tenant isolation strategy** (shared schema with tenant discriminator vs. schema-per-tenant vs. database-per-tenant). PRD Risk #9 rates cross-tenant data exposure as **Critical**, and PRD §12.2 requires per-tenant data residency — this decision must be made before the first persisted module.
3. **Auth provider** (self-hosted vs. managed identity provider). PRD §5.1 requires SSO federation, MFA, and biometric sign-in.
4. **Mobile application** (PRD §6 requires exactly one unified app for all roles). Not in this repository yet.

---

## Core Engineering Principles

1. Build features as independent modules.
2. Keep frontend and backend responsibilities clearly separated.
3. Avoid tightly coupled code.
4. Prefer reusable abstractions only when there is a genuine shared use case.
5. Every feature must include tests and documentation.
6. Database changes must be handled only through safe, sequential migrations.
7. Do not introduce duplicate models, services, endpoints, schemas, utilities, or migrations.
8. Do not modify unrelated modules while implementing a feature.
9. Preserve existing behaviour unless the task explicitly requires changing it.
10. Prioritize correctness, readability, and maintainability over unnecessary abstraction.

---

## Repository Structure

```text
project-root/
├── frontend/                  # Next.js 16 web application
│   ├── src/
│   │   ├── app/               # App Router routes ONLY — thin, no business logic
│   │   ├── modules/           # feature modules
│   │   ├── shared/            # cross-module UI, hooks, utilities
│   │   └── core/              # config, http client, error contract, providers
│   └── tests/                 # cross-module / app-level tests
│
├── backend/                   # NestJS 11 API
│   ├── src/
│   │   ├── modules/           # feature modules
│   │   ├── shared/            # business-neutral utilities
│   │   ├── core/              # config, filters, guards, interceptors, logging
│   │   ├── infrastructure/    # database, cache, queue, storage, external SDK adapters
│   │   └── main.ts
│   ├── migrations/            # database migrations (single head)
│   └── test/                  # e2e tests
│
├── docs/                      # architecture decisions, HLD, cross-cutting docs
├── scripts/                   # repo tooling
├── PRD.pdf                    # product requirements — source of truth for behaviour
├── AGENTS.md
└── README.md
```

Note the NestJS adaptation: the backend application root is `backend/src/`, not `backend/app/`. The modular principles are unchanged.

---

## Feature-Based Modular Architecture

Every major feature must live inside its own module. Module names should track the PRD's module names.

```text
frontend/src/modules/attendance/
frontend/src/modules/fee-management/
frontend/src/modules/student-information/
frontend/src/modules/examination/
frontend/src/modules/parent-identity/
```

```text
backend/src/modules/attendance/
backend/src/modules/fee-management/
backend/src/modules/student-information/
backend/src/modules/examination/
backend/src/modules/parent-identity/
```

Use `kebab-case` for directory names on both sides.

A module should contain everything primarily owned by that feature.

Do not organize the entire project only by technical type such as `components/`, `services/`, `controllers/`, `models/`, `utils/`. Instead, group code by feature and keep technical layers inside each feature.

Correct:

```text
modules/
└── attendance/
    ├── components/
    ├── hooks/
    ├── services/
    ├── types/
    ├── schemas/
    ├── tests/
    ├── docs/
    └── index.ts
```

Avoid:

```text
components/
├── AttendanceCard.tsx
├── FeeCard.tsx
└── ExamCard.tsx

services/
├── attendanceService.ts
├── feeService.ts
└── examService.ts
```

---

## Frontend Module Structure

```text
frontend/src/modules/<module-name>/
├── components/       # feature UI (Server Components by default)
├── hooks/            # client-side hooks
├── services/         # API calls — the ONLY place that talks to the backend
├── stores/           # feature state
├── types/            # TypeScript types
├── schemas/          # runtime validation of API responses
├── utils/
├── tests/
├── docs/
├── constants.ts
└── index.ts          # the module's public API
```

Not every folder is mandatory. Only create folders that the module actually needs.

### Frontend Rules

* `src/app/` contains routing only. A route file wires params, metadata, and layout, then renders a component from a module. Business logic in `src/app/` is a defect.
* UI components specific to a feature must remain inside that feature module.
* Shared UI components go in `frontend/src/shared/components`; shared hooks in `frontend/src/shared/hooks`.
* API calls must be isolated inside the module's `services/` folder and must go through `src/core/http/apiClient.ts`. Do not call `fetch` directly from a component.
* Runtime validation schemas belong in `schemas/`. Validate API responses at the module boundary — do not trust response shapes.
* Feature state stays inside the feature module unless it is genuinely global.
* Avoid direct cross-module imports into internal files. Import only from the module root.
* Modules expose their public API through `index.ts`.
* Do not place business logic directly inside large UI components. Keep components small and focused, and separate presentation from network and state logic.
* Default to React Server Components. Add `"use client"` only where interactivity, browser APIs, or hooks genuinely require it, and push it as far down the tree as possible.
* Never read `process.env` outside `src/core/config/env.ts`.
* Never place secrets in `NEXT_PUBLIC_*` variables — they are compiled into the browser bundle.
* Every list, dashboard, and detail view must define its empty, loading, and error states before build (PRD §11).

Avoid:

```typescript
import { attendanceStore } from "@/modules/attendance/stores/internal/state";
```

Prefer:

```typescript
import { useAttendanceSession } from "@/modules/attendance";
```

---

## Backend Module Structure

```text
backend/src/modules/<module-name>/
├── <name>.module.ts        # NestJS module — the composition root
├── <name>.controller.ts    # thin HTTP layer
├── <name>.service.ts       # business logic
├── domain/                 # entities, value objects, pure business rules
├── repositories/           # data access
├── dto/                    # request DTOs (class-validator decorated)
├── schemas/                # response contracts
├── events/
├── tests/
└── docs/
```

The NestJS adaptation of the `__init__.py` public-export convention is the `@Module()` file: whatever a module lists in `exports` is its public API. Everything else is internal.

### Backend Rules

* Controllers must remain thin: validate, delegate, map to response. No business logic.
* Business logic lives in services or domain-layer code.
* Database access happens only through repositories or clearly defined data-access services.
* Request and response contracts must be explicitly defined. Request DTOs use `class-validator` decorators; the global `ValidationPipe` runs with `whitelist: true` and `forbidNonWhitelisted: true`.
* ORM models must not be used directly as public API response contracts. Map to an explicit response type.
* No business logic inside database models.
* Do not import internal code from unrelated modules. Cross-module communication happens through exported services, events, or defined interfaces.
* Circular dependencies are not allowed. Do not reach for `forwardRef()` to paper over a boundary violation — fix the boundary.
* Shared infrastructure (database, cache, queue, storage, external SDK adapters) belongs in `backend/src/infrastructure`.
* Business-neutral utilities belong in `backend/src/shared`. Feature-specific helpers do not go in global utility folders.
* Never read `process.env` directly in a module. Inject `ConfigService` or the typed config from `src/core/config`.
* Every new module must be registered in `app.module.ts` and must expose `docs/README.md` and, if it has endpoints, `docs/API.md`.

---

## Multi-Tenancy Rules

**Cross-tenant data exposure is rated Critical in the PRD (Risk #9). Treat tenant isolation as an architectural invariant, not a feature.**

* Every tenant-owned table must carry a tenant identifier, and every query against it must be scoped by that identifier. There are no exceptions for "internal" or "admin" queries.
* Tenant context is derived on the server from the authenticated session — never from a request body, query parameter, header, or any other client-controlled input.
* A repository method that can return rows across tenants must be explicitly named to say so (e.g. `findAcrossTenantsForPlatformAdmin`) and must be reachable only by a Platform Super Admin path that is audited.
* The unified parent identity (PRD §4.2) is the one deliberate cross-tenant entity. A parent account spans schools; a school must never be able to enumerate which other schools a parent is linked to. Guard this explicitly.
* Every module that persists tenant data must include a test proving that tenant A cannot read or mutate tenant B's records.
* Caching keys, queue job payloads, file storage paths, and search indexes must all include the tenant identifier. A cache key collision is a cross-tenant leak.

## Authorization Rules

* Authorization is enforced on the backend, on every request, always. Frontend role checks are presentation only and are never a security control.
* Never trust client-provided IDs, roles, scores, permissions, or ownership claims.
* PRD §3.6 defines RBAC as `Module → Feature → Action → Scope`, with 400+ granular permissions and 19 roles. Permission checks must include the **scope** dimension — "a teacher may read attendance" is incomplete; it is "a teacher may read attendance *for their assigned classes*".
* A single person may hold multiple roles across multiple schools under one identity. Never merge permissions across role views — a user acting in Parent View has exactly the Parent permission set, never a union with their Teacher permissions.
* Every permission change must be written to the audit log with actor, timestamp, and before/after state.

## Student Data Privacy

The platform holds children's personal, health, academic, and family financial data under FERPA, GDPR, and COPPA (PRD §12).

* Apply data minimization: collect and return only the fields the caller actually needs. Do not return a full student record where a name and ID would do.
* Personal data must never appear in logs, error messages, analytics events, or URL query strings.
* Data deletion and export paths must be real, not stubbed — PRD §12.1 requires portability and erasure workflows.
* Retention rules are configurable per tenant; do not hardcode retention periods.

---

## Module Boundaries

Each module must define a clear public interface. Other modules must not directly depend on internal repositories, private helpers, internal database models, internal state implementations, internal component files, or private service methods.

Modules should expose only the minimum required functionality.

* Frontend modules expose their public API through `index.ts`.
* Backend modules expose their public API through the `exports` array of their `@Module()`.

Never import deeply into another module unless there is a documented architectural reason.

---

## Tests Inside Every Module

Every module must contain its own `tests` folder, close to the feature it validates.

### Testing Requirements

Each feature should include the relevant combination of unit, service, API, component, integration, repository, and validation tests.

At minimum, test:

1. The primary successful flow.
2. Input validation.
3. Error handling.
4. Permission and authorization behaviour, including scope.
5. **Tenant isolation** — required for every module that touches tenant data.
6. Important edge cases.
7. State transitions.
8. External API failure handling.
9. Database transaction behaviour where applicable.

Tests must not depend on execution order. Tests must not modify shared or production data. Tests must use isolated fixtures, mocks, factories, or test databases.

A bug fix should include a regression test whenever practical.

Do not delete failing tests simply to make the test suite pass.

### Commands

```text
frontend:  npm run lint | npm run typecheck | npm run test | npm run build
backend:   npm run lint | npm run typecheck | npm run test | npm run test:e2e | npm run build
```

---

## Module Documentation

Every module must include a `docs` folder with at minimum `README.md`, plus `API.md` for backend modules exposing endpoints.

`docs/README.md` should explain: module purpose, responsibilities, what the module owns, what it does not own, public interfaces, dependencies, main flows, important design decisions, testing instructions, and known limitations.

`docs/API.md` should document each endpoint: path, HTTP method, required permission, request schema, response schema, error responses, and worked examples.

Documentation must be updated in the same change whenever behaviour, contracts, or architecture changes.

---

## Database Migration Rules

All schema changes go through migration files in `backend/migrations/`. Direct manual changes to shared, staging, or production databases are not allowed.

Before creating a migration:

1. Inspect all existing migrations.
2. Inspect the current models.
3. Confirm the table, column, index, constraint, and enum do not already exist.
4. Confirm another migration is not already implementing the same change.
5. Confirm the migration is based on the latest migration head.
6. Check whether parallel migration branches exist.

Every migration must have a unique identifier, point to the correct predecessor, avoid duplicate tables/columns/indexes/constraints/enums, include both up and down logic, be safe to run on an existing populated database, preserve existing data unless removal is explicitly required, use transactions where supported, and avoid unnecessary destructive operations.

**Additionally, for this product:** any new tenant-owned table must include its tenant identifier column and an index that leads with it in the same migration that creates the table. A tenant-owned table without a tenant-scoped index is an isolation and performance defect.

### Migration Conflict Prevention

```text
1. Pull or rebase the latest branch.
2. Inspect the migration history.
3. Verify there is a single migration head.
4. Regenerate or update the migration if the base changed.
5. Run all migrations on a fresh database.
6. Run migrations on a database containing existing data.
7. Test downgrade and upgrade.
```

Do not create multiple migrations for the same schema change. Do not edit a migration already applied to shared environments — create a new corrective migration instead.

Do not rename, remove, or alter existing columns without checking production data, backend usage, frontend API dependencies, indexes, constraints, foreign keys, and rollback strategy.

### Data Migrations

Separate schema changes from large data migrations where possible. Data migrations must be idempotent where practical, batched, safe to retry, observable through logs, documented, and designed to avoid long table locks.

---

## API Contract Rules

Every endpoint must define request type, response type, validation rules, error structure, authentication requirements, and authorization requirements.

All endpoints live under the `/api/v1` prefix.

All errors use one envelope, produced centrally by the global exception filter:

```json
{
  "error": {
    "code": "STUDENT_NOT_FOUND",
    "message": "Student was not found",
    "details": null
  }
}
```

Error codes are `SCREAMING_SNAKE_CASE` and stable — they are part of the contract. Do not return arbitrary error shapes from different endpoints, and do not leak stack traces or internal identifiers in `message`.

Breaking API changes must be explicitly documented.

Do not duplicate backend response types manually across multiple frontend modules. Prefer OpenAPI generation or a shared contract package.

---

## Shared Code Rules

Code may move into a shared folder only when it is used by at least two modules, is not specific to one business feature, has a clearly defined purpose, and moving it does not create hidden coupling.

Do not create generic utility files containing unrelated functions:

```text
utils/helpers.ts    ✗
utils/common.ts     ✗
utils/misc.ts       ✗
```

Prefer focused files:

```text
shared/date/formatAcademicTerm.ts
shared/currency/formatFeeAmount.ts
shared/validation/emailSchema.ts
```

Shared code must include tests and documentation when it contains meaningful logic.

---

## Configuration and Environment Variables

Environment variables must be documented, validated at startup, grouped by responsibility, never hardcoded, and never committed with real secrets.

* Backend: `backend/src/core/config/` — validated at boot, process exits with a clear message on missing or malformed configuration.
* Frontend: `frontend/src/core/config/env.ts` — the single place `process.env` is read.
* Both apps ship a committed `.env.example` with safe placeholders for every variable. `.env` and `.env.local` are gitignored and must never be committed.

When you add a variable, you must update `.env.example`, the validation schema, and the app README in the same change.

---

## External Service Integration

Every external integration must be isolated behind a service or adapter in `backend/src/infrastructure/`. Business modules must not depend directly on provider-specific SDKs.

This product integrates with payment gateways, SMS/email/push providers, GPS and RFID/biometric hardware, object storage, and accounting software (PRD §5, §9). Prefer `PaymentService`, `NotificationService`, `StorageService`, `LocationService` over direct SDK usage throughout the application.

External calls must include timeouts, error handling, retry with backoff where appropriate, structured logging, rate-limit handling, and defined fallback behaviour. PRD Risk #11 requires multi-provider fallback for payments, messaging, and tracking — design adapters so a second provider can be added without touching business modules.

Never log secrets, access tokens, raw credentials, or student data.

---

## Logging and Observability

Use structured logging. Include request ID, tenant ID, module name, operation, duration, and error code. Include user ID only where appropriate and never alongside sensitive data.

Do not commit `console.log("here")` or equivalent debugging output.

Never log passwords, API keys, authorization headers, access tokens, student personal data, or private messages.

Instrument the flows the PRD commits to numerically: attendance submission time, notification delivery latency (PRD requires parent notification within 30 seconds of attendance submission), fee payment completion, API p95 response time (target under 200 ms), and notification delivery success rate.

---

## Error Handling

Errors must be explicit, typed or categorized, logged at the correct layer, converted into the consistent API envelope, and user-friendly on the frontend.

Do not silently ignore errors. Do not expose internal stack traces to users.

Frontend errors provide a clear message, a retry path where appropriate, safe fallback UI, and a recovery route.

Backend errors distinguish validation, authentication, authorization, not-found, conflict, external-service, and internal errors.

---

## Security Rules

All new features must consider authentication, authorization, input validation, output sanitization, rate limiting, file upload restrictions, secret management, CORS, injection risks, tenant isolation, and data access boundaries.

Never trust client-provided IDs, roles, scores, permissions, or ownership information. Authorization is enforced on the backend.

File uploads (student documents, homework submissions, study material) must validate type and size, must not execute, and must be stored under tenant-scoped paths with access mediated by permission checks — never by unguessable URLs alone.

---

## Naming Conventions

Use clear, domain-specific names drawn from the PRD glossary (§17): `tenant`, `unified parent identity`, `role view`, `guardian`, `academic term`, `fee installment`, `admission pipeline`.

Avoid: `data`, `temp`, `helper`, `manager2`, `newService`, `finalHandler`, `misc`.

Conventions:

| Thing | Convention | Example |
|---|---|---|
| Directories | kebab-case | `fee-management/` |
| React components | PascalCase | `AttendanceRoster.tsx` |
| Hooks | camelCase, `use` prefix | `useAttendanceRoster.ts` |
| NestJS files | kebab-case, dotted suffix | `attendance.service.ts` |
| Classes | PascalCase | `AttendanceService` |
| Database tables/columns | snake_case | `fee_installment` |
| Error codes | SCREAMING_SNAKE_CASE | `FEE_ALREADY_PAID` |

---

## Change Scope

1. Identify the module that owns the change.
2. Modify only that module and necessary shared contracts.
3. Avoid unrelated refactoring.
4. Do not rename files or reorganize folders without a clear reason.
5. Do not introduce a new abstraction for a single trivial use case.
6. Update tests.
7. Update module documentation.
8. Update API documentation if contracts changed.
9. Add a migration only if the schema changed.
10. Verify there are no migration conflicts.

Large refactors should be separated from feature changes.

---

## Definition of Done

A feature is not complete until:

* The feature works end to end.
* Code is placed in the correct module and module boundaries are preserved.
* Input validation is implemented.
* Authorization is enforced on the backend, including scope.
* Tenant isolation is enforced and proven by test.
* Errors are handled and returned in the standard envelope.
* Unit tests are added.
* Integration or API tests are added where relevant.
* Module documentation is updated; API documentation is updated where relevant.
* Database migrations are conflict-free and existing migrations still run.
* Existing tests pass and new tests pass.
* Linting passes. Type checking passes.
* No secrets are committed. No temporary debugging code remains.
* No duplicate implementation was introduced.
* The feature is usable from the intended UI flow.

---

## Required Validation Before Finishing a Task

Run the relevant commands for formatting, linting, type checking, unit tests, integration tests, build, and migrations.

```bash
cd frontend && npm run lint && npm run typecheck && npm run test && npm run build
```

```bash
cd backend && npm run lint && npm run typecheck && npm run test && npm run build
```

Also verify: fresh database migration succeeds, existing database migration succeeds, frontend build succeeds, backend starts successfully, API contracts match frontend usage, and documentation reflects the implementation.

If any command cannot be run, state clearly which command was not run, why, and what remains unverified.

**Never claim a task is fully tested when the tests were not executed.**

---

## Prohibited Practices

Do not:

* Put entire features inside one large file.
* Create unrelated global utility files.
* Duplicate services or schemas.
* Write business logic inside route handlers, controllers, or UI components.
* Access the database directly from frontend code.
* Query tenant-owned data without a tenant scope.
* Derive tenant or role from client-controlled input.
* Add schema changes without migrations, or create conflicting migration heads.
* Edit already-applied shared migrations.
* Commit secrets, or put secrets in `NEXT_PUBLIC_*`.
* Ignore failing tests, or remove tests to make builds pass.
* Catch exceptions without handling or logging them.
* Log student personal data.
* Introduce dependencies without a clear need.
* Modify unrelated modules during a focused task.
* Leave undocumented public APIs or temporary mock logic in production paths.

---

## Preferred Implementation Workflow

```text
1.  Read the relevant PRD section for the feature.
2.  Identify the owning frontend and backend modules.
3.  Review existing implementations before creating new files.
4.  Define or update API contracts.
5.  Define data-model changes and inspect migration history.
6.  Implement backend domain logic.
7.  Implement backend APIs with validation and authorization.
8.  Add backend tests, including tenant isolation and permission scope.
9.  Implement frontend services, schemas, and types.
10. Implement frontend UI and state, including empty/loading/error states.
11. Add frontend tests.
12. Update module documentation.
13. Run migrations, tests, linting, type checking, and builds.
14. Verify the complete user flow.
```

---

## Final Rule

Every implementation should make the repository easier to understand, test, operate, and extend.

A feature should be removable or replaceable with minimal impact outside its owning module.

When choosing between speed and structure, prefer the simplest implementation that preserves clear module boundaries, correctness, testability, tenant isolation, and safe database evolution.
