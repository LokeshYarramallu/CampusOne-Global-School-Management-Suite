# API Contracts: Role-Aware Account Profile

**Date**: 2026-08-03 | **Feature**: `002-account-profile` | **Base path**: `/api/v1`

All endpoints use the standard error envelope (`{ error: { code, message, details } }`, `SCREAMING_SNAKE_CASE` codes — `backend/src/core/http/api-error.ts`). All require authentication. The subject is **always** the authenticated principal; no endpoint here accepts a user identifier from the client (FR-028).

## Relationship to feature 001's contract

Feature 001 already reserved a `/me` namespace. **This feature realises those paths rather than creating a parallel `/profile/*` namespace** — duplicate endpoints for the same resource are forbidden by the constitution.

| 001 reserved | This feature |
|---|---|
| `GET /me`, `PATCH /me`, `POST /me/password` | Implemented as specified |
| `GET /auth/sessions`, `DELETE /auth/sessions/:id` | Implemented at 001's paths verbatim — not re-homed under `/me` |
| `GET/PUT /me/notification-preferences` | **Superseded** by `GET/PATCH /me/preferences`. One `user_preference` row holds language, appearance, and notification preferences, so one endpoint owns it. Recorded here so the two contracts do not disagree |
| `GET /me/mfa` | Read-only here (which factors are enrolled). Enrolment stays deferred to the Keycloak feature |

`GET /auth/me` already exists and returns the **session principal** (id, email, role). It is unchanged and keeps its narrow purpose; `GET /me` returns the full account page payload. They are not duplicates — one answers "who is this request", the other "what does the account page show".

## Endpoints

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/me` | *Authenticated* | Account page payload: shared core + the panel for the **active** role. |
| PATCH | `/me` | *Authenticated* | Update self-editable identity fields. Currently phone only — name is approval-gated, email deferred. |
| GET | `/me/preferences` | *Authenticated* | Language, appearance, notification preferences. |
| PATCH | `/me/preferences` | *Authenticated* | Update any subset of the above. |
| POST | `/me/password` | *Authenticated* | Change own password. Rate limited via `@StrictRateLimit()`. |
| GET | `/me/activity` | *Authenticated* | Recent security activity, most recent first, bounded window. |
| GET | `/auth/sessions` | *Authenticated* | Own active sessions; current one flagged. |
| DELETE | `/auth/sessions/:id` | *Authenticated* | End one of own sessions. |

### `GET /me`

The role panel is chosen server-side from the active role assignment. **A client cannot request a panel**, and data for a role the caller is not currently acting in is never included in the response (FR-013, FR-014).

```jsonc
{
  "identity": {
    "userId": "…", "givenName": "Priya", "familyName": "Sharma",
    "displayName": "Priya Sharma", "email": "…", "phone": "…",
    "photoUrl": null,                      // always null this delivery (research R2)
    "avatarInitials": "PS"
  },
  "activeContext": {
    "roleKey": "TEACHER", "roleName": "Teacher",
    "tenantId": "…", "schoolName": "Greenwood High",
    "hasMultipleRoles": false              // drives whether a switcher renders (FR-015)
  },
  "security": {
    "passwordChangedAt": "…", "mfaFactors": [{ "type": "TOTP", "verified": true }],
    "activeSessionCount": 2
  },
  "editability": {                          // drives the UI; the API re-checks on write
    "phone": "SELF", "givenName": "APPROVAL", "familyName": "APPROVAL",
    "email": "APPROVAL", "employeeNumber": "SCHOOL_MANAGED"
  },
  "panel": {
    "kind": "TEACHER",                      // discriminated union — exactly one shape
    "staff": { "employeeNumber": "…", "designation": "…", "department": "…", "joinedOn": "…" },
    "assignments": [
      { "subject": "Mathematics", "classLabel": "8", "sectionLabel": "B", "isClassTeacher": true }
    ]
  }
}
```

**`panel.kind`** is one of `PLATFORM`, `STAFF`, `TEACHER`, `STUDENT`, `PARENT`. Each carries only its own fields. An absent underlying record yields the panel with empty collections plus an `emptyReason` the UI renders per FR-033 — never a missing key the client must guess about.

**`editability`** is returned rather than inferred by the client, so the read-only affordance in FR-023 has a real source and cannot drift from what the API will actually accept.

### `PATCH /me`

Body accepts only fields marked `SELF` in `editability`. Anything else is rejected by `forbidNonWhitelisted` and, defensively, re-checked in the service (FR-024, FR-025). No partial writes: a request with one invalid field changes nothing (FR-034).

### `GET /me/activity`

Returns `eventType`, `occurredAt`, and a coarse user-agent description. **Never** returns `ipHash`, a raw address, or another person's details (FR-012). Bounded to a recent window; not an unbounded audit export.

### Parent panel and the cross-school boundary

`GET /me` for a `PARENT_GUARDIAN` returns children grouped by school across **all** their schools — the caller is the parent, so FR-030 applies.

No endpoint in this feature lets a school-side role read another person's profile. When that endpoint arrives, it must use the tenant-scoped repository method (see [data-model.md](../data-model.md)) and must not leak counts, totals, orderings, or paging cursors derived from the cross-tenant set (FR-029).

## Error codes introduced

| Code | Status | When |
|---|---|---|
| `PROFILE_NOT_FOUND` | 404 | The principal has no profile row (a seeding defect, not a user error) |
| `FIELD_NOT_EDITABLE` | 403 | A write targeted a field not marked `SELF` |
| `PREFERENCE_INVALID` | 400 | Language outside the school's configured set, or unknown appearance value |
| `SESSION_NOT_FOUND` | 404 | Session id not found **or** not owned by the caller — deliberately indistinguishable, so the endpoint cannot enumerate others' sessions |
| `CURRENT_PASSWORD_INCORRECT` | 401 | Password change with a wrong current password |
| `TENANT_CONTEXT_MISSING` | 500 | A tenant-owned read was attempted with no tenant context. Server fault, never the caller's |

Reused: `VALIDATION_FAILED`, `UNAUTHENTICATED`, `FORBIDDEN`, `RATE_LIMITED`, `INTERNAL_ERROR`.

## Cross-cutting

- **Feature gating**: the shared core is ungated (FR-037 — foundation, like sign-in). Each role panel follows its owning capability's per-tenant gate (FR-038); a gated-off panel returns `panel: { kind: "UNAVAILABLE" }` and the underlying data is never read.
- **Tenant context**: set server-side per request before any tenant-owned read (research R1). Its absence is a 500, never a silent empty result — an empty list where rows exist is exactly the failure mode that hid the RLS defect.
- **Audit**: password change, session termination, and preference changes emit `security_event` rows, reusing the existing writer.
- **Data minimisation**: `GET /me` returns only fields the page renders. No password hash, no token, no raw IP, no other person's identifiers beyond the child/guardian names the panel legitimately shows.
