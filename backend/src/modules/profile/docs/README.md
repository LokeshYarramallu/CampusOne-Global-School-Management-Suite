# Profile (backend)

The account page: one page per person, shared across their roles, composed of a
**shared core** plus **exactly one role panel** chosen from the role they are
currently acting in.

Spec: [specs/002-account-profile](../../../../../specs/002-account-profile/spec.md)

## Responsibilities

| Owns | Does not own |
|---|---|
| Assembling the account payload for the active role | Authentication and session issuing (`identity`) |
| The editability tier — who may change what | Role and permission definitions (`rbac`) |
| Session listing and self-termination | School provisioning (`tenant`, and a future feature) |
| Recent security activity, read-only | Writing security events — the writer lives in `identity` |

Exported: `ProfileService`. Nothing outside reaches the repositories or the
panel resolver.

## Endpoints

See [API.md](./API.md). These realise the `/me` namespace that feature 001's
contract reserved rather than creating a parallel `/profile/*` one — duplicate
endpoints for one resource are forbidden.

## Key decisions

**The subject is always the session principal.** No endpoint accepts a user id
from the caller, so there is no path by which one person reads another's
profile (FR-028).

**Editability is enforced twice, deliberately.** The DTO whitelist strips
unknown fields (`forbidNonWhitelisted`), and `ProfileService` re-checks against
`FIELD_EDITABILITY` before writing. A whitelist is a contract; the second check
is the authorization decision, and the two can drift.

**`editability` is returned to the client.** The read-only affordance in the UI
renders from the same map the API enforces, so what the page shows and what the
API accepts cannot diverge.

**Tenant-owned reads go through `TenantScopedPrisma`.** Staff records, learner
enrolment, and teaching assignments are tenant-owned; every read sets
`app.tenant_id` for its transaction (ADR 0005). Identity-level tables — profile,
preferences, sessions, security events — deliberately do not.

**The parent boundary is two differently named repository methods.**
`findLinkedChildrenForParentAcrossTenants` is the parent's own view;
`findLinkedChildrenWithinTenant` is for every school-side caller. The names are
the guard. A school-side response must leak no total, count, ordering, or cursor
computed over the cross-tenant set — returning one row while disclosing a total
of two still tells school A that school B exists.

**A session id that is not yours yields the same error as one that does not
exist.** Distinguishing them would enumerate other people's sessions.

**Panel selection happens server-side.** The client cannot request a panel, and
data for an inactive role is never assembled — not merely hidden.

## Testing

```bash
npm run test
```

`tests/` covers panel resolution for all seven roles, empty states, feature
gating (including that gated-off data is never read), the tenant requirement,
the editability tiers, preference validation, and the parent cross-school
privacy boundary — including the inference channels, not just the rows.

## Limitations

- **Photo upload is not built.** `photoReference` is always null; the UI renders
  generated initials. Needs a storage adapter (PRD §5.8) — research R2.
- **Email change is not built.** Rendered read-only with an explanation, because
  the confirmation cannot be delivered without a notification adapter — research R3.
- **The change-request workflow is not built.** `profile_change_request` exists
  so the read-only affordance names a real destination, but nothing writes to it.
- **MFA enrolment is not built.** The page lists enrolled factors only.
- **Guardians are not yet listed on the student panel** — the reverse lookup from
  a learner to their guardians lands with the SIS feature.
- **Custom roles are not evaluated.** `PermissionEvaluatorService` reads the
  static catalog; a database-backed path is needed when custom roles arrive
  (spec 001 FR-018).
