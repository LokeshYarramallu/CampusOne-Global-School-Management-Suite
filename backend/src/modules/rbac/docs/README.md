# RBAC foundation

This module owns the initial role catalog and permission model for the
authentication and multi-tenancy foundation.

## Initial roles

- Platform Super Admin
- School Admin Office
- Principal
- Accountant
- Teacher
- Student
- Parent / Guardian

School Owner, School Administrator, Academic Coordinator, receptionist,
admissions, and general administrative responsibilities are represented by
School Admin Office for now. Parent and Guardian are one role; family
relationship and child-access scope are stored separately.

## Scope model

Role assignments always carry JSON scope. Authorization must derive scope from
the authenticated server-side session and assignment, never from a
client-provided role or tenant identifier. Examples include school-wide,
assigned classes, self, and linked children.

## Persistence

`backend/prisma/schema.prisma` is the source of truth. Run `npm run db:generate`
to regenerate Prisma Client, `npm run db:migrate:deploy` to apply migrations,
and `npm run db:seed` to insert the idempotent role and permission catalog.

Keycloak remains the identity provider; this module does not implement local
password storage or a replacement login flow.
