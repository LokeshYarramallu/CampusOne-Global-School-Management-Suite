-- CreateTable
CREATE TABLE "user_profile" (
    "id" UUID NOT NULL,
    "user_identity_id" UUID NOT NULL,
    "given_name" TEXT NOT NULL,
    "family_name" TEXT NOT NULL,
    "display_name" TEXT,
    "photo_reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preference" (
    "id" UUID NOT NULL,
    "user_identity_id" UUID NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "appearance" TEXT NOT NULL DEFAULT 'system',
    "notification_preferences" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_profile" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_identity_id" UUID NOT NULL,
    "employee_number" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "department" TEXT,
    "joined_on" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_enrollment" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_identity_id" UUID NOT NULL,
    "admission_number" TEXT NOT NULL,
    "class_label" TEXT NOT NULL,
    "section_label" TEXT NOT NULL,
    "roll_number" TEXT,
    "admitted_on" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teaching_assignment" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "staff_profile_id" UUID NOT NULL,
    "subject_label" TEXT NOT NULL,
    "class_label" TEXT NOT NULL,
    "section_label" TEXT NOT NULL,
    "is_class_teacher" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teaching_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_change_request" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_identity_id" UUID NOT NULL,
    "field_path" TEXT NOT NULL,
    "requested_value" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMP(3),
    "decided_by_user_id" UUID,

    CONSTRAINT "profile_change_request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_profile_user_identity_id_key" ON "user_profile"("user_identity_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_preference_user_identity_id_key" ON "user_preference"("user_identity_id");

-- CreateIndex
CREATE INDEX "staff_profile_tenant_id_user_identity_id_idx" ON "staff_profile"("tenant_id", "user_identity_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_profile_tenant_id_user_identity_id_key" ON "staff_profile"("tenant_id", "user_identity_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_profile_tenant_id_employee_number_key" ON "staff_profile"("tenant_id", "employee_number");

-- CreateIndex
CREATE INDEX "student_enrollment_tenant_id_user_identity_id_idx" ON "student_enrollment"("tenant_id", "user_identity_id");

-- CreateIndex
CREATE INDEX "student_enrollment_tenant_id_class_label_section_label_idx" ON "student_enrollment"("tenant_id", "class_label", "section_label");

-- CreateIndex
CREATE UNIQUE INDEX "student_enrollment_tenant_id_admission_number_key" ON "student_enrollment"("tenant_id", "admission_number");

-- CreateIndex
CREATE UNIQUE INDEX "student_enrollment_tenant_id_user_identity_id_key" ON "student_enrollment"("tenant_id", "user_identity_id");

-- CreateIndex
CREATE INDEX "teaching_assignment_tenant_id_staff_profile_id_idx" ON "teaching_assignment"("tenant_id", "staff_profile_id");

-- CreateIndex
CREATE INDEX "teaching_assignment_tenant_id_class_label_section_label_idx" ON "teaching_assignment"("tenant_id", "class_label", "section_label");

-- CreateIndex
CREATE UNIQUE INDEX "teaching_assignment_tenant_id_staff_profile_id_subject_labe_key" ON "teaching_assignment"("tenant_id", "staff_profile_id", "subject_label", "class_label", "section_label");

-- CreateIndex
CREATE INDEX "profile_change_request_tenant_id_status_idx" ON "profile_change_request"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "profile_change_request_tenant_id_user_identity_id_idx" ON "profile_change_request"("tenant_id", "user_identity_id");

-- AddForeignKey
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_user_identity_id_fkey" FOREIGN KEY ("user_identity_id") REFERENCES "user_identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preference" ADD CONSTRAINT "user_preference_user_identity_id_fkey" FOREIGN KEY ("user_identity_id") REFERENCES "user_identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_profile" ADD CONSTRAINT "staff_profile_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_profile" ADD CONSTRAINT "staff_profile_user_identity_id_fkey" FOREIGN KEY ("user_identity_id") REFERENCES "user_identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollment" ADD CONSTRAINT "student_enrollment_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollment" ADD CONSTRAINT "student_enrollment_user_identity_id_fkey" FOREIGN KEY ("user_identity_id") REFERENCES "user_identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teaching_assignment" ADD CONSTRAINT "teaching_assignment_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teaching_assignment" ADD CONSTRAINT "teaching_assignment_staff_profile_id_fkey" FOREIGN KEY ("staff_profile_id") REFERENCES "staff_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_change_request" ADD CONSTRAINT "profile_change_request_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_change_request" ADD CONSTRAINT "profile_change_request_user_identity_id_fkey" FOREIGN KEY ("user_identity_id") REFERENCES "user_identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Row-level security backstop (ADR 0003, ADR 0005).
--
-- Every tenant-owned table created above gets a policy in the same migration
-- that creates it — a tenant-owned table without one is a defect
-- (AGENTS.md, "Database Migration Rules").
--
-- The policies compare against app.tenant_id, which the API sets with
-- SET LOCAL inside an interactive transaction (see
-- backend/src/infrastructure/prisma/tenant-scoped.client.ts). This is a
-- backstop for a forgotten `where: { tenantId }`, never a replacement for it.
--
-- NOTE: these policies are inert for any database role holding SUPERUSER or
-- BYPASSRLS. PrismaService warns at boot when that is the case.
--
-- user_profile and user_preference are deliberately absent: they are
-- identity-level, belong to the person rather than to a school, and carry no
-- tenant_id.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'staff_profile', 'student_enrollment',
    'teaching_assignment', 'profile_change_request'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', target_table);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', target_table);
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (tenant_id::text = current_setting(''app.tenant_id'', true))',
      target_table || '_tenant_isolation', target_table
    );
  END LOOP;
END $$;
