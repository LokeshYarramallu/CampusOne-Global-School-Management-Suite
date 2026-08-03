# Feature Specification: Authentication, Authorization & Multi-Tenant Isolation

**Feature Branch**: `001-auth-multitenancy`

**Created**: 2026-08-01

**Status**: Draft

**Input**: User description: "authentication and multi-tenant isolation"

## User Scenarios & Testing *(mandatory)*

This feature is the platform foundation: every later module depends on identity, tenancy, authorization, feature gating, notifications, and audit. It is specced full-breadth and priority-tiered. P1 is the first deliverable; P2 lands next in this same feature; items in *Out of Scope (deferred)* belong to later features.

### User Story 1 - School self-registers and configures its foundation (Priority: P1)

A School Owner registers a new institution. A new isolated tenant is created for the school. The Owner then completes foundation configuration: timezone, currency, supported languages, and which platform modules are activated for this school. The school becomes operable as a tenant with its own isolated data boundary.

**Why this priority**: No other capability can exist without a provisioned, configured, isolated tenant. This is the entry point for the entire platform.

**Independent Test**: A new school can register, complete foundation configuration, and exist as an isolated tenant with module-activation flags set — verifiable end-to-end without any other story.

**Acceptance Scenarios**:

1. **Given** no tenant exists for "Sunrise School", **When** the School Owner submits self-registration, **Then** a new isolated tenant is created and the Owner becomes its first administrator.
2. **Given** a newly registered tenant, **When** the Owner sets timezone, currency, languages, and module-activation flags, **Then** those foundation settings are persisted for the tenant and module activation controls which capabilities are reachable.
3. **Given** two registered tenants A and B, **When** any query is made for tenant A's data, **Then** tenant B's data is never visible or reachable (isolation verified by test).
4. **Given** a tenant with a module deactivated, **When** any user of that tenant attempts to reach that module through any path, **Then** the module is unreachable (not merely hidden).

### User Story 2 - User signs in on the web with credentials and MFA (Priority: P1)

A returning user (any role) signs in with email and password. When the tenant's MFA policy requires it (globally, for their role, or for them specifically), they complete a second factor via an authenticator-app code or an email code, then reach their role-appropriate landing experience.

**Why this priority**: Sign-in is the gateway to every capability and must be available on day one.

**Independent Test**: A provisioned user can sign in with email/password, complete MFA when required, and reach their authenticated experience — verifiable with a single test tenant and one user per role.

**Acceptance Scenarios**:

1. **Given** a user with valid credentials and no MFA requirement, **When** they submit email and password, **Then** they are authenticated and reach their role-appropriate experience.
2. **Given** a tenant that enforces MFA for the Accountant role, **When** an Accountant signs in, **Then** they must complete a second factor before reaching any authenticated surface.
3. **Given** MFA enforcement just enabled for a role, **When** an affected user next signs in, **Then** the MFA requirement takes effect at that sign-in.
4. **Given** repeated failed sign-in attempts, **When** attempts exceed the tenant's configured lockout threshold, **Then** the account is locked and the user is informed without revealing which credential was wrong.

### User Story 3 - User signs in via single sign-on (Priority: P1)

A user chooses to sign in with a productivity identity provider (Google, Microsoft, or Apple) instead of a password. On first use, their provider identity is linked to their platform identity; on later use, single sign-on authenticates them directly.

**Why this priority**: SSO is a P0 PRD requirement and a key convenience/enterprise expectation.

**Independent Test**: A user can link a provider and subsequently sign in entirely via that provider — verifiable independently of the password flow.

**Acceptance Scenarios**:

1. **Given** a user with a linked provider, **When** they choose that provider at sign-in, **Then** they are authenticated through the provider and reach their experience.
2. **Given** a user with no linked provider, **When** they sign in via a provider for the first time, **Then** the provider identity is associated with their platform identity.

### User Story 4 - User manages own credentials, MFA, and sessions (Priority: P1)

