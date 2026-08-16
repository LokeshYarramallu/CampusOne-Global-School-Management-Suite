# Identity (frontend)

## Purpose

The screens through which a person proves who they are and sees who they are
signed in as: the sign-in page and the authenticated shell that follows it.

## Responsibilities

| Owns | Does not own |
|---|---|
| The sign-in form, its states, and its client-side input rules | Deciding whether credentials are valid |
| Rendering the signed-in principal | Issuing, storing, or reading the session token |
| Calling `/auth/login`, `/auth/me`, `/auth/logout` and validating their shapes | Authorization — what a role may do |
| Presentation tokens shared with the login route's loading skeleton | Role and permission catalogues (backend `rbac`) |

The session token is an httpOnly cookie set by the API. Nothing in this module
can read it, and nothing here should try. `proxy.ts` observes only whether the
cookie is *present*, to steer routing.

## Public interface

`index.ts` exports:

- `LoginForm` — the whole sign-in screen, including its branded panel.
- `DashboardShell` — the authenticated landing shell.
- `FIELD_HEIGHT`, `FIELD_RADIUS`, `BUTTON_RADIUS` — layout tokens, so
  `app/login/loading.tsx` renders a skeleton with the same geometry as the real
  form. Without them the two drift and the swap visibly jumps.

Everything else — `TextField`, `LoginHero`, `StatusNotice`, the services, the
schemas, the validation helpers — is internal.

## Structure

```
components/    LoginForm, LoginHero, TextField, StatusNotice, DashboardShell
schemas/       Runtime validation of API responses
services/      The module's only calls to apiClient
types/         AuthUser, AuthSession
utils/         loginValidation — input rules and server-error mapping
constants.ts   Presentation tokens and the limits mirrored from LoginDto
```

## Dependencies

- `@/core/http/apiClient` — the single HTTP entry point. Components never
  `fetch`; only `services/authApi.ts` does.
- `@/core/config/env` — the only reader of `process.env`.
- `next/navigation` — routing after a successful sign-in.

## Main flow

1. `validateLoginInput` runs first. Input that could not possibly succeed never
   reaches the network, and the message lands on the field.
2. `login()` posts to `/api/v1/auth/login`. The API sets the session cookie and
   returns the principal, which `parseAuthSession` validates before it is
   trusted.
3. On success the form enters `status: 'success'` and stays there. It does not
   return to `idle` — the redirect to `/dashboard` follows after
   `REDIRECT_DELAY_MS`.
4. On failure the error is mapped: a `VALIDATION_FAILED` envelope's `details`
   array is split across the fields that produced it; anything else is shown in
   the alert banner using the message the API sent.

## Key decisions

**Submit state is one value, not several booleans.** `status` is
`'idle' | 'submitting' | 'success'`. The previous `isSubmitting`/`isSuccess`
pair let a `finally` block read a stale `isSuccess` from its own closure and
re-enable the button during the success animation, which allowed a second
sign-in request and a second session. There is a regression test for this.

**No credential is ever compiled into the bundle.** The local sign-in hint is
driven by `NEXT_PUBLIC_DEV_ADMIN_EMAIL` — an address, not a secret — and
`env.ts` drops it outright when `NEXT_PUBLIC_APP_ENV=production`. The demo
password lives in `backend/.env.example` and never reaches the browser. A test
asserts it is absent from the rendered output.

**Error messages come from the API, not from here.** `INVALID_CREDENTIALS`,
`ACCOUNT_LOCKED`, and `RATE_LIMITED` all arrive with text written for an end
user and already checked for what it is safe to disclose. Re-wording them on
the client would risk revealing more than the server intended — notably that a
given address exists.

**`/dashboard` is the one post-sign-in destination.** `proxy.ts` already sends
`/` and an already-signed-in `/login` there, so a second landing route would
mean two answers to "where does signing in take me". The dashboard carries the
links to the other built surfaces until the core application framework
(PRD §6.2) provides shared navigation; a surface reachable only by typing its
URL is how the calendar came to be linked from nowhere.

**Colour is chosen for contrast, not for the mockup.** Every foreground in
`constants.ts` clears 4.5:1 against its surface. The greys are darker than a
typical design comp, because sign-in is the one screen no user can skip.

**The branded panel is `aria-hidden`.** It carries no heading and no control.
The form's "Welcome back" is the document's only `h1`, and it is present at
every breakpoint — the hero headline it replaced was hidden below `lg`, leaving
mobile with no `h1` at all.

## Testing

```bash
npm run test          # from frontend/
```

`tests/` covers the success flow and redirect, the double-submit regression,
timer cleanup on unmount, client-side validation, server field-error mapping,
lockout and throttling messages, focus movement to errors, `aria-invalid`
wiring, heading structure, password visibility toggling, and the absence of the
demo password from the DOM. `DashboardShell.test.tsx` covers the signed-in
identity, the loading state, the unauthenticated bounce, and a link to every
built surface.

Tenant isolation has no test here, and needs none yet: this module renders only
the caller's own principal and holds no tenant-scoped records. That changes the
moment a school selector appears — see below.

## Limitations

- **No password recovery.** There is no "forgot password" path, on either side.
  Building one needs an email/notification adapter that does not exist yet, a
  token endpoint, and its own rate limits. It is a feature, not a fix, and
  should go through `/speckit-specify`.
- **No school selection.** One identity may hold roles at several schools
  (PRD §3.6, §4.2), but `/auth/login` returns a single principal and the backend
  picks `roleAssignments[0]`. Correcting that changes the login response
  contract, so it is spec work rather than a change to this module.
- **No MFA, SSO, or biometric sign-in** (PRD §5.1). These arrive with the
  Keycloak adapter — see
  [ADR 0002](../../../../../docs/decisions/0002-keycloak-identity-provider.md).
- `DashboardShell` is a placeholder for the Platform Super Admin screens.
