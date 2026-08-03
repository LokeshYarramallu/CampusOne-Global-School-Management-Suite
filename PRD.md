

> > **Product Requirements**

> > **Document**

> > Avanta

> > Version 2.0  |  July 2026  |  CONFIDENTIAL

# **Table of Contents**

**Executive Summary	1**

**Product Vision and Goals	1**

**User Personas and Roles	1**

**Platform Functional Requirements	1**

Authentication and Authorization	1

Tenant Management	1

White Label Branding	1

Notification Center	1

**School Administration	1**

**Student Information System	1**

**Attendance Management	1**

**Academic Management	1**

**Examination Management	1**

**Fee Management	1**

**Communication Module	1**

**Calendar and Events	1**

**Transport Management	1**

**Library Management	1**

**Hostel Management	1**

**Inventory Management	1**

**Human Resources	1**

**Parent Mobile Application	1**

**Teacher Mobile Application	1**

**Student Mobile Application	1**

**Analytics and Reporting	1**

**Integrations	1**

**Non-Functional Requirements	1**

**UX Requirements	1**

**System Architecture	1**

**Security and Compliance	1**

**Assumptions and Risks	1**

**Future Extensibility	1**

**Glossary	1**

**Appendix	1**

# **1\. Executive Summary**

CampusOne (USMP) is a multi-tenant, enterprise-grade SaaS product that modernizes how educational institutions operate and how families engage with them. It consolidates every aspect of school operations — student information, attendance, academics, examinations, fees, communication, transport, library, hostel, inventory, and human resources — into a single coherent product, delivered through a web application and **one unified mobile application** that adapts to each user's role.

The education technology market is projected to reach $404 billion globally by 2028, with school management systems among its fastest-growing segments. Extensive competitive analysis of leading platforms (PowerSchool, Blackbaud, Infinite Campus, Gradelink, Teachmint, Classter, OpenEduCat) revealed persistent gaps: fragmented user experiences, dated interfaces, weak mobile capabilities, and — most significantly — no support for families whose children attend different schools.

USMP's signature innovation is the **unified parent identity**: a single global account through which a parent manages all of their children across any number of independent schools on the platform. Combined with comprehensive operational modules, white-label branding, multi-campus support, and enterprise-grade reliability and compliance, this positions USMP as the next-generation standard for educational management software.

## **1.1 The Problems We Solve**

**Parents** juggle multiple portals, logins, and communication channels — one per school — and miss time-sensitive information about their children. An estimated 35% of families globally have children enrolled in more than one school.

**Teachers** lose instructional time to administrative overhead: paper attendance registers, manual mark entry, and unstructured parent communication that spills into personal time.

**School administrators and owners** operate on fragmented point solutions and spreadsheets, with no consolidated view of enrollment, finance, attendance, and staff, and no reliable audit trail for compliance.

**Students** lack a single self-service view of their timetable, homework, results, and study materials, limiting their ability to manage their own learning.

**School groups** running multiple campuses cannot govern centrally while operating locally, and cannot present a consistent, school-branded digital experience to their communities.

## **1.2 Business Opportunity**

Key market drivers include digital transformation of institutions, hybrid learning models, rising parental engagement expectations, tightening student data privacy regulation (FERPA, GDPR, COPPA), and demand for data-driven education governance. Incumbent leaders carry significant product debt and lack the flexibility to deliver mobile-first, real-time, cross-institutional experiences. No existing competitor offers a unified parent identity across schools — a defensible differentiator and the platform's core wedge into the market.

---

# **2\. Product Vision and Goals**

## **2.1 Vision Statement**

To create the world's most connected, intuitive, and comprehensive school management platform — one that empowers every stakeholder in the education ecosystem. By unifying fragmented school operations into a single seamless experience and enabling families to transcend institutional boundaries, we will redefine how education is managed, experienced, and optimized for every learner.

## **2.2 Product Goals**

* **Enterprise Grade** — reliability, security, and scalability to the highest standard: 99.99% availability, independently audited controls, and support for millions of concurrent users across thousands of institutions.

* **Highly Scalable** — grow from a single school to thousands of institutions on the same product, with sub-second responsiveness under peak load.

* **Secure by Design** — end-to-end protection of student and family data, comprehensive audit trails, and compliance with global education data protection regulations.

* **Modular** — schools activate only the modules they need and add capabilities as they grow, without disruption to existing operations.

* **Open and Integrable** — every platform capability is programmatically accessible to authorized third parties, enabling integrations, custom extensions, and headless use.

* **Mobile First** — a native-quality unified mobile experience on iOS and Android with offline capability, push notifications, and biometric sign-in.

* **White-Label Capable** — each school can present the platform entirely as its own: branding, domain, and a school-branded mobile app presence, all without custom development.

* **Multi-Tenant** — complete data isolation and independent configuration per school, on shared, efficiently operated infrastructure.

* **Future-Proof** — extensible by design to accommodate AI-powered insights, verifiable digital credentials, immersive learning technologies, and evolving education standards.

## **2.3 Key Differentiators**

1. **Unified Parent Identity (signature innovation).** One global account per parent, valid across every school on the platform. No duplicate accounts, no password fatigue, no fragmented view of the family's education life.

2. **One App, Every Role.** A single mobile application serves parents, teachers, students, and all school staff. Users with multiple roles — a teacher who is also a parent — switch views instantly without logging out.

3. **Zero-Config Onboarding.** A guided onboarding experience takes a school from sign-up to operational within 24 hours, auto-configuring academic structures, importing existing data, and generating role-specific training pathways.

4. **Intelligent Automation.** Routine work — attendance alerts, fee reminders, timetable generation, anomaly detection — is automated, targeting up to 60% reduction in administrative burden.

5. **Real-Time Everything.** Data changes propagate to all affected users and devices immediately; no stakeholder ever acts on stale information.

6. **Family-Centric Design.** Where competitors organize around the institution, USMP is organized around the family — reflecting how modern families actually interact with education.

## **2.4 Non-Goals**

The following are explicitly **out of scope** for this product. Documenting them prevents scope creep and clarifies positioning.

* **Learning Management System (LMS) depth.** USMP supports homework, assignments, study materials, and virtual class links, but does not aim to replace dedicated courseware platforms (authoring interactive lessons, adaptive learning paths, SCORM content delivery). It integrates with them instead.

* **General-purpose accounting/ERP.** The platform manages school fees, payroll, and purchase records, but is not a statutory general ledger; it integrates with industry-standard accounting software.

* **Content marketplace.** USMP does not sell or license curriculum content, textbooks, or question banks.

* **Consumer social networking.** Communication features are purposeful and school-scoped; the platform is not an open social network for students.

* **Government/board examination administration.** The platform manages internal school assessments; it does not conduct or certify external board examinations (though it stores their outcomes).

* **Hardware manufacturing or resale.** The platform integrates with biometric, RFID, and GPS hardware; it does not supply or service devices.

* **Custom per-school source code.** White-labeling covers branding, configuration, and modular activation — not bespoke code forks per customer.

* **Separate role-specific mobile apps.** There is exactly one mobile application; the platform will not ship or maintain independent parent/teacher/student apps.

## **2.5 Success Metrics**

Success is measured across seven dimensions with quantifiable targets. All targets are measured from general availability (GA) unless stated otherwise.

### **Adoption**

* 500 schools live within 18 months of GA; 2,000 within 36 months.

* 60% of enrolled families activate their parent account within 30 days of school go-live.

* 90% of teaching staff actively using the platform within 60 days of school go-live.

* 25% of parents on the platform linked to more than one school within 3 years (validating the unified identity thesis).

### **Engagement**

* Daily active users ≥ 70% of weekly active users during term time.

* Parents open the app ≥ 4 times per week on average during term time.

* ≥ 80% of homework assignments created and graded digitally within 6 months of school go-live.

* ≥ 95% of priority notifications read within 24 hours.

### **Retention**

* Gross annual school (logo) retention ≥ 95%; net revenue retention ≥ 110% through module expansion and enrollment growth.

* Parent account 90-day retention ≥ 85%.

### **Satisfaction**

* Net Promoter Score ≥ 50 for parents, ≥ 45 for school administrators, ≥ 40 for teachers.

* App store rating ≥ 4.5 sustained.

* Support CSAT ≥ 90%; median first-response time under 2 business hours.

### **Teacher Productivity & Operational Efficiency**

* ≥ 40% average reduction in school administrative time within one year of adoption (measured by customer time-and-motion studies).

* Class attendance marked in under 2 minutes; marks entry for a class completed in under 15 minutes per exam.

* ≥ 50% reduction in fee-related front-office inquiries via self-service payment and receipts.

### **Revenue**

* Fee collection rate for schools on the platform improves ≥ 10 percentage points within one year (customer value metric).

* ≥ 30% of tenant revenue from module and tier expansion by end of year 3\.

* Payback period per acquired school ≤ 18 months.

### **Platform Reliability**

* 99.99% monthly availability; interactive response p95 under 200 ms at peak.

* ≥ 99.5% notification delivery success within SLA windows.

* Zero data-loss incidents; zero cross-tenant data exposure incidents.

---

# **3\. User Personas and Roles**

The platform supports **nineteen distinct user roles** governed by granular, role-based access control. Each role receives a curated default permission set; School Administrators can create custom roles or adjust permissions within policy limits. Every permission change is fully audited. A single person may hold multiple roles (even across schools) under one identity — see the Unified Mobile Application (Section 6).