A user views and terminates their own active sessions, changes their password, updates their contact details, and enrols or removes MFA methods. An administrator can force sign-out for a single user or all users of a tenant.

**Why this priority**: Session control and self-service reduce support load and are PRD §5.1 P0 requirements.

**Independent Test**: A user can list active sessions, terminate one, and confirm it can no longer act — verifiable with one user and two sessions.

**Acceptance Scenarios**:

1. **Given** an authenticated user with multiple active sessions, **When** they view their sessions and terminate one, **Then** that session can perform no further action.
2. **Given** an administrator, **When** they force sign-out for a user (or all users), **Then** the targeted session(s) can perform no further action.
3. **Given** a tenant with a concurrent-session limit for a role, **When** a user exceeds the limit, **Then** the oldest session is ended per policy.
4. **Given** a user, **When** they change their password or update their contact details, **Then** the change persists and (for password) existing sessions behave per tenant policy.

### User Story 5 - Administrator manages roles, permissions, and scope (Priority: P1)

A School Admin Office user assigns built-in roles from the platform's initial seven-role catalog, creates custom roles later, and adjusts permission assignments with data scope (a teacher sees only assigned classes; a parent/guardian sees only linked children). Every permission change is recorded with actor, timestamp, and before/after state.

**Why this priority**: RBAC with scope is the authorization backbone for every module and a P0 PRD requirement (§3.6).

**Independent Test**: An administrator can create a custom role, assign it to a user, and confirm the user gains exactly those permissions with the intended scope — verifiable with one tenant and two users.

**Acceptance Scenarios**:

1. **Given** a School Administrator, **When** they create a custom role and assign it to a user, **Then** the user gains exactly that role's permissions, no more, and the change appears in the audit log with before/after state within one minute.
2. **Given** a Teacher role scoped to assigned classes, **When** the teacher attempts to view data outside their assignment, **Then** access is denied.
3. **Given** a custom role that inherits a Teacher role, **When** permissions are evaluated, **Then** the holder has the inherited set plus any additions.
4. **Given** a custom role created and assigned, **Then** it can be created and assigned in under five minutes without vendor assistance.

### User Story 6 - Platform Super Admin manages tenants (Priority: P1)

A Platform Super Admin views and manages tenants across the platform: list tenants, suspend a tenant, adjust tenant-level configuration, and view platform-wide health. Access to tenant data is restricted to support/compliance purposes and is fully audited.

**Why this priority**: The platform operator must be able to operate the service and respond to incidents; the role exists in the catalog from day one.

**Independent Test**: A Platform Super Admin can list tenants and suspend one, and the suspended tenant's users cannot sign in — verifiable with two tenants.

**Acceptance Scenarios**:

1. **Given** a Platform Super Admin, **When** they list tenants, **Then** they see platform tenants (via an audited cross-tenant path only).
2. **Given** a Platform Super Admin, **When** they suspend a tenant, **Then** that tenant's users can no longer sign in and the action is audited.
3. **Given** any tenant user (including School Owner), **When** they attempt to alter or delete an audit record, **Then** the attempt is denied.

### User Story 7 - New parent onboards and links to their child (Priority: P1)

A school enrolls a student and records parent contact details. No existing global parent identity exists for that verified email/mobile, so the parent receives an invitation, verifies their identity, sets credentials, and lands on a dashboard showing their child with the school's identity context. This creates a platform-level parent identity owned by the parent, not the school.

**Why this priority**: The unified parent identity is the platform's defining innovation (PRD §5.3) and is required for family-facing modules to function.

**Independent Test**: A school records a parent's contacts, the parent accepts the invitation and lands on a dashboard showing their child — verifiable with one tenant and one student.

**Acceptance Scenarios**:

1. **Given** a school records a new parent's verified email/mobile, **When** no existing global identity matches, **Then** an invitation is sent and a new platform-level parent identity is created on acceptance.
2. **Given** the parent completes first-run, **Then** registration through first child linked completes in under five minutes.
3. **Given** the new parent identity, **Then** it belongs to the parent and is independent of any single school.

