# Feature Specification: Role-Aware Account Profile

**Feature Branch**: `002-account-profile`

**Created**: 2026-08-03

**Status**: Draft

**Input**: User description: "Role-aware account profile — every signed-in person gets one 'my account' page showing their own details, tailored to the role they are currently acting as."

## User Scenarios & Testing *(mandatory)*

This feature gives every person on the platform one place to see and maintain who they are. It completes the self-service half of feature 001 (User Story 4, FR-013 — specified but never built) and adds the personal-identity layer that feature never covered: a person currently has an email address and a phone number, but no name, no photo, and no preferences.

The organising decision is **one page, not seven**. PRD §6.2 requires one profile and one settings area spanning all roles. The platform separately forbids blending two roles' views together. Both hold at once through a **shared core** that is identical in every role view, plus **exactly one role panel** chosen by the role the person is currently acting as.

### User Story 1 - Any signed-in person views and maintains their own account (Priority: P1)

A person who has signed in opens their account page. They see who the platform believes they are — photo, name, email address, phone number — and which role and school they are currently acting in. They correct their phone number, upload a photo, and set their language and appearance preferences. The changes take effect immediately and are visible the next time they sign in.

**Why this priority**: This is the feature's foundation and the only part that works for every role without exception. It is also the smallest thing that delivers standalone value: today a person cannot discover or correct any of their own details.

**Independent Test**: Sign in as the existing Platform Super Admin, view the account page, change the phone number and language, sign out and back in, and confirm the changes persisted — verifiable without any school, staff record, or student record existing.

**Acceptance Scenarios**:

1. **Given** a signed-in person, **When** they open their account page, **Then** they see their photo, name, email address, phone number, and the role and school they are currently acting in.
2. **Given** a signed-in person, **When** they change their phone number, language, or appearance preference, **Then** the change is saved immediately and persists across sessions.
3. **Given** a person who has never set a photo, **When** they view their account page, **Then** a meaningful placeholder is shown rather than a broken or empty image.
4. **Given** a person submits a phone number in an invalid format, **When** they save, **Then** they are told which field is wrong and how to correct it, and no partial change is saved.
5. **Given** the account page cannot be loaded, **When** they open it, **Then** they are shown a clear explanation and a way to retry, never a blank screen.

---

### User Story 2 - Each role sees the panel appropriate to what they are (Priority: P1)

A teacher opens their account and sees their staff record and their teaching assignment — the subjects and sections they are responsible for. A student opens the same page and sees their enrolment: admission number, class and section, roll number, and who their guardians are. An accountant sees their staff record, the finance operations they may perform, and an explicit statement that they cannot alter academic records.

**Why this priority**: Without this the page is generic and tells a teacher nothing a student would not also see. The role panel is what makes the page worth opening, and it is the part that must be designed per role rather than emerging from a shared layout.

**Independent Test**: With one school and one person per role, sign in as each of the seven roles in turn and confirm each sees the panel defined for that role and no other — verifiable independently of the parent privacy behaviour.

**Acceptance Scenarios**:

1. **Given** a person acting as Teacher, **When** they open their account, **Then** they see their staff record and their teaching assignment including which sections they are class teacher of.
2. **Given** a person acting as Student, **When** they open their account, **Then** they see their enrolment details and their linked guardians with each relationship type.
3. **Given** a person acting as Accountant, **When** they open their account, **Then** they see the finance operations they may perform and a plain statement of the boundary that they cannot modify academic records.
4. **Given** a person acting as Platform Super Admin, **When** they open their account, **Then** they see platform scope with no school affiliation and a notice that all access to school data is audited.
5. **Given** a person acting as Principal or School Admin Office, **When** they open their account, **Then** they see their staff record and the scope of oversight or administration they hold.
6. **Given** a role panel has no data to show yet, **When** the person opens their account, **Then** the panel explains what will appear there and who populates it, rather than rendering empty.

---

### User Story 3 - A parent sees every child; no school learns of the others (Priority: P1)

A parent with children at two different schools opens their account and sees both children, grouped by school, each showing their relationship, whether they are the primary contact, whether they carry billing responsibility, and what access they have been granted. An administrator at one of those schools looking at that same parent sees only the child and link belonging to their own school, and has no way — through any screen, search, or export — to discover that the parent has any association with another school.

**Why this priority**: The unified parent identity is the platform's defining innovation (PRD §5.3) and this panel is the single place where it is most easily leaked. Cross-tenant exposure is rated Critical. If this behaviour is not correct from the first release, the feature cannot ship.