## **3.1 Platform-Level Roles**

**Platform Super Admin.** Operates the SaaS service itself: tenant provisioning, platform configuration, subscription plans, service health, security incident response, and controlled feature rollout. Access to tenant data is restricted to support and compliance purposes and is fully audited. Internal to the platform operator only.

**School Owner.** Highest authority within a school tenant — typically the proprietor, trust, or board. Full administrative access to all modules and data in their institution; manages subscription and billing; approves critical operations; delegates authority.

## **3.2 Administrative Roles**

**School Administrator.** The day-to-day system coordinator: academic year setup, classes and sections, subject allocation, timetables, user accounts, role assignments, workflow configuration, and settings.

**Principal.** Institution-wide oversight. A high-level dashboard of enrollment, attendance, academic performance, staff utilization, and financial health; read access to most modules; approval authority for critical workflows; communication with all stakeholder groups.

**Vice Principal.** Assists the Principal in delegated domains (academics, student affairs, administration). Permissions are configurable per the delegation established by the Principal and School Owner.

**Academic Coordinator.** Bridges academic strategy and classroom operations: curriculum implementation, examination scheduling, grading scheme configuration, teacher workload distribution, lesson plan approval, and academic reporting.

## **3.3 Teaching Roles**

**Teacher.** All instructional staff. Marks attendance for assigned classes; creates and grades homework and assignments; enters examination marks; uploads study materials; communicates with parents and students; manages classroom announcements; views their teaching timetable. Access is scoped strictly to assigned subjects, classes, and students.

**Class Teacher.** A teacher with homeroom responsibility for a specific section. Additionally views holistic student profiles, manages class-level communication, coordinates with parents in their section, approves student leave requests, and monitors overall class performance.

## **3.4 Student and Family Roles**

**Student.** Self-service access to timetable, homework, assignments, attendance, examination schedules, report cards, study materials, and announcements; digital assignment submission; communication with teachers; leave requests. Designed to build self-management of the learning journey.

**Parent.** The platform's most important end user. Through a **single unified account**, a parent manages all children across any number of schools: attendance, homework, academic progress, fee payment, teacher communication, report cards, transport tracking, announcements, and leave requests. Optimized for mobile with push notifications for time-sensitive events.

**Guardian.** Authorized caregivers who are not the primary parent — grandparents, step-parents, foster parents, legal guardians. Receives limited, configurable access granted by the primary parent or the school.

## **3.5 Operational Roles**

**Accountant.** All financial operations: fee structures, invoicing, payment reconciliation, scholarships and discounts, payroll processing, expense tracking, financial reporting, and audit support. No access to modify academic records or user permissions.

**Librarian.** Catalog management, circulation (issue/return), reservations, fines, digital library administration, and reading analytics.

**Transport Manager.** Fleet, routes, stops, drivers, live tracking oversight, pickup/drop notifications, and transport fee configuration; responds to operational disruptions in real time.

**Hostel Warden.** Residential operations: room allocation, visitor management, hostel attendance, mess planning, disciplinary records, and maintenance requests.

**HR Manager.** Personnel lifecycle: employee records, recruitment, onboarding, leave administration, staff attendance, performance evaluation, payroll inputs, training, and compliance reporting.

**Receptionist.** Front-desk hub: visitor registration, call and inquiry handling, appointment scheduling, and initial grievance recording.

**Admission Officer.** The enrollment pipeline end to end: inquiry capture, application review, interviews, document verification, admission fees, waitlists, and enrollment confirmation; enrollment analytics.

**Inventory Manager.** Institutional assets and consumables: procurement, stock levels, asset allocation, maintenance scheduling, vendor management, depreciation, and disposal.

**IT Administrator.** In-school technical coordination: account provisioning, password resets, device management, integration configuration, backup verification, and liaison with platform support.

## **3.6 Access Control Requirements (P0)**

* The platform shall provide role-based access control with **400+ granular permissions** organized as Module → Feature → Action → Scope, where scope constrains data visibility (e.g., a teacher sees only assigned classes).

* Role hierarchies shall support permission inheritance (e.g., Vice Principal inherits relevant Teacher permissions).

* Schools shall be able to create custom roles and adjust permission assignments; all changes are audited with before/after state.

* One person shall be able to hold multiple roles, within and across schools, under a single identity.

**Acceptance Criteria**

* A user can never view or act on data outside their permission scope, verified by systematic access-control testing across all modules.

* A School Administrator can create a custom role and assign it to a user in under 5 minutes without vendor assistance.

* Every permission change appears in the audit log within 1 minute, with actor, timestamp, and before/after state.

* A user holding Teacher and Parent roles sees exactly the union of experiences through role switching, never a blended or leaked view.

---

# **4\. User Journeys**

These end-to-end journeys define the experiences the product must deliver. They are the primary input for UX design and acceptance testing. Time targets are product requirements, not aspirations.

## **4.1 School Onboarding (Owner / Administrator)**

1. **Sign-up.** The School Owner registers the institution, verifies the school's domain and identity, and selects a subscription plan.

2. **Guided setup.** An onboarding wizard walks the administrator through academic year structure, terms, classes and sections, subjects, grading schemes, timezone, currency, languages, working days, and holiday calendar. Sensible regional defaults minimize manual entry.

3. **Data import.** The administrator imports existing student, staff, and fee records from spreadsheets or prior systems using guided mapping templates with validation and error reports.

4. **Branding.** The school uploads its logo and selects brand colors; the platform generates a compliant, accessible theme and previews it across web and mobile.

5. **Module activation.** The school activates the modules it needs; others remain available to enable later.

6. **User invitations.** Staff, teachers, students, and parents are invited in bulk; each receives role-appropriate first-run guidance.

7. **Go-live.** A readiness checklist confirms configuration completeness; the school goes live.

**Journey requirements:** a school can be operational within **24 hours** of registration; initial administrator setup completes in under **30 minutes**; tenant provisioning completes within **30 minutes** of registration.

## **4.2 Parent Onboarding and Multi-School Linking**

1. **Invitation.** A school enrolls a student and records parent contact details. The platform checks whether a global parent identity already exists for that verified email/mobile number.

2. **New parent.** If none exists, the parent receives an invitation, downloads the app (or the school-branded app), verifies their identity, sets credentials, and lands on a dashboard showing their child with the school's branding.

3. **Existing parent.** If an identity exists, the parent receives a link request; on acceptance, the new school and child appear alongside existing ones — **no new account, no new password**.

4. **Family setup.** The primary parent invites the other parent or guardians and configures each person's access scope.

5. **First-run orientation.** A brief guided tour highlights attendance, homework, fees, and messages; the parent sets notification preferences.

**Journey requirements:** registration through first child linked completes in under **5 minutes**; linking an additional school to an existing account requires no re-registration; a school can never see which other schools a parent is linked to.

## **4.3 Multi-School Parent Daily Experience**

1. The parent opens the app to a unified dashboard: one card per child, each carrying its school's branding, with at-a-glance status (attendance today, homework due, fees pending, unread notices).

2. A morning absence alert for Child A (School 1\) arrives as a push notification; tapping it opens the attendance detail with one-tap options to acknowledge or submit a leave justification.

3. Switching to Child B (School 2\) is a single tap; all context — branding, announcements, teachers — changes to School 2 unambiguously.

4. The parent pays a pending fee installment for Child B in under 3 taps from the notification, receives an instant digital receipt, and RSVPs to School 1's parent-teacher meeting from the shared calendar.

5. Notifications remain intelligently grouped by child and school; a single notification center spans everything with per-school preferences and quiet hours.

## **4.4 Student Admission (Admission Officer / Parent)**

1. **Inquiry.** A prospective parent submits an inquiry via web form, app, or walk-in entry by the Receptionist; the inquiry receives a tracking number and enters the pipeline.

2. **Application.** The parent completes the application, uploads required documents (birth certificate, prior records, photographs, etc.), and pays the application fee online.

3. **Verification & assessment.** The Admission Officer verifies documents against a checklist; the school schedules entrance tests and/or interviews with automated notifications.

4. **Decision.** Merit lists or offers are published; waitlisted candidates are ranked by configurable criteria and progressed automatically as seats free up.

5. **Enrollment.** On offer acceptance and fee payment, the student record is created, a student ID is generated, class/section is assigned, and the parent's account is linked (Journey 4.2).

**Journey requirements:** applicants can check status at every stage without contacting the school; schools can configure custom pipeline stages and approvals without vendor involvement.

## **4.5 Teacher Attendance Workflow**

1. At the start of class, the teacher opens the app; the correct class roster is preselected based on the timetable.

2. The roster defaults to "all present"; the teacher taps only exceptions (absent, late, half-day), optionally noting reasons.

3. The teacher submits; parents of absent/late students are notified within **30 seconds**.

4. If offline (connectivity gap), attendance is captured locally and synchronizes automatically when connectivity returns, preserving original timestamps.

5. Where the school uses biometric/RFID capture, records flow in automatically and the teacher's role becomes exception review.

**Journey requirements:** full-class marking in under **2 minutes**; offline capture is indistinguishable from online capture from the parent's perspective apart from delivery time.

## **4.6 Homework Workflow (Teacher → Student → Parent)**

1. The teacher creates homework (subject, classes/sections or individual students, description, attachments, due date, submission format) in under 2 minutes from the app or web.

2. Students and parents are notified; homework appears on their dashboards with due-date reminders.

