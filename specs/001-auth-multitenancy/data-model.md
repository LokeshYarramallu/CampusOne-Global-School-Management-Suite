# Data Model: Authentication, Authorization & Multi-Tenant Isolation

**Date**: 2026-08-01 | **Feature**: `001-auth-multitenancy` | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Prisma models for the seven modules. Conventions (ADR 0001, ADR 0003, AGENTS.md):
- All tenant-owned tables carry `tenantId` (UUID) with an index whose **leading column is `tenantId`**.
- PostgreSQL **RLS** is enabled on every tenant-owned table (additive to app-layer `where: { tenantId }`); RLS policies are created via raw SQL in the migration (Prisma does not manage RLS natively).
- Platform-level/global tables (Tenant, Permission catalog, UserIdentity, ParentIdentity, NotificationTemplate defaults, AuditRecord-with-tenant_id) are noted explicitly.
- `campusId` is included now (P2 multi-campus prepared) as an optional scoping column on tenant-owned tables where campus-level isolation will matter; nullable at P1.
- IDs are UUIDs (`@db.Uuid`); timestamps are UTC; snake_case tables/columns via `@@map`/`@map`.
- ORM models are **never** returned as API contracts; repositories map to explicit response types.

## tenant-management module

```prisma
// Platform-level: the tenant itself. Owns the data boundary.
model Tenant {
  id            String   @id @default(uuid()) @db.Uuid
  slug          String   @unique // URL-friendly identifier
  displayName   String
  status        TenantStatus @default(ACTIVE) // ACTIVE | SUSPENDED
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  configuration TenantConfiguration?
  campuses      Campus[]
  roleAssignments RoleAssignment[]
  featureFlags  FeatureFlag[]
  notifications Notification[]
  auditRecords  AuditRecord[]
  parentLinks   ParentSchoolLink[]
  @@map("tenant")
}

enum TenantStatus { ACTIVE SUSPENDED }

// Tenant-owned: foundation settings (timezone, currency, languages, module flags,
// password policy, MFA policy, notification policy). Versioned (P2 rollback).
model TenantConfiguration {
  id            String   @id @default(uuid()) @db.Uuid
  tenantId      String   @db.Uuid
  tenant        Tenant   @relation(fields: [tenantId], references: [id])
  timezone      String
  currency      String
  languages     String[] // supported language codes
  moduleActivation Json   // { moduleKey: boolean }
  passwordPolicy Json   // { complexity, rotationDays, reuseCount }
  mfaPolicy     Json     // { global: bool, roles: [...], ... }
  notificationPolicy Json
  version       Int      @default(1)
  createdAt     DateTime @default(now())
  @@unique([tenantId, version])
  @@index([tenantId])
  @@map("tenant_configuration")
}

// Tenant-owned (P2-prepared): a campus within a school-group tenant.
model Campus {
  id          String   @id @default(uuid()) @db.Uuid
  tenantId    String   @db.Uuid
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  name        String
  createdAt   DateTime @default(now())
  @@index([tenantId])
  @@map("campus")
}
```

## rbac module

```prisma
// Global catalog: all Module/Feature/Action tuples (400+), seeded.
// DB-stored per plan decision R10; a consistency check asserts code-referenced
// permissions exist here.
model Permission {
  id       String @id @default(uuid()) @db.Uuid
  module   String
  feature  String
  action   String
  @@unique([module, feature, action])
  @@map("permission")
}

// Roles: seven initial built-ins (global — tenantId null) and custom roles
// (tenant-scoped) can be added later without changing the identity model.
model Role {
  id          String @id @default(uuid()) @db.Uuid
  tenantId    String? @db.Uuid // null = built-in platform role
  key         String  // e.g. SCHOOL_ADMIN_OFFICE, or custom key
  displayName String
  isBuiltIn   Boolean @default(false)
  assignments RoleAssignment[]
  permissions RolePermission[]
  children    RoleInheritance[] @relation("ChildRoles")
  parents     RoleInheritance[] @relation("ParentRoles")
  @@index([tenantId])
  @@map("role")
}

model RolePermission {
  roleId       String @db.Uuid
  permissionId String @db.Uuid
  role         Role       @relation(fields: [roleId], references: [id])
  permission   Permission @relation(fields: [permissionId], references: [id])
  @@id([roleId, permissionId])
  @@map("role_permission")
}

// Role hierarchy / inheritance (e.g. Vice Principal inherits Teacher).
model RoleInheritance {
  childRoleId  String @db.Uuid
  parentRoleId String @db.Uuid
  child        Role @relation("ChildRoles", fields: [childRoleId], references: [id])
  parent       Role @relation("ParentRoles", fields: [parentRoleId], references: [id])
  @@id([childRoleId, parentRoleId])
  @@map("role_inheritance")
}

// Tenant-owned: binds a user to a role within a tenant, with a data scope.
model RoleAssignment {
  id        String @id @default(uuid()) @db.Uuid
  tenantId  String @db.Uuid
  tenant    Tenant @relation(fields: [tenantId], references: [id])
  userId    String @db.Uuid
  roleId    String @db.Uuid
  role      Role   @relation(fields: [roleId], references: [id])
  scope     Json   // e.g. { type: "ASSIGNED_CLASSES", classIds: [...] } | SELF | SCHOOL_WIDE
  campusId  String? @db.Uuid // optional campus scoping (P2)
  createdAt DateTime @default(now())
  @@index([tenantId, userId])
  @@index([tenantId, roleId])
  @@map("role_assignment")
}
```

