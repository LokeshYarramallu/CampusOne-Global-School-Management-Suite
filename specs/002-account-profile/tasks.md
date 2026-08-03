---

description: "Task list for Role-Aware Account Profile"
---

# Tasks: Role-Aware Account Profile

**Input**: Design documents from `/specs/002-account-profile/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/README.md)

**Tests**: Included. Constitution Principle VI (Test-Including) requires them, every user story in the spec carries an Independent Test, and SC-004/SC-005 demand systematic access testing.

**Organization**: Grouped by user story so each can be implemented, tested, and demoed independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete work)
- **[Story]**: Which user story the task serves (US1–US6)

## Path Conventions

Web application: `backend/src/`, `frontend/src/`, per [plan.md](./plan.md) Structure Decision.

---

## Phase 1: Setup

**Purpose**: Directory skeletons and the two decision records the plan requires *before* the behaviour they govern is built (constitution Principle VII).

- [ ] T001 Create backend module directories `backend/src/modules/profile/{dto,repositories,docs,tests}` and `backend/src/modules/tenant/{docs,tests}`
- [ ] T002 [P] Create frontend module directories `frontend/src/modules/profile/{components/panels,services,schemas,types,utils,docs,tests}`
- [ ] T003 [P] Write ADR `docs/decisions/0004-foundation-surfaces-exempt-from-tenant-gating.md` justifying the FR-037 deviation from constitution Principle II (NON-NEGOTIABLE)
- [ ] T004 [P] Write ADR `docs/decisions/0005-tenant-context-propagation.md` recording the `SET LOCAL app.tenant_id` mechanism and the non-bypassing database role requirement, closing the item deferred by ADR 0003

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Tenant isolation, authorization, data, and shared UI. Nothing user-facing ships before this.

**⚠️ CRITICAL**: T005–T012 close the defect found in research R1 — RLS is enabled and forced on six tables while the connected role carries `BYPASSRLS` and `app.tenant_id` is never set. Constitution Principle III is **FAIL** until this phase completes. No tenant-owned read may be written before T012 passes.

### Tenant context (research R1)

- [ ] T005 Define the active-tenant context type and server-side resolver in `backend/src/core/auth/tenant-context.ts`, deriving tenant strictly from `AuthPrincipal` (never from body, query, or header)
- [ ] T006 Implement tenant-scoped execution in `backend/src/infrastructure/prisma/tenant-scoped.client.ts` using an interactive `$transaction` that issues `SET LOCAL app.tenant_id` before any tenant-owned query
- [ ] T007 Raise `TENANT_CONTEXT_MISSING` (500) when a tenant-owned read is attempted with no context in `backend/src/infrastructure/prisma/tenant-scoped.client.ts` — never return an empty result, which is exactly what concealed this defect
- [ ] T008 Add a boot-time check in `backend/src/infrastructure/prisma/prisma.service.ts` that queries `pg_roles` for the connected role and logs a prominent warning when `rolsuper` or `rolbypassrls` is true
- [ ] T009 [P] Test tenant-scoped execution in `backend/src/infrastructure/prisma/tests/tenant-scoped.client.spec.ts`: missing context raises rather than returning empty; context for tenant A returns no tenant B rows; a second transaction on a pooled connection does not inherit the previous tenant
- [ ] T010 [P] Document the non-bypassing application role in `backend/README.md` and add the connection-string guidance to `backend/.env.example`

### Data model

- [ ] T011 Add `UserProfile`, `UserPreference`, `StaffProfile`, `StudentEnrollment`, `TeachingAssignment`, `ProfileChangeRequest` models to `backend/prisma/schema.prisma` per [data-model.md](./data-model.md)
- [ ] T012 Create migration `backend/prisma/migrations/<ts>_account_profile/migration.sql` — tables, constraints, an index leading with `tenant_id` on every tenant-owned table, and an RLS policy on each, all in this one migration. Single head, additive only
- [ ] T013 Extend `backend/prisma/seed.ts` to create two tenants, one person per seeded role in each, and one parent linked to a child in **both** — without the second tenant FR-029 cannot be tested at all

### Authorization

- [ ] T014 Implement the permission evaluation service in `backend/src/modules/rbac/permission-evaluator.service.ts`, resolving `self`, `linked`, `assigned`, `school`, and `platform` scopes as named strategies
- [ ] T015 Implement `@RequirePermission(module, feature, action)` and its guard in `backend/src/core/auth/require-permission.guard.ts`
- [ ] T016 [P] Test each scope strategy in `backend/src/modules/rbac/tests/permission-evaluator.spec.ts`, including the denial path for every one
- [ ] T017 Export the evaluator from `backend/src/modules/rbac/rbac.module.ts` (public API only — no deep imports)

### Modules and wiring

- [ ] T018 [P] Implement the read-only tenant module in `backend/src/modules/tenant/tenant.service.ts` and `tenant.module.ts` — resolve and expose a school; provisioning belongs to a separate feature
- [ ] T019 [P] Add feature error codes to `backend/src/modules/profile/profile.constants.ts`: `PROFILE_NOT_FOUND`, `FIELD_NOT_EDITABLE`, `PREFERENCE_INVALID`, `SESSION_NOT_FOUND`, `CURRENT_PASSWORD_INCORRECT`, `TENANT_CONTEXT_MISSING`
- [ ] T020 Register `TenantModule` and `ProfileModule` in `backend/src/app.module.ts`

### Frontend foundation

- [ ] T021 Move `TextField` and `StatusNotice` from `frontend/src/modules/identity/components/` to `frontend/src/shared/components/`, relocating their tests — they now have two consumers, satisfying the AGENTS.md "≥2 modules" rule. Its own step, not folded into the profile UI
- [ ] T022 Move the reusable field tokens from `frontend/src/modules/identity/constants.ts` into `frontend/src/shared/components/fieldStyles.ts` and update both modules' imports
- [ ] T023 Add `/profile` to the matcher in `frontend/src/proxy.ts`
- [ ] T024 Verify the identity module is still green after the move: `cd frontend && npm run lint && npm run typecheck && npm run test`

**Checkpoint**: Tenant isolation proven, authorization enforceable, data seeded, shared UI relocated. User stories can begin.

---

## Phase 3: User Story 1 — Any signed-in person maintains their own account (P1) 🎯 MVP

**Goal**: The shared core — identity, contact details, credentials, preferences — for every role.

**Independent Test**: Sign in as the existing Platform Super Admin, view the page, change phone and language, sign out and back in, confirm persistence. Requires no school, staff, or student record.

### Tests for User Story 1

- [ ] T025 [P] [US1] Contract test for `GET /me` in `backend/src/modules/profile/tests/profile.controller.spec.ts` — payload shape, `editability` map present, no password hash or token in the response
- [ ] T026 [P] [US1] Contract test for `PATCH /me` in `backend/src/modules/profile/tests/profile.controller.spec.ts` — self-editable field accepted, unknown field rejected, no partial write on validation failure

### Implementation for User Story 1

- [ ] T027 [P] [US1] Implement `backend/src/modules/profile/repositories/user-profile.repository.ts` for the identity-level profile and preference rows
- [ ] T028 [P] [US1] Define request DTOs in `backend/src/modules/profile/dto/update-profile.dto.ts` and `update-preferences.dto.ts` with `class-validator`, whitelisting only self-editable fields
- [ ] T029 [US1] Implement shared-core assembly in `backend/src/modules/profile/profile.service.ts`, including the server-computed `editability` map that the client renders from
- [ ] T030 [US1] Implement `GET /me` and `PATCH /me` in `backend/src/modules/profile/profile.controller.ts`, taking the subject from the session only
- [ ] T031 [US1] Implement `GET /me/preferences` and `PATCH /me/preferences` in `backend/src/modules/profile/profile.controller.ts`, validating language against the school's configured set
- [ ] T032 [US1] Implement `POST /me/password` in `backend/src/modules/profile/profile.controller.ts` behind `@StrictRateLimit()`, reusing `backend/src/core/http/rate-limit.guard.ts`, and emit a `security_event`
- [ ] T033 [P] [US1] Define frontend types in `frontend/src/modules/profile/types/profile.ts` and boundary validation in `frontend/src/modules/profile/schemas/profileSchema.ts`
- [ ] T034 [P] [US1] Implement `frontend/src/modules/profile/services/profileApi.ts` through `frontend/src/core/http/apiClient.ts` — no component calls `fetch`
- [ ] T035 [US1] Build the shared core UI in `frontend/src/modules/profile/components/ProfileShell.tsx` with a generated initials avatar (photo upload deferred, research R2)
- [ ] T036 [US1] Add `frontend/src/app/profile/page.tsx` with its own metadata, and `frontend/src/app/profile/loading.tsx` mirroring the real layout
- [ ] T037 [US1] Define the empty, loading, and error state for every area of the shared core (FR-032) — no blank regions
- [ ] T038 [P] [US1] Test the shared core in `frontend/src/modules/profile/tests/ProfileShell.test.tsx`: renders identity, saves an edit, surfaces a field error, exactly one `h1`

**Checkpoint**: The account page works end to end for the Platform Super Admin with no school data. This is the demoable MVP.

---

## Phase 4: User Story 2 — Each role sees its own panel (P1)

**Goal**: One role panel per role, chosen server-side from the active role.

**Independent Test**: Sign in as each of the seven seeded roles and confirm each sees its own panel and no other.

### Tests for User Story 2

- [ ] T039 [P] [US2] Test panel resolution for all seven roles in `backend/src/modules/profile/tests/panel-resolver.spec.ts`, asserting the discriminated `panel.kind` and that no other role's fields appear
- [ ] T040 [P] [US2] Test the empty-panel path in `backend/src/modules/profile/tests/panel-resolver.spec.ts` — a teacher with no assignments yields an `emptyReason`, not a missing key

### Implementation for User Story 2

- [ ] T041 [P] [US2] Implement `backend/src/modules/profile/repositories/staff-profile.repository.ts`, tenant-scoped via the Phase 2 client
- [ ] T042 [P] [US2] Implement `backend/src/modules/profile/repositories/student-enrollment.repository.ts`, tenant-scoped
- [ ] T043 [P] [US2] Implement `backend/src/modules/profile/repositories/teaching-assignment.repository.ts`, tenant-scoped
- [ ] T044 [US2] Implement panel resolution in `backend/src/modules/profile/panel-resolver.service.ts`, returning exactly one discriminated panel for the active role
- [ ] T045 [US2] Apply per-panel feature gating in `backend/src/modules/profile/panel-resolver.service.ts` (FR-038): a gated-off panel returns `kind: "UNAVAILABLE"` and its data is never read
- [ ] T046 [P] [US2] Build `frontend/src/modules/profile/components/panels/PlatformPanel.tsx`
- [ ] T047 [P] [US2] Build `frontend/src/modules/profile/components/panels/StaffPanel.tsx` (School Admin Office, Principal, Accountant — including the Accountant's academic-records boundary statement)
- [ ] T048 [P] [US2] Build `frontend/src/modules/profile/components/panels/TeacherPanel.tsx`
- [ ] T049 [P] [US2] Build `frontend/src/modules/profile/components/panels/StudentPanel.tsx`
- [ ] T050 [US2] Select the panel component by `panel.kind` in `frontend/src/modules/profile/components/ProfileShell.tsx` — a lookup, so a new role is a new file rather than a longer conditional
- [ ] T051 [US2] Give every panel its empty state explaining what will appear and who populates it (FR-033)
- [ ] T052 [P] [US2] Test panel rendering per role in `frontend/src/modules/profile/tests/panels.test.tsx`

**Checkpoint**: All seven roles see a meaningful, correct panel.

---

## Phase 5: User Story 3 — Parent sees every child; no school learns of the others (P1)

**Goal**: The cross-tenant privacy boundary. Highest-risk story in the feature.

**Independent Test**: A parent with children at two schools sees both; each school's admin sees only its own and cannot infer the other.

### Tests for User Story 3

- [ ] T053 [P] [US3] Privacy test in `backend/src/modules/profile/tests/parent-privacy.spec.ts`: the parent's own view returns both schools; the school-scoped method returns only one
- [ ] T054 [P] [US3] Inference test in `backend/src/modules/profile/tests/parent-privacy.spec.ts`: the school-scoped response leaks no total, count, ordering, or paging cursor derived from the cross-tenant set — assert absence of *inference*, not merely absence of rows
- [ ] T055 [P] [US3] Tenant isolation test in `backend/src/modules/profile/tests/tenant-isolation.spec.ts`: school A cannot read school B's staff or student records by any path (constitution Principle III)

### Implementation for User Story 3

- [ ] T056 [US3] Implement `findLinkedChildrenForParentAcrossTenants` in `backend/src/modules/profile/repositories/parent-link.repository.ts` — explicitly named, callable only when the principal *is* that parent
- [ ] T057 [US3] Implement `findLinkedChildrenWithinTenant` in `backend/src/modules/profile/repositories/parent-link.repository.ts` for every school-side caller
- [ ] T058 [US3] Wire the parent panel in `backend/src/modules/profile/panel-resolver.service.ts`, choosing the method by who is asking
- [ ] T059 [P] [US3] Build `frontend/src/modules/profile/components/panels/ParentPanel.tsx` — children grouped by school, with relationship, primary-contact, billing responsibility, and access scope
- [ ] T060 [US3] Handle guardian revocation in the panel so a revoked child disappears on next load (FR-031)
- [ ] T061 [P] [US3] Test the parent panel in `frontend/src/modules/profile/tests/panels.test.tsx` — grouping by school, and the empty state when the only link is revoked

**Checkpoint**: The platform's defining innovation works, and its privacy boundary is proven by dedicated tests.

---

## Phase 6: User Story 4 — Sessions and security activity (P2)

**Goal**: Complete feature 001's User Story 4, which was specified and never built.

**Independent Test**: Sign in from two sessions, end one, confirm it can no longer act.

### Tests for User Story 4

- [ ] T062 [P] [US4] Test session listing and termination in `backend/src/modules/profile/tests/sessions.spec.ts`, including that another person's session id yields `SESSION_NOT_FOUND` rather than a distinguishable error
- [ ] T063 [P] [US4] Test that `GET /me/activity` never returns `ipHash` or a raw address in `backend/src/modules/profile/tests/activity.spec.ts` (FR-012)

### Implementation for User Story 4

- [ ] T064 [US4] Implement `GET /auth/sessions` and `DELETE /auth/sessions/:id` in `backend/src/modules/identity/auth.controller.ts`, reusing the existing `AuthService.revokeAccessToken`
- [ ] T065 [US4] Implement `GET /me/activity` in `backend/src/modules/profile/profile.controller.ts`, reading `security_event` with a bounded window and returning a coarse user-agent description only
- [ ] T066 [P] [US4] Build `frontend/src/modules/profile/components/SessionList.tsx`, flagging the current session and handling self-termination by returning to sign-in
- [ ] T067 [P] [US4] Build `frontend/src/modules/profile/components/ActivityList.tsx` with its empty state
- [ ] T068 [P] [US4] Test both in `frontend/src/modules/profile/tests/sessions.test.tsx`

**Checkpoint**: A person can investigate and shut down suspicious access to their own account.

---

## Phase 7: User Story 5 — School-managed fields explain themselves (P2)

**Goal**: No unexplained disabled controls anywhere on the page.

**Independent Test**: As a teacher and as a student, every non-editable field states who manages it and how to request a correction.

### Tests for User Story 5

- [ ] T069 [P] [US5] Test that a write to a non-`SELF` field is rejected with no change recorded in `backend/src/modules/profile/tests/editability.spec.ts` (FR-024, FR-025)
- [ ] T070 [P] [US5] Test that every rendered read-only field carries a management explanation in `frontend/src/modules/profile/tests/editability.test.tsx` (FR-023)

### Implementation for User Story 5

- [ ] T071 [US5] Enforce the editability tier server-side in `backend/src/modules/profile/profile.service.ts` — re-checked in the service, not trusted from the DTO whitelist alone
- [ ] T072 [P] [US5] Build `frontend/src/modules/profile/components/ManagedField.tsx` rendering value plus who manages it and the route to request a change
- [ ] T073 [US5] Apply `ManagedField` to every read-only field across the shell and all panels
- [ ] T074 [US5] Render email as managed with the deferral explained (research R3) rather than offering a confirmation that cannot be delivered

**Checkpoint**: The page explains itself; zero silent dead ends.

---

## Phase 8: User Story 6 — Multi-role separation (P3)

**Goal**: Exactly one role panel per view, never a blend.

**Independent Test**: Give one person Teacher and Parent roles; switch views; confirm the shared core is identical and only one panel appears.

### Tests for User Story 6

- [ ] T075 [P] [US6] Test that the inactive role's data is absent from the **response body**, not merely hidden in the UI, in `backend/src/modules/profile/tests/role-separation.spec.ts` (FR-014)
- [ ] T076 [P] [US6] Test that a single-role person gets no switcher in `frontend/src/modules/profile/tests/ProfileShell.test.tsx` (FR-015)

### Implementation for User Story 6

- [ ] T077 [US6] Extend `backend/prisma/seed.ts` with one person holding both Teacher and Parent roles in school A
- [ ] T078 [US6] Resolve the active role from the session in `backend/src/modules/profile/panel-resolver.service.ts` and return only that role's panel
- [ ] T079 [US6] Render the role switcher in `frontend/src/modules/profile/components/ProfileShell.tsx` only when `hasMultipleRoles` is true

**Checkpoint**: Role views are provably separate.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T080 [P] Write `backend/src/modules/profile/docs/README.md` and `docs/API.md`
- [ ] T081 [P] Write `backend/src/modules/tenant/docs/README.md`
- [ ] T082 [P] Write `frontend/src/modules/profile/docs/README.md`
- [ ] T083 [P] Update `backend/README.md` env table and `frontend/README.md` if any variable was added
- [ ] T084 Record deferred items in the module docs — photo upload, email change, MFA enrolment, approval workflow, password recovery — named, not silently dropped
- [ ] T085 Accessibility pass: one `h1` at every breakpoint, 4.5:1 contrast, labelled fields, `aria-invalid`/`aria-describedby`, keyboard reachability (FR-035)
- [ ] T086 Verify migrations on a **fresh** database and on the **existing** one, single head both times
- [ ] T087 Full gate — backend `lint`, `typecheck`, `test`, `test:e2e`, `build`; frontend `lint`, `typecheck`, `test`, `build`
- [ ] T088 Walk [quickstart.md](./quickstart.md) end to end, including Gate 0 and all six scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup; **blocks every user story**. T005–T012 in particular block all tenant-owned reads
- **US1 (Phase 3)**: depends on Phase 2. Needs no tenant data — the reduced slice
- **US2 (Phase 4)**: depends on Phase 2 and on US1's shell (T035)
- **US3 (Phase 5)**: depends on Phase 2 and US2's resolver (T044)
- **US4 (Phase 6)**: depends on Phase 2 only — genuinely independent of US2/US3
- **US5 (Phase 7)**: depends on US1's editability map (T029)
- **US6 (Phase 8)**: depends on US2 and US3 panels existing
- **Polish (Phase 9)**: depends on all shipped stories

### Critical path

```text
T005 → T006 → T007 → T009   (tenant context proven)
   → T011 → T012 → T013     (data + seed)
   → T029 → T030            (shared core)
   → T044                   (panels)
   → T056/T057              (parent privacy)