**Independent Test**: With two schools and one parent linked to a child at each, confirm the parent sees both and each school's administrator sees only their own — verifiable with two schools, one parent, and two children.

**Acceptance Scenarios**:

1. **Given** a parent linked to children at two schools, **When** they open their account, **Then** they see both children grouped by school with each school's identity clearly shown.
2. **Given** an administrator at school A viewing a parent who is also linked to school B, **When** they view that parent's details, **Then** only the school A link is returned and nothing indicates school B exists.
3. **Given** an administrator at school A, **When** they export or search any data relating to that parent, **Then** no school B association is discoverable by any means.
4. **Given** a guardian rather than a primary parent, **When** they open their account, **Then** they see exactly the access scope granted to them and no more.
5. **Given** a guardian's access is revoked, **When** they next open their account, **Then** the revoked child no longer appears.

---

### User Story 4 - A person reviews and ends their own sessions and security activity (Priority: P2)

A person who suspects someone else has used their account opens their account page, sees every device currently signed in, ends the one they do not recognise, and reviews recent sign-in activity including failed attempts and any lockouts.

**Why this priority**: This completes feature 001's User Story 4, which was specified and never built. The underlying activity is already being recorded, so this story surfaces information the platform already holds. It ranks below the role panels because the account page delivers value without it.

**Independent Test**: Sign in from two separate sessions, end one from the account page, and confirm the ended session can no longer act — verifiable with one person and two sessions.

**Acceptance Scenarios**:

1. **Given** a person with more than one active session, **When** they view their sessions, **Then** each is listed with enough context to recognise it and the current session is identifiable.
2. **Given** a person viewing their sessions, **When** they end one, **Then** that session can perform no further action.
3. **Given** a person viewing recent activity, **When** sign-ins, failed attempts, or lockouts have occurred, **Then** they are listed with when they happened.
4. **Given** a person ends their own current session, **When** the action completes, **Then** they are returned to sign-in rather than left on a dead page.
5. **Given** recent activity is displayed, **When** it is shown, **Then** it never exposes a full network address or any other person's details.

---

### User Story 5 - School-managed fields explain who manages them (Priority: P2)

A teacher notices their designation is wrong. The field is not editable, but rather than an unexplained greyed-out box, it is labelled as managed by their school with a clear route to request a correction. A student sees the same treatment on their admission number and class.

**Why this priority**: PRD §7.2 requires sensitive-field changes to follow approval workflows. Until that workflow exists, the difference between a well-explained read-only field and a silently disabled one is the difference between a person understanding the system and filing a support ticket.

**Independent Test**: Sign in as a teacher and a student and confirm every non-editable field states who manages it and how to request a change — verifiable by inspection of the rendered page.

**Acceptance Scenarios**:

1. **Given** a field the person cannot edit, **When** they view it, **Then** it states who manages it and how a correction is requested.
2. **Given** a person attempts to submit a change to a field they may not edit, **When** the request is processed, **Then** it is rejected and no change is recorded.
3. **Given** a person changes their email address, **When** they submit it, **Then** the change takes effect only after the new address is confirmed.

---

### User Story 6 - A multi-role person sees exactly one role's panel (Priority: P3)

A teacher who is also a parent at the same school switches from Teacher view to Parent view. Their photo, name, contact details, security settings, and preferences are unchanged — they are one person. The panel below changes completely: the teaching assignment is replaced by their children. At no point do both panels appear together.

**Why this priority**: The platform's rule against blended role views must hold here as everywhere. It is P3 only because current data gives each person a single role, so the behaviour cannot be exercised end-to-end until multi-role assignment exists — but the design must not assume a single role.

**Independent Test**: Assign one person both Teacher and Parent roles, switch between views, and confirm the shared core is identical while exactly one role panel is shown at a time.

**Acceptance Scenarios**:

1. **Given** a person holding two roles, **When** they switch role view, **Then** the shared core is unchanged and the role panel is replaced entirely.
2. **Given** a person holding two roles, **When** they view their account in either view, **Then** the other role's panel is never visible and its data is never returned.
3. **Given** a person holding one role only, **When** they view their account, **Then** they encounter no role-switching interface at all.

---

### Edge Cases