## identity module

```prisma
// Platform-level (cross-tenant): an authenticatable person, linked to a Keycloak user.
// Not tenant-owned — one identity per person across all schools (PRD §5.3).
model UserIdentity {
  id              String @id @default(uuid()) @db.Uuid
  keycloakSubject String @unique // Keycloak user id (sub claim)
  email           String @unique
  phone           String?
  status          UserIdentityStatus @default(ACTIVE)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  roleAssignments RoleAssignment[]
  parentIdentity  ParentIdentity?
  providerLinks   IdentityProviderLink[]
  @@map("user_identity")
}

enum UserIdentityStatus { ACTIVE SUSPENDED DELETED }

// SSO provider links (Google/Microsoft/Apple). (Biometrics app-side; no row here.)
model IdentityProviderLink {
  id            String @id @default(uuid()) @db.Uuid
  userIdentityId String @db.Uuid
  provider      String // GOOGLE | MICROSOFT | APPLE
  providerSubject String
  user          UserIdentity @relation(fields: [userIdentityId], references: [id])
  @@unique([provider, providerSubject])
  @@index([userIdentityId])
  @@map("identity_provider_link")
}

// Note: sessions are NOT modelled here — delegated to Keycloak (plan R2).
// MFA enrolment lives in Keycloak; the app policy endpoint reads tenant/role/user
// MFA policy (TenantConfiguration.mfaPolicy + RoleAssignment) to drive the
// Keycloak conditional flow (plan R4).
```

## parent-identity module

```prisma
// Platform-level (cross-tenant): the unified parent identity (PRD §5.3).
// The ONE deliberate cross-tenant entity. A school must never see a parent's
// other schools — enforced at the repository boundary + query scope + tests.
model ParentIdentity {
  id        String @id @default(uuid()) @db.Uuid
  userIdentityId String @unique @db.Uuid
  user      UserIdentity @relation(fields: [userIdentityId], references: [id])
  verifiedEmail String
  verifiedPhone String?
  createdAt DateTime @default(now())
  schoolLinks ParentSchoolLink[]
  guardians Guardian[]
  @@map("parent_identity")
}

// Cross-tenant link between a ParentIdentity and a Tenant (school), consent-based.
// tenantId = the school; the parent's other links are never enumerable from a tenant.
model ParentSchoolLink {
  id              String @id @default(uuid()) @db.Uuid
  parentIdentityId String @db.Uuid
  parent          ParentIdentity @relation(fields: [parentIdentityId], references: [id])
  tenantId        String @db.Uuid
  tenant          Tenant @relation(fields: [tenantId], references: [id])
  status          ParentLinkStatus @default(PENDING) // PENDING | ACCEPTED | REVOKED
  consentAt       DateTime?
  createdAt       DateTime @default(now())
  @@unique([parentIdentityId, tenantId])
  @@index([tenantId]) // leading tenant — tenant-scoped queries
  @@map("parent_school_link")
}

enum ParentLinkStatus { PENDING ACCEPTED REVOKED }

// A guardian/extended-family member granted scoped access by a primary parent.
model Guardian {
  id              String @id @default(uuid()) @db.Uuid
  parentIdentityId String @db.Uuid // the primary parent who grants
  parent          ParentIdentity @relation(fields: [parentIdentityId], references: [id])
  userIdentityId  String @db.Uuid // the guardian's own identity
  relationship    String // PARENT | STEP_PARENT | GRANDPARENT | GUARDIAN ...
  scope           Json   // granted access scope
  revokedAt       DateTime? // null = active; revocation immediate
  createdAt       DateTime @default(now())
  @@index([parentIdentityId])
  @@map("guardian")
}
```

## feature-gating module

```prisma
// Tenant-owned: per-tenant feature flag state. Core on by default, optional off.
model FeatureFlag {
  id        String @id @default(uuid()) @db.Uuid
  tenantId  String @db.Uuid
  tenant    Tenant @relation(fields: [tenantId], references: [id])
  feature   String // module/feature key
  enabled   Boolean @default(false)
  updatedAt DateTime @updatedAt
  @@unique([tenantId, feature])
  @@index([tenantId, feature])
  @@map("feature_flag")
}
```

