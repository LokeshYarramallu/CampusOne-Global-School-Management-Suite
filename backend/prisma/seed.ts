import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { Pool, type PoolClient } from 'pg';
import { INITIAL_ROLE_DEFINITIONS } from '../src/modules/rbac/role-catalog';

/**
 * Development seed.
 *
 * Creates **two** schools deliberately. A single tenant makes the tenant
 * isolation test (constitution Principle III) and the parent cross-school
 * privacy test (FR-029) impossible to write — the most security-critical
 * behaviour in the platform would go unverified.
 *
 * The parent is linked to a child in *both* schools. That fixture is the whole
 * point of the unified parent identity (PRD §5.3).
 */

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to seed the database.');
}

const pool = new Pool({ connectionString: databaseUrl });

const DEV_PASSWORD =
  process.env.DEV_PLATFORM_ADMIN_PASSWORD ?? 'CampusOneAdmin!2026';

interface SchoolPlan {
  slug: string;
  displayName: string;
  timezone: string;
  currency: string;
}

const SCHOOLS: SchoolPlan[] = [
  {
    slug: 'greenwood',
    displayName: 'Greenwood High',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
  },
  {
    slug: 'riverside',
    displayName: 'Riverside Academy',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
  },
];

async function seedRoleCatalog(client: PoolClient): Promise<void> {
  for (const definition of INITIAL_ROLE_DEFINITIONS) {
    const roleResult = await client.query<{ id: string }>(
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
      const permissionResult = await client.query<{ id: string }>(
        `INSERT INTO "permission" ("id", "module", "feature", "action")
         VALUES (gen_random_uuid(), $1, $2, $3)
         ON CONFLICT ("module", "feature", "action") DO UPDATE SET
           "module" = EXCLUDED."module"
         RETURNING "id"`,
        [module, feature, action],
      );
      await client.query(
        `INSERT INTO "role_permission" ("role_id", "permission_id")
         VALUES ($1, $2)
         ON CONFLICT ("role_id", "permission_id") DO NOTHING`,
        [roleId, permissionResult.rows[0].id],
      );
    }
  }
}

async function roleIdFor(client: PoolClient, key: string): Promise<string> {
  const result = await client.query<{ id: string }>(
    `SELECT "id" FROM "role" WHERE "key" = $1`,
    [key],
  );
  if (!result.rows[0]) throw new Error(`Role ${key} was not seeded`);
  return result.rows[0].id;
}

/** Creates the identity plus its identity-level profile and preferences. */
async function upsertPerson(
  client: PoolClient,
  person: {
    email: string;
    givenName: string;
    familyName: string;
    phone?: string;
    /** Path under frontend/public — illustrated portraits, not photographs. */
    photo?: string;
    passwordHash: string;
  },
): Promise<string> {
  const identity = await client.query<{ id: string }>(
    `INSERT INTO "user_identity"
       ("id", "email", "phone", "password_hash", "status", "failed_login_count", "created_at", "updated_at")
     VALUES (gen_random_uuid(), $1, $2, $3, 'ACTIVE', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT ("email") DO UPDATE SET
       "password_hash" = EXCLUDED."password_hash",
       "phone" = EXCLUDED."phone",
       "status" = 'ACTIVE'
     RETURNING "id"`,
    [person.email, person.phone ?? null, person.passwordHash],
  );
  const userId = identity.rows[0].id;

  const photo =
    person.photo ??
    `/avatars/${person.givenName}-${person.familyName}`.toLowerCase();

  await client.query(
    `INSERT INTO "user_profile"
       ("id", "user_identity_id", "given_name", "family_name", "photo_reference", "created_at", "updated_at")
     VALUES (gen_random_uuid(), $1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT ("user_identity_id") DO UPDATE SET
       "given_name" = EXCLUDED."given_name",
       "family_name" = EXCLUDED."family_name",
       "photo_reference" = EXCLUDED."photo_reference",
       "updated_at" = CURRENT_TIMESTAMP`,
    [userId, person.givenName, person.familyName, `${photo}.svg`],
  );

  await client.query(
    `INSERT INTO "user_preference"
       ("id", "user_identity_id", "language", "appearance", "notification_preferences", "created_at", "updated_at")
     VALUES (gen_random_uuid(), $1, 'en', 'system', '{}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT ("user_identity_id") DO NOTHING`,
    [userId],
  );

  return userId;
}