```

### Parallel Opportunities

- T002, T003, T004 together (Setup)
- T009, T010 together; T016, T018, T019 together (Foundational)
- All three repositories T041–T043 together
- All four panel components T046–T049 together
- Every test task marked [P] within a story
- US4 can be built alongside US2/US3 by a second person — it touches different files entirely

---

## Parallel Example: User Story 2

```bash
# Repositories together — different files, no interdependency:
Task: "Implement staff-profile.repository.ts"
Task: "Implement student-enrollment.repository.ts"
Task: "Implement teaching-assignment.repository.ts"

# Panel components together:
Task: "Build PlatformPanel.tsx"
Task: "Build StaffPanel.tsx"
Task: "Build TeacherPanel.tsx"
Task: "Build StudentPanel.tsx"
```

---

## Implementation Strategy

### MVP: Phases 1–3

Setup → Foundational → US1. Delivers a working account page for the Platform Super Admin **with no school data required**. Stop here and validate before adding panels.

Note that the Foundational phase is large and produces nothing visible. That is a consequence of the research R1 finding, not of the feature's design: the RLS backstop must work before anything reads a tenant-owned row.

### Incremental Delivery

1. Phases 1–2 → foundation, tenant isolation proven
2. Phase 3 → **MVP**, demoable
3. Phase 4 → all seven roles meaningful
4. Phase 5 → parent privacy, the defining innovation
5. Phases 6–8 → sessions, self-explaining fields, role separation
6. Phase 9 → docs and the full gate

### Suggested cut if scope must shrink

Phases 1–3 plus Phase 9 is a coherent, shippable, honest product: one account page, correct for every role's shared core, with the tenant-isolation defect fixed. Role panels then land incrementally.

---

## Notes

- `[P]` = different files, no dependency on incomplete work
- Verify each test fails before implementing the behaviour it covers
- Commit after each task or logical group
- **T005–T012 are not optional and cannot be reordered after the user stories.** They close a live defect in existing code: RLS is enabled and forced on six tables while the connected role bypasses it and `app.tenant_id` is never set
