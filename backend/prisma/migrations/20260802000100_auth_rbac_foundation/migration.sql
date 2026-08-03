-- Initial authentication, tenant, and RBAC foundation.
-- RLS is defense in depth; repositories must still scope every query.

CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "UserIdentityStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');
CREATE TYPE "ParentLinkStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED');

CREATE TABLE "tenant" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tenant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tenant_configuration" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "timezone" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "languages" TEXT[],
    "module_activation" JSONB NOT NULL,
    "password_policy" JSONB NOT NULL,
    "mfa_policy" JSONB NOT NULL,
    "notification_policy" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tenant_configuration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_identity" (
    "id" UUID NOT NULL,
    "keycloak_subject" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "status" "UserIdentityStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_identity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "identity_provider_link" (
    "id" UUID NOT NULL,
    "user_identity_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_subject" TEXT NOT NULL,
    CONSTRAINT "identity_provider_link_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "permission" (
    "id" UUID NOT NULL,
    "module" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    CONSTRAINT "permission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "role" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "key" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "is_built_in" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "role_permission" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    CONSTRAINT "role_permission_pkey" PRIMARY KEY ("role_id", "permission_id")
);

CREATE TABLE "role_assignment" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "scope" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "role_assignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "parent_identity" (
    "id" UUID NOT NULL,
    "user_identity_id" UUID NOT NULL,
    "verified_email" TEXT NOT NULL,
    "verified_phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "parent_identity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "parent_school_link" (
    "id" UUID NOT NULL,
    "parent_identity_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "status" "ParentLinkStatus" NOT NULL DEFAULT 'PENDING',
    "consent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "parent_school_link_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "family_access_grant" (
    "id" UUID NOT NULL,
    "parent_identity_id" UUID NOT NULL,
    "user_identity_id" UUID NOT NULL,
    "relationship" TEXT NOT NULL,
    "scope" JSONB NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "family_access_grant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "feature_flag" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "feature" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "feature_flag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_record" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" UUID,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "device_context" JSONB NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "prev_hash" TEXT,
    "hash" TEXT NOT NULL,
    CONSTRAINT "audit_record_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_slug_key" ON "tenant"("slug");
CREATE UNIQUE INDEX "tenant_configuration_tenant_id_key" ON "tenant_configuration"("tenant_id");
CREATE INDEX "tenant_configuration_tenant_id_idx" ON "tenant_configuration"("tenant_id");
CREATE UNIQUE INDEX "user_identity_keycloak_subject_key" ON "user_identity"("keycloak_subject");
CREATE UNIQUE INDEX "user_identity_email_key" ON "user_identity"("email");
CREATE INDEX "identity_provider_link_user_identity_id_idx" ON "identity_provider_link"("user_identity_id");
CREATE UNIQUE INDEX "identity_provider_link_provider_provider_subject_key" ON "identity_provider_link"("provider", "provider_subject");
CREATE UNIQUE INDEX "permission_module_feature_action_key" ON "permission"("module", "feature", "action");
CREATE UNIQUE INDEX "role_key_key" ON "role"("key");
CREATE INDEX "role_tenant_id_idx" ON "role"("tenant_id");
CREATE INDEX "role_assignment_tenant_id_user_id_idx" ON "role_assignment"("tenant_id", "user_id");
CREATE INDEX "role_assignment_tenant_id_role_id_idx" ON "role_assignment"("tenant_id", "role_id");
CREATE UNIQUE INDEX "role_assignment_tenant_id_user_id_role_id_key" ON "role_assignment"("tenant_id", "user_id", "role_id");
CREATE UNIQUE INDEX "parent_identity_user_identity_id_key" ON "parent_identity"("user_identity_id");
CREATE INDEX "parent_school_link_tenant_id_parent_identity_id_idx" ON "parent_school_link"("tenant_id", "parent_identity_id");
CREATE UNIQUE INDEX "parent_school_link_parent_identity_id_tenant_id_key" ON "parent_school_link"("parent_identity_id", "tenant_id");
CREATE INDEX "family_access_grant_parent_identity_id_idx" ON "family_access_grant"("parent_identity_id");
CREATE INDEX "family_access_grant_user_identity_id_idx" ON "family_access_grant"("user_identity_id");
CREATE INDEX "feature_flag_tenant_id_feature_idx" ON "feature_flag"("tenant_id", "feature");
CREATE UNIQUE INDEX "feature_flag_tenant_id_feature_key" ON "feature_flag"("tenant_id", "feature");
CREATE INDEX "audit_record_tenant_id_occurred_at_idx" ON "audit_record"("tenant_id", "occurred_at");

ALTER TABLE "tenant_configuration" ADD CONSTRAINT "tenant_configuration_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "identity_provider_link" ADD CONSTRAINT "identity_provider_link_user_identity_id_fkey" FOREIGN KEY ("user_identity_id") REFERENCES "user_identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "role_assignment" ADD CONSTRAINT "role_assignment_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "role_assignment" ADD CONSTRAINT "role_assignment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "role_assignment" ADD CONSTRAINT "role_assignment_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "role" ADD CONSTRAINT "role_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "parent_identity" ADD CONSTRAINT "parent_identity_user_identity_id_fkey" FOREIGN KEY ("user_identity_id") REFERENCES "user_identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "parent_school_link" ADD CONSTRAINT "parent_school_link_parent_identity_id_fkey" FOREIGN KEY ("parent_identity_id") REFERENCES "parent_identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "parent_school_link" ADD CONSTRAINT "parent_school_link_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "family_access_grant" ADD CONSTRAINT "family_access_grant_parent_identity_id_fkey" FOREIGN KEY ("parent_identity_id") REFERENCES "parent_identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "feature_flag" ADD CONSTRAINT "feature_flag_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_record" ADD CONSTRAINT "audit_record_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Tenant context is set by the authenticated request after Keycloak validation.
-- Tables with tenant_id are protected even if a repository accidentally omits
-- its application-level tenant predicate. The database role used by Prisma in
-- production must not bypass RLS.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'tenant_configuration', 'role_assignment', 'parent_school_link',
    'feature_flag', 'audit_record'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (tenant_id::text = current_setting(''app.tenant_id'', true))',
      table_name || '_tenant_isolation', table_name
    );
  END LOOP;
END $$;

ALTER TABLE "role" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "role" FORCE ROW LEVEL SECURITY;
CREATE POLICY "role_tenant_visibility" ON "role"
  USING (tenant_id IS NULL OR tenant_id::text = current_setting('app.tenant_id', true));

-- Tenant users may not modify the append-only audit stream.
REVOKE UPDATE, DELETE ON "audit_record" FROM PUBLIC;
