# Phase 1 Data Model: Role-Aware Account Profile

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-08-03

Six new tables. The dividing line that governs all of them: **does this fact belong to the person, or to the person's relationship with one school?**

- Belongs to the person → identity-level, **no** `tenant_id`, follows them across every school.
- Belongs to a school relationship → tenant-owned, carries `tenant_id`, indexed leading with it, RLS policy in the same migration.

Getting this wrong in either direction is a defect: a tenant-scoped name would give a parent a different name at each school; an identity-level admission number would leak across schools.

## Existing tables reused unchanged

| Table | Used for |
|---|---|
| `user_identity` | The person. Already holds email, phone, status, `last_login_at` |
| `auth_session` | Active sessions (FR-009, FR-010) — already written on every sign-in |
| `security_event` | Recent activity (FR-011) — already written, IP already stored as a keyed hash |
| `role_assignment` | Which role in which school, and the scope payload |
| `role` | The seven-role catalog |
| `tenant` | The school |
| `parent_identity`, `parent_school_link`, `family_access_grant` | The Parent panel (FR-022) |

No migration touches these beyond adding foreign keys.

---

## New identity-level tables (no `tenant_id`)

### `user_profile`

The person's own identity. One row per `user_identity`.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_identity_id` | uuid, **unique**, FK → `user_identity` ON DELETE CASCADE | One profile per person |
| `given_name` | text | |
| `family_name` | text | |
| `display_name` | text, nullable | Preferred form of address; falls back to given + family |
| `photo_reference` | text, nullable | Reserved. Always null in this delivery — upload deferred (research R2). Present so no migration is needed when storage arrives |
| `created_at` / `updated_at` | timestamptz | |

**Rules**: `given_name` and `family_name` non-empty, trimmed, ≤ 100 characters. Name changes are approval-gated (FR-023) and therefore **not** writable by the profile endpoints in this delivery.

**Why identity-level**: a parent with children at three schools is one person with one name. PRD §5.3 — the identity belongs to the parent, not to any school.

### `user_preference`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_identity_id` | uuid, **unique**, FK → `user_identity` ON DELETE CASCADE | |
| `language` | text | BCP-47. Validated against the school's configured languages at write time |
| `appearance` | text | `system` \| `light` \| `dark`. Default `system` |
| `notification_preferences` | jsonb | Per-category, per-school. JSON by decision R6 — grows with each module that emits notifications |
| `created_at` / `updated_at` | timestamptz | |

**Why JSON for notifications only**: language and appearance are enumerable and queried; notification categories are not yet known and modelling them relationally now would be guesswork (PRD §5.9).

---

## New tenant-owned tables (all carry `tenant_id`)

Every one of these gets, **in the same migration that creates it**: a `tenant_id` column, an index whose leading column is `tenant_id`, and an RLS policy `USING (tenant_id::text = current_setting('app.tenant_id', true))`.

### `staff_profile`

A person's employment at one school. Serves the School Admin Office, Principal, Accountant, and Teacher panels (FR-017).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `tenant_id` | uuid, FK → `tenant` | |
| `user_identity_id` | uuid, FK → `user_identity` | |
| `employee_number` | text | Unique **within a tenant**, never globally |
| `designation` | text | e.g. "Senior Teacher" |
| `department` | text, nullable | |
| `joined_on` | date | |
| `created_at` / `updated_at` | timestamptz | |

**Constraints**: `@@unique([tenantId, userIdentityId])` — one staff record per person per school. `@@unique([tenantId, employeeNumber])` — employee numbers collide across schools and that is expected.
**Indexes**: `(tenant_id, user_identity_id)`.
**Editability**: entirely school-managed. Read-only to the person (FR-023, FR-024).

### `student_enrollment`

A learner's registration at one school (FR-021).

> **Named for what it will become.** This is the first sliver of the SIS learner record. The SIS feature must **extend this table**, not create a parallel `student`. Two sources of truth for one learner is the failure this naming exists to prevent (research R5, constitution "no duplicate implementation").

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `tenant_id` | uuid, FK → `tenant` | |
| `user_identity_id` | uuid, FK → `user_identity` | The learner's own sign-in identity |
| `admission_number` | text | Unique within a tenant |
| `class_label` | text | e.g. "8" — a plain label until academic structure exists |
| `section_label` | text | e.g. "B" |
| `roll_number` | text, nullable | |
| `admitted_on` | date | |
| `created_at` / `updated_at` | timestamptz | |

