# ADR 0006: Frontend UI libraries for the calendar feature

- **Status:** Accepted
- **Date:** 2026-08-04
- **Satisfies:** Constitution Principle VII — a new library requires a recorded ADR.
- **Scope:** Frontend only. The backend introduces no new dependency.

## Context

The calendar feature (`003-calendar`) adapts the interaction design of the
DeepTrack school project's event workspace: a month grid, a selected-day list,
event cards with type accents, and smooth transitions. The user reviewed the
reference and asked for that look and motion specifically, and chose to bring in
DeepTrack's UI libraries rather than reimplement the behaviour with CampusOne's
existing toolkit.

The constitution fixes the frontend stack (Next.js 16 / React 19 / TypeScript /
Tailwind v4) and requires an ADR before adding any library. Six libraries are
involved, none originally present in `frontend/package.json`. The initial four
were approved for the calendar; two additional styling utilities are added now
because the DeepTrack component port relies heavily on dynamic class merging.

## Decision

Add **frontend-only** runtime dependencies, all React 19-compatible:

| Library | Purpose | Why not build it |
|---|---|---|
| `date-fns` | Month-grid maths (`eachDayOfInterval`, `startOfWeek`, `format`) | Date arithmetic across month/week boundaries is a well-known source of off-by-one and DST bugs; a tested, tree-shakeable library is the right call. Pure functions, no framework coupling. |
| `react-day-picker` | The month calendar control | A correct, accessible, keyboard-navigable date grid is non-trivial; this is the de-facto React choice and builds on `date-fns`. |
| `motion` (Framer Motion) | Card/grid/panel transitions | The reference's "smoothness" is spring-based motion the user explicitly wanted; CSS keyframes approximate but do not match it. |
| `lucide-react` | Icons in the calendar surfaces | Matches the reference's icon set; tree-shakeable per-icon imports. |
| `clsx` | Conditional class-name strings | DeepTrack's components use `clsx` for readable conditional styling; replacing every branch with template strings would make the port harder to maintain and verify. |
| `tailwind-merge` | Resolve conflicting Tailwind classes | Required to safely merge default and override class names (for example, DayPicker classNames with caller overrides). Without it, conflicting utility classes produce unpredictable precedence. |

**Boundaries on their use:**

- They are used **only** within `frontend/src/modules/calendar/` and its route.
  Existing features (login, profile) keep their inline-SVG icons and
  `campusone-*` CSS animations; this ADR does not license a sweep replacing
  them.
- `date-fns` is imported per-function; `lucide-react` per-icon; `clsx` and
  `tailwind-merge` combined as a local `cn` helper — no barrel imports, so the
  bundle carries only what the calendar uses.
- No backend dependency is added. Server-side date handling stays on the
  native `Date` already used across the API.

## Alternatives Considered

- **Reimplement with CampusOne's existing toolkit** (native `Intl`/`Date`, CSS
  keyframes, inline SVG). Zero new dependencies, no ADR. Achieves ~95% of the
  look. Rejected by the user in favour of higher fidelity to DeepTrack's exact
  motion and calendar behaviour — a deliberate, recorded choice, which is what
  this ADR captures.
- **A heavier calendar/scheduler library** (e.g. FullCalendar, react-big-calendar).
  Rejected: far larger, opinionated styling that fights the CampusOne design
  tokens, and more than a month grid + day list needs.

## Consequences

**Positive**

- High fidelity to the reference the user approved, with less bespoke date and
  animation code to maintain.
- Each library is mainstream, actively maintained, and React 19-ready.

**Negative / Trade-offs**

- Four more dependencies to track for security and version upgrades. Mitigated
  by confining them to one module, so removal or replacement is localised.
- `motion` adds bundle weight to the calendar route specifically. Acceptable for
  a route this interaction-heavy; it is not loaded by login or profile.
- A second animation idiom now exists in the codebase (`motion` here,
  `campusone-*` CSS elsewhere). The boundary above keeps that from spreading:
  new work outside the calendar continues to use the CSS approach unless a
  future ADR widens this.
- A second class-string helper idiom now exists (`cn` in the calendar, plain
  template strings elsewhere). It is confined to the calendar module by the same
  boundary.

**Follow-up**

- If a later feature wants these libraries too, extend this ADR rather than
  adding them ad hoc, and revisit whether the CSS-animation approach should be
  retired in favour of `motion` platform-wide.
