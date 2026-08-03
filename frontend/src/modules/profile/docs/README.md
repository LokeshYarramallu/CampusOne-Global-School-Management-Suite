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
  ProfileShell.tsx      shared core + save flow
  PanelSection.tsx      titled card; makes the empty state hard to omit
  ManagedField.tsx      a field the person cannot edit, and why
  panels/RolePanel.tsx  lookup on panel.kind → one panel
services/  schemas/  types/  docs/  tests/
```

## Key decisions

**The server picks the panel.** `panel.kind` is a discriminated union and
`RolePanel` is a lookup on it. Adding a role means adding a case and a
component, not lengthening a conditional. A role the person is not currently
acting in contributes nothing to the response, so there is nothing to hide.

**`editability` is not inferred here.** It arrives from the API, so the
read-only affordance and what the API will actually accept cannot drift.

**Every non-editable field explains itself.** `ManagedField` takes the tier as a
required prop, which makes an unexplained disabled control awkward to write.
That is the point — a greyed-out box with no reason is how people end up filing
a ticket to change their own phone number.

**`PanelSection` takes `emptyReason` as a first-class prop.** PRD §11 requires
every list and detail view to define its empty state before build; the component
shape enforces the habit.

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
and every panel including its empty state.

## Limitations

- **Photo upload, email change, MFA enrolment** are not available; the page says
  so rather than offering controls that do nothing.
- **No role switcher.** When a person holds several roles the page names the
  active one; switching arrives with the role-switching capability.
- **Sessions and activity are not yet on the page.** The endpoints and the
  service functions exist (`getSessions`, `endSession`, `getActivity`); the UI
  for them is the next increment (spec US4).
