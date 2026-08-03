# Identity API

All paths are under `/api/v1`.

## `POST /auth/login`

Development-only login. Body: `{ "email": string, "password": string }`.
Returns the authenticated user and sets an httpOnly JWT cookie.

## `GET /auth/me`

Requires the `campusone_access_token` cookie or `Authorization: Bearer <token>`.
Returns the authenticated principal and role.

## `POST /auth/logout`

Clears the access cookie. Authentication is required only by the browser's
session state; the endpoint is safe to call after expiry.