3. The student submits digitally (file, photo, text, or in-app quiz); submissions are timestamped and late submissions flagged per school policy.

4. The teacher reviews and grades with marks/grades, rubric scores, and feedback; results publish to student and parent views.

5. Parents see pending vs. completed homework per child; teachers see class-level completion analytics and can nudge non-submitters in one tap.

## **4.7 Fee Payment Workflow (Parent / Accountant)**

1. The Accountant configures fee structures, applicability rules, installment plans, and discount/scholarship policies once per cycle.

2. Invoices generate automatically; parents are reminded through their preferred channels on a configurable escalation schedule.

3. The parent pays online in **3 taps or fewer** from the reminder, using any supported payment method; a verifiable digital receipt is delivered instantly.

4. Counter payments (cash/cheque/transfer) are recorded by the Accountant with numbered, branded receipts.

5. Payments reconcile automatically against fee records; discrepancies surface for investigation; refunds follow approval workflows with status visible to the parent.

6. Defaulter management escalates per policy, with reports and configurable restrictions for chronic arrears.

## **4.8 Examination Workflow (Coordinator → Teacher → Family)**

1. The Academic Coordinator plans the examination (types, subjects, classes, dates, marks, passing criteria) and generates a conflict-free exam timetable with rooms and invigilators.

2. Seating arrangements generate automatically per school policy; admit cards/schedules publish to students and parents.

3. Teachers enter marks via fast bulk entry with validation and anomaly flagging; the Coordinator reviews grade boundaries and approves.

4. Results publish in a controlled release; report cards generate from school-configured templates combining marks, attendance, remarks, and co-curricular achievements.

5. Parents and students view results with trend analysis; official transcripts can be issued with verifiable authenticity.

## **4.9 Transport Tracking (Parent / Transport Manager)**

1. The Transport Manager configures vehicles, routes, stops, and driver assignments; students are mapped to stops.

2. Each morning, the parent sees the bus's live location and ETA for their child's stop.

3. Boarding/alighting is verified (RFID tap, driver confirmation, or equivalent); the parent is notified on each event.

4. A missed pickup triggers escalation to the parent and Transport Manager; geofence and overspeed events alert the school in real time.

5. The Transport Manager monitors the fleet on a live map, handles disruptions (breakdown → reroute/substitute), and reviews route adherence history.

## **4.10 Multi-Role User Experience (e.g., Teacher-Parent)**

1. Ms. Rao is a teacher at School X and a parent of a child at School Y. She has **one account and one app**.

2. She starts her day in Teacher View: today's classes, attendance, pending grading.

3. Between classes, a notification arrives about her own child's fee due at School Y. Tapping it switches her to Parent View — clearly distinguished visually — where she pays the fee.

4. She switches back to Teacher View in one tap. No logout, no second account, no confusion about which context she is in.

5. Her notification center shows both streams, clearly labeled by role and school; her permissions in each view are exactly those of that role, never blended.

---

# **5\. Functional Requirements — Platform Foundation**

The Platform Foundation provides capabilities every other module depends on: identity, tenancy, branding, notifications, documents, billing, auditability, and data portability. Requirements below are expressed as product behavior; realization choices belong to the architecture documents.

## **5.1 Authentication and Authorization — P0**

**Why it exists.** Every stakeholder — from a Platform Super Admin to a grandparent guardian — must access exactly what they are entitled to, conveniently and securely. Trust in the platform begins here.

**Requirements**

* Users shall sign in with email/password, single sign-on via industry-standard federation with major productivity identity providers, or device biometrics (fingerprint/face) on mobile.

* Multi-factor authentication shall be available via authenticator apps, SMS, email codes, and in-app push approval, and shall be enforceable globally, per role, or per user, per tenant policy.

* Password policies (complexity, rotation, reuse) shall be configurable per tenant.

* Users shall be able to view and terminate their active sessions; administrators shall be able to force sign-out for any user or all users. Concurrent session limits shall be configurable per role.

* Authorization shall be evaluated on every request against the RBAC model defined in Section 3.6, including data-scope filtering.

**Acceptance Criteria**

* A returning mobile user signs in with biometrics in under 3 seconds.

* Enforcing MFA for a role takes effect for all affected users at their next sign-in.

* A terminated session cannot perform any further action.

* Access-control checks demonstrably prevent out-of-scope data access across all modules.

## **5.2 Tenant Management — P0**

**Why it exists.** Each school is an independent institution with its own data, rules, and identity. Multi-tenancy lets the platform serve thousands of schools efficiently while guaranteeing each one isolation and autonomy.

**Requirements**

* Each school shall operate as an isolated tenant: its data shall never be visible to another tenant.

* Tenant provisioning shall be automated (registration → verification → subscription → configuration wizard → go-live) and complete within 30 minutes.

* Tenant configuration shall cover academic structure, grading systems, timezone, currency, languages, working days/hours, holiday calendars, notification policies, and per-module activation. Configuration changes shall be versioned with rollback.

* **Multi-campus support:** school groups shall operate multiple campuses under one tenant with shared governance and consolidated reporting, while each campus maintains its own timetables, staff assignments, and local settings.

* Administrators shall have self-service visibility into tenant health: storage use, active users, notification delivery rates, and integration status, with configurable threshold alerts.

**Acceptance Criteria**

* A new tenant is fully provisioned and configurable within 30 minutes of registration.

* Systematic isolation testing confirms zero cross-tenant data visibility.

* A two-campus group produces a consolidated enrollment and finance report in one action.

* A configuration change can be rolled back to any prior version.

## **5.3 Global Identity and Multi-School Parent Accounts — P0**

**Why it exists.** This is the platform's defining innovation. Families are the constant; schools change. A parent's identity must belong to the parent, not to any single school.

**Requirements**

* A parent's account shall exist at the platform level, identified by verified email or mobile number, independent of any school.

* When a school records parent contact details for a student, the platform shall detect an existing global identity and initiate a consent-based link; otherwise it shall create a new identity via invitation.

* **Privacy boundary:** a school shall never be able to see which other schools a parent is linked to; a parent shall see only data from schools that have linked them.

* The parent dashboard shall unify all children across all schools, each clearly delineated with its school's branding; switching between children shall be a single interaction.

* Family structures shall be fully supported: separated/divorced parents with independent access, step-parents, grandparents as primary caregivers, and guardians — each with independently configurable access scope controlled by the primary parent (or school where legally required).

* Notifications shall be intelligently grouped by child and school within one notification center.

**Acceptance Criteria**

* A parent with children in three schools operates entirely from one account with one credential set.

* Linking a new school to an existing parent takes the parent under 1 minute and requires no new registration.

* Privacy testing confirms no school can infer a parent's other school associations through any interface or export.

* A guardian's access reflects exactly the scope granted, and revocation takes effect immediately.

## **5.4 White-Label Branding — P0**

**Why it exists.** Schools invest in their identity and community trust. The platform must feel like *the school's* platform, not a third-party product — a decisive factor for premium and enterprise customers.

**Requirements**

* Tenants shall customize their visual identity without any custom development: logos (all required sizes for web, mobile, print), primary/secondary colors, favicon, email header/footer templates, login page imagery, and mobile app icon and splash screen.

* The platform shall automatically derive accessible color palettes from the chosen brand color, guaranteeing WCAG 2.1 AA contrast for all text.

* Administrators shall preview branding across all surfaces before publishing.

* Tenants shall be able to use a **custom domain** with automatically managed secure certificates.

* **Branded mobile presence:** schools shall be able to distribute a school-branded edition of the unified mobile application through public app stores (own name, icon, store listing), functionally identical to the standard app. Within any edition of the app, each school's content carries that school's branding.

**Acceptance Criteria**

* A school completes full rebranding (logo, colors, domain, templates) in under 1 hour with no vendor involvement.

* All auto-generated themes pass WCAG 2.1 AA contrast checks.

* A parent using a school-branded app edition still sees their other schools' children with correct per-school branding.

## **5.5 Subscription and Billing (Platform-to-School) — P1**

**Why it exists.** Flexible commercial packaging lets the platform serve a village school and a national chain with the same product.

**Requirements**

* The platform shall support per-student pricing, per-module pricing, tiered bundles, and custom enterprise agreements, with monthly, quarterly, or annual cycles and prorated mid-cycle changes.

* Subscription payment shall support industry-standard payment methods; invoices shall generate and deliver automatically with configurable reminder escalation.

* Usage shall be metered (active students, integration call volume, storage, messaging credits, notification volume) with tenant-selectable overage handling: automatic tier upgrade, pay-as-you-go, or service limits.

**Acceptance Criteria**

* A tenant upgrades a plan mid-cycle and is billed the correct prorated amount.

* A tenant approaching a usage limit is alerted before any service impact.

## **5.6 Audit Logs and Activity Tracking — P0**

**Why it exists.** Schools are accountable for children's data and money. Regulators, auditors, and disputes all demand a complete, trustworthy record of who did what, when.

**Requirements**

* Every significant action shall be logged: actor, action, target, timestamp, originating device context, and before/after state for data changes.

* Logs shall be tamper-evident and immutable, retained for a configurable period with a minimum of **seven years**.

* Authorized users shall filter, search, and export audit records (spreadsheet, document, machine-readable formats).

* Audit events shall be streamable in real time to customers' security monitoring tooling.

**Acceptance Criteria**

* Any data modification can be traced to an actor with before/after values.

