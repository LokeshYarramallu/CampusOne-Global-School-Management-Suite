# Identity and login

The login vertical slice. It uses a development-only local identity provider so
the product can be exercised before Keycloak is deployed
([ADR 0002](../../../../../docs/decisions/0002-keycloak-identity-provider.md)).

## Responsibilities

| Owns | Does not own |
|---|---|
| Verifying credentials and issuing sessions | What a role may do (`rbac`) |
| Account lockout and the authentication audit trail | Per-IP throttling (`core/http/rate-limit.guard.ts`) |
| Session revocation and token verification | Password recovery — not built |

Exported from `IdentityModule`: `AuthService`, `JwtAuthGuard`. Other modules
depend on those, never on the controller or the constants file.

## Development credentials

- Email: `platform-admin@campusone.local`
- Password: `CampusOneAdmin!2026`
- Role: Platform Super Admin

Configured through `DEV_PLATFORM_ADMIN_EMAIL` and
`DEV_PLATFORM_ADMIN_PASSWORD_HASH`, and never valid in production —
`validateEnv` rejects `AUTH_MODE=local-dev` when `NODE_ENV=production`.

The password is **not** compiled into the web bundle. The login page shows only
the address, from `NEXT_PUBLIC_DEV_ADMIN_EMAIL`, and drops even that when the
frontend is built for production.

## Flow

`POST /auth/login` validates the DTO, looks the identity up, compares the
bcrypt hash, and — on success — signs a JWT into the httpOnly
`campusone_access_token` cookie while recording an `auth_session` row.
`GET /auth/me` re-verifies that row on every request, so revoking a session
takes effect immediately rather than at token expiry. `POST /auth/logout`
revokes it and clears the cookie.

The browser never reads or stores the JWT. The frontend sends
`credentials: 'include'` so the cookie travels with each call.

## Brute-force protection

Two independent layers, because they stop different attacks:

| Layer | Guards against | Configured by |
|---|---|---|
| Per-IP throttle | One source trying many accounts | `LOGIN_RATE_LIMIT_ATTEMPTS`, `LOGIN_RATE_LIMIT_WINDOW_SECONDS` |
| Per-account lockout | Many sources trying one account | `LOGIN_MAX_FAILED_ATTEMPTS`, `LOGIN_LOCKOUT_MINUTES` |

The lockout counter is incremented atomically (`{ increment: 1 }`), so
concurrent attempts cannot race past the threshold. A successful sign-in clears
both the counter and the lock. Further guesses against an already-locked
account do **not** extend the lock — otherwise an attacker could keep the
rightful owner out indefinitely.

`ACCOUNT_LOCKED` is disclosed only to a caller who supplied the correct
password. See `docs/API.md` for why.

The throttle's default storage is in-process. Running more than one API
instance needs a shared store, or each instance enforces its own count.

## Key decisions

**The password hash is compared even when the email does not match.** A wrong
address and a wrong password then cost the same wall-clock time, so response
timing does not reveal which addresses exist.

**Suspended and deleted identities return `INVALID_CREDENTIALS`,** not a
distinct code, for the same reason.

**Audit writes never fail a sign-in.** `recordSecurityEvent` swallows its
errors and logs a warning. Losing an audit row is bad; refusing a legitimate
sign-in because the audit table is unavailable is worse.

**The identity lookup logs no identifiers.** A database failure logs the error
name and code only — never the email address being looked up (AGENTS.md,
"Student Data Privacy").

## Testing

```bash
npm run test        # from backend/
npm run test:e2e
```

`tests/auth.service.spec.ts` covers the success flow, wrong passwords, the
lockout threshold, lock expiry, non-disclosure of the lock to a caller without
the password, counter reset on success, suspended identities, security-event
contents (including that the IP is hashed and the user agent is truncated), and
that a failed audit write still lets the sign-in complete.

Tenant isolation is not tested here yet: the only seeded role is the
cross-tenant Platform Super Admin, and no tenant-scoped record is read or
written by this module. The first endpoint that returns tenant data must add
that test.

## Limitations

- **No password recovery.** `password_reset_token` exists in the schema, but no
  endpoint uses it. A real flow needs a notification adapter in
  `infrastructure/`, a token endpoint, and its own rate limits — spec work.
- **No MFA.** `mfa_factor` is likewise unused; PRD §5.1 requires MFA and
  biometric sign-in, both of which arrive with Keycloak.
- **One role per session.** `login` takes `roleAssignments[0]`. A person
  holding roles at several schools cannot choose which they are signing in to
  (PRD §3.6, §4.2). Fixing this changes the login response contract.