**Constraints**: `@@unique([tenantId, admissionNumber])`, `@@unique([tenantId, userIdentityId])`.
**Indexes**: `(tenant_id, user_identity_id)`, `(tenant_id, class_label, section_label)` — the second anticipates the roster reads attendance will need.
**Deliberately absent**: academic history, health, discipline, achievements, fees, transport, documents. All belong to the SIS feature (PRD §7.2) and each carries its own access rules.

### `teaching_assignment`

What a teacher is responsible for (FR-020). **This is the scope that constrains the Teacher role everywhere else on the platform**, not merely a display field.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `tenant_id` | uuid, FK → `tenant` | |
| `staff_profile_id` | uuid, FK → `staff_profile` ON DELETE CASCADE | |
| `subject_label` | text | Plain label until academic structure exists |
| `class_label` / `section_label` | text | |
| `is_class_teacher` | boolean, default false | Homeroom responsibility for the section |
| `created_at` | timestamptz | |

**Constraints**: `@@unique([tenantId, staffProfileId, subjectLabel, classLabel, sectionLabel])`.
**Indexes**: `(tenant_id, staff_profile_id)`, plus `(tenant_id, class_label, section_label)` for the reverse lookup the `assigned` scope strategy performs.

### `profile_change_request`

Created but **not exercised** in this delivery. Present so the approval workflow (PRD §7.2) has somewhere to land without a second migration, and so the read-only affordance in FR-023 can name a real destination.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `tenant_id` | uuid, FK → `tenant` | |
| `user_identity_id` | uuid, FK → `user_identity` | |
| `field_path` | text | Which field a correction is sought for |
| `requested_value` | text | |
| `status` | text | `PENDING` \| `APPROVED` \| `REJECTED` |
| `requested_at` / `decided_at` | timestamptz | |
| `decided_by_user_id` | uuid, nullable | |

**Indexes**: `(tenant_id, status)`, `(tenant_id, user_identity_id)`.

---

## Relationships

```text
user_identity ──1:1── user_profile          (identity-level: name, photo ref)
      │       ──1:1── user_preference       (identity-level: language, appearance, notifications)
      │
      ├──1:N── auth_session                 (existing — sessions panel)
      ├──1:N── security_event               (existing — activity panel)
      ├──1:N── role_assignment ──N:1── role (existing — which panel to render)
      │
      ├──0:1── staff_profile      per tenant ──1:N── teaching_assignment
      ├──0:1── student_enrollment per tenant
      └──0:1── parent_identity              (existing, cross-tenant by design)
                     └──1:N── parent_school_link ──N:1── tenant
                     └──1:N── family_access_grant
```

## Which panel renders

Resolved from the **active** role assignment, never from client input (FR-013, FR-028):

| Role key | Panel source |
|---|---|
| `PLATFORM_SUPER_ADMIN` | No tenant. Static platform-scope content; no school-shaped element rendered at all |
| `SCHOOL_ADMIN_OFFICE`, `PRINCIPAL`, `ACCOUNTANT` | `staff_profile` |
| `TEACHER` | `staff_profile` + `teaching_assignment` |
| `STUDENT` | `student_enrollment` + guardians via `family_access_grant` |
| `PARENT_GUARDIAN` | `parent_school_link` + `family_access_grant` |

A role with no matching row renders the empty state required by FR-033 — explaining what will appear and who populates it — not a blank region.

## The parent privacy boundary

The one place in this model where a query may deliberately cross tenants, and the one most likely to leak (FR-029, FR-030).

Two repository methods, named so the difference cannot be missed:

- `findLinkedChildrenForParentAcrossTenants(parentIdentityId)` — the parent's own view. Returns every school. Callable **only** when the authenticated principal *is* that parent.
- `findLinkedChildrenWithinTenant(parentIdentityId, tenantId)` — every school-side caller. Returns only that school's links.

The school-side method must not expose a count, a total, an ordering, or a paging cursor derived from the full cross-tenant set — any of which would let school A infer that school B exists. The dedicated test asserts absence of inference, not merely absence of rows.

## Migration notes

- **One migration**, single head, forward-only.
- Every tenant-owned table above gets `tenant_id`, a leading index, and an RLS policy in that same migration — the checklist ADR 0003 requires.
- The migration is additive only: no existing column is altered, renamed, or dropped, so it is safe on the populated development database.
- The seed becomes: two tenants (A and B), one person per role in each, one parent linked to a child in **both** — the fixture without which FR-029 cannot be tested at all.