* Audit records cannot be altered or deleted by any tenant user, including the School Owner.

* An auditor extracts a filtered, exportable trail for any date range in under 5 minutes.

## **5.7 Controlled Feature Rollout — P2**

**Why it exists.** New capabilities must reach thousands of schools safely, and enterprise customers expect predictability.

**Requirements**

* The platform operator shall be able to enable capabilities platform-wide, for tenant groups, for individual tenants, or gradually by percentage, and to run controlled experiments — all without service disruption.

* Tenants shall be able to opt in to early-access programs.

**Acceptance Criteria**

* A capability can be enabled for a single pilot tenant and later rolled out platform-wide with no downtime.

## **5.8 File Storage and Document Management — P0**

**Why it exists.** Schools run on documents — certificates, report cards, receipts, study materials, photographs — and need them organized, secure, and durable.

**Requirements**

* Secure, scalable storage for all common file formats, organized in folder hierarchies with role-based access at folder and file level.

* Document versioning with configurable retention; storage quotas configurable per tenant and role.

* Large uploads shall support resume and progress indication; previews shall render for images, PDFs, and office documents without native applications; all uploads shall be scanned for malicious content before availability.

* **Document templates** shall generate standardized documents (report cards, transfer certificates, fee receipts, official letters) with variable substitution, conditional sections, and digital signature support.

**Acceptance Criteria**

* An interrupted large upload resumes without restarting.

* A malicious test file is rejected and never becomes accessible.

* A transfer certificate generates from template with correct student data and a verifiable signature.

## **5.9 Notification Center — P0**

**Why it exists.** Timely, relevant communication is the heartbeat of school–family engagement; noisy or unreliable notifications destroy trust faster than any other failure.

**Requirements**

* Multi-channel delivery: push notification, in-app feed, email, SMS, and popular messaging services — with intelligent channel selection based on message priority, recipient preference, time of day, and cost policy.

* Templates with variable substitution, conditional content, rich formatting, and full multi-language localization; customizable per tenant over platform-managed defaults; content experimentation supported.

* End-to-end delivery tracking (sent/delivered/read/failed/bounced) with automatic retry and channel fallback on failure; delivery and engagement analytics per channel.

* Per-user preference management by channel, category, and school; quiet hours honoring local timezone; frequency caps on non-critical notifications. Emergency broadcasts may override quiet hours (Section 12.4).

**Acceptance Criteria**

* Attendance alerts reach parents within 30 seconds of marking.

* A failed delivery automatically retries and falls back to an alternate channel, visible in delivery reports.

* A parent's quiet hours suppress routine notifications but never emergency broadcasts.

* Notification delivery success ≥ 99.5% within SLA windows.

## **5.10 Data Export and Portability — P1**

**Why it exists.** Schools own their data; regulators require individual data portability. Freedom to leave is a prerequisite of enterprise trust.

**Requirements**

* Schools shall export their complete data (students, academics, finance, communications, configuration) in standard open formats, on demand.

* Scheduled automatic exports to the customer's own cloud storage shall be supported.

* Privacy-regulation-compliant exports shall package all personal data for a specific individual in machine-readable form.

**Acceptance Criteria**

* A full tenant export completes and is downloadable without vendor assistance.

* An individual data-portability request is fulfilled within regulatory timelines via self-service.

## **5.11 Backup and Business Continuity — P0**

**Why it exists.** A school's records are irreplaceable. Institutions entrust the platform with legal-grade data and expect it to survive any failure.

**Requirements**

* All tenant data shall be backed up automatically at least daily, with point-in-time recovery and geographically redundant storage.

* Service restoration objectives: service restored within **4 hours** and no more than **1 hour** of data loss in a worst-case regional failure (enterprise tier; tier-specific objectives published per plan).

* Tenant administrators shall be able to trigger on-demand backups and perform self-service restores within a rolling 30-day window.

* Recoverability shall be proven by regular restore testing.

**Acceptance Criteria**

* A tenant administrator restores an accidentally deleted dataset from a prior day without vendor involvement.

* Published restoration objectives are demonstrated in scheduled continuity exercises.

---

# **6\. The Unified Mobile Application — P0**

**Why it exists.** Stakeholders live on their phones. Fragmenting the experience across role-specific apps multiplies installs, confuses multi-role users, and triples product surface. USMP ships **one mobile application** for iOS and Android that adapts to whoever signs in.

## **6.1 Product Principles**

* **One app, every role.** Parent, Teacher, Student, Principal, School Administrator, Accountant, Transport Manager, Librarian, HR Manager, Hostel Warden, Receptionist, Inventory Manager — every role is served by the same application. There are no separate parent/teacher/student apps.

* **Role-adaptive by default.** After sign-in, the user lands directly in the experience for their role. Single-role users never see role machinery at all.

* **Instant multi-role switching.** Users holding multiple roles (e.g., a teacher who is also a parent; a principal who also teaches) switch between role views in one tap, without logging out. The active role context is always visually unmistakable.

* **Shared foundations.** One authentication, one profile, one settings area, one notification center — role- and school-aware throughout.

* **Native quality.** Follows each platform's design conventions, supports offline usage for core tasks, push notifications, and biometric sign-in. School-branded editions (Section 5.4) are the same application with school-specific presentation.

## **6.2 Core Application Framework**

**Requirements**

* **Shared authentication:** one sign-in for all roles and schools; biometric unlock; per-tenant MFA policies honored.

* **Role-based navigation:** menus, dashboards, and actions are generated from the user's roles and permissions — users see only what they may do.

* **Dynamic dashboards:** each role receives a purpose-built home experience (defined in 6.3); dashboards update in real time.

* **Multi-role switching:** a persistent, discoverable switcher lists the user's roles (and schools); switching preserves app state and completes instantly; deep links and notifications open in the correct role context automatically.

* **Shared notification center:** one inbox across all roles and schools, grouped and labeled by role, school, and child; per-category and per-school preferences; quiet hours.

* **Shared profile and settings:** one profile (photo, contact details, credentials, security settings, linked family members) and one settings area (language, appearance, notification preferences) spanning all roles.

* **Offline capability:** core workflows (viewing cached data; capturing attendance, marks, and messages) function offline and synchronize automatically with original timestamps preserved.

* **Accessibility & localization:** the app meets WCAG 2.1 AA equivalents on mobile and supports all platform languages including right-to-left layouts.

**Acceptance Criteria**

* A single-role parent never encounters role-switching UI.

* A teacher-parent switches views in one tap in under 1 second, with permissions correctly scoped in each view (verified by access-control testing).

* Tapping a notification always opens the correct role and school context.

* Attendance captured offline syncs automatically and parents receive alerts once connectivity returns.

* All twelve+ staff roles can complete their primary daily tasks from the app.

## **6.3 Role Experiences**

Each role experience is a view within the one application, composed from the modules that role may access.

### **Parent View — P0**

* **Multi-child dashboard:** one card per child across all schools, school-branded, with at-a-glance attendance, homework due, upcoming exams, fee dues, and unread notices; quick-switch between children; aggregate unread count.

* **Multi-school clarity:** the active school context is always visible; moving between schools requires no account action.

* Attendance calendar and trends with real-time absence/late alerts; homework and assignment tracking with direct submission support (photo/document) where schools permit parent-assisted submission; fee summary, online payment, history, and downloadable receipts; digital report cards with performance trends; timetable; unified calendar with RSVP and device-calendar sync; announcements feed with priority indicators and search; direct and group messaging with teachers; leave requests with status tracking; student documents; live transport tracking with ETA and boarding/alighting alerts.

### **Teacher View — P0**

* Dashboard of today's classes, pending tasks, unread messages, and attendance status with quick actions.

* Two-minute attendance marking (roster preselected by timetable, exception-based tap flow, bulk tools, offline support); homework and assignment creation, submission tracking, grading with rubrics and feedback; fast validated marks entry (draft/publish); personal timetable with substitution alerts; classroom announcements with read receipts; lesson plans from templates with sharing; parent/student messaging within school communication policies; leave requests and balances.

### **Student View — P0**

* Dashboard of today's timetable, pending homework, upcoming exams, recent announcements, and attendance summary.

* Homework and assignment detail with digital submission and feedback; personal attendance with justification submission; report cards and performance history; searchable study materials with offline download; calendar with device sync; teacher and class-group messaging where school policy permits.

### **Leadership & Administrative Views — P1**

* **Principal / Vice Principal:** institution KPIs (enrollment, attendance, academics, finance, staffing), approvals, drill-downs, and broadcast communication.

* **School Administrator:** user and configuration management essentials, approvals, and operational alerts on the go.

* **Accountant:** collection dashboard, counter-payment recording, due/defaulter views, refund approvals.

* **Transport Manager:** live fleet map, route adherence, incident alerts, driver/vehicle status.

* **Librarian:** circulation actions (issue/return/renew), reservations, overdue follow-ups.

* **HR Manager:** staff attendance and leave approvals, recruitment pipeline snapshots.

* **Hostel Warden:** hostel attendance, visitor approvals, curfew exceptions, mess feedback.

* **Receptionist:** visitor registration, appointment scheduling, inquiry capture.

* **Inventory Manager:** stock alerts, goods receipt, asset lookup by tag scan.

**Acceptance Criteria (role experiences)**

* Each role's primary daily workflow (as defined in its module) is completable end-to-end on mobile.

* Parent fee payment completes in ≤ 3 taps from a reminder notification.

