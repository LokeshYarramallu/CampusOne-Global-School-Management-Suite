# Phase 0 Research: Role-Aware Account Profile

**Feature**: [spec.md](./spec.md) | **Date**: 2026-08-03

The stack is fixed by the constitution, so this phase resolved integration questions rather than technology choices. Two findings materially change the plan and are recorded first.

---

## R1 — The RLS backstop is inert, and tenant context is never set

**This is the most important finding in this phase.** It was verified against the live database, not inferred.

### What was found

`prisma/migrations/20260802000100_auth_rbac_foundation/migration.sql` enables and **forces** row-level security on six tables — `tenant_configuration`, `role_assignment`, `parent_school_link`, `feature_flag`, `audit_record`, and `role` — with policies of the form:

```sql
USING (tenant_id::text = current_setting('app.tenant_id', true))
```

The migration carries this comment:

> The database role used by Prisma in production must not bypass RLS.

Two things are wrong today:

| # | Finding | Evidence |
|---|---|---|
| 1 | **The application role bypasses RLS entirely** | Connected role is `neondb_owner` with `rolbypassrls = true`. Verified: with `row_security = on` *and* `app.tenant_id` set to a non-matching value, `role` still returned all 7 rows. `BYPASSRLS` overrides both the policy and the session setting. |
| 2 | **`app.tenant_id` is never set by the application** | `grep` across `backend/src` for `app.tenant_id`, `SET LOCAL`, and `$executeRaw` returns nothing. `PrismaService` connects and disconnects; it establishes no per-request tenant context. |

ADR 0003 left exactly this open:

> The exact RLS session-variable mechanism and Prisma integration (setting `SET LOCAL app.tenant_id` per request) is finalized in the implementation tasks for `001-auth-multitenancy`.

It was never finalised.

### Why it has not caused a visible failure

The database currently holds **zero tenants** and therefore zero role assignments. The one seeded account — the Platform Super Admin — resolves its role through `role.findUnique`, and the `role` policy has a deliberate escape hatch:

```sql
USING (tenant_id IS NULL OR tenant_id::text = current_setting('app.tenant_id', true))
```

The seven catalog roles all carry `tenant_id IS NULL`, so they remain visible. Nothing has yet read a genuinely tenant-owned row.

### Why it breaks this feature specifically

This feature is the first to seed users **with role assignments** and the first to read tenant-owned rows (staff records, student enrolment, parent-school links). Both defects land immediately:

- Fixing defect 1 without fixing defect 2 makes every tenant-owned query return **zero rows** — sign-in would stop resolving roles.
- Fixing neither means the constitution's NON-NEGOTIABLE Principle III is satisfied only by application-layer `where` clauses, with the promised defense-in-depth absent.

### Decision

Build tenant context propagation **before** any tenant-owned read, as the first substantive work of this feature.

1. **A dedicated, non-bypassing application role.** Migrations continue to run as the owner; the API connects as a role with neither `SUPERUSER` nor `BYPASSRLS`. Provisioning this role is an environment/ops step, so the code must **detect and report** the condition rather than assume it: a startup check that logs a loud warning when the connected role bypasses RLS.
2. **`SET LOCAL app.tenant_id` inside an interactive transaction**, derived server-side from the authenticated session. `SET LOCAL` is transaction-scoped, which is what makes it safe under connection pooling — a pooled connection cannot leak the previous request's tenant. A request without tenant context (Platform Super Admin, sign-in) simply does not set it and must not touch tenant-owned tables outside the audited cross-tenant path.
3. **Platform-level tables stay outside the mechanism**: `user_identity`, `parent_identity`, the role/permission catalog. The new identity-level profile and preference tables join them.

**Rationale**: `SET LOCAL` in a transaction is the standard Prisma+RLS pattern and the only one that is pooling-safe. The startup check exists because the correctness of the whole backstop depends on a database-role property that no application code can enforce — silence there is what produced this finding.

**Alternatives considered**:
- *Prisma client extension setting the GUC per query* — no transaction boundary, so a pooled connection can carry the setting into the next request. Rejected as unsafe.
- *Drop RLS and rely on repository scoping alone* — contradicts ADR 0003 and removes defense-in-depth precisely where PRD Risk #9 is rated Critical. Rejected.
- *Connection-per-tenant pools* — does not scale to thousands of schools. Rejected.

**Follow-up**: this correction belongs to feature 001's scope, not 002's. It is done here because 002 is blocked without it, and it must be recorded as closing 001's open item.

---

## R2 — Photo storage has no adapter, and building one is not small

**Found**: `backend/src/infrastructure/` contains only `prisma/`. There is no `StorageService`, and PRD §5.8 (file storage, P0) is unbuilt. FR-036 requires an uploaded photo to be validated for type and size and reachable only by those permitted to see it — never by knowledge of its location alone.