### User Story 8 - Existing parent links an additional school (Priority: P1)

A school records parent contact details that match an existing global parent identity. The platform initiates a consent-based link request. The parent accepts, and the new school and child appear alongside their existing ones — no new account, no new password. The school can never see which other schools the parent is linked to.

**Why this priority**: The no-re-registration promise (PRD §4.2, §5.3) is core to the product's value and must hold from the first release.

**Independent Test**: A parent already linked to School A is linked to School B and sees both children under one account — verifiable with two tenants and one parent.

**Acceptance Scenarios**:

1. **Given** an existing global parent identity, **When** a second school records matching verified contact details, **Then** a consent-based link request is sent rather than a new account being created.
2. **Given** the parent accepts the link, **Then** the new school and child appear under the same account with no re-registration, in under one minute.
3. **Given** any school, **When** it attempts to discover the parent's other school associations through any interface or export, **Then** no such association is revealed.

### User Story 9 - Primary parent configures family and guardian access (Priority: P1)

A primary parent invites the other parent, step-parents, grandparents, or guardians and configures each person's access scope. Revocation of a guardian's access takes effect immediately. Family structures including separated/divorced parents with independent access are supported.

**Why this priority**: Family-structure support (PRD §5.3) is required for the parent experience to be correct and is coupled to the parent identity.

**Independent Test**: A primary parent invites a guardian with a limited scope, the guardian sees exactly that scope, and revoking access immediately removes it — verifiable with one parent and one guardian.

**Acceptance Scenarios**:

1. **Given** a primary parent, **When** they invite a guardian with a configured access scope, **Then** the guardian sees exactly the scope granted, no more.
2. **Given** a guardian with access, **When** the primary parent revokes it, **Then** the revocation takes effect immediately.
3. **Given** separated parents, **Then** each has independent access to the shared child without one seeing or controlling the other's access.

### User Story 10 - Notifications are delivered across channels with preferences (Priority: P1)

Auth and platform notifications (invitations, password-reset, MFA codes, welcome, system notices) are delivered through email, in-app feed, and push channels using localized templates. Delivery is tracked end-to-end with automatic retry and channel fallback. Users manage per-channel, per-category, per-school preferences with quiet hours and frequency caps; emergency broadcasts override quiet hours.

**Why this priority**: Auth flows cannot complete at P1 without email delivery, and the notification center is a P0 PRD requirement (§5.9) that other modules will depend on.

**Independent Test**: An invitation notification is sent, delivered, tracked, and visible in the recipient's in-app feed with correct localization — verifiable with one sender and one recipient. *(Note: push and in-app feed channels fully activate once the mobile/app shell exists — see P2.)*

**Acceptance Scenarios**:

1. **Given** a notification addressed to a user with email enabled, **When** it is sent, **Then** delivery status (sent/delivered/read/failed/bounced) is tracked and the user can see it.
2. **Given** a failed delivery on one channel, **Then** the system retries and falls back to an alternate channel, visible in delivery reports.
3. **Given** a user's quiet hours in their local timezone, **When** a routine notification falls within them, **Then** it is suppressed, but an emergency broadcast is delivered regardless.
4. **Given** a localized template, **Then** the notification renders in the recipient's preferred language.

### User Story 11 - Every significant action is captured in a trustworthy audit log (Priority: P1)

Every significant action — sign-in, MFA change, permission/role change, tenant provisioning, session termination, parent linking, feature-gate change — is logged with actor, action, target, timestamp, device context, and before/after state. Logs are tamper-evident and immutable, retained for a configurable period with a seven-year minimum, and can be filtered, searched, exported, and streamed to a customer's security-monitoring tooling.

**Why this priority**: Accountability for children's data and money is a P0 PRD requirement (§5.6) and the constitution requires every permission change to be audited.

