# Quickstart: Role-Aware Account Profile

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-08-03

How to run and validate this feature end to end. Scenario numbers map to spec user stories.

## Prerequisites

- PostgreSQL reachable via `DATABASE_URL` in `backend/.env`
- `backend/.env` and `frontend/.env.local` present (copy from each `.env.example`)
- Migrations applied and the seed run

```bash
cd backend && npm run db:migrate:dev && npm run db:seed
```

The seed must produce **two** schools, one person per role in each, and one parent linked to a child in **both**. Without the second school, FR-029 cannot be tested at all — the most security-critical requirement in this feature would silently go unverified.

## Run

```bash
cd backend && npm run start:dev
```

```bash
cd frontend && npm run dev
```

Sign in at `http://localhost:3000/login`, then open `/profile`.

> **Note**: `npm run start:prod` is broken independently of this feature — it runs `node dist/main` but the build emits `dist/src/main.js`, because `prisma.config.ts` at the repo root lifts `rootDir`. Use `start:dev` until that is fixed.

---

## Gate 0 — tenant context actually works

**Run this before anything else.** It is the phase A gate, and the reason this feature exists in the order it does. Everything below is meaningless if it fails.

```bash
cd backend && npm run test -- tenant-context
```

Must demonstrate:

1. A tenant-owned query issued **without** tenant context raises `TENANT_CONTEXT_MISSING` — it does **not** return an empty list. An empty result is precisely what hid this defect for two migrations.
2. With context set to school A, a query for school B's rows returns nothing.
3. `SET LOCAL` is scoped to its transaction: a second request on the same pooled connection does not inherit the first request's tenant.

Also confirm the startup check fires. With a `BYPASSRLS` role (the current Neon `neondb_owner`), the API must log a loud warning at boot that the RLS backstop is not in force. Silence here is what let the original defect through.

```bash
cd backend && npm run start:dev 2>&1 | grep -i "bypass"
```

---

## Scenario 1 — anyone maintains their own account (US1, P1)

Sign in as the Platform Super Admin. This works with **no school, staff, or student record** — the deliberate reduced slice.

1. Open `/profile`. Expect name, email, phone, and an initials avatar.
2. Change the phone number and language. Expect an immediate save.
3. Sign out, sign back in. Expect both to have persisted.
4. Submit an invalid phone number. Expect a field-level message and **no** partial save.
5. Confirm the Platform panel shows platform scope and the audit notice, with **no** school-shaped element anywhere.

## Scenario 2 — each role gets its own panel (US2, P1)

Sign in as each of the seven seeded roles in school A.

| Role | Expect |
|---|---|
| Platform Super Admin | Platform scope, no school affiliation |
| School Admin Office | Staff record |
| Principal | Staff record + oversight scope |
| Accountant | Staff record + finance scope + the "cannot modify academic records" boundary |
| Teacher | Staff record + subjects/sections + class-teacher flag |
| Student | Enrolment + linked guardians |
| Parent / Guardian | Children grouped by school |

Then delete a teacher's assignments and reload: the panel must explain what will appear and who populates it (FR-033), not render blank.

## Scenario 3 — parent privacy across schools (US3, P1) — highest risk

The one most likely to be got wrong quietly.

1. Sign in as the parent linked to children in **both** schools. Expect both, grouped by school.
2. As school A's admin, read anything relating to that parent. Expect only the school A link.
3. Confirm no **inference** channel exists: no total, no count, no ordering, no paging cursor derived from the cross-tenant set.

```bash
cd backend && npm run test -- parent-privacy
```

The test must assert absence of inference, not merely absence of rows — a response that returns one row but a total of two still leaks.

## Scenario 4 — sessions and activity (US4, P2)

1. Sign in from two browsers. Both appear; the current one is flagged.
2. End the other. Confirm it can perform no further action.
3. Check recent activity lists sign-ins, failed attempts, and lockouts, and exposes **no** raw IP.
4. End your own current session. Expect a return to sign-in, not a dead page.

## Scenario 5 — school-managed fields (US5, P2)

1. As a teacher, confirm every non-editable field states who manages it and how to request a correction.
2. Attempt `PATCH /me` with `employeeNumber`. Expect rejection and no change:

```bash
curl -s -X PATCH http://localhost:3001/api/v1/me \
  -H "Content-Type: application/json" -b cookies.txt \
  -d '{"employeeNumber":"HACKED"}'
```

Expect `VALIDATION_FAILED` (stripped by `forbidNonWhitelisted`) or `FIELD_NOT_EDITABLE`. Then re-read `GET /me` and confirm the value is unchanged.

## Scenario 6 — multi-role separation (US6, P3)

Assign one person both Teacher and Parent in school A.

1. In Teacher view: teaching assignment shown, children **absent from the response body**, not merely hidden in the UI.
2. Switch to Parent view: the reverse.
3. The shared core is byte-identical across both.

---

## Full gate

```bash
cd backend && npm run lint && npm run typecheck && npm run test && npm run test:e2e && npm run build
```

```bash
cd frontend && npm run lint && npm run typecheck && npm run test && npm run build
```

Migrations on a **fresh** database and on the **existing** one, single head both times:

```bash
cd backend && npm run db:validate && npm run db:migrate:deploy
```

## Accessibility

Parity with the sign-in page, which is the standard this feature inherits:

- Exactly one `h1` at every breakpoint
- All text ≥ 4.5:1 against its surface
- Every field labelled; errors wired via `aria-invalid` / `aria-describedby`
- Full keyboard reachability; visible focus
- Every list and detail area has a defined empty, loading, and error state (FR-032)

## Definition of Done

- [ ] Gate 0 passes — tenant context proven, startup check fires
- [ ] All six scenarios pass
- [ ] Isolation and parent-privacy tests are dedicated, not incidental
- [ ] Both ADRs recorded (`docs/decisions/`): foundation gating exemption, tenant context mechanism
- [ ] Module docs written: `docs/README.md` both sides, `docs/API.md` backend
- [ ] Full gate green on both apps
- [ ] Deferred items stated in the module docs, not silently dropped: photo upload, email change, MFA enrolment, approval workflow, password recovery