async function assignRole(
  client: PoolClient,
  args: {
    tenantId: string;
    userId: string;
    roleId: string;
    scope: Record<string, unknown>;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO "role_assignment"
       ("id", "tenant_id", "user_id", "role_id", "scope", "created_at")
     VALUES (gen_random_uuid(), $1, $2, $3, $4::jsonb, CURRENT_TIMESTAMP)
     ON CONFLICT ("tenant_id", "user_id", "role_id") DO NOTHING`,
    [args.tenantId, args.userId, args.roleId, JSON.stringify(args.scope)],
  );
}

async function upsertStaff(
  client: PoolClient,
  args: {
    tenantId: string;
    userId: string;
    employeeNumber: string;
    designation: string;
    department: string | null;
    joinedOn: string;
  },
): Promise<string> {
  const result = await client.query<{ id: string }>(
    `INSERT INTO "staff_profile"
       ("id", "tenant_id", "user_identity_id", "employee_number", "designation",
        "department", "joined_on", "created_at", "updated_at")
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT ("tenant_id", "user_identity_id") DO UPDATE SET
       "designation" = EXCLUDED."designation",
       "department" = EXCLUDED."department",
       "updated_at" = CURRENT_TIMESTAMP
     RETURNING "id"`,
    [
      args.tenantId,
      args.userId,
      args.employeeNumber,
      args.designation,
      args.department,
      args.joinedOn,
    ],
  );
  return result.rows[0].id;
}

async function seedSchool(
  client: PoolClient,
  school: SchoolPlan,
  passwordHash: string,
): Promise<{ tenantId: string; childUserId: string }> {
  const tenantResult = await client.query<{ id: string }>(
    `INSERT INTO "tenant" ("id", "slug", "display_name", "status", "created_at", "updated_at")
     VALUES (gen_random_uuid(), $1, $2, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT ("slug") DO UPDATE SET "display_name" = EXCLUDED."display_name"
     RETURNING "id"`,
    [school.slug, school.displayName],
  );
  const tenantId = tenantResult.rows[0].id;

  await client.query(
    `INSERT INTO "tenant_configuration"
       ("id", "tenant_id", "timezone", "currency", "languages", "module_activation",
        "password_policy", "mfa_policy", "notification_policy", "created_at", "updated_at")
     VALUES (gen_random_uuid(), $1, $2, $3, ARRAY['en'], '{"profile":true}'::jsonb,
             '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT ("tenant_id") DO UPDATE SET
       "timezone" = EXCLUDED."timezone",
       "currency" = EXCLUDED."currency",
       "updated_at" = CURRENT_TIMESTAMP`,
    [tenantId, school.timezone, school.currency],
  );

  const domain = `${school.slug}.campusone.local`;

  // --- Staff -------------------------------------------------------------
  const staffPlan = [
    {
      roleKey: 'SCHOOL_ADMIN_OFFICE',
      email: `admin@${domain}`,
      givenName: 'Asha',
      familyName: 'Menon',
      employeeNumber: 'EMP-0001',
      designation: 'Administrative Officer',
      department: 'Administration',
    },
    {
      roleKey: 'PRINCIPAL',
      email: `principal@${domain}`,
      givenName: 'Rajesh',
      familyName: 'Iyer',
      employeeNumber: 'EMP-0002',
      designation: 'Principal',
      department: 'Leadership',
    },
    {
      roleKey: 'ACCOUNTANT',
      email: `accountant@${domain}`,
      givenName: 'Meera',
      familyName: 'Nair',
      employeeNumber: 'EMP-0003',
      designation: 'Accountant',
      department: 'Finance',
    },
    {
      roleKey: 'TEACHER',
      email: `teacher@${domain}`,
      givenName: 'Priya',
      familyName: 'Sharma',
      employeeNumber: 'EMP-0004',
      designation: 'Senior Teacher',
      department: 'Mathematics',
    },
  ];

  let teacherStaffId = '';
  let teacherUserId = '';
  let adminUserId = '';
  for (const member of staffPlan) {
    const userId = await upsertPerson(client, {
      email: member.email,
      givenName: member.givenName,
      familyName: member.familyName,
      phone: '+91 98000 00000',
      passwordHash,
    });
    await assignRole(client, {
      tenantId,
      userId,
      roleId: await roleIdFor(client, member.roleKey),
      scope: { kind: 'school' },
    });
    const staffId = await upsertStaff(client, {
      tenantId,
      userId,
      employeeNumber: member.employeeNumber,
      designation: member.designation,
      department: member.department,
      joinedOn: '2024-06-01',
    });
    if (member.roleKey === 'TEACHER') {
      teacherStaffId = staffId;
      teacherUserId = userId;
    }
    if (member.roleKey === 'SCHOOL_ADMIN_OFFICE') adminUserId = userId;
  }

  // The teaching assignment is the Teacher role's scope, not decoration.
  for (const assignment of [
    { subject: 'Mathematics', classLabel: '8', sectionLabel: 'B', isClassTeacher: true },
    { subject: 'Mathematics', classLabel: '9', sectionLabel: 'A', isClassTeacher: false },
  ]) {
    await client.query(
      `INSERT INTO "teaching_assignment"
         ("id", "tenant_id", "staff_profile_id", "subject_label", "class_label",
          "section_label", "is_class_teacher", "created_at")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       ON CONFLICT ("tenant_id", "staff_profile_id", "subject_label", "class_label", "section_label")
       DO NOTHING`,
      [
        tenantId,
        teacherStaffId,
        assignment.subject,
        assignment.classLabel,
        assignment.sectionLabel,
        assignment.isClassTeacher,
      ],
    );
  }

  // --- Student -----------------------------------------------------------
  const childGivenName = school.slug === 'greenwood' ? 'Aarav' : 'Diya';
  const childUserId = await upsertPerson(client, {
    email: `student@${domain}`,
    givenName: childGivenName,
    familyName: 'Kumar',
    passwordHash,
  });
  await assignRole(client, {
    tenantId,
    userId: childUserId,
    roleId: await roleIdFor(client, 'STUDENT'),
    scope: { kind: 'self' },
  });
  await client.query(
    `INSERT INTO "student_enrollment"
       ("id", "tenant_id", "user_identity_id", "admission_number", "class_label",
        "section_label", "roll_number", "admitted_on", "created_at", "updated_at")
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT ("tenant_id", "user_identity_id") DO UPDATE SET
       "class_label" = EXCLUDED."class_label",
       "updated_at" = CURRENT_TIMESTAMP`,
    [
      tenantId,
      childUserId,
      school.slug === 'greenwood' ? '2024-0417' : '2024-0912',
      school.slug === 'greenwood' ? '8' : '5',
      school.slug === 'greenwood' ? 'B' : 'A',
      school.slug === 'greenwood' ? '17' : '09',
      '2024-06-10',
    ],
  );

  // --- Calendar demo events ---------------------------------------------
  // One of each scope so every role sees something, and the membership rule
  // is demonstrable: the CLASS event is owned by the teacher and targets the
  // student's class, so both see it but the admin does not.
  const studentClass = school.slug === 'greenwood'
    ? { classLabel: '8', sectionLabel: 'B' }
    : { classLabel: '5', sectionLabel: 'A' };
  const soon = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  const events: Array<{
    scope: 'SCHOOL' | 'CLASS' | 'PERSONAL';
    classLabel: string | null;
    sectionLabel: string | null;
    ownerUserId: string;
    role: string;
    type: string;
    title: string;
    description: string | null;
    eventDate: string;
    startTime: string | null;
    endTime: string | null;
  }> = [
    {
      scope: 'SCHOOL', classLabel: null, sectionLabel: null,
      ownerUserId: adminUserId, role: 'SCHOOL_ADMIN_OFFICE', type: 'HOLIDAY',
      title: 'Founders Day holiday', description: 'The school is closed for Founders Day.',
      eventDate: soon(6), startTime: null, endTime: null,
    },
    {
      scope: 'SCHOOL', classLabel: null, sectionLabel: null,
      ownerUserId: adminUserId, role: 'SCHOOL_ADMIN_OFFICE', type: 'MEETING',
      title: 'Parent–teacher meeting', description: 'Term-one progress discussions in the main hall.',
      eventDate: soon(9), startTime: '10:00', endTime: '13:00',
    },
    {
      scope: 'CLASS', classLabel: studentClass.classLabel, sectionLabel: studentClass.sectionLabel,
      ownerUserId: teacherUserId, role: 'TEACHER', type: 'EXAM',
      title: `Mathematics unit test — ${studentClass.classLabel}-${studentClass.sectionLabel}`,
      description: 'Chapters 3 and 4. Bring your own instruments.',
      eventDate: soon(3), startTime: '09:00', endTime: '10:00',
    },
    {
      scope: 'PERSONAL', classLabel: null, sectionLabel: null,
      ownerUserId: teacherUserId, role: 'TEACHER', type: 'NOTICE',
      title: 'Prepare test papers', description: null,
      eventDate: soon(2), startTime: '18:00', endTime: null,
    },
    {
      scope: 'PERSONAL', classLabel: null, sectionLabel: null,
      ownerUserId: childUserId, role: 'STUDENT', type: 'ACADEMIC',
      title: 'Revise algebra', description: 'Focus on quadratic equations.',
      eventDate: soon(1), startTime: '17:00', endTime: '18:30',
    },
  ];

  // Idempotent re-seed: calendar_event has no natural unique key, so clear the
  // tenant's events before re-inserting rather than accumulating duplicates.
  await client.query(`DELETE FROM "calendar_event" WHERE "tenant_id" = $1`, [
    tenantId,
  ]);

  for (const e of events) {
    await client.query(
      `INSERT INTO "calendar_event"
         ("id", "tenant_id", "scope", "class_label", "section_label",
          "owner_user_id", "created_by_role", "type", "title", "description",
          "event_date", "start_time", "end_time", "created_at", "updated_at")
       VALUES (gen_random_uuid(), $1, $2::"CalendarScope", $3, $4, $5, $6,
               $7::"CalendarEventType", $8, $9, $10, $11, $12,
               CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT DO NOTHING`,
      [
        tenantId, e.scope, e.classLabel, e.sectionLabel, e.ownerUserId,
        e.role, e.type, e.title, e.description, e.eventDate, e.startTime, e.endTime,
      ],
    );
  }

  return { tenantId, childUserId };
}

async function main(): Promise<void> {
  const client = await pool.connect();
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12);

  try {
    await seedRoleCatalog(client);

    // Platform Super Admin — deliberately has no tenant. Its account page must
    // render with no school-shaped element at all.
    const platformAdminEmail = (
      process.env.DEV_PLATFORM_ADMIN_EMAIL ?? 'platform-admin@campusone.local'
    ).toLowerCase();
    await upsertPerson(client, {
      email: platformAdminEmail,
      givenName: 'Platform',
      familyName: 'Operator',
      photo: '/avatars/platform-operator',
      passwordHash,
    });

    const seeded: Array<{ tenantId: string; childUserId: string }> = [];
    for (const school of SCHOOLS) {
      seeded.push(await seedSchool(client, school, passwordHash));
    }

    // --- The cross-school parent ------------------------------------------
    // One identity, children at both schools. Without this, FR-029 (a school
    // must never learn of a parent's other schools) cannot be tested.
    const parentUserId = await upsertPerson(client, {
      email: 'parent@campusone.local',
      givenName: 'Lakshmi',
      familyName: 'Kumar',
      phone: '+91 98000 11111',
      passwordHash,
    });

    const parentIdentity = await client.query<{ id: string }>(
      `INSERT INTO "parent_identity"
         ("id", "user_identity_id", "verified_email", "verified_phone", "created_at")
       VALUES (gen_random_uuid(), $1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT ("user_identity_id") DO UPDATE SET
         "verified_email" = EXCLUDED."verified_email"
       RETURNING "id"`,
      [parentUserId, 'parent@campusone.local', '+91 98000 11111'],
    );
    const parentIdentityId = parentIdentity.rows[0].id;

    const parentRoleId = await roleIdFor(client, 'PARENT_GUARDIAN');
    for (const school of seeded) {
      await assignRole(client, {
        tenantId: school.tenantId,
        userId: parentUserId,
        roleId: parentRoleId,
        scope: { kind: 'linked' },
      });
      await client.query(
        `INSERT INTO "parent_school_link"
           ("id", "parent_identity_id", "tenant_id", "status", "consent_at", "created_at")
         VALUES (gen_random_uuid(), $1, $2, 'ACCEPTED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT ("parent_identity_id", "tenant_id") DO UPDATE SET "status" = 'ACCEPTED'`,
        [parentIdentityId, school.tenantId],
      );
      await client.query(
        `INSERT INTO "family_access_grant"
           ("id", "parent_identity_id", "user_identity_id", "relationship", "scope", "created_at")
         SELECT gen_random_uuid(), $1, $2, 'biological', '{"kind":"full"}'::jsonb, CURRENT_TIMESTAMP
         WHERE NOT EXISTS (
           SELECT 1 FROM "family_access_grant"
           WHERE "parent_identity_id" = $1 AND "user_identity_id" = $2
         )`,
        [parentIdentityId, school.childUserId],
      );
    }

    // --- Multi-role person -------------------------------------------------
    // Teacher AND Parent at the same school, so role separation (FR-014) can be
    // exercised end to end rather than only reasoned about.
    const dualRoleUserId = await upsertPerson(client, {
      email: 'teacher.parent@greenwood.campusone.local',
      givenName: 'Nandini',
      familyName: 'Rao',
      phone: '+91 98000 22222',
      passwordHash,
    });
    const greenwood = seeded[0];
    await assignRole(client, {
      tenantId: greenwood.tenantId,
      userId: dualRoleUserId,
      roleId: await roleIdFor(client, 'TEACHER'),
      scope: { kind: 'assigned' },
    });
    await assignRole(client, {
      tenantId: greenwood.tenantId,
      userId: dualRoleUserId,
      roleId: parentRoleId,
      scope: { kind: 'linked' },
    });
    await upsertStaff(client, {
      tenantId: greenwood.tenantId,
      userId: dualRoleUserId,
      employeeNumber: 'EMP-0005',
      designation: 'Teacher',
      department: 'Science',
      joinedOn: '2023-06-01',
    });

    console.log(
      `Seeded ${SCHOOLS.length} schools, ${INITIAL_ROLE_DEFINITIONS.length} roles, ` +
        'one cross-school parent, and one multi-role person.',
    );
  } finally {
    client.release();
  }
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