* Teacher attendance completes in under 2 minutes per class.

* Leadership dashboards reflect operational data in real time.

---

# **7\. Functional Requirements — School Operations Modules**

Each module below states why it exists, what it must do (as product behavior), acceptance criteria, and priority. All modules respect tenant isolation, RBAC scoping, audit logging, and notification preferences by default.

## **7.1 School Administration — P0**

**Why it exists.** Every other module depends on an accurate model of how the institution is organized — its calendar, structure, subjects, and schedules. Getting this right first makes everything else automatic.

**Requirements**

* **School profile:** institutional identity (name, addresses, contacts, registrations, board/university affiliations, locations), timezone, currency, default and additional languages, and academic calendar alignment. Multiple campuses share institutional identity with independent local details.

* **Academic years, terms, semesters:** flexible term structures (annual, semester, trimester, custom) with term boundaries, examination periods, and result publication dates; overlapping years for smooth transition; completed years archived but fully queryable.

* **Departments, classes, sections:** a configurable organizational hierarchy supporting multi-stream configurations, elective groupings, and house systems.

* **Subjects and electives:** subject definitions (code, credits, department, applicable grades, evaluation components: theory/practical/project/internal), mandatory vs. elective; student elective-choice workflows with ranked preferences, capacity-based allocation, prerequisites, and approval-based change requests.

* **Timetable management:** automatic generation of conflict-free schedules respecting teacher availability, room capacity, subject requirements, and institutional constraints; optimization for balanced workloads and minimal idle time; day/week/room views; drag-and-drop adjustment with conflict detection; substitution management suggesting qualified, available substitutes; publication to student/parent views with change notifications; export to personal calendar applications.

* **School calendar and holidays:** consolidated institutional calendar; recurring, one-time, partial-day, and campus-specific holidays; holiday declarations automatically adjust attendance expectations and due dates; subscribable calendar feeds.

* **Promotion rules:** configurable progression criteria (attendance %, academic thresholds, fee clearance) with flagged exceptions for administrative review.

**Acceptance Criteria**

* A generated timetable contains zero teacher, room, or class conflicts.

* A teacher absence produces qualified substitution suggestions in one action, and affected students/parents are notified of the change.

* Declaring a holiday updates attendance expectations and due-date calculations the same day.

* Completed academic years remain reportable without any data migration by the school.

## **7.2 Student Information System (SIS) — P0**

**Why it exists.** The SIS is the authoritative record of every learner from first inquiry to alumni status. Every module reads from it; its accuracy and completeness underpin the whole platform.

**Requirements**

* **Admissions pipeline:** inquiry capture (web, app, walk-in, bulk import) with tracking numbers; configurable multi-stage workflows (inquiry → application → documents → application fee → assessment → interview → merit list → fee → enrollment) with custom stages, approvals, and automated transitions; document checklist verification with format/quality validation; ranked waitlists on configurable criteria with automatic progression and notification.

* **Student profiles:** the comprehensive record — personal information, academic history, attendance summary, health records, disciplinary history, achievements, fee status, transport details, and documents — organized in sections with independent access controls. Configurable student ID generation; ID cards with photo and machine-readable codes for attendance and library use. Sensitive-field changes follow approval workflows; parent-initiated change requests require administrative approval; full modification history retained.

* **Parent/guardian management:** multiple parents/guardians per student linked to global identities (Section 5.3), with relationship types (biological, step, legal guardian, grandparent, foster, other), designated primary contact, billing responsibility, communication preferences, emergency priority, and pickup authorization.

* **Medical records:** blood group, allergies, chronic conditions, medications, vaccinations, physician contacts, insurance — with access restricted to authorized health staff and administrators, and strong protection appropriate to health data. Health incident logging with priority parent alerts for significant incidents.

* **Emergency contacts:** prioritized per student, integrated with rapid-notification workflows.

* **Student documents:** admission documents, identity proofs, certificates, and school-defined types, with verification status and expiry tracking.

* **Transfer certificates and alumni:** official transfer documents (enrollment period, performance summary, conduct, fee clearance) with verifiable authenticity; alumni engagement (portal, events, donations, career networking) preserving academic history within retention policy.

**Acceptance Criteria**

* An applicant progresses from inquiry to enrolled with status visible to the family at every stage.

* A waitlisted candidate is automatically offered a seat when one opens, per configured ranking.

* Unauthorized roles can never view medical or other restricted profile sections (verified by access testing).

* A transfer certificate is generated in one action and its authenticity is externally verifiable.

## **7.3 Attendance Management — P0**

**Why it exists.** Attendance is the highest-frequency touchpoint between school and family and a legally reportable record. It must be effortless to capture, impossible to lose, and instantly communicated.

**Requirements**

* **Student attendance:** capture via teacher entry (exception-based), industry-standard biometric devices, contactless ID cards, supervised student self-check-in with location validation, and code scanning; once-daily or period-wise per school configuration; statuses: present, absent, late, half-day, on-leave; late-arrival timing with configurable policies; partial-day handling.

* **Real-time family alerts:** parents notified within 30 seconds of absence, late arrival, or early checkout, honoring quiet-hour and escalation policies for unacknowledged critical alerts.

* **Staff attendance:** the same capture options plus web check-in, location-validated remote check-in, and building-access integration.

* **Device integration:** the platform shall integrate with industry-standard biometric and contactless attendance hardware, including offline capture with automatic reconciliation (device specifics belong to the integration design).

* **Leave management (students and staff):** configurable leave types (annual, sick, casual, maternity/paternity, bereavement, custom), approval chains (student requests via parent pre-approval; staff via departmental hierarchy), balance accrual with carry-forward/encashment/lapse rules, and status notifications to all parties.

* **Offline resilience:** attendance captured without connectivity synchronizes automatically with original timestamps.

**Acceptance Criteria**

* A teacher marks a full class in under 2 minutes; parents of absentees are alerted within 30 seconds.

* Attendance reports export by class, section, student, and date range.

* Offline-captured attendance reconciles automatically with no duplicates or losses.

* A student leave request follows parent → school approval and updates attendance expectations on approval.

## **7.4 Academic Management — P1**

**Why it exists.** Teaching and learning generate the platform's daily engagement: homework, assignments, lesson plans, and study materials keep students, parents, and teachers in one loop.

**Requirements**

* **Homework:** creation with subject, class/section or individual targeting (differentiated instruction), description, attachments, due date, and submission format (file, text, in-app quiz); student notifications and reminders; timestamped submissions with content safety scanning; late-submission flagging with configurable policies; grading with marks/grades, qualitative feedback, and rubrics; results visible in student records and parent views.

* **Assignments:** substantial work (projects, research, presentations, practicals) with weighted rubrics, peer review options, group submissions with member contribution tracking and individual grade adjustment, plagiarism screening via integration, draft → final → evaluation → publication → appeal lifecycle.

* **Lesson plans:** structured plans (objectives, methodology, resources, assessment, time allocation) organized into units and linked to curriculum standards; templates; sharing with attribution; administrative review workflows.

* **Study materials:** notes, slides, documents, video, audio, and external links organized by subject/chapter/topic/difficulty; searchable student library with filters; offline download; read-progress tracking.

* **Classroom announcements:** rich-format posts to classes with attachments, priority levels, scheduling, pinning, and read receipts; urgent posts push-notify.

**Acceptance Criteria**

* A teacher creates and targets homework in under 2 minutes; affected students/parents are notified immediately.

* A student submits from mobile (photo or file) and later sees grade and feedback in the same thread.

* Class-level completion status is visible to the teacher at a glance, with one-tap reminders to non-submitters.

* Study materials are discoverable by search and usable offline after download.

## **7.5 Examination Management — P0**

**Why it exists.** Assessment is the school's most consequential, deadline-driven process. Errors in scheduling, marks, or results are highly visible and damage institutional credibility.

**Requirements**

* **Planning and scheduling:** assessment types (formative, summative, quiz, practical, oral, online); per-exam configuration (subject, classes, date/time, duration, maximum marks, passing criteria, mode); automatic conflict-free exam timetables considering subject combinations, room availability, invigilator assignment, and inter-exam gaps, with visual conflict resolution.

* **Seating arrangements:** automated allocation across rooms by configurable rules (sequence, randomized, mixed anti-malpractice), producing printable charts.

* **Marks entry and grading:** fast bulk entry, spreadsheet import, and per-student lookup; validation (ranges, totals) and anomaly detection; configurable grading schemes (absolute, relative, hybrid, custom scales) with administratively approved boundary adjustments before publication; GPA/CGPA on multiple scales and institutional formulas with credit weighting.

* **Report cards and transcripts:** template-based report cards combining results, attendance, teacher remarks, behavioral assessment, and co-curricular achievements, accommodating multiple education boards; official transcripts with complete academic history and externally verifiable authenticity.

* **Academic history and promotion:** longitudinal performance records; trend analysis and early-intervention flags; promotion criteria combining academics, attendance, behavior, and fee clearance with exception review.

**Acceptance Criteria**

* A generated exam timetable has zero student, room, or invigilator conflicts.

* Marks entry validation blocks out-of-range values and flags statistical anomalies for review before publication.

* Result publication is a controlled action; families see results only after approval, simultaneously.

* Report cards generate for an entire class in one action using the school's template.

## **7.6 Fee Management — P0**

**Why it exists.** Fees are the school's revenue lifeline and a leading source of parent friction. Transparent structures, effortless payment, and airtight reconciliation create value for both sides.

