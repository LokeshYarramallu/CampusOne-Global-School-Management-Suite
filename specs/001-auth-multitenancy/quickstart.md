# Quickstart Validation: Authentication, Authorization & Multi-Tenant Isolation

**Date**: 2026-08-01 | **Feature**: `001-auth-multitenancy` | **Spec**: [spec.md](spec.md) | **Contracts**: [contracts/README.md](contracts/README.md) | **Data model**: [data-model.md](data-model.md)

Runnable scenarios that prove the feature works end-to-end at each priority. These are validation guides, not implementations — full code, migrations, and test suites belong to `tasks.md` and `/speckit-implement`.

## Prerequisites

- **Infrastructure (dev)**: PostgreSQL, Redis, and Keycloak running locally (docker-compose, to be added in tasks). Keycloak configured with one shared realm and the OIDC client used by the frontend.
- **Backend**: `cd backend && npm install && npm run start:dev` (after Prisma is installed and `DATABASE_URL` is set; first migration applied).
- **Frontend**: `cd frontend && npm install && npm run dev` (Auth.js v5 pointed at the Keycloak client).
- **Env**: copy `backend/.env.example` → `backend/.env` and `frontend/.env.example` → `frontend/.env.local`; fill `DATABASE_URL`, `KEYCLOAK_*`, `REDIS_URL`.

## P1 validation scenarios

### 1. Tenant self-registration & foundation config (Story 1)
1. `POST /api/v1/tenants` with a new slug + owner email → expect `201` with tenant + owner onboarding.
2. Owner signs in via the frontend login UI (OIDC → Keycloak), completes MFA if required.
3. `PUT /api/v1/tenant/configuration` with timezone/currency/languages/moduleActivation → expect `200`.
4. **Expected**: tenant exists, foundation settings persisted, owner is the first admin, module-activation flags control reachability.

### 2. Sign-in with credentials + MFA (Story 2)
1. As the owner, enable MFA for a role via tenant `mfaPolicy`.
2. Sign in as a user in that role → expect the flow to require a second factor (TOTP/email code); `GET /api/v1/auth/mfa-policy` returns the required factors.
3. Complete MFA → reach the role-appropriate experience.
4. **Expected**: MFA enforcement takes effect at next sign-in; failed attempts lock the account after the configured threshold.

### 3. SSO sign-in (Story 3)
1. `POST /api/v1/auth/sso/google/link` while authenticated → links the provider.
2. Sign out, sign in via Google from the login UI → authenticated without password.
3. **Expected**: provider identity links and re-authenticates.

### 4. Session management (Story 4)
1. Open two sessions; `GET /api/v1/auth/sessions` → both listed.
2. `DELETE /api/v1/auth/sessions/:id` → the terminated session can no longer call authenticated endpoints (expect `401`).
3. As School Admin, `POST /api/v1/admin/sessions/:userId/terminate` → target session ends.
4. **Expected**: terminated sessions cannot act; concurrent limits evict per policy.

### 5. RBAC + scope + custom roles (Story 5)
1. `POST /api/v1/roles` (custom role with a scoped permission) → `201`.
2. `POST /api/v1/role-assignments` assigning it to a user with a class scope.
3. As that user, attempt an out-of-scope read → expect `403 PERMISSION_DENIED`.
4. `GET /api/v1/audit?action=ROLE_*` → the role/permission change appears with before/after within one minute.
5. **Expected**: scope enforced; custom-role creation < 5 min; changes audited.

### 6. Platform admin manages tenants (Story 6)
1. As Platform Super Admin, `GET /api/v1/platform/tenants` → list (audited cross-tenant path).
2. `POST /api/v1/platform/tenants/:id/suspend` → suspended tenant's users cannot sign in.
3. Attempt to delete/alter an audit record as School Owner → expect `403`.
4. **Expected**: platform admin operates tenants; audit is immutable.

### 7. New-parent onboarding (Story 7)
1. `POST /api/v1/parents/invite` (school records a new parent's verified email) → invitation sent.
2. Parent accepts, verifies identity, sets credentials → lands on dashboard with their child.
3. **Expected**: registration through first child linked < 5 min; identity is platform-level.

### 8. Existing-parent consent link (Story 8)
1. With the parent from #7, register a second tenant and `POST /api/v1/parents/invite` with the same verified email → a link request (not a new account) is sent.
2. Parent calls `POST /api/v1/parents/link-requests/:id/accept` → second school + child appear under the same account, no re-registration.
3. As the first school, attempt any enumeration of the parent's other schools → none revealed.
4. **Expected**: linking < 1 min, no re-registration; privacy boundary holds.

### 9. Guardian scope + revocation (Story 9)
1. `POST /api/v1/me/parent/guardians` (primary parent invites a guardian with a limited scope).
2. As the guardian, verify access is exactly the granted scope.
3. `DELETE /api/v1/me/parent/guardians/:id` → guardian's access ends immediately.
4. **Expected**: scope exact; revocation immediate.

### 10. Feature gating (Story 1 + gate)
1. `PUT /api/v1/tenant/features/some_module` → disabled.
2. Any call to that module's endpoints (including direct/background) → `403 FEATURE_DISABLED`.
3. **Expected**: disabled feature unreachable through any path, not merely hidden.

### 11. Notifications (Story 10)
1. Trigger an auth notification (e.g. parent invitation) → `GET /api/v1/notifications` shows it in the in-app feed; email delivered.
2. Inspect delivery status → `SENT`/`DELIVERED`; simulate a channel failure → retry + fallback visible.
3. Set quiet hours → a routine notification is suppressed; an emergency broadcast is delivered.
4. **Expected**: delivery success ≥ 99.5% within SLA; retry/fallback works; quiet hours + emergency override work. *(Push/in-app channels fully exercisable once the mobile/app shell exists — P2.)*

### 12. Audit end-to-end (Story 11)
1. Perform a state-changing action → `GET /api/v1/audit` finds it with before/after.
2. `GET /api/v1/audit/export` for a date range → export completes < 5 min.
3. Configure `PUT /api/v1/audit/webhook` → audit events arrive at the webhook endpoint (via BullMQ, with retry).
4. **Expected**: every significant action logged; records immutable; export < 5 min; SIEM streaming works.

## P2 validation scenarios (after mobile shell / later in this feature)

- **Multi-role switching (Story 12)**: a Teacher-Parent switches views; each view shows exactly that role's permissions, never a blend.
- **Multi-campus (Story 13)**: a two-campus tenant produces a consolidated report in one action.
- **Config rollback (Story 14)**: roll back foundation configuration to a prior version.
- **Biometrics + magic-link (Story 15)**: returning mobile user signs in with biometrics < 3 s; magic-link sign-in succeeds.
- **Identity deletion + export (Story 16)**: `POST /api/v1/me/export` delivers a machine-readable package; `DELETE /api/v1/me` removes the identity per policy (audited).

## Test commands

```bash
# Backend
cd backend && npm run lint && npm run typecheck && npm run test && npm run test:e2e && npm run build

# Frontend
cd frontend && npm run lint && npm run typecheck && npm run test && npm run build
```

Every module's test suite MUST include a **tenant-isolation test** (tenant A cannot read/mutate tenant B's records) and an **authorization+scope test** (out-of-scope access denied). These are constitution requirements (Principle III/VI), not optional.