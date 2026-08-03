# ADR 0005: Tenant context propagation via `SET LOCAL` in an interactive transaction

- **Status:** Accepted
- **Date:** 2026-08-03
- **Closes:** the open item deferred by [ADR 0003](./0003-tenant-isolation-shared-schema.md) — "The exact RLS session-variable mechanism and Prisma integration (setting `SET LOCAL app.tenant_id` per request) is finalized in the implementation tasks for `001-auth-multitenancy`."
- **Raised by:** research finding R1 in [specs/002-account-profile/research.md](../../specs/002-account-profile/research.md)

## Context

ADR 0003 chose a shared schema with a `tenant_id` discriminator, application-layer scoping as the primary control, and PostgreSQL row-level security as a defense-in-depth backstop. It explicitly deferred the mechanism for setting the session variable the RLS policies read.

That mechanism was never built. Investigation during feature 002 planning found two defects, both verified against the live database rather than inferred:

**1. The RLS backstop is inert.** Migration `20260802000100_auth_rbac_foundation` enables and *forces* row-level security on `tenant_configuration`, `role_assignment`, `parent_school_link`, `feature_flag`, `audit_record`, and `role`, with policies of the form:

```sql
USING (tenant_id::text = current_setting('app.tenant_id', true))
```

The migration even carries the comment "The database role used by Prisma in production must not bypass RLS." But the connected role is `neondb_owner`, which has `rolbypassrls = true`. Verified empirically: with `row_security = on` and `app.tenant_id` deliberately set to a non-matching value, every row was still returned. `BYPASSRLS` overrides both the policy and the session setting.

**2. `app.tenant_id` is never set.** No occurrence of `app.tenant_id`, `SET LOCAL`, or `$executeRaw` exists anywhere in `backend/src`. `PrismaService` connects and disconnects; it establishes no per-request tenant context.

Neither has caused a visible failure because the database holds zero tenants, and the seven catalog roles carry `tenant_id IS NULL`, which the `role` policy deliberately admits. No genuinely tenant-owned row has ever been read.

Feature 002 is the first to seed role assignments and read tenant-owned rows, so both defects become live. Critically, **fixing only the first would make every tenant-owned query return zero rows** — sign-in would stop resolving roles — because nothing sets the variable the policies compare against.

## Decision

**Tenant context is set with `SET LOCAL app.tenant_id` inside an interactive transaction**, and every tenant-owned query runs inside that transaction.

1. **Transaction-scoped, not session-scoped.** `SET LOCAL` reverts at transaction end. This is the property that makes it safe under connection pooling: a pooled connection cannot carry one request's tenant into the next request. A plain `SET` would persist on the connection and leak.

2. **Context derived server-side only.** The active tenant comes from the authenticated principal's role assignment (`backend/src/core/auth/tenant-context.ts`), never from a request body, query parameter, or header. This restates constitution Principle III at the one place it is enforced.

3. **Absence is an error, never an empty result.** A tenant-owned read attempted with no context raises `TENANT_CONTEXT_MISSING` (500). Returning an empty list would be indistinguishable from "this tenant has no rows" — which is precisely the ambiguity that let the original defect survive two migrations unnoticed.

4. **A non-bypassing application role.** Migrations continue to run as the owner. The API must connect as a role with neither `SUPERUSER` nor `BYPASSRLS`. Because no application code can grant itself this property, **the application detects and reports instead of assuming**: `PrismaService` queries `pg_roles` at boot and logs a prominent warning when the connected role can bypass RLS. Silence is what produced this finding; the check ensures the same silence cannot recur.

5. **Platform-level tables stay outside the mechanism.** `user_identity`, `parent_identity`, the role and permission catalog, and the new identity-level `user_profile` and `user_preference` tables are not tenant-owned and carry no policy. The unified parent identity remains the deliberate cross-tenant entity of ADR 0003, guarded by explicitly named repository methods.

## Alternatives Considered

- **A Prisma client extension setting the GUC per query.** Simpler to write and requires no transaction. Rejected: without a transaction boundary the setting persists on the pooled connection, so a subsequent request on that connection inherits the previous tenant. That is a cross-tenant leak, the exact failure ADR 0003 rates Critical.
- **Drop RLS; rely on repository `where: { tenantId }` alone.** Removes the whole problem. Rejected: it contradicts ADR 0003 and removes defense-in-depth precisely where PRD Risk #9 is rated Critical. The value of the backstop is that it catches the forgotten `where`, which is the realistic human error.
- **A connection pool per tenant.** Gives session-scoped settings safely. Rejected: does not scale to thousands of schools, and multiplies connection count against a serverless database.
- **Fix the role only, leave the variable unset.** Rejected: makes every tenant-owned query return zero rows. Worse than the current state.

## Consequences

**Positive**

- The backstop ADR 0003 promised actually takes effect once a non-bypassing role is configured.
- Pooling-safe by construction rather than by discipline.
- The boot-time check converts a silent, invisible misconfiguration into a loud one.
- `TENANT_CONTEXT_MISSING` makes a missing-context bug fail loudly in development instead of silently returning nothing.

**Negative / Trade-offs**

- **Every tenant-owned read must run inside the transaction wrapper.** A repository that bypasses it silently loses the backstop. Mitigated by routing all tenant-owned access through one client and by the mandatory per-module isolation test.
- **Interactive transactions carry overhead** and hold a connection for their duration. Acceptable for request-scoped reads; long-running or batch work needs its own consideration.
- **The non-bypassing role is an environment concern, not a code one.** On the current Neon database the connection uses `neondb_owner`, which bypasses RLS — so until a dedicated role is provisioned, the backstop remains inert in development and the boot warning will fire. This is deliberate: a visible warning is better than a false sense of protection.
- Existing RLS policies were written before this decision and are compatible, but any table added without a policy is a gap. The migration checklist in ADR 0003 already requires one per tenant-owned table.

**Follow-up**

- Provisioning the non-bypassing database role in each environment is an operations task, tracked outside this repository. Until it is done, the boot warning is the system telling the truth about its own posture.