- A person holds a role at a school that has since been suspended — what does their account page show?
- A parent's only child link is revoked, leaving the Parent panel with nothing to display.
- A student has no guardian linked yet, so the guardians list is empty.
- A teacher has been given no teaching assignment yet, so the panel that defines their scope is empty.
- A person uploads a photo that is too large, of an unsupported type, or is not actually an image.
- A person changes their email to one that already belongs to another identity.
- A person's session expires while they have unsaved edits open.
- Two devices edit the same field at once.
- A Platform Super Admin has no school at all, so every school-shaped element must be absent rather than empty.
- A person's role is removed while they are viewing the page.

## Requirements *(mandatory)*

### Functional Requirements

#### Shared core

- **FR-001**: Every signed-in person MUST have exactly one account page, shared across all their roles and schools.
- **FR-002**: The account page MUST show the person's photo, full name, email address, and phone number.
- **FR-003**: The account page MUST show which role and school the person is currently acting in.
- **FR-004**: A person MUST be able to change their photo, phone number, language, appearance, and notification preferences, with the change taking effect immediately.
- **FR-005**: Preferences MUST persist across sessions and devices and MUST apply wherever the person uses the platform.
- **FR-006**: A person MUST be able to change their own password.
- **FR-007**: A change to a person's email address MUST take effect only after the new address is confirmed.
- **FR-008**: A person MUST be able to see when their password was last changed and which additional sign-in factors are enrolled.

#### Sessions and security activity

- **FR-009**: A person MUST be able to see all of their currently active sessions, with enough context to recognise each and to identify the current one.
- **FR-010**: A person MUST be able to end any of their own sessions; an ended session MUST be unable to perform any further action.
- **FR-011**: A person MUST be able to review their recent sign-in activity, including failed attempts and lockouts, with the time of each.
- **FR-012**: Security activity shown to a person MUST NOT expose a full network address, another person's details, or any credential.

#### Role panels

- **FR-013**: The account page MUST show exactly one role panel, determined by the role the person is currently acting in.
- **FR-014**: A person holding more than one role MUST never see two role panels at once, and data belonging to a role they are not currently acting in MUST NOT be returned.
- **FR-015**: A person holding exactly one role MUST encounter no role-switching interface.
- **FR-016**: The Platform Super Admin panel MUST show platform scope, no school affiliation, and a notice that access to school data is audited.
- **FR-017**: The School Admin Office, Principal, Accountant, and Teacher panels MUST each show that person's staff record: employee identifier, designation, department, joining date, and school.
- **FR-018**: The Principal panel MUST additionally show the oversight scope and approval authority held.
- **FR-019**: The Accountant panel MUST additionally show the finance operations permitted and MUST state the boundary that academic records cannot be modified.
- **FR-020**: The Teacher panel MUST additionally show the subjects and sections assigned and which sections the person is class teacher of.
- **FR-021**: The Student panel MUST show admission number, class and section, roll number, date of admission, school, and each linked guardian with their relationship type.
- **FR-022**: The Parent/Guardian panel MUST show one entry per linked child grouped by school, with relationship type, primary-contact status, billing responsibility, and access scope granted.

#### Editability

- **FR-023**: Fields a person may not edit MUST state who manages them and how a correction is requested — never presented as an unexplained disabled control.
- **FR-024**: A submitted change to a field the person may not edit MUST be rejected with no change recorded.
- **FR-025**: The platform MUST NOT accept a change to any field that was not offered to that person as editable.

#### Access control and isolation

- **FR-026**: A person MUST NOT be able to view or act on profile data outside their permission scope; a student MUST NOT reach another student's profile and a teacher MUST reach only assigned students.
- **FR-027**: Staff and student profile data belonging to one school MUST NOT be reachable from another school by any path.
- **FR-028**: The identity of the person whose profile is being viewed MUST be derived from the authenticated session, never from client input.
- **FR-029**: A school MUST NOT be able to discover which other schools a parent is linked to, through any screen, search, or export.
- **FR-030**: A parent MUST see only schools that have linked them, and MUST see all of them.
- **FR-031**: A guardian MUST see exactly the access scope granted, and revocation MUST take effect immediately.

#### Presentation and quality

- **FR-032**: Every list and detail area on the page MUST define its empty, loading, and error state, and MUST never render as a blank region.
- **FR-033**: An empty role panel MUST explain what will appear there and who populates it.
- **FR-034**: Validation failures MUST identify the specific field and how to correct it, and MUST NOT partially save.
- **FR-035**: The page MUST meet WCAG 2.1 AA, matching the standard already set by the sign-in page.
- **FR-036**: An uploaded photo MUST be validated for type and size and MUST be reachable only by those permitted to see it — never by knowledge of its location alone.
- **FR-037**: The shared core of the account page — identity, contact details, password, sessions, security activity, and preferences — MUST be available to every person at every school and MUST NOT be disableable by a school. It is authentication foundation, in the same category as the sign-in page: a school cannot lock its own users out of their own credentials.
- **FR-038**: Each role panel MUST follow the per-school availability of the capability that owns its data. Where that capability is unavailable to a school, the panel MUST be unreachable by any path, not merely hidden from view.

