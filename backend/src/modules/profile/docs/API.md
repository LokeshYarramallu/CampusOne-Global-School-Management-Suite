# Profile API

All paths under `/api/v1`. All require authentication. Errors use the platform
envelope: `{ "error": { "code", "message", "details" } }`.

**The subject is always the authenticated principal.** No endpoint here accepts
a user identifier from the caller (FR-028).

## `GET /me`

The whole account page: shared core plus the panel for the **active** role.

**Auth:** authenticated.

### Response `200`

```jsonc
{
  "identity": {
    "userId": "…", "givenName": "Priya", "familyName": "Sharma",
    "displayName": "Priya Sharma", "email": "…", "phone": "+91 …",
    "photoUrl": null,            // always null — upload deferred
    "avatarInitials": "PS"
  },
  "activeContext": {
    "roleKey": "TEACHER", "roleName": "Teacher",
    "tenantId": "…", "schoolName": "Greenwood High",
    "hasMultipleRoles": false
  },
  "security": {
    "passwordChangedAt": "2026-05-01T00:00:00.000Z",
    "mfaFactors": [], "activeSessionCount": 2
  },
  "editability": { "phone": "SELF", "givenName": "APPROVAL", … },
  "panel": { "kind": "TEACHER", … }
}
```

`panel.kind` is one of `PLATFORM`, `STAFF`, `TEACHER`, `STUDENT`, `PARENT`,
`UNAVAILABLE`. Exactly one shape arrives; a role the caller is not currently
acting in contributes nothing to the response.

An absent underlying record yields the panel with empty collections plus
`emptyReason`, so the UI has something to say rather than a missing key.

`editability` values: `SELF` (saves immediately), `VERIFICATION`, `APPROVAL`,
`SCHOOL_MANAGED`. Returned so the client's read-only affordance renders from the
same map the API enforces.

### Errors

| Status | Code | When |
|---|---|---|
| `401` | `UNAUTHENTICATED` | No or invalid session |
| `404` | `PROFILE_NOT_FOUND` | The principal has no profile row — a seeding defect, not a user error |
| `500` | `TENANT_CONTEXT_MISSING` | A tenant-owned read was attempted with no tenant context. Server fault |

## `PATCH /me`

Updates self-editable identity fields. Currently `phone` only — name is
approval-gated and email is deferred.

### Request

```json
{ "phone": "+91 98000 12345" }
```

Any other property is rejected by `forbidNonWhitelisted` and, defensively,
re-checked in the service. No partial writes: one invalid field changes nothing.

### Response `200`

The full `GET /me` payload, so the client does not need a second round trip.

### Errors

| Status | Code | When |
|---|---|---|
| `400` | `VALIDATION_FAILED` | Malformed value, or an unknown property. `details` carries per-field messages |
| `403` | `FIELD_NOT_EDITABLE` | A field not marked `SELF` reached the service |

#### Example — a school-managed field

```json
{
  "error": {
    "code": "FIELD_NOT_EDITABLE",
    "message": "That detail is maintained by your school. Contact your school administrator to request a correction.",
    "details": null
  }
}
```

## `GET /me/preferences` · `PATCH /me/preferences`

Language, appearance, and notification preferences. Identity-level: they follow
the person across every school.

```json
{ "language": "en", "appearance": "system", "notificationPreferences": {} }
```

`appearance` is one of `system`, `light`, `dark`. `language` is validated
against the school's configured languages.

Supersedes the separate `/me/notification-preferences` path that feature 001's
contract sketched — one `user_preference` row, one endpoint.

| Status | Code | When |
|---|---|---|
| `400` | `PREFERENCE_INVALID` | A language the school does not offer; the message names the available ones |

## `POST /me/password`

Changes the caller's own password. **Rate limited** on the same strict bucket as
sign-in — an unlimited endpoint that verifies the current password is a password
oracle.

```json
{ "currentPassword": "…", "newPassword": "…" }
```

Emits a `PASSWORD_CHANGED` security event.

| Status | Code | When |
|---|---|---|
| `401` | `CURRENT_PASSWORD_INCORRECT` | Wrong current password |
| `429` | `RATE_LIMITED` | Throttle tripped |

## `GET /me/activity`

Recent authentication activity, most recent first, bounded to a recent window —
not an audit export.

```json
[{ "eventType": "LOGIN_SUCCEEDED", "occurredAt": "…", "device": "Chrome on desktop" }]
```

**Never returns** `ipHash`, a raw address, or another person's details (FR-012).
The device string is coarse by design — enough to recognise, not to fingerprint.

## `GET /auth/sessions`

The caller's own active sessions; the current one flagged via its token hash
rather than by asking the client which it is.

```json
[{ "id": "…", "createdAt": "…", "lastUsedAt": "…", "expiresAt": "…", "isCurrent": true }]
```

## `DELETE /auth/sessions/:id`

Ends one of the caller's own sessions.

| Status | Code | When |
|---|---|---|
| `404` | `SESSION_NOT_FOUND` | Unknown id **or** a session belonging to someone else — deliberately indistinguishable, so the endpoint cannot enumerate others' sessions |

## Cross-cutting

- **Feature gating**: the shared core is ungated — it is authentication
  foundation ([ADR 0004](../../../../../docs/decisions/0004-foundation-surfaces-exempt-from-tenant-gating.md)).
  Each role panel follows its owning capability's per-tenant flag; a gated-off
  panel returns `kind: "UNAVAILABLE"` and its data is never read.
- **Tenant context** is set server-side before any tenant-owned read
  ([ADR 0005](../../../../../docs/decisions/0005-tenant-context-propagation.md)).
  Its absence is a 500, never a silent empty result.
- **Parent privacy**: `GET /me` for a parent returns children across every school
  that linked them, because the caller *is* the parent. No endpoint here lets a
  school-side role read another person's profile; when one is added it must use
  the tenant-scoped repository method.
- **Data minimisation**: only fields the page renders. No password hash, no
  token, no raw IP.