**Requirements**

* **Fee structures:** tuition, admission, examination, transport, hostel, meals, activities, and custom categories; one-time, annual, term-wise, monthly, or installment-based; applicability rules by class, section, category, sibling status, and custom criteria; bulk assignment with individual overrides.

* **Installments:** scheduled plans with due dates, late penalties, and early-payment discounts; automatic reminders via preferred channels.

* **Scholarships and discounts:** merit/need/category-based concessions with eligibility rules, fixed or percentage awards, duration and renewal criteria, and automatic application; sibling/staff/early-payment/loyalty/special-case discounts, all audited with approval workflows for non-standard concessions.

* **Online payments:** all mainstream payment methods through industry-standard, certified payment providers; payment data handled to recognized card-security standards; automatic retry guidance on failure; instant verifiable digital receipts.

* **Offline payments:** counter recording of cash/cheque/draft/transfer with numbered branded receipts and verification codes.

* **Reconciliation and refunds:** automatic matching of provider settlements to fee records with discrepancy surfacing; refund workflows with authorization limits and family-visible status.

* **Dues and defaulters:** escalating reminder campaigns (informational → urgent → administrative); defaulter reporting; configurable restrictions (exam registration, report card, portal access) for chronic arrears; structured settlement/payment-plan tools.

* **Financial reporting:** collection summaries, outstanding aging, trends, payment-method mix, scholarship utilization, reconciliation status; filtering and export.

**Acceptance Criteria**

* A parent completes payment in ≤ 3 taps from a reminder and receives a receipt within seconds.

* Every online settlement reconciles automatically or appears in a discrepancy queue — none silently unmatched.

* A non-standard discount cannot be applied without the configured approval.

* The Accountant produces a term collection report with aging in under 5 minutes.

## **7.7 Communication Module — P1**

**Why it exists.** Schools succeed on trust, and trust is built through consistent, contextual communication — while protecting teachers from unbounded messaging load.

**Requirements**

* **Announcements:** targeted publishing (whole school, classes, sections, parent groups, custom audiences) with rich text, attachments, media; scheduling, pinning, and read receipts.

* **Parent–teacher messaging:** one-to-one messaging within guardrails — configurable messaging hours with off-hours queueing, auto-responses setting response expectations; group conversations (class, subject, custom) requiring administrative approval, with moderation tools.

* **Circulars:** formal communications requiring explicit acknowledgment, with escalation for non-responders.

* **Broadcasts:** urgent multi-channel simultaneous delivery (closures, weather, safety) that overrides quiet hours by design.

* **Events:** creation, publication, RSVP, volunteer sign-up, resource allocation, and attendance tracking for school events.

**Acceptance Criteria**

* A message sent to a teacher outside configured hours is queued and delivered at the window start, with the sender informed.

* Circular acknowledgment rates are trackable, and non-acknowledgers receive automated escalation.

* An emergency broadcast reaches all recipients across all channels, bypassing quiet hours, with delivery reporting.

## **7.8 Calendar and Events — P1**

**Why it exists.** Families and staff coordinate their lives around the school calendar; one accurate, personal, subscribable view eliminates a chronic source of confusion.

**Requirements**

* **Academic calendar:** term dates, exam schedules, result dates, admission deadlines, curriculum milestones.

* **School events:** functions, sports, cultural programs, parent-teacher meetings, guest lectures — with venue, timing, audience, RSVP, and resources.

* **Personal calendar:** each user's unified view of relevant institutional events plus personal reminders; parents see all children across all schools; teachers see teaching schedule, exam duties, and meetings.

* **External sync:** subscribe/export to mainstream personal calendar applications; two-way synchronization for staff calendars.

**Acceptance Criteria**

* A multi-school parent sees every child's events in one calendar, unambiguously labeled by school.

* Event changes propagate to subscribed external calendars automatically.

## **7.9 Transport Management — P1**

**Why it exists.** The school bus is the highest-anxiety moment of a parent's day and a real safety obligation for the school. Live visibility and verified boarding transform it.

**Requirements**

* **Vehicles:** registration, capacity, type, insurance and statutory certificate validity with expiry alerts, assigned driver, maintenance history and scheduling.

* **Routes and stops:** pickup/drop sequences with estimated times; route optimization suggestions honoring traffic and time constraints; day-specific route variants; stop locations with coordinates and landmarks; student–stop assignment with change-request workflows.

* **Drivers:** records, licensing with expiry reminders, background verification status, shift schedules, and performance ratings.