**Independent Test**: A permission change is performed and an auditor can locate it in the audit trail with before/after values and export it — verifiable with one change and one auditor user.

**Acceptance Scenarios**:

1. **Given** any data modification, **Then** it can be traced to an actor with before/after values.
2. **Given** an auditor with permission, **When** they filter and export audit records for a date range, **Then** the export completes in under five minutes.
3. **Given** audit records, **Then** no tenant user (including School Owner) can alter or delete them.
4. **Given** a customer's security-monitoring integration, **When** audit events occur, **Then** they are streamable in real time.

### User Story 12 - Multi-role user switches between role views (Priority: P2)

A person who holds multiple roles within or across schools under one identity switches between clearly-distinguished role views in one tap. Their permissions in each view are exactly those of that role — never a blended or leaked union.

**Why this priority**: Important for the Teacher-Parent experience (PRD §4.10) but not required for single-role day-one operation; lands after P1.

**Independent Test**: A user with Teacher and Parent roles switches views and each view shows exactly that role's permissions — verifiable with one user and two role assignments.

**Acceptance Scenarios**:

1. **Given** a user with Teacher (School X) and Parent (School Y) roles, **When** they switch from Teacher View to Parent View, **Then** they see exactly the Parent permission set, never a blend.
2. **Given** the same user, **Then** they operate from one account and one app with no second registration.

### User Story 13 - Multi-campus school group operates under one tenant (Priority: P2)

A school group operates multiple campuses under one tenant with shared governance and consolidated reporting, while each campus maintains its own timetables, staff assignments, and local settings.

**Why this priority**: Required by PRD §5.2 for chains, but single-campus tenants are sufficient for day-one operation.

**Independent Test**: A two-campus group produces a consolidated enrollment/finance view in one action — verifiable with one tenant and two campuses (once the underlying modules exist).

**Acceptance Scenarios**:

1. **Given** a tenant with two campuses, **When** an administrator requests a consolidated report, **Then** data across both campuses is aggregated in one action.
2. **Given** the two campuses, **Then** each maintains its own timetables, staff assignments, and local settings independently.

### User Story 14 - Tenant configuration is versioned and rollback-able (Priority: P2)

Tenant configuration changes are versioned, and an administrator can roll back to any prior version.

**Why this priority**: Required by PRD §5.2 but not needed until tenants are actively reconfiguring; lands after P1.

**Independent Test**: An administrator changes foundation configuration and rolls it back to a prior version, confirming the restoration — verifiable with one tenant.

**Acceptance Scenarios**:

1. **Given** a tenant with configuration history, **When** an administrator rolls back to a prior version, **Then** the configuration is restored to that version's state.

### User Story 15 - Returning mobile user signs in with biometrics; magic-link available (Priority: P2)

A returning mobile user signs in with device biometrics (fingerprint/face) in under three seconds. Separately, a user may sign in via a passwordless email magic link.

**Why this priority**: Mobile biometrics (PRD §5.1) depend on the unified mobile app (PRD §6), which is not yet in this repo; magic-link is a convenience that can follow the core flows.

**Independent Test**: A returning mobile user unlocks the app with biometrics and reaches their experience; a user clicks a magic link and is signed in — verifiable once the mobile surface exists.

**Acceptance Scenarios**:

1. **Given** a returning mobile user who has enabled biometrics, **When** they sign in with fingerprint/face, **Then** they reach their experience in under three seconds.
2. **Given** a user who requests a magic link, **When** they click the delivered link, **Then** they are authenticated without a password.

### User Story 16 - Identity data can be deleted and exported (Priority: P2)

A user or authorized party requests deletion (right-to-erasure) or export (data portability) of their identity data. Deletion removes the identity per policy; export packages the identity data in machine-readable form.

**Why this priority**: Required by GDPR/FERPA (PRD §12.1, §5.10) but the core identity system must exist before deletion/export of it is meaningful; lands at P2.

**Independent Test**: An identity is exported to a machine-readable package, and a separate identity is deleted with confirmation — verifiable with two identities.