## notification-center module

```prisma
// Notification templates: global defaults + tenant overrides, per locale.
model NotificationTemplate {
  id          String @id @default(uuid()) @db.Uuid
  tenantId    String? @db.Uuid // null = platform default
  templateKey String  // e.g. "parent_invitation"
  locale      String  // e.g. "en", "es"
  subject     String
  body        String  // Handlebars template
  channels    String[] // EMAIL | PUSH | IN_APP
  createdAt   DateTime @default(now())
  @@unique([tenantId, templateKey, locale])
  @@index([tenantId, templateKey])
  @@map("notification_template")
}

// Tenant-owned (recipient-scoped): a notification instance.
model Notification {
  id          String @id @default(uuid()) @db.Uuid
  tenantId    String @db.Uuid
  tenant      Tenant @relation(fields: [tenantId], references: [id])
  recipientUserId String @db.Uuid
  templateKey String
  locale      String
  payload     Json   // variables for template rendering
  category    String
  priority    NotificationPriority @default(NORMAL) // NORMAL | EMERGENCY
  createdAt   DateTime @default(now())
  deliveries  NotificationDelivery[]
  @@index([tenantId, recipientUserId])
  @@map("notification")
}

enum NotificationPriority { NORMAL EMERGENCY }

// Per-channel delivery attempt with end-to-end status + retry/fallback.
model NotificationDelivery {
  id            String @id @default(uuid()) @db.Uuid
  notificationId String @db.Uuid
  notification  Notification @relation(fields: [notificationId], references: [id])
  channel       String // EMAIL | PUSH | IN_APP
  status        DeliveryStatus @default(PENDING) // PENDING|SENT|DELIVERED|READ|FAILED|BOUNCED
  attempts      Int @default(0)
  lastError     String?
  sentAt        DateTime?
  deliveredAt   DateTime?
  updatedAt     DateTime @updatedAt
  @@index([notificationId, channel])
  @@map("notification_delivery")
}

enum DeliveryStatus { PENDING SENT DELIVERED READ FAILED BOUNCED }

// Per-user, per-tenant preferences + quiet hours + frequency caps.
model NotificationPreference {
  id          String @id @default(uuid()) @db.Uuid
  tenantId    String @db.Uuid
  userId      String @db.Uuid
  channelPrefs Json  // { EMAIL: { categories: {...} }, ... }
  quietHours  Json   // { start, end, timezone }
  frequencyCaps Json
  @@unique([tenantId, userId])
  @@index([tenantId, userId])
  @@map("notification_preference")
}

// Tenant-owned: customer SIEM webhook config for audit streaming.
model AuditWebhookConfig {
  id        String @id @default(uuid()) @db.Uuid
  tenantId  String @db.Uuid @unique
  url       String
  secret    String // signing secret (never logged)
  enabled   Boolean @default(true)
  @@index([tenantId])
  @@map("audit_webhook_config")
}
```

## audit-log module

```prisma
// Tenant-scoped, append-only, hash-chained. RLS by tenantId; no UPDATE/DELETE
// granted to any tenant DB role. hash = sha256(prevHash || canonicalJson(fields)).
model AuditRecord {
  id            String @id @default(uuid()) @db.Uuid
  tenantId      String @db.Uuid
  tenant        Tenant @relation(fields: [tenantId], references: [id])
  actorId       String? @db.Uuid // null = system
  action        String
  targetType    String
  targetId      String? @db.Uuid
  occurredAt    DateTime @default(now())
  deviceContext Json   // ip, user-agent, device (no PII beyond what's required)
  before        Json?
  after         Json?
  prevHash      String?
  hash          String
  @@index([tenantId, occurredAt]) // leading tenant + time for filter/export
  @@map("audit_record")
}
```

## RLS & migration notes

- Every tenant-owned table (`tenant_configuration`, `campus`, `role_assignment`, `parent_school_link`, `feature_flag`, `notification`, `notification_preference`, `audit_webhook_config`, `audit_record`) gets:
  1. a `tenant_id` column (where shown) with a leading-`tenant_id` index, and
  2. an RLS policy in the migration: `CREATE POLICY tenant_isolation ON <table> USING (tenant_id = current_setting('app.tenant_id')::uuid)`. Cross-tenant Platform Super Admin paths set a superuser/override role explicitly.
- Platform-level tables (`tenant`, `permission`, `user_identity`, `parent_identity`, `notification_template` defaults) are not RLS-tenant-scoped; access is governed by the application authorization layer + scope.
- The first migration (a prerequisite task) installs Prisma, creates these tables, and applies RLS. Subsequent migrations are forward-only, single-head (ADR 0001, AGENTS.md → Database Migration Rules).
- Prisma does not manage RLS; RLS statements are written as raw SQL in the migration (`prisma migrate` supports custom SQL in migration files).