* **Live tracking:** real-time vehicle location for parents (their child's vehicle) and administrators (fleet view); ETAs at stops; historical journey playback for dispute resolution; zone-based alerts (school premises, stops, unauthorized areas); overspeed alerts.

* **Boarding notifications:** automatic parent notification on verified boarding/alighting (contactless ID, driver confirmation, or equivalent); missed-pickup escalation to parents and the Transport Manager.

* **Transport attendance:** daily ridership records integrated with the main attendance system.

**Acceptance Criteria**

* A parent sees live location and a reliable ETA for their child's vehicle throughout the route.

* Boarding/alighting alerts arrive within 30 seconds of the verified event.

* A missed expected boarding triggers escalation without human initiation.

* Certificate/license expiries generate advance reminders to the Transport Manager.

## **7.10 Library Management — P2**

**Why it exists.** Libraries drive literacy outcomes but drown in manual circulation work; automation returns librarian time to readers.

**Requirements**

* **Catalog:** complete bibliographic records with classification, location, condition, and availability; bulk import from standard bibliographic sources and ISBN lookup; label printing for spine and machine-readable tags.

* **Circulation:** issue, return, renewal with limits, overdue restrictions, and reservation priority; self-service checkout/return using machine-readable identification.

* **Reservations:** hold queues with position visibility, availability notifications, and auto-cancellation after hold periods.

* **Fines:** configurable rules by category, patron type, and duration; waiver workflows with authorization; consolidated collection through Fee Management.

* **Digital library:** e-books, audiobooks, journals, and reference databases via external providers and open educational resources; usage analytics.

**Acceptance Criteria**

* Issue or return completes in under 10 seconds at the desk or kiosk.

* A reserved book's availability notifies the next patron automatically.

* Library fines appear in the family's consolidated fee view.

## **7.11 Hostel Management — P2**

**Why it exists.** Residential schools carry round-the-clock duty of care; wardens need allocation, presence, visitor, and mess operations in one place.

**Requirements**

* **Configuration:** buildings, floors, wings, rooms with capacity, type, amenities, and occupancy; photos and floor plans to aid allocation.

* **Allocation:** matching by preference, gender, age, medical needs, and behavioral history; change requests with approval and availability checks; vacancy reporting.

* **Visitors:** registration with purpose, host student, entry/exit times, and authorization; fast-path processing for pre-approved family; warden approval for unexpected visitors.

* **Hostel attendance:** evening/night presence confirmation, curfew-miss tracking, and coordination with academic leave records.

* **Mess:** menu planning, meal attendance, dietary preferences, special requests, consumption analytics, and feedback collection.

**Acceptance Criteria**

* A curfew miss is flagged to the warden the same evening.

* A parent visit is processed via identity verification in under 2 minutes.

* Hostel and academic leave records never contradict each other.

## **7.12 Inventory Management — P2**

**Why it exists.** Schools hold substantial physical assets with weak controls; visibility prevents loss, stockouts, and audit findings.

**Requirements**

* **Assets:** full records (identity, purchase, cost, depreciation method, location, custodian, condition, warranty) with scannable asset tags.

* **Stock:** consumables with on-hand quantity, reorder levels/quantities, locations, and usage history; low-stock alerts triggering procurement.

* **Stock operations:** goods receipt, departmental issue, transfers, vendor returns, disposal; adjustments require documented reasons.

* **Purchasing:** requisition → quotation comparison → purchase order → goods receipt → invoice matching, with spend-authorization approval limits.

* **Vendors:** contacts, categories, terms, ratings, contracts; purchase-history analysis.

**Acceptance Criteria**

* Scanning an asset tag returns its full record and custodian instantly.

* A stock level crossing its reorder point generates a procurement alert automatically.

* No purchase order can be issued above a user's authorization limit without escalation.

## **7.13 Human Resources — P2**

**Why it exists.** Staff are a school's largest cost and its core asset; consistent HR processes protect both the institution and its people.

**Requirements**

* **Employee profiles:** personal and contact details, emergency contacts, qualifications, certifications, employment history, documents, and salary account details.

* **Recruitment:** job postings, application collection, candidate tracking, interview scheduling, evaluation scorecards, offers, and onboarding workflows; connection to external job boards and the school careers page.

* **Payroll:** gross earnings, statutory and voluntary deductions, and net pay per cycle; protected digital payslips; consistency with financial records via accounting integration.

* **Leave:** configurable types, accrual rules, approval hierarchies, balances, and calendar integration (shared with Section 7.3 leave infrastructure).

* **Performance:** goal setting, periodic evaluations, 360° feedback, competency assessment, development planning, and configurable review cycles with reminders and escalation.

**Acceptance Criteria**

* Payroll for the full staff completes with zero manual recalculation and payslips delivered digitally.

* A leave request follows the configured hierarchy and updates balances and calendars on approval.

* Overdue performance reviews escalate automatically.

---

# **8\. Analytics and Reporting — P1**

**Why it exists.** Schools sit on rich operational data but act on anecdotes. Turning that data into timely insight — for a principal, an accountant, or a class teacher — is a core product value, not an add-on. All analytics respect tenant isolation and user permission scope.

**Requirements**

* **Student performance analytics:** individual achievement across subjects, exams, and time; improvement/decline trends; class-relative comparisons and percentiles; early-warning flags for at-risk students combining attendance, marks, and behavioral indicators.

* **Attendance analytics:** patterns by class, section, cohort, and student; chronic absenteeism identification; late-arrival patterns; government compliance reporting support.

* **Enrollment analytics:** inquiry→application→admission conversion, source attribution, demographics, and capacity/enrollment forecasting.

* **Fee analytics:** collection rates, outstanding aging, payment-method mix, defaulter patterns, and revenue forecasting from history and enrollment projections.

* **Staff analytics:** workload distribution, student–teacher ratios, leave utilization, attendance patterns, evaluation summaries, and recruitment funnel metrics.

* **Transport analytics:** route efficiency, vehicle utilization, on-time performance, cost per student, and safety incident tracking.

* **Library analytics:** circulation, popular titles, engagement, collection growth, overdue analysis, and acquisition recommendations.

* **Custom report builder:** visual, non-technical report creation over any accessible module data — field selection, filters, grouping, sorting, aggregation; scheduled generation and email distribution; export to standard document and data formats.

**Acceptance Criteria**

* A principal's dashboard reflects current-day operational data without manual refresh.

* An at-risk student flag is raised from configured indicators and is actionable (drill-down to underlying data).

* A non-technical administrator builds, schedules, and distributes a custom report without vendor help.

* No report can ever include data beyond the viewer's permission scope.

---

# **9\. Integration Requirements — P1**

**Why it exists.** Schools already run payment providers, productivity suites, attendance hardware, and accounting systems. The platform must fit their ecosystem, not fight it. Requirements below define **capabilities**; specific vendors and protocols are selected in the integration design.

* **Payment providers:** integration with multiple industry-standard payment providers covering cards, bank transfer, instant payment systems, digital wallets, and international methods — including refunds, settlement verification, and reconciliation. New providers must be addable without disrupting existing ones.

* **Productivity suites:** single sign-on, calendar synchronization, cloud file storage, virtual meeting creation, and email delivery with the major productivity ecosystems used by schools.

* **Video conferencing:** virtual classroom sessions with mainstream conferencing services — meeting creation, link distribution, attendance capture, and recording management from within platform workflows.

* **Messaging providers:** SMS, rich messaging services, and email delivery through interchangeable industry providers with delivery tracking and fallback routing.

* **Biometric and contactless attendance hardware:** integration with industry-standard fingerprint, facial recognition, palm, and contactless-card devices, including enrollment data synchronization, remote device management, and offline capture reconciliation.

* **Vehicle tracking:** real-time location, zone alerts, speed monitoring, and journey playback with industry-standard fleet tracking providers.

* **Accounting software:** account mapping, transaction export, and reconciliation with the accounting systems schools commonly use.

* **Open platform (public interfaces and event subscriptions):** every platform capability shall be accessible to authorized external systems through documented, versioned public interfaces with self-service developer documentation and delegated, scoped authorization; abuse protection shall not impair legitimate use. External systems shall be able to subscribe to platform events (admission, attendance, payment, results, timetable changes) with verifiable, reliable delivery including retries and status visibility.

**Acceptance Criteria**

* A school connects a supported payment provider through configuration alone.

* A third-party developer can build a working integration using only public documentation and self-service credentials.

* Event subscriptions deliver reliably with verification, retry on failure, and delivery status visibility.

* Attendance hardware outages never lose records — offline captures reconcile automatically.

---

# **10\. Non-Functional Requirements**

Quality attributes are product commitments, stated here as measurable outcomes. How they are achieved is defined in the architecture documents.

## **10.1 Scalability — P0**

* The platform shall scale from a single school to thousands of institutions and millions of users without requiring customers to migrate or reconfigure.

* Performance under peak load: interactive requests p95 under 200 ms; dashboard loads under 2 seconds; mobile screen transitions under 300 ms; reports up to 100,000 records generated under 10 seconds.

* Seasonal surges (result publication day, fee due dates, first day of term) shall be absorbed without degradation.

## **10.2 Availability and Reliability — P0**

* 99.99% monthly availability, excluding announced maintenance performed in low-usage windows with ≥ 72 hours notice.

* No single failure shall cause platform-wide outage; regional failures shall be survivable within the continuity objectives in Section 5.11.

* Long-running work (report generation, bulk imports, mass notifications) shall never degrade interactive use.

## **10.3 Security — P0**

* All data shall be strongly encrypted in transit and at rest, with tenant-specific protection for stored data and additional field-level protection for highly sensitive data (government identifiers, financial and health details).

* The platform shall be defended against common attack classes (injection, cross-site attacks, request forgery, credential stuffing, denial of service) and validated by regular independent penetration testing and a responsible-disclosure program.

* Account protection shall include brute-force lockouts with progressive delays, compromised-password screening, device-bound sessions, and suspicious-activity detection.

* Security posture shall be independently audited (see Section 12).

## **10.4 Accessibility — P0**

* All user interfaces shall conform to WCAG 2.1 Level AA: screen reader compatibility, full keyboard operability, contrast compliance, and zoom support. Accessibility verification is part of release acceptance.

## **10.5 Internationalization and Localization — P1**

* Full translation of user-facing text into supported languages, including right-to-left scripts; per-user language preference.

* Locale-correct dates, times, numbers, and currencies; correct behavior across timezones for all scheduling and deadlines.

## **10.6 Observability and Support — P1**

* The platform operator shall have comprehensive visibility into service health, performance, errors, security events, and business metrics, with proactive alerting — sufficient to detect customer-impacting issues before customers report them.

* Tenant administrators shall have self-service visibility into their tenant's health and integration status (Section 5.2).

## **10.7 Data Durability — P0**

* Zero tolerance for data loss under normal operations; continuity objectives per Section 5.11; recoverability proven by scheduled restore exercises.

---

# **11\. User Experience Requirements**

UX quality is a stated product requirement, not a byproduct. Design should reduce cognitive load, respect user time, and give clear feedback.

* **Navigation:** progressive disclosure (primary actions prominent, advanced features discoverable); persistent orientation cues and breadcrumbs; global search over accessible records and features; role-based menus showing only permitted items; favorites and recent items.

* **Information architecture:** organized around user mental models; logical grouping with clear hierarchy; card-based layouts; faceted search with suggestions and saved searches.

* **Journey performance targets:** school onboarding setup \< 30 minutes; parent registration to first child linked \< 5 minutes; class attendance \< 2 minutes; fee payment ≤ 3 interactions from notification.

* **Dashboards:** actionable at a glance; customizable widget layouts with sensible defaults; appropriate visualization per metric type; drill-down from summary to detail; contextual actions; data-freshness indicators.

* **Mobile:** platform-convention-native interactions; thumb-reachable primary navigation; adequate touch targets; offline viewing of cached data with queued actions; loading skeletons and pull-to-refresh.

* **Empty states:** explain what will appear and how to create it — never a blank screen.

* **Error states:** human, specific, and actionable messages; field-level validation guidance; retry paths for connectivity errors; technical detail captured for support, not shown to users.

* **Design principles:** Clarity, Efficiency, Consistency, Feedback, Accessibility — applied systematically through a shared design system.

**Acceptance Criteria**

* Usability testing demonstrates the journey performance targets with representative users, including low-digital-literacy parents.

* Every list, dashboard, and detail view defines its empty, loading, and error states before build.

---

# **12\. Security, Privacy, and Compliance — P0**

**Why it exists.** The platform holds children's personal, health, academic, and family financial data. Privacy and compliance are existential product requirements and enterprise sales prerequisites.

## **12.1 Data Privacy**

* Privacy by design: data minimization, purpose limitation, and storage limitation. Personal data is collected only for defined purposes with clear consent.

* Consent management shall track explicit consent for data processing, marketing communication, and third-party sharing; consent withdrawal shall trigger removal workflows where legally required.

* Retention policies shall automatically purge records after configurable periods; individuals shall be able to obtain their personal data in portable form (Section 5.10).

## **12.2 Compliance Commitments**

* The platform shall maintain compliance with FERPA (US student privacy), GDPR (EU data protection), COPPA (US children's privacy), recognized payment-card security standards, and independently audited service-organization controls (SOC 2 Type II). Compliance documentation shall be available to enterprise customers.

* **Data residency:** schools shall be able to select the geographic region where their data is stored to satisfy local regulation, with lawful cross-border transfer mechanisms where applicable.

## **12.3 Access Safeguards**

* Least-privilege access throughout, including for integrations; defense-in-depth so that application-level authorization is not the only barrier to data.

* Platform-operator access to tenant data shall be restricted to support/compliance purposes and fully audited (Section 3.1, 5.6).

**Acceptance Criteria**

* Independent audits (service-organization controls, payment security) are passed and current at GA.

* A data subject request (access, portability, erasure) is fulfilled within regulatory timelines through defined workflows.

* Region selection demonstrably constrains where a tenant's data is stored.

---

# **13\. Release Prioritization**

The full scope in this document is committed. Sequencing below reflects the priority labels and dependency order; it aligns with the phased roadmap in Appendix C.

* **P0 (foundation and core value):** platform foundation (identity, tenancy, global parent identity, branding, notifications, documents, audit, backup), School Administration, SIS, Attendance, Examination, Fee Management, and the Unified Mobile Application with Parent, Teacher, and Student views.

* **P1 (complete institutional deployment):** Academic Management, Communication, Calendar and Events, Transport, Analytics and Reporting, leadership/administrative mobile views, integrations, subscription/billing management, data portability, localization depth.

* **P2 (full operational coverage):** Library, Hostel, Inventory, HR, controlled-rollout tooling, advanced analytics.

* **P3 (differentiating enhancements):** future-extensibility capabilities as they mature (Section 16), alumni engagement depth, advanced experimentation.

---

# **14\. Assumptions**

## **Business Assumptions**

* Sufficient market demand exists to reach 500 schools within 18 months and achieve economies of scale in the projected timeline.

* Schools will pay subscription pricing (per-student/per-module/tiers) at levels consistent with the revenue model.

* White-label and multi-campus capabilities materially influence enterprise purchasing decisions.

## **User Assumptions**

* Parents and staff have smartphones capable of running modern applications, and schools have internet connectivity adequate for cloud operations (with the platform's offline support covering intermittent gaps).

* Schools are willing to digitize records and processes, and will invest modest administrator time in onboarding.

* Parents will adopt a single cross-school identity when the value is evident; teachers will adopt mobile-first workflows that demonstrably save time.

## **Technical Assumptions**

* Skilled product and engineering resources are available for the roadmap; cloud service costs follow projected trends.

* Third-party partners (payments, messaging, tracking, hardware) maintain stable, backward-compatible interfaces; attendance-hardware vendors continue supporting standard protocols.

## **Market Assumptions**

* Incumbent competitors will not neutralize the unified-parent-identity differentiator in the near term (validated by their institution-centric architectures).

* Education spending on management software continues its projected growth trajectory.

## **Regulatory Assumptions**

* The regulatory environment remains supportive of cloud-based education technology.

* Data-protection regimes continue to permit compliant cross-border operation with residency options; no jurisdiction in the target market bans cloud storage of student records outright.

---

# **15\. Risks and Mitigations**

| \# | Risk | Type | Impact | Mitigation |
| :---- | :---- | :---- | :---- | :---- |
| 1 | Established competitors with deep customer relationships slow adoption | Business | High | Lead with unified parent identity and superior UX; aggressive early-adopter pricing; land-and-expand via must-have modules |
| 2 | Long institutional sales cycles delay revenue | Business | Medium | Zero-config onboarding lowers trial friction; per-module pricing lowers entry cost; reference-customer program |
| 3 | Unified parent identity underused if early schools don't overlap families | Product | Medium | Target school-dense regions and school groups first; make single-school parent experience excellent on its own |
| 4 | Feature breadth dilutes quality ("wide but shallow") | Product | High | Priority-driven sequencing (Section 13); acceptance criteria as release gates; module-level quality bars |
| 5 | Poor onboarding data imports create bad first impressions | Product / Adoption | High | Guided import tooling with validation and error reporting; onboarding success team; go-live readiness checklist |
| 6 | Teacher resistance to workflow change | Adoption | High | Sub-2-minute core workflows; mobile-first design; role-specific training pathways; champion programs in schools |
| 7 | Low parent digital literacy in some markets | Adoption | Medium | Simple journeys, local-language UX, SMS fallbacks for critical alerts, school-mediated account recovery |
| 8 | Data breach involving children's data | Security | Critical | Defense-in-depth and encryption per Sections 10.3/12; independent penetration testing; incident response plan; cyber insurance; breach-notification runbooks |
| 9 | Cross-tenant data exposure defect | Security / Product | Critical | Isolation as an architectural invariant; mandatory isolation test suites; independent audits |
| 10 | Scaling failures under seasonal surges (results day, fee deadlines) | Scaling | High | Load targets in NFRs; surge modeling and load testing as release gates; capacity headroom policy |
| 11 | Third-party integration failures (payments, messaging, tracking) | Technical | Medium | Multi-provider strategy with fallback routing; graceful degradation; provider status monitoring |
| 12 | Attendance/GPS hardware diversity causes field failures | Technical | Medium | Certification program for supported devices; offline reconciliation; remote diagnostics |
| 13 | Evolving data-protection law increases compliance cost | Regulatory | Medium | Privacy-by-design; data residency options; legal monitoring; configurable retention/consent |
| 14 | Changing education standards outdate academic structures | Regulatory / Product | Low | Fully configurable academic structures, grading schemes, and templates; customer advisory board |
| 15 | Talent acquisition constraints slow the roadmap | Business | Medium | Remote-friendly hiring, competitive compensation, prioritized sequencing to protect P0 scope |
| 16 | White-label app-store distribution policy changes | Technical / Business | Low | Standard unified app as the default channel; branded editions as additive; policy monitoring |

---

# **16\. Future Extensibility**

The platform is designed so the following can be added without fundamental redesign. These are directional, post-roadmap capabilities (P3), not committed scope for initial releases.

* **AI and machine learning:** predictive early-warning for at-risk students; personalized learning recommendations; automated grading assistance for objective assessments; language understanding for communication sentiment and suggested responses.

* **Verifiable digital credentials:** tamper-proof academic records that students can share with employers and institutions, with granular privacy control and automated verification.

* **Immersive technologies:** virtual field trips and simulations; augmented interactive learning content; immersive remote parent-teacher meetings.

* **Connected campus (IoT):** sensor-based automated attendance, environmental monitoring, shared-asset tracking, and wearable health monitoring during physical education.

* **Advanced analytics:** anonymized peer benchmarking across institutions, predictive enrollment modeling, and teacher-effectiveness insights for professional development.

---

# **17\. Glossary**

* **Guardian:** an authorized caregiver granted configurable access to a student's information by the primary parent or school.

* **Multi-Campus / Multi-Branch:** a single institution or group operating multiple locations under shared governance within one tenant.

* **RBAC (Role-Based Access Control):** restricting system access according to a user's roles and the scope of data those roles may see.

* **Role View:** the experience presented in the unified mobile application for one of a user's roles (e.g., Parent View, Teacher View).

* **SIS (Student Information System):** the authoritative record of student data — profiles, enrollment, academics, and history.

* **SLA (Service Level Agreement):** the contractual commitment for service availability and performance.

* **Tenant:** an independent school (or school group) instance on the platform with complete data isolation and its own configuration.

* **Unified Parent Identity:** a single platform-level parent account valid across all schools using the platform.

* **White-Label:** presenting the platform under the school's own brand — visual identity, domain, and app-store presence — without custom development.

* **FERPA / GDPR / COPPA:** the US student-privacy, EU data-protection, and US children's-privacy regulations, respectively.

* **MFA (Multi-Factor Authentication):** verifying identity with more than one factor.

* **NPS (Net Promoter Score):** a standard measure of customer advocacy.

* **RTO / RPO:** maximum acceptable service-restoration time / data loss, respectively, after a disruption.

* **WCAG:** the international accessibility standard for digital interfaces.

---

# **Appendix**

## **A. Competitor Analysis Summary**

Analysis of twelve competitor platforms informed this document. PowerSchool leads US K-12 share but suffers dated design and a fragmented mobile experience; Blackbaud serves private schools with strong fundraising but limited parent engagement; Infinite Campus offers robust SIS depth but poor integration flexibility; Teachmint brings modern Indian-market focus but lacks enterprise scalability; Classter is strong on internationalization but shallow on customization; Canvas/Schoology excel at LMS but lack comprehensive school administration. **No competitor offers a unified parent identity across schools** — today, parents maintain a separate account per school, producing password fatigue and fragmented information. This is the platform's clearest market opening.

## **B. Relocated Technical Content**

The following topics from prior versions of this document are intentionally **not** specified here and will be defined in companion documents, using this PRD as input:

* System, frontend, backend, and mobile architecture; technology stack selection → **Architecture Document / HLD**

* Data storage, search, caching, and queuing strategies; database scaling → **HLD / LLD**

* Cloud infrastructure, deployment, environments, and delivery pipelines → **Infrastructure Design**

* Public interface design, endpoint structure, and event payloads → **API Specification**

* Detailed security controls, key management, and network defenses → **Security Design**

Product-level commitments those designs must satisfy (performance, availability, isolation, integration capabilities, compliance) are retained in Sections 5, 9, 10, and 12\.

## **C. Release Roadmap**

* **Phase 1 (Months 1–6):** Platform foundation (identity, tenancy, unified parent identity, notifications), School Administration, core SIS, Attendance, and the **unified mobile application with the Parent View**.

* **Phase 2 (Months 7–12):** Fee Management, Examination Management, Academic Management, Communication, **Teacher and Student views in the unified app**, Calendar, core Analytics.

* **Phase 3 (Months 13–18):** Transport, Library, Hostel, Inventory, HR, leadership/administrative mobile views, advanced analytics, full white-label capability including branded app editions.

* **Phase 4 (Months 19–24):** AI-powered features, advanced integrations, international expansion, and enterprise program maturity.

## **D. Document Control**

This document is the property of the Product Development organization. Unauthorized distribution is prohibited. Feedback should be submitted through the designated review channel. Changes require approval from the Product Director; downstream technical documents require joint approval with the Engineering Lead.

**CampusOne**

Product Requirements Document  |  Version 2.0  |  July 2026

CONFIDENTIAL  |  For Internal Use Only

© 2026 All Rights Reserved