**Acceptance Scenarios**:

1. **Given** a valid portability request for a user, **When** it is fulfilled, **Then** the user's identity data is delivered in machine-readable form within regulatory timelines.
2. **Given** a valid erasure request, **When** it is fulfilled, **Then** the identity data is removed per policy and the deletion is auditable.

### Edge Cases

- **Tenant isolation under cross-tenant parent identity**: the unified parent identity is the one deliberate cross-tenant entity. A school must never enumerate a parent's other schools through any interface, export, or inference; cache keys, search indexes, and storage paths must include the tenant identifier so a collision never leaks across tenants.
- **Tenant context from client input**: a request that attempts to supply a tenant identifier via body, query, or header must be ignored — tenant context is derived server-side from the authenticated session.
- **MFA lockout vs. denial**: failed sign-in responses must not reveal which credential factor was wrong, to avoid enumeration.
- **Concurrent session limit eviction**: when a user exceeds the limit for their role, the policy (e.g. evict oldest) must be deterministic and the evicted session immediately unable to act.
- **Parent link to a suspended tenant**: a parent linked to a suspended school must not see that school's data while it is suspended; other linked schools are unaffected.
- **Guardian scope revocation race**: a guardian acting at the moment of revocation must have the action denied if it occurs after revocation.
- **Disabled feature under active session**: a feature disabled mid-session for a tenant becomes unreachable through any endpoint, job, or UI path immediately — not merely hidden.
- **SSO provider outage**: a fallback to email/password sign-in must remain available when a federated provider is unavailable.
- **Notification channel exhaustion**: if all configured channels fail, the failure is recorded and surfaced in delivery reports; the system never silently drops a notification.
- **Audit of audit access**: reads of the audit log by authorized users are themselves recorded.
- **Cross-tenant query paths**: any backend path that returns rows across tenants must be named explicitly (e.g. "findAcrossTenantsForPlatformAdmin") and reachable only by an audited Platform Super Admin path.

## Requirements *(mandatory)*

### Functional Requirements

#### Authentication (PRD §5.1)

- **FR-001**: The system MUST let users sign in with email and password.
- **FR-002**: The system MUST let users sign in via single sign-on with Google, Microsoft, and Apple as federation providers.
- **FR-003**: The system MUST let returning mobile users sign in with device biometrics (fingerprint/face) in under three seconds (P2, once the mobile surface exists).
- **FR-004**: The system MUST let users sign in via a passwordless email magic link (P2).
- **FR-005**: The system MUST support multi-factor authentication via authenticator-app (TOTP) codes and email codes.
- **FR-006**: The system MUST allow MFA enforcement to be configured globally, per role, and per user, per tenant policy.
- **FR-007**: The system MUST make an MFA requirement enforced for a role take effect at each affected user's next sign-in.
- **FR-008**: The system MUST allow password policies (complexity, rotation, reuse) to be configured per tenant.
- **FR-009**: The system MUST allow users to view and terminate their own active sessions.
- **FR-010**: The system MUST allow administrators to force sign-out for a single user or all users of a tenant.
- **FR-011**: The system MUST allow concurrent session limits to be configured per role; a terminated session MUST be unable to perform any further action.
- **FR-012**: The system MUST provide self-service password reset/recovery and account lockout after a configurable number of failed attempts, with sensible defaults (lockout after approximately five failed attempts; idle session timeout approximately thirty minutes; concurrent limits per role), all configurable per tenant/role.
- **FR-013**: The system MUST allow users to update their own email and mobile number, change their password, and manage their MFA methods.
- **FR-014**: Authorization MUST be evaluated on every request against the RBAC model including the data-scope dimension; frontend role checks are presentation only.

#### Authorization / RBAC (PRD §3.6)

