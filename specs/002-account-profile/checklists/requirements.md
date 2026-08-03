# Specification Quality Checklist: Role-Aware Account Profile

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-03
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain — FR-037 resolved 2026-08-03
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Constitution Alignment

Checked against `.specify/memory/constitution.md` v1.0.0:

| Principle | Status |
|---|---|
| I. Spec-Driven | Spec written before plan; what/why only |
| II. Feature-Gated (NON-NEGOTIABLE) | Resolved — FR-037 carves out foundation surfaces (core always available); FR-038 gates every role panel by its owning capability. A recorded ADR is still required per Principle VII before the gating is built |
| III. Tenant Isolation (NON-NEGOTIABLE) | FR-027, FR-028, FR-029, FR-030; SC-004, SC-005; User Story 3 is dedicated to it |
| IV. Module-Bounded | Deferred to plan — no module structure asserted in the spec |
| V. Secure & Private by Design | FR-012, FR-024, FR-025, FR-026, FR-028, FR-036 |
| VI. Test-Including | Every user story carries an Independent Test; SC-004 and SC-005 demand systematic access testing |
| VII. Safe Evolution | FR-037 flagged as requiring a recorded ADR |

## Revision Log

**Iteration 1** — three issues found and fixed before this checklist was finalised:

1. *Success criteria contained implementation detail.* An earlier draft of SC-006 referenced response times. Rewritten as a user-facing duration.
2. *"Student profile" risked seeding a duplicate model.* The Key Entities note on **Student enrolment** now states explicitly that the full learner record must extend it rather than replace it, per the constitution's rule against duplicate implementations.
3. *Editability was described but not enforceable.* FR-025 was added so that rejecting unoffered fields is a stated requirement rather than an implied one.

**Iteration 2** — FR-037 resolved by decision, 2026-08-03. The shared core is treated as authentication foundation and is not disableable by a school; role panels are gated by their owning capability (now FR-038). Split into two requirements so each is independently testable.

## Status

**All checklist items pass. Ready for `/speckit-plan`.**

## Notes

- **Carried into the plan**: FR-037 is a deliberate exception to a NON-NEGOTIABLE constitutional principle. Principle VII requires it be recorded as an ADR in `docs/decisions/` before the gating behaviour is built. The plan must schedule that ADR, not assume it.
- `/speckit-clarify` is not needed — the one question that warranted it has been answered.
- User Story 1 is deliberately testable against the currently seeded Platform Super Admin alone — no school, staff, or student record required. That makes it a viable reduced first slice if the feature needs cutting down.
- User Story 3 (parent cross-school privacy) is the highest-risk story and is the one most likely to be got wrong quietly. It needs a dedicated test, not a general one.
