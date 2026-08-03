import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { INITIAL_ROLE_DEFINITIONS } from '../src/modules/rbac/role-catalog';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to seed the database.');
}

const pool = new Pool({ connectionString: databaseUrl });

async function main(): Promise<void> {
  for (const definition of INITIAL_ROLE_DEFINITIONS) {
    const roleResult = await pool.query<{ id: string }>(
      `INSERT INTO "role" ("id", "key", "display_name", "is_built_in")
       VALUES (gen_random_uuid(), $1, $2, true)
       ON CONFLICT ("key") DO UPDATE SET
         "display_name" = EXCLUDED."display_name",
         "is_built_in" = true,
         "tenant_id" = NULL
       RETURNING "id"`,
      [definition.key, definition.displayName],
    );
    const roleId = roleResult.rows[0].id;

    for (const [module, feature, action] of definition.permissions) {
      const permissionResult = await pool.query<{ id: string }>(
        `INSERT INTO "permission" ("id", "module", "feature", "action")
         VALUES (gen_random_uuid(), $1, $2, $3)
         ON CONFLICT ("module", "feature", "action") DO UPDATE SET
           "module" = EXCLUDED."module"
         RETURNING "id"`,
        [module, feature, action],
      );
      await pool.query(
        `INSERT INTO "role_permission" ("role_id", "permission_id")
         VALUES ($1, $2)
         ON CONFLICT ("role_id", "permission_id") DO NOTHING`,
        [roleId, permissionResult.rows[0].id],
      );
    }
  }

  const platformAdminEmail = (
    process.env.DEV_PLATFORM_ADMIN_EMAIL ?? 'platform-admin@campusone.local'
  ).toLowerCase();
  const platformAdminPassword =
    process.env.DEV_PLATFORM_ADMIN_PASSWORD ?? 'CampusOneAdmin!2026';
  const platformAdminPasswordHash = await bcrypt.hash(platformAdminPassword, 12);

  await pool.query(
    `INSERT INTO "user_identity"
      ("id", "email", "password_hash", "status", "failed_login_count", "created_at", "updated_at")
     VALUES (gen_random_uuid(), $1, $2, 'ACTIVE', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT ("email") DO UPDATE SET
       "password_hash" = EXCLUDED."password_hash",
       "status" = 'ACTIVE'`,
    [platformAdminEmail, platformAdminPasswordHash],
  );
}

main()
  .then(async () => {
    await pool.end();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await pool.end();
    process.exitCode = 1;
  });
