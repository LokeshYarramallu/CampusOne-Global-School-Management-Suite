# ADR 0004: Authentication foundation surfaces are exempt from per-tenant feature gating

- **Status:** Accepted
- **Date:** 2026-08-03
- **Deviates from:** Constitution Principle II — Feature-Gated (NON-NEGOTIABLE)
- **Raised by:** FR-037 in [specs/002-account-profile/spec.md](../../specs/002-account-profile/spec.md)

## Context

The constitution states Principle II without qualification:

> Every feature is behind a per-tenant (school/organization) feature gate enforced on the backend. A disabled feature for a tenant is unreachable through any endpoint, job, or UI path — not merely hidden in the UI. Core capabilities are on by default; optional ones are off until a tenant enables them.

Feature 002 introduces the account profile page. Its shared core lets a person see their own name and contact details, change their password, review and terminate their active sessions, inspect recent security activity, and set language and appearance preferences.

Applying Principle II literally means a school can switch that off. The result would be a school whose teachers and parents cannot change a compromised password, cannot see that an unrecognised device is signed in, and cannot end that session. That is not a configuration option a school should possess; it is a way to lock users out of the controls that protect their own accounts.

The same tension already exists silently elsewhere: the sign-in page is not gated, and nobody has proposed that it should be. Principle II was written with *product modules* in mind — attendance, fees, library, transport — where "this school does not use that" is a real and useful statement.

## Decision

**Authentication foundation surfaces are outside the scope of per-tenant feature gating.** A surface qualifies as foundation when all three hold:

1. It exists to let a person establish, maintain, or protect their own access to the platform.
2. Disabling it would remove a security control from the person rather than remove a capability from the school.
3. It carries no school-owned business data.

Under this definition the following are foundation and are **not** gateable:

- The sign-in page and the authentication endpoints (already ungated in practice).
- The account profile **shared core**: identity display, contact details, password change, active sessions, security activity, and personal preferences.

Everything else keeps Principle II unchanged. In feature 002 specifically, **every role panel is gated by the capability that owns its data** (FR-038): the staff record, teaching assignment, learner enrolment, and guardian-link panels each follow their owning module's per-tenant flag. A gated-off panel is unreachable — the underlying data is never read — not merely hidden.

## Alternatives Considered

- **Gate the whole page, default it on.** Principle II holds literally with no carve-out and no ADR. Rejected: it leaves a switch whose only effect is to lock a school's users out of their own credentials. A default is not a safeguard — defaults get changed, and the failure mode is silent and security-relevant.
- **Gate the page, pin the core permanently on and hide the setting.** Keeps one mechanism. Rejected: a gate that cannot be closed is not a gate, and it hides the exception inside a default value where it is easy to alter by accident. An architectural exemption stated out loud is easier to reason about and harder to erode.
- **Split the account page into a gated part and an ungated part as separate routes.** Rejected: PRD §6.2 requires *one* profile and one settings area spanning all roles. Two routes to satisfy a gating mechanism would be the tail wagging the dog.

## Consequences

**Positive**

- A person's ability to secure their own account cannot be revoked by their school.
- The rule is stated in architecture rather than encoded in a default value, so it is visible to reviewers.
- The definition is narrow and testable, which limits how far it can be stretched later.

**Negative / Trade-offs**

- **Principle II now has an exception**, and exceptions invite more exceptions. The three-part test above exists to make each future claim arguable on its merits rather than by precedent. Any new claim of foundation status requires its own ADR.
- Two gating behaviours coexist on one page — ungated core, gated panels. The panel resolver must be explicit about which is which, and the module docs must say so.
- The constitution's text is now incomplete on its own. It should be amended to reference this ADR at its next revision, per the Governance section.

**Not decided here**

- Whether any *other* surface qualifies as foundation. Nothing beyond sign-in and the account shared core is claimed. Password recovery, when built, is an obvious candidate and should be argued in its own ADR rather than assumed to be covered by this one.
