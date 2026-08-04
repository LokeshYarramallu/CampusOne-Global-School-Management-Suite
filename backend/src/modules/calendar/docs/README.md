# Calendar module

The CampusOne calendar is a tenant-scoped, role-aware event board. It shows
every school member the events that matter to them and lets them create events
only within the scope their role owns.

## Purpose

Provide a single place where students, teachers, parents, administrators,
principals, and accountants see what is happening at the school. Visibility is
by membership, not by rank: a teacher's class event is seen only by that
class's students and that teacher, not by the school office.

## What this module owns

- `CalendarEvent` Prisma model and its PostgreSQL table (`calendar_event`).
- Row-level security policy for tenant isolation.
- Calendar-scope permissions in the RBAC catalog.
- The visibility predicate (`visibility.ts`) that decides which events a
  principal may see.
- HTTP endpoints under `/api/v1/calendar`.
- Feature flag key `calendar` for per-tenant enablement.

## What it does not own

- User identity, authentication, or session management (Identity module).
- Class assignments, enrolments, or parent links (Student Information and
  Profile modules own those records; this module reads them to resolve
  visibility).
- General RBAC evaluation (Rbac module).
- Notifications or reminders (Communication module).

## Public interface

Backend consumers import only from `CalendarModule` exports:

- `CalendarService` programmatic reads/writes with tenant-scoped Prisma.

## Main flows

1. **Read month.** `GET /api/v1/calendar?year=2026&month=8` returns every event
   visible to the caller in the requested month, padded by a week on each side.
   The response also includes `canCreate`, telling the UI which scopes the user
   may add.
2. **Create event.** `POST /api/v1/calendar` accepts `scope`, optional
   `classLabel`/`sectionLabel`, event type, title, description, date, and
   times. The service enforces the caller's permitted scope and, for `CLASS`,
   verifies the teacher is assigned to that class.
3. **Edit or delete event.** `PATCH /api/v1/calendar/:id` and
   `DELETE /api/v1/calendar/:id` are creator-only. An event the caller does not
   own is reported as `EVENT_NOT_FOUND` so the endpoint cannot be used to probe
   for others' events.

## Role to scope matrix

| Role | Can see | Can create |
|---|---|---|
| School Admin | school events, own events | school, personal |
| Principal | school events, own events | school, personal |
| Accountant | school events only | none |
| Teacher | school events, own events, assigned-class events | assigned class, personal |
| Student | school events, own events, own-class events | personal |
| Parent | school events, children's class events | none (v1) |

## Key decisions

- Visibility is membership-based, not oversight-based. School admins do not
  automatically see a teacher's class event (the user's explicit instruction).
- The guard proves the caller is a calendar participant
  (`calendar:view:read`). Finer scope decisions happen in the service because
  they depend on the request body and on the caller's class memberships.
- Creator-only edits are enforced by repository lookup on `ownerUserId`, not by
  a permission flag, because ownership is a fact about the row.

## Testing

Run the module tests:

```bash
npm run test -- --testPathPatterns=calendar
```

The suite covers the visibility predicate, create-scope enforcement,
creator-only edits, and class-assignment validation.

## Limitations

- Parents cannot create personal events in v1; they have read-only access to
  school and their children's class events.
- No recurring events, invitations, or room/resource booking.
- No ICS export or external calendar sync.
