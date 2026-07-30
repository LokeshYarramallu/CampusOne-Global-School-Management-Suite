# Documentation

Cross-cutting documentation. Module-specific documentation lives with its module, in `frontend/src/modules/<name>/docs/` and `backend/src/modules/<name>/docs/`.

## Contents

| Document | Status |
|---|---|
| [PRD.md](../PRD.md) | v2.0 — product requirements, source of truth for behaviour |
| [AGENTS.md](../AGENTS.md) | current — engineering rules |
| [decisions/0001-postgres-prisma.md](decisions/0001-postgres-prisma.md) | accepted — database and ORM |
| `decisions/` | architecture decision records |

## Documents Still To Be Written

PRD Appendix B intentionally defers the following out of the PRD. They are this repository's responsibility.

* **Architecture Document / HLD** — system, frontend, backend, and mobile architecture; technology stack rationale.
* **Data storage design** — storage, search, caching, queuing, scaling.
* **Infrastructure design** — cloud infrastructure, environments, delivery pipelines.
* **API specification** — endpoint structure, event payloads, versioning policy.
* **Security design** — detailed controls, key management, network defenses.

## Architecture Decision Records

Record any decision that constrains future work in `docs/decisions/` as `NNNN-short-title.md`, covering context, the decision, alternatives considered, and consequences.

The database and ORM decision is resolved ([0001](decisions/0001-postgres-prisma.md)). The three decisions still open — tenant isolation strategy, auth provider, and mobile stack — each need an ADR before the code that depends on them is written. See the "Open Decisions" section of [AGENTS.md](../AGENTS.md).