- **FR-015**: The system MUST provide the seven initial platform roles defined by this feature, each with a curated default permission set; additional specialized roles may be added later.
- **FR-016**: Permissions MUST be organized as Module → Feature → Action → Scope, where scope constrains data visibility (e.g. a teacher sees only assigned classes; a parent sees only their children).
- **FR-017**: The system MUST support role hierarchies with permission inheritance (e.g. Vice Principal inherits relevant Teacher permissions).
- **FR-018**: The system MUST allow School Administrators to create custom roles and adjust permission assignments within policy limits.
- **FR-019**: Every permission change MUST be written to the audit log with actor, timestamp, and before/after state, within one minute.
- **FR-020**: A user MUST never view or act on data outside their permission scope, verified by systematic access-control testing.
- **FR-021**: One person MUST be able to hold multiple roles within and across schools under one identity (P2 switching: each view shows exactly that role's permissions, never a blended union).
- **FR-022**: The system MUST never trust client-provided IDs, roles, scores, permissions, or ownership.

#### Tenant Management (PRD §5.2)

- **FR-023**: Each school MUST operate as an isolated tenant whose data is never visible to another tenant.
- **FR-024**: The system MUST allow a school to self-register and create a new isolated tenant (domain/identity verification, plan selection, and go-live checklist are out of scope for this feature — deferred).
- **FR-025**: Tenant configuration MUST cover foundation settings: timezone, currency, supported languages, and per-module activation flags. (Academic structure, grading, and holiday calendar belong to the SIS/academic-management features and are out of scope here. White-label branding is out of scope — deferred to the PRD §5.4 feature.)
- **FR-026**: Module activation MUST be enforced on the backend: a disabled module for a tenant is unreachable through any endpoint, job, or UI path.
- **FR-027**: A Platform Super Admin MUST be able to list, suspend, configure, and view health of tenants; access to tenant data is restricted to support/compliance purposes and is fully audited.
- **FR-028**: The system MUST support multi-campus school groups under one tenant with shared governance and consolidated reporting, each campus maintaining its own timetables, staff assignments, and local settings (P2).
- **FR-029**: Tenant configuration changes MUST be versioned with rollback to any prior version (P2).
- **FR-030**: Tenant context MUST be derived server-side from the authenticated session — never from request body, query, header, or any client input.

#### Global Identity & Multi-School Parent Accounts (PRD §5.3)

- **FR-031**: A parent's account MUST exist at the platform level, identified by verified email or mobile number, independent of any school.
- **FR-032**: When a school records parent contact details, the system MUST detect an existing global identity and initiate a consent-based link; otherwise it MUST create a new identity via invitation.
- **FR-033**: A school MUST NEVER be able to see which other schools a parent is linked to; a parent MUST see only data from schools that have linked them.
- **FR-034**: The parent dashboard MUST unify all children across all schools, each delineated with its school's identity context; switching between children MUST be a single interaction.
- **FR-035**: The system MUST support family structures: separated/divorced parents with independent access, step-parents, grandparents as primary caregivers, and guardians, each with independently configurable access scope controlled by the primary parent (or school where legally required).
- **FR-036**: Guardian access MUST reflect exactly the scope granted, and revocation MUST take effect immediately.
- **FR-037**: Linking a new school to an existing parent MUST require no new registration and complete in under one minute.

#### Feature Gating (PRD §5.2, §5.7; constitution Principle II)

- **FR-038**: Every feature MUST be behind a per-tenant feature gate enforced on the backend; a disabled feature for a tenant is unreachable through any endpoint, job, or UI path.
- **FR-039**: Feature gates MUST be evaluated per tenant on the backend, never client-side only.
- **FR-040**: Core capabilities MUST be on by default; optional ones MUST be off until a tenant enables them. (Full controlled-rollout controls — tenant groups, percentage rollout, experiments — are out of scope here and deferred to the PRD §5.7 feature.)

#### Notification Center (PRD §5.9)

- **FR-041**: The system MUST deliver notifications via email, in-app feed, and push channels (SMS and external messaging services are out of scope here — deferred).
- **FR-042**: The system MUST provide templates with variable substitution, conditional content, and full multi-language localization, customizable per tenant over platform-managed defaults.
- **FR-043**: The system MUST track delivery end-to-end (sent/delivered/read/failed/bounced) with automatic retry and channel fallback on failure.
- **FR-044**: The system MUST provide per-user preference management by channel, category, and school; quiet hours honoring local timezone; and frequency caps on non-critical notifications.
- **FR-045**: Emergency broadcasts MUST override quiet hours.
- **FR-046**: Notification delivery success MUST be at least 99.5% within SLA windows.
- **FR-047**: Notifications MUST be grouped by child and school within one notification center where applicable.

#### Audit Logs (PRD §5.6)

- **FR-048**: Every significant action MUST be logged with actor, action, target, timestamp, originating device context, and before/after state for data changes.
- **FR-049**: Audit logs MUST be tamper-evident and immutable; no tenant user (including School Owner) can alter or delete them.
- **FR-050**: Audit logs MUST be retained for a configurable period with a minimum of seven years.
- **FR-051**: Authorized users MUST be able to filter, search, and export audit records in spreadsheet, document, and machine-readable formats.
- **FR-052**: Audit events MUST be streamable in real time to customers' security-monitoring tooling.
- **FR-053**: Any data modification MUST be traceable to an actor with before/after values; an auditor MUST be able to extract a filtered, exportable trail for any date range in under five minutes.

#### Privacy (PRD §12, §5.10)

- **FR-054**: The system MUST provide real (not stubbed) deletion of a user identity per right-to-erasure (P2).
- **FR-055**: The system MUST provide export of a user's identity data in machine-readable form for data portability (P2).
- **FR-056**: Personal data MUST NOT appear in logs, error messages, analytics events, or URL query strings. The system MUST apply data minimization — return only the fields the caller needs.
- **FR-057**: Every module persisting tenant data MUST include a test proving tenant A cannot read or mutate tenant B's records.

### Key Entities *(include if feature involves data)*

- **Tenant**: An isolated school (or school group) — the unit of data isolation and configuration. Owns foundation settings and module-activation flags. Identified server-side from the session; never from client input.
- **Tenant Configuration**: Versioned foundation settings for a tenant — timezone, currency, supported languages, per-module activation flags. (Academic/grading/holiday settings are owned by other modules.)
- **User Identity**: A person who can authenticate. Carries one or more tenant associations and one or more role assignments. Distinguished from a Parent Identity (which is platform-level and cross-tenant).
- **Role**: One of the seven initial platform roles or a custom role. Carries a permission set and may inherit another role's permissions.
- **Permission**: A unit of access organized as Module → Feature → Action → Scope.
- **Role Assignment**: The binding of a user to a role within a tenant (and, where relevant, to a data scope such as assigned classes).
- **Session**: An authenticated session for a user, with device context; subject to concurrent limits and termination.
- **Parent Identity**: The platform-level, cross-tenant identity of a parent, identified by verified email/mobile, independent of any single school. The one deliberate cross-tenant entity; guarded so a school cannot see a parent's other schools.
- **Parent–School Link**: A consent-based association between a Parent Identity and a Tenant (school), created on invitation or link acceptance.
- **Guardian**: An authorized caregiver (step-parent, grandparent, etc.) with an independently configurable access scope granted by the primary parent or school.
- **Guardian Access Scope**: The precise data scope a guardian may see; revocable, with revocation taking effect immediately.
- **Feature Flag**: A per-tenant, backend-evaluated toggle controlling whether a feature is reachable for that tenant.
- **Notification**: A message addressed to a user, carried over one or more channels, with localized content and end-to-end delivery status.
- **Notification Template**: A localized, tenant-customizable template with variable substitution and conditional content.
- **Notification Preference**: A user's per-channel, per-category, per-school preferences, quiet hours, and frequency caps.
- **Audit Record**: An immutable, tamper-evident record of a significant action with actor, target, timestamp, device context, and before/after state.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A returning web user with MFA completes sign-in in under ten seconds; a returning mobile user signs in with biometrics in under three seconds (P2).
- **SC-002**: An MFA requirement enabled for a role takes effect for all affected users at their next sign-in.
- **SC-003**: A terminated session cannot perform any further action.
- **SC-004**: A School Administrator creates a custom role and assigns it to a user in under five minutes without vendor assistance.
- **SC-005**: Every permission change appears in the audit log within one minute, with actor, timestamp, and before/after state.
- **SC-006**: Systematic isolation testing confirms zero cross-tenant data visibility; a user can never view or act on data outside their permission scope.
- **SC-007**: A school can never infer a parent's other school associations through any interface or export.
- **SC-008**: A parent with children in three schools operates entirely from one account with one credential set; linking a new school completes in under one minute with no re-registration.
- **SC-009**: Registration through first child linked completes in under five minutes.
- **SC-010**: A guardian's access reflects exactly the scope granted, and revocation takes effect immediately.
- **SC-011**: A new tenant is self-registered and foundation-configured in under thirty minutes.
- **SC-012**: Notification delivery success is at least 99.5% within SLA windows; a failed delivery retries and falls back to an alternate channel, visible in delivery reports.
- **SC-013**: An auditor extracts a filtered, exportable audit trail for any date range in under five minutes.
- **SC-014**: Audit records cannot be altered or deleted by any tenant user, including the School Owner.
- **SC-015**: A disabled feature for a tenant is unreachable through any endpoint, job, or UI path.
- **SC-016**: A multi-role user switching views sees exactly the switched role's permissions, never a blended or leaked set (P2).

## Assumptions

- The authentication technology choice (identity provider and integration model) is recorded in `docs/decisions/0002-keycloak-identity-provider.md` and is intentionally out of this spec's text; this spec describes behaviour only. One open consequence — how per-tenant password policy is honoured — will be resolved during `/speckit-plan`.
- The database tenant-isolation *strategy* (shared schema + discriminator vs. schema-per-tenant vs. database-per-tenant) remains Open Decision #1 and is decided in `/speckit-plan` for this feature, recorded as its own ADR. This spec states isolation as a hard behavioural requirement only.
- **Notification channel phasing**: the notification center infrastructure and the email channel are P1 (auth flows require email); the push and in-app-feed channels fully activate once the unified mobile app / app shell exists (P2 mobile surface). Until then, push/in-app delivery is not exercisable end-to-end.
- **Identity deletion/export** (FR-054, FR-055) is in scope but lands at P2, after the core identity system exists at P1.
- **Mobile surface** (biometrics, mobile sign-in, magic-link end-to-end on mobile) is P2 and depends on the unified mobile app (PRD §6), which is not yet in this repo (Open Decision #3).
- **Provisioning steps deferred**: domain/identity verification, subscription plan selection, and the go-live readiness checklist are out of scope for this feature (they belong to later features: §5.4 branding/verification, §5.5 billing, §4.1 onboarding).
- **Branding deferred**: all white-label branding (PRD §5.4) is out of scope; this feature stores no branding configuration.
- **Subscription/billing deferred**: PRD §5.5 is out of scope.
- **Config wizard scope**: only foundation settings (timezone, currency, languages, module-activation flags) are in scope; academic structure, grading schemes, working days, and holiday calendar belong to the SIS/academic-management features.
- **Notification channels deferred**: SMS and external messaging services are out of scope for this feature.
- **Controlled rollout deferred**: percentage rollout, tenant-group targeting, and experiments (PRD §5.7) are out of scope; only per-tenant on/off feature gates are in scope here.
- Defaults (lockout after ~5 failed attempts, ~30-minute idle session timeout, per-role concurrent session limits) are starting points, all configurable per tenant/role; final values are confirmed during `/speckit-plan`.
- Users have stable internet connectivity for web flows; offline behaviour is owned by the mobile surface (P2) and by individual modules (e.g. attendance).