Delivering that properly means: an adapter interface, at least one implementation, multipart handling, magic-byte type sniffing (a declared MIME type is caller-controlled and cannot be trusted), size limits, tenant-scoped paths, and a permission-checked serving endpoint. That is a storage subsystem, not a profile field.

**Decision**: **defer binary photo upload.** This delivery renders a generated initials avatar with a deterministic colour derived from the person's identifier. The data model still carries a photo reference so no migration is needed when upload arrives.

**Consequence for the spec**: the photo clause of FR-004 and all of FR-036 move to deferred. FR-002 remains satisfied — a photo area is shown, with a meaningful placeholder, which is what Acceptance Scenario 1.3 already requires.

**Rationale**: a half-built storage layer is worse than none, and file upload is where the security mistakes live. Building `StorageService` as its own feature — with the multi-provider fallback the constitution requires — is the right shape.

**Alternatives considered**:
- *Local-disk adapter now* — works in dev, fails on any multi-instance or serverless deployment, and would be rewritten. Rejected as throwaway.
- *Base64 image in a database column* — bloats rows, defeats caching, and still needs validation. Rejected.

---

## R3 — Email change cannot be confirmed without a notification capability

**Found**: FR-007 requires an email change to take effect only after the new address is confirmed. There is no notification or email adapter, and no way to deliver a confirmation.

**Decision**: **defer email change.** The email field is rendered read-only under the FR-023 treatment — stating who manages it and how to request a correction — exactly as the other approval-workflow fields are handled. FR-007 stands as the requirement for when the capability exists; it is not implemented in this delivery and is not faked.

**Rationale**: the alternative is a confirmation flow whose confirmation never arrives, which is worse than an honest read-only field. This is the same reasoning already applied to password recovery.

---

## R4 — Permission and scope evaluation

**Found**: `backend/src/modules/rbac/` contains `role-catalog.ts` (seven roles, permissions as `[module, feature, action]` triples) and a module file. There is **no evaluation service and no guard** — nothing currently checks a permission on any request.

The catalog already implies three distinct scope shapes, visible in the tuples themselves: `['profile','self','read']`, `['children','linked','read']`, `['students','assigned','read']`.

**Decision**: introduce a `@RequirePermission(module, feature, action)` decorator plus a permission-evaluation service in `rbac`, resolving scope as a named strategy per tuple rather than as ad-hoc conditionals in services.

- `self` — the subject must be the authenticated principal.
- `linked` — the subject must be reachable through a guardian link the principal holds.
- `assigned` — the subject must fall inside the principal's teaching assignment.
- `school` / `platform` — whole-tenant and cross-tenant, the latter audited.

**Rationale**: this feature is the first with real scope cases, and three genuinely different shapes is a far better design input than one imagined case. Keeping resolution beside the guard stops each service inventing its own interpretation — which is exactly the drift the earlier sequencing discussion aimed to avoid.

**Alternatives considered**: per-service scope checks (rejected — guarantees divergence); a full policy engine such as CASL or OPA (rejected — introduces a dependency and a second authorization vocabulary; the constitution fixes `Module → Feature → Action → Scope`).

---

## R5 — Where the learner record begins

**Found**: no student table exists. This feature needs admission number, class/section, roll number, and admission date (FR-021). PRD §7.2 defines a far larger record.

**Decision**: create the table under the name the SIS will keep, containing only this feature's columns, so the SIS feature **extends** it with further columns and relations rather than creating a parallel table.

**Rationale**: the constitution forbids duplicate models. The realistic failure mode is a `student_profile` here and a `student` in SIS, with two sources of truth for the same learner. Naming it correctly now costs nothing.

---

## R6 — Preference storage shape

**Decision**: discrete columns for the known preferences (language, appearance), and a JSON column for notification preferences.

**Rationale**: language and appearance are queried, validated, and enumerable. Notification preferences are per-category and per-school and will grow with each module that emits notifications (PRD §5.9); modelling them relationally now would be guesswork. Both are identity-level, following the person across schools.

---

## Summary of decisions

| ID | Decision | Effect on plan |
|---|---|---|
| R1 | Build tenant context (`SET LOCAL` in transaction) + non-bypassing role + startup check, before any tenant-owned read | **New first phase**; closes an open item from feature 001 |
| R2 | Defer photo upload; initials avatar now | FR-004 photo clause and FR-036 deferred |
| R3 | Defer email change; read-only with FR-023 treatment | FR-007 deferred |
| R4 | `@RequirePermission` + scope strategies in `rbac` | Phase before the profile endpoints |
| R5 | Learner table created under the SIS's eventual name | Prevents a duplicate model later |
| R6 | Columns for language/appearance, JSON for notifications | Data model detail |

**No NEEDS CLARIFICATION markers remain.** FR-037 was resolved during `/speckit-specify`; it still requires an ADR before the gating behaviour is built (constitution Principle VII).
