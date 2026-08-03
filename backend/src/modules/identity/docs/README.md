# Identity and login

The initial login vertical slice uses a development-only local identity
provider so the product can be exercised before Keycloak is deployed.

## Development credentials

- Email: `platform-admin@campusone.local`
- Password: `CampusOneAdmin!2026`
- Role: Platform Super Admin

These credentials are configured through `DEV_PLATFORM_ADMIN_EMAIL` and
`DEV_PLATFORM_ADMIN_PASSWORD_HASH`. They must never be used in production.
Production configuration rejects `AUTH_MODE=local-dev`; the planned Keycloak
adapter will replace this provider behind the same service boundary.

## Flow

`POST /api/v1/auth/login` validates the DTO, verifies the development password,
and returns the principal while setting a signed JWT in the httpOnly
`campusone_access_token` cookie. `GET /api/v1/auth/me` requires that cookie (or a
Bearer token) and validates the signature and expiry. `POST /api/v1/auth/logout`
clears the cookie.

The browser never reads or stores the JWT. API calls use credentials included so
the httpOnly cookie is sent to the backend.
