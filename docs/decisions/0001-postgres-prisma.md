# ADR 0001: PostgreSQL with Prisma ORM

- **Status:** Accepted
- **Date:** 2026-07-30
- **Resolves:** Open Decision #1 (database and ORM) in [AGENTS.md](../../AGENTS.md)

## Context

The PRD defers technology selection to the architecture documents (PRD Appendix B). Before any persisted module can be written, the repository must commit to a database and an ORM. This decision constrains the shape of `backend/prisma/`, the data-access layer of every module, and all future migrations.

The product is a multi-tenant, enterprise-grade SaaS for schools with hard requirements that bear on this choice:

- **Tenant isolation is an architectural invariant.** PRD Risk #9 rates cross-tenant data exposure as *Critical*. Every tenant-owned table carries a tenant identifier, and every query is scoped by it (AGENTS.md → Multi-Tenancy Rules). The data layer must make scoped querying natural and make cross-tenant access explicit.
- **Tenant-indexed tables.** Every tenant-owned table must include a tenant identifier column with an index leading with it, in the same migration that creates the table.
- **Safe, sequential, single-head migrations.** Schema evolution must be reproducible and conflict-free across a team (AGENTS.md → Database Migration Rules).
- **Strict TypeScript.** The backend is NestJS 11 with strict TypeScript; the ORM must provide strong, generated types and integrate cleanly with the NestJS module/DI model.
- **Repository-mediated data access.** Modules access data only through repositories; ORM models are never returned directly as API response contracts (AGENTS.md → Backend Rules). The ORM must be easy to wrap behind a repository boundary.

PostgreSQL is chosen as the database; this ADR also selects the ORM that sits on top of it.

## Decision

Use **PostgreSQL** as the primary relational database and **Prisma** as the ORM.

- Migrations live in `backend/prisma/migrations/` with a single migration head.
- The schema is defined in `backend/prisma/schema.prisma`.
- A `PrismaService` (wrapping `PrismaClient`) lives in `backend/src/infrastructure/` and is injected into module repositories. Business modules never import `PrismaClient` directly.
- Prisma models are mapped to explicit response types at the repository boundary; they are never used as public API contracts.

## Alternatives Considered

### ORM

- **TypeORM** — Mature, deeply NestJS-native (`@nestjs/typeorm`), full feature set, decorators on plain classes. Rejected: Active Record/Data Mapper models encourage leaking ORM entities into the service/controller layers, which conflicts with our repository-boundary and no-ORM-models-as-API-contracts rules. Its decorator-based schema is harder to review as a single source of truth than Prisma's declarative `schema.prisma`, and its migration tooling has a history of surprises on populated databases.
- **Drizzle** — Lightweight, SQL-first, excellent TypeScript inference, and a very small runtime footprint. Rejected (for now): its ecosystem and NestJS integration are younger; the team values Prisma's generated client and declarative schema for a codebase that will hold dozens of modules. Worth revisiting if performance or bundle size becomes a constraint.

### Database

PostgreSQL was selected over alternatives (e.g. MySQL) for its stronger concurrency, robust partial/expression indexes (useful for tenant-scoped composite indexes), JSONB for flexible tenant configuration, and row-level security as a future defense-in-depth option for tenant isolation (complementing, not replacing, application-level scoping).

## Consequences

**Positive**

- Single declarative source of truth (`schema.prisma`) for the data model, easy to review and diff.
- Generated, strictly-typed client reduces runtime shape errors and aligns with the strict-TS backend.
- Migration history is explicit and ordered; the single-head rule from AGENTS.md applies directly.
- Prisma's query API makes adding a `where: { tenantId }` scope straightforward, supporting the tenant-scoping rule.

**Negative / Trade-offs**

- Prisma migrations are forward-only (no automatic down). Corrective changes require a new migration, not editing an applied one — this is already the AGENTS.md rule, so it formalizes an existing constraint.
- The generated client must be regenerated (`prisma generate`) whenever `schema.prisma` changes; this step is part of the local and CI workflow.
- Prisma's abstraction can obscure generated SQL. For hot paths identified by the PRD's performance instrumentation (API p95 < 200 ms, PRD §10.1), use `$queryRaw` / `prisma.$queryRawTyped` and `EXPLAIN` where needed rather than fighting the client.
- Tenant isolation is **still enforced in application code and proven by tests** — the ORM does not guarantee it. Every module persisting tenant data ships a test proving tenant A cannot read or mutate tenant B's records (AGENTS.md → Multi-Tenancy Rules).

**Open items this does not decide**

- Tenant isolation is resolved by [ADR 0003](0003-tenant-isolation-shared-schema.md): shared PostgreSQL schema, tenant discriminator, and RLS backstop.
