# Documentation

Cross-cutting documentation. Module-specific documentation lives with its
module, in `frontend/src/modules/<name>/docs/` and
`backend/src/modules/<name>/docs/`.

## Contents

| Document | Status |
|---|---|
| [PRD.md](../PRD.md) | v2.0 — product requirements |
| [AGENTS.md](../AGENTS.md) | engineering rules |
| [0001-postgres-prisma.md](decisions/0001-postgres-prisma.md) | accepted — PostgreSQL and Prisma |
| [0002-keycloak-identity-provider.md](decisions/0002-keycloak-identity-provider.md) | accepted — Keycloak/OIDC |
| [0003-tenant-isolation-shared-schema.md](decisions/0003-tenant-isolation-shared-schema.md) | accepted — shared schema and RLS |

## Architecture records

Record decisions that constrain future work in `docs/decisions/` as
`NNNN-short-title.md`, covering context, decision, alternatives, and
consequences.

The database/ORM, tenant-isolation, and auth-provider decisions are resolved
by ADRs 0001–0003. The mobile application stack remains open and must be
decided before the mobile surface is built.
