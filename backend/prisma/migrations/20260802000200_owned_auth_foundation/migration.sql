-- CampusOne-owned authentication foundation.
-- Rollback guidance: drop the four auth tables, then remove the added columns
-- from user_identity. Do not run destructive rollback against shared data
-- without an approved backup and migration plan.

ALTER TABLE "user_identity"
  ALTER COLUMN "keycloak_subject" DROP NOT NULL,
  ADD COLUMN "password_hash" TEXT,
  ADD COLUMN "failed_login_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "locked_until" TIMESTAMP(3),
  ADD COLUMN "last_login_at" TIMESTAMP(3);

CREATE TABLE "auth_session" (
    "id" UUID NOT NULL,
    "user_identity_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "replaced_by_id" UUID,
    CONSTRAINT "auth_session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "password_reset_token" (
    "id" UUID NOT NULL,
    "user_identity_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    CONSTRAINT "password_reset_token_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mfa_factor" (
    "id" UUID NOT NULL,
    "user_identity_id" UUID NOT NULL,
    "factor_type" TEXT NOT NULL,
    "secret_encrypted" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified_at" TIMESTAMP(3),
    "disabled_at" TIMESTAMP(3),
    CONSTRAINT "mfa_factor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "security_event" (
    "id" UUID NOT NULL,
    "user_identity_id" UUID,
    "event_type" TEXT NOT NULL,
    "ip_hash" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "security_event_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "auth_session_token_hash_key" ON "auth_session"("token_hash");
CREATE INDEX "auth_session_user_identity_id_revoked_at_idx" ON "auth_session"("user_identity_id", "revoked_at");
CREATE INDEX "auth_session_expires_at_revoked_at_idx" ON "auth_session"("expires_at", "revoked_at");
CREATE UNIQUE INDEX "password_reset_token_token_hash_key" ON "password_reset_token"("token_hash");
CREATE INDEX "password_reset_token_user_identity_id_used_at_idx" ON "password_reset_token"("user_identity_id", "used_at");
CREATE INDEX "password_reset_token_expires_at_used_at_idx" ON "password_reset_token"("expires_at", "used_at");
CREATE INDEX "mfa_factor_user_identity_id_disabled_at_idx" ON "mfa_factor"("user_identity_id", "disabled_at");
CREATE INDEX "security_event_user_identity_id_occurred_at_idx" ON "security_event"("user_identity_id", "occurred_at");
CREATE INDEX "security_event_event_type_occurred_at_idx" ON "security_event"("event_type", "occurred_at");

ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_user_identity_id_fkey" FOREIGN KEY ("user_identity_id") REFERENCES "user_identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "password_reset_token" ADD CONSTRAINT "password_reset_token_user_identity_id_fkey" FOREIGN KEY ("user_identity_id") REFERENCES "user_identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mfa_factor" ADD CONSTRAINT "mfa_factor_user_identity_id_fkey" FOREIGN KEY ("user_identity_id") REFERENCES "user_identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "security_event" ADD CONSTRAINT "security_event_user_identity_id_fkey" FOREIGN KEY ("user_identity_id") REFERENCES "user_identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
