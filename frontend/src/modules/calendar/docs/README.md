# Calendar frontend module

The CampusOne calendar page at `/calendar`. It adapts the interaction design
of the DeepTrack school project's event workspace — a month grid, a selected-day
list, aura-tinted event cards, and spring-based transitions — while staying
inside CampusOne's own visual system.

## Reaching the page

`/calendar` is enrolled in `src/proxy.ts`, so a signed-out visitor is sent to
sign-in rather than to a shell that fetches and fails. The dashboard links here;
until the core application framework (PRD §6.2) provides shared navigation, a
new surface has to claim both of those or it is reachable only by typed URL.

## Responsibilities

- Render the calendar page for every signed-in school role.
- Fetch the month's events from `GET /api/v1/calendar`.
- Let users create, edit, and delete events according to the scopes the backend
  says they may manage.
- Validate API responses at the module boundary (`schemas/calendarSchema.ts`).

## Structure

- `components/CalendarShell.tsx` — route-level shell, auth check, layout.
- `components/CalendarGrid.tsx` — `react-day-picker` month grid with dot markers.
- `components/EventList.tsx` — selected-day events plus the create button.
- `components/EventCard.tsx` — tactile event card with scope icon, aura tint, and
  frosted-glass date block.
- `components/EventForm.tsx` — create/edit modal.
- `components/EmptyState.tsx` — empty day placeholder.
- `hooks/useCalendar.ts` — data fetching and mutations.
- `services/calendarApi.ts` — the module's only API calls.
- `schemas/calendarSchema.ts` — response validation.
- `types/calendar.ts` — shared shapes.
- `utils/cn.ts` — local `clsx`-equivalent for conditional class strings.

## Visual design

Cards use warm, slightly desaturated "aura" colors defined in `constants.ts`.
Each event type has a surface color, a subtle radial-gradient wash, a warm
border, a badge color, and an accent dot. The goal is a real-world feeling —
less like a generated color palette and more like a physical school planner
or notice board. Scope is shown with a small icon:

- `SCHOOL` — 🏛
- `CLASS` — 🏫
- `PERSONAL` — 👤

Panels and the header use a light frosted-glass treatment (`bg-white/90`,
`backdrop-blur`) with soft, diffused shadows. Buttons scale on hover and press
on active using `cubic-bezier(0.23, 1, 0.32, 1)` spring easing.

## Role behaviour

The backend decides which scopes a role may create. The UI only hides or shows
controls based on `canCreate` in the response:

- School admin / Principal: school + personal events.
- Teacher: assigned-class + personal events.
- Student: personal events.
- Parent: read-only in v1.
- Accountant: read-only, school events only.

## Running tests

```bash
npm run test -- calendar
```