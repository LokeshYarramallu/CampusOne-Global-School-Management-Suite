# Profile (frontend)

The account page — what a signed-in person sees about themselves, tailored to
the role they are currently acting in.

Spec: [specs/002-account-profile](../../../../../specs/002-account-profile/spec.md)

## Responsibilities

| Owns | Does not own |
|---|---|
| The account page: shared core plus one role panel | Deciding which panel to show — the server decides |
| Client-side input rules for self-editable fields | Whether a field may be edited — `editability` comes from the API |
| Empty, loading, and error states for every area | Session issuing or revocation |

## Public interface

`index.ts` exports `ProfileShell` only. Panels, services, schemas, and types are
internal.

## Structure

```
components/
  ProfileShell.tsx       cover + identity rail + content grid
  ProfileHeader.tsx      cover band with the portrait overlapping it
  ContactCard.tsx        contact details and the self-edit affordance
  AccountSecurity.tsx    provenance, password, devices, recent activity
  Primitives.tsx         Card, DataGrid, Field, StatTiles
  panels/RolePanel.tsx   lookup on panel.kind → one panel, plus statsFor()
services/  schemas/  types/  docs/  tests/
```

## Layout

Modelled on what professional profile surfaces actually do, rather than a form:

- **Cover band with the portrait overlapping it** — establishes who this is
  before any data is read, and carries the brand orange from the sign-in screen.
- **Stat tiles** — the three or four facts people came for, read first.
- **Identity rail beside a content grid**, not one tall column. The rail holds
  contact and security (identical for everyone); the grid holds the role panel.
- **Cards state ownership once**, in the header. Fields inside are label/value
  pairs in a two-column grid.

An earlier version stacked everything in a single column and repeated
"Maintained by your school. Contact your school administrator…" beneath all
four fields of a staff record. A temporary gallery rendering all seven roles
side by side made both problems obvious; it was removed once the design
settled.

## Editability is per role

Accounts are **provisioned from above**: the platform registers a school, the
school creates staff and learners, and enrolling a learner brings the
guardian's account into being. Nobody self-registers. Two consequences shape
this module:

- **Names are fixed at creation.** They come from the record the school
  entered; renaming yourself would decouple the account from the roll.
- **A person edits their own contact details, nobody else's.** A learner may
  change their phone and portrait but not the household address, and never a
  guardian's details. An adult owns their address outright.

`editabilityFor(roleKey)` on the server is the single source; the map is
returned in `editability` and the interface renders from it. The service
re-checks on write, so a learner posting an address change is rejected at the
API even though the same field is editable for their parent.

## Key decisions

**The server picks the panel.** `panel.kind` is a discriminated union and
`RolePanel` is a lookup on it. Adding a role means adding a case and a
component, not lengthening a conditional. A role the person is not currently
acting in contributes nothing to the response, so there is nothing to hide.

**`editability` is not inferred here.** It arrives from the API, so the
read-only affordance and what the API will actually accept cannot drift.

**Ownership is stated once per card, not per field.** The requirement is that a
person can tell who maintains a field (FR-023), not that every field repeats the
same sentence. Repetition is how people stop reading the sentence that matters.
Editing is behind an explicit affordance, so read-only is the resting state.

**`Card` takes `empty` as a first-class prop.** PRD §11 requires every list and
detail view to define its empty state before build; the component shape enforces
the habit.

**Portraits are illustrated SVGs in `public/avatars/`,** seeded into
`user_profile.photo_reference`. They are drawings, not photographs of real
people — appropriate for demo data on a platform holding children's records.
Upload still needs a storage adapter; the initials block remains the fallback.

**Shared UI lives in `@/shared/components`.** `TextField` and `StatusNotice`
moved out of the identity module when this became their second consumer — the
threshold AGENTS.md sets.

## Testing

```bash
npm run test
```

Covers the loading, ready, and error states; saving a phone number; client-side
rejection without an API call; server errors surfaced in an alert; the
explanation on every non-editable field; single heading structure; initials
instead of a broken image; role separation (a teacher sees no children section);
the device list, its sign-out path and its load failure; recent activity with no
address in the rendered output; and every panel including its empty state.

## Limitations

- **Photo upload, email change, MFA enrolment** are not available; the page says
  so rather than offering controls that do nothing.
- **No role switcher.** When a person holds several roles the page names the
  active one; switching arrives with the role-switching capability.
- **The current session cannot sign itself out from here.** Other devices can;
  ending your own is what the sign-out control in the shell is for.
