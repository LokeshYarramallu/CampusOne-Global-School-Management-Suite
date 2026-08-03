# Identity API

All paths are under `/api/v1`. Every failure uses the platform error envelope:

```json
{ "error": { "code": "INVALID_CREDENTIALS", "message": "...", "details": null } }
```

## `POST /auth/login`

Exchanges credentials for a session. Development-only while
`AUTH_MODE=local-dev`; production rejects that mode at boot.

**Auth:** none.

**Rate limit:** strict bucket — `LOGIN_RATE_LIMIT_ATTEMPTS` requests per
`LOGIN_RATE_LIMIT_WINDOW_SECONDS` per IP (default 10 / 60s).

### Request

```json
{ "email": "platform-admin@campusone.local", "password": "••••••••" }
```

| Field | Type | Rules |
|---|---|---|
| `email` | string | Valid email, ≤ 254 characters. Compared case-insensitively and trimmed. |
| `password` | string | 8–128 characters. |

Unknown properties are rejected — `forbidNonWhitelisted` is on, so a client
cannot smuggle `tenantId` or `roleKey` into the body.

### Response `200`

Sets `campusone_access_token`: httpOnly, `sameSite=lax`, `path=/`,
`secure` in production, `maxAge` = `expiresInSeconds`.

```json
{
  "user": {
    "userId": "0f1c…",
    "email": "platform-admin@campusone.local",
    "roleKey": "PLATFORM_SUPER_ADMIN",
    "roleName": "Platform Super Admin",
    "authMode": "local-dev"
  },
  "expiresInSeconds": 3600
}
```

`tenantId` and `scope` are present only when the identity has a role
assignment. The token itself is **not** in the body — it exists only in the
cookie.

### Errors

| Status | Code | When |
|---|---|---|
| `400` | `VALIDATION_FAILED` | A field broke a rule. `details` is an array of per-field messages; the client attaches them to inputs. |
| `401` | `INVALID_CREDENTIALS` | Wrong email, wrong password, or a suspended/deleted identity. Deliberately one code — the caller must not learn which. |
| `401` | `ACCOUNT_LOCKED` | Correct password, but the account is locked after `LOGIN_MAX_FAILED_ATTEMPTS` failures. Message includes the remaining minutes. |
| `401` | `UNAUTHENTICATED` | `AUTH_MODE` names a provider that is not available. |
| `429` | `RATE_LIMITED` | The per-IP throttle tripped. |
| `500` | `INTERNAL_ERROR` | Identity lookup failed. |

**Why `ACCOUNT_LOCKED` is only returned after the password matches:** returning
it to any caller would make the endpoint an account-enumeration oracle — an
attacker could learn which addresses exist without ever guessing a password. A
caller who already has the password learns nothing new.

#### Example — locked out

```http
POST /api/v1/auth/login
{ "email": "teacher@school.test", "password": "correct-horse-battery" }
```

```json
{
  "error": {
    "code": "ACCOUNT_LOCKED",
    "message": "Too many failed sign-in attempts. Try again in 14 minutes, or contact your school administrator.",
    "details": null
  }
}
```

#### Example — field validation

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The submitted data is not valid.",
    "details": [
      "email must be an email",
      "password must be longer than or equal to 8 characters"
    ]
  }
}
```

## `GET /auth/me`

Returns the authenticated principal.

**Auth:** `campusone_access_token` cookie, or `Authorization: Bearer <token>`.

Verifies the JWT signature and expiry, then re-checks the session row, the
identity's status, and that the role in the token still matches the role on
record — a revoked session or a changed role invalidates a token that has not
yet expired.

### Response `200`

Same `user` shape as the login response.

### Errors

| Status | Code | When |
|---|---|---|
| `401` | `UNAUTHENTICATED` | Missing, malformed, expired, revoked, or superseded token. |

## `POST /auth/logout`

Revokes the session server-side and clears the cookie.

**Auth:** none required — the endpoint is safe to call with an expired or
absent token, and returns `200` either way so a client can always reach a
signed-out state.

### Response `200`

```json
{ "success": true }
```

## Security events

Every authentication outcome appends a row to `security_event`:

| `event_type` | Written when |
|---|---|
| `LOGIN_SUCCEEDED` | Credentials accepted. |
| `LOGIN_FAILED` | Credentials rejected. |
| `ACCOUNT_LOCKED` | The failure that crossed the threshold. |
| `LOGIN_BLOCKED_LOCKED` | Correct password presented to a locked account. |
| `LOGOUT` | A session was revoked. |

The caller's IP is stored as a keyed HMAC, never in the clear: enough to
correlate attempts from one source, not enough to recover the address from the
table. The user agent is truncated to 255 characters. No email address, token,
or password ever reaches this table or the logs.
