-- CreateEnum
CREATE TYPE "CalendarScope" AS ENUM ('SCHOOL', 'CLASS', 'PERSONAL');

-- CreateEnum
CREATE TYPE "CalendarEventType" AS ENUM ('ACADEMIC', 'CULTURAL', 'EXAM', 'HOLIDAY', 'MEETING', 'NOTICE');

-- CreateTable
CREATE TABLE "calendar_event" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "scope" "CalendarScope" NOT NULL,
    "class_label" TEXT,
    "section_label" TEXT,
    "owner_user_id" UUID NOT NULL,
    "created_by_role" TEXT NOT NULL,
    "type" "CalendarEventType" NOT NULL DEFAULT 'NOTICE',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "event_date" DATE NOT NULL,
    "start_time" TEXT,
    "end_time" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "calendar_event_tenant_id_event_date_idx" ON "calendar_event"("tenant_id", "event_date");

-- CreateIndex
CREATE INDEX "calendar_event_tenant_id_scope_class_label_section_label_idx" ON "calendar_event"("tenant_id", "scope", "class_label", "section_label");

-- CreateIndex
CREATE INDEX "calendar_event_tenant_id_owner_user_id_idx" ON "calendar_event"("tenant_id", "owner_user_id");

-- AddForeignKey
ALTER TABLE "calendar_event" ADD CONSTRAINT "calendar_event_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_event" ADD CONSTRAINT "calendar_event_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "user_identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Row-level security backstop (ADR 0003, ADR 0005).
-- calendar_event is tenant-owned, so it gets a policy in the same migration
-- that creates it. Inert for a role with BYPASSRLS; PrismaService warns at boot.
-- ---------------------------------------------------------------------------
ALTER TABLE "calendar_event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "calendar_event" FORCE ROW LEVEL SECURITY;
CREATE POLICY "calendar_event_tenant_isolation" ON "calendar_event"
  USING (tenant_id::text = current_setting('app.tenant_id', true));