### Key Entities

- **Person profile**: the personal identity belonging to the individual rather than to any school — name, photo, contact details, preferred language. Follows the person across every school they are associated with.
- **Person preferences**: appearance and notification choices belonging to the individual, applying everywhere they use the platform.
- **Staff record**: a person's employment details at one particular school — identifier, designation, department, joining date. Belongs to that school.
- **Student enrolment**: a learner's registration at one particular school — admission number, class and section, roll number, date of admission. Belongs to that school. This is the earliest sliver of the learner record and must be defined so the full record extends it rather than replacing it.
- **Teaching assignment**: the subjects and sections a teacher is responsible for at one school, including class-teacher responsibility. This is the scope that constrains what the teacher may see across the platform.
- **Guardian link**: the relationship between a parent or guardian and a child at a particular school, carrying relationship type, primary-contact status, billing responsibility, and granted access scope.
- **Active session**: a currently valid sign-in belonging to a person, which they may end.
- **Security activity record**: a past authentication event belonging to a person — sign-in, failed attempt, or lockout.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A person can find and correct their own contact details in under one minute from signing in.
- **SC-002**: All seven roles can open their account page and see a panel populated with information meaningful to that role; none sees another role's panel.
- **SC-003**: A parent with children at two schools operates from one account and sees both children, with no repeated registration.
- **SC-004**: Systematic access testing confirms no school can determine a parent's other school associations through any screen, search, or export.
- **SC-005**: Systematic access testing confirms no person can read or change profile data outside their permission scope, and no school can reach another school's staff or student profiles.
- **SC-006**: A person who suspects account misuse can review their active sessions and end an unrecognised one in under two minutes.
- **SC-007**: Every field a person cannot edit states who manages it; zero unexplained disabled controls remain on the page.
- **SC-008**: Every list and detail area has a defined empty, loading, and error state, verified before build.
- **SC-009**: The page passes WCAG 2.1 AA checks, including contrast, labelling, keyboard reachability, and a single top-level heading.
- **SC-010**: Requests to support asking how to change one's own details fall to near zero once the page is available.

## Assumptions

- **Role switching interface is deferred.** The design assumes a person may hold several roles and renders the panel for the role they are currently acting in, but the switcher itself belongs to the role-switching capability (feature 001 marks this P2). Until then each person acts in their single assigned role. The design must not assume a single role.
- **The change-request and approval workflow is deferred.** PRD §7.2 requires sensitive-field changes to follow an approval workflow with retained history. That workflow depends on a notification capability the platform does not have yet. Until then those fields are shown read-only with a clear route to contact the school administrator (FR-023), and no change request is raised.
- **Additional sign-in factor enrolment is deferred.** The page shows which factors are enrolled; enrolling and removing them arrives with the external identity provider already decided in ADR 0002.
- **School provisioning is out of scope.** This feature needs schools to exist but does not build the interface for creating them. That belongs to the tenant capability.
- **The full learner record is out of scope.** Only the enrolment fields in FR-021 are in scope; academic history, health, discipline, achievements, fees, transport, and documents belong to the student information feature.
- **Password recovery remains outstanding.** A person who cannot sign in still has no self-service route back in. That gap predates this feature and is not closed by it.
- **Reasonable defaults applied without asking**: photo constrained to common image formats at a size suitable for an avatar; recent security activity limited to a recent window rather than unbounded history; language limited to the school's configured languages; concurrent edits resolved last-write-wins per field.
- **Existing behaviour reused**: sign-in, session issuing and revocation, and the recording of security activity already exist and are not rebuilt by this feature.
- **Foundation surfaces sit outside per-school gating** (FR-037, decided 2026-08-03). The constitution makes per-tenant gating non-negotiable, so this carve-out is a deliberate, recorded exception rather than an oversight, and requires an ADR in `docs/decisions/` before the gating behaviour is built. The reasoning: gating exists so a school can choose which capabilities it offers, not so it can revoke its own users' access to their credentials. Sign-in is already ungated for the same reason.
