# Calendar frontend module

The CampusOne calendar page at /calendar. It adapts the interaction design
of the DeepTrack school project's event workspace: a month grid, a selected-day
list, type-accented event cards, and spring-based transitions.

## Responsibilities

- Render the calendar page for every signed-in school role.
- Fetch the month's events from GET /api/v1/calendar.
- Let users create, edit, and delete events according to the scopes the backend
  says they may manage.
- Validate API responses at the module boundary (schemas/calendarSchema.ts).

## Structure

- components/CalendarShell.tsx — route-level shell, auth check, layout.
- components/CalendarGrid.tsx — 
eact-day-picker month grid with dot markers.
- components/EventList.tsx — selected-day events plus the create button.
- components/EventCard.tsx — DeepTrack-style event card.
- components/EventForm.tsx — create/edit modal.
- components/EmptyState.tsx — empty day placeholder.
- hooks/useCalendar.ts — data fetching and mutations.
- services/calendarApi.ts — the module's only API calls.
- schemas/calendarSchema.ts — response validation.
- 	ypes/calendar.ts — shared shapes.
- utils/cn.ts — local clsx-equivalent for conditional class strings.

## Role behaviour

The backend decides which scopes a role may create. The UI only hides or shows
controls based on canCreate in the response:

- School admin / Principal: school + personal events.
- Teacher: assigned-class + personal events.
- Student: personal events.
- Parent: read-only in v1.
- Accountant: read-only, school events only.

## Running tests

`ash
npm run test -- calendar
`
