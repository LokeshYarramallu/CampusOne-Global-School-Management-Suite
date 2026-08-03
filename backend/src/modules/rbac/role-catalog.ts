export const INITIAL_ROLE_DEFINITIONS = [
  {
    key: 'PLATFORM_SUPER_ADMIN',
    displayName: 'Platform Super Admin',
    permissions: [
      ['platform', 'tenant', 'manage'],
      ['platform', 'health', 'read'],
    ],
  },
  {
    key: 'SCHOOL_ADMIN_OFFICE',
    displayName: 'School Admin Office',
    permissions: [
      ['tenant', 'configuration', 'manage'],
      ['identity', 'users', 'manage'],
      ['rbac', 'role-assignment', 'manage'],
      ['academics', 'configuration', 'manage'],
      ['admissions', 'pipeline', 'manage'],
      ['fees', 'configuration', 'manage'],
      ['fees', 'invoices', 'manage'],
      ['communication', 'school', 'manage'],
    ],
  },
  {
    key: 'PRINCIPAL',
    displayName: 'Principal',
    permissions: [
      ['analytics', 'school', 'read'],
      ['approvals', 'workflow', 'manage'],
      ['academics', 'school', 'read'],
      ['attendance', 'school', 'read'],
      ['fees', 'school', 'read'],
      ['identity', 'users', 'read'],
    ],
  },
  {
    key: 'ACCOUNTANT',
    displayName: 'Accountant',
    permissions: [
      ['fees', 'operations', 'manage'],
      ['fees', 'payments', 'record'],
      ['fees', 'reconciliation', 'manage'],
      ['fees', 'refunds', 'manage'],
      ['finance', 'reports', 'read'],
    ],
  },
  {
    key: 'TEACHER',
    displayName: 'Teacher',
    permissions: [
      ['attendance', 'class', 'manage'],
      ['assignments', 'class', 'manage'],
      ['grades', 'class', 'manage'],
      ['students', 'assigned', 'read'],
      ['communication', 'class', 'create'],
    ],
  },
  {
    key: 'STUDENT',
    displayName: 'Student',
    permissions: [
      ['profile', 'self', 'read'],
      ['attendance', 'self', 'read'],
      ['assignments', 'self', 'read'],
      ['assignments', 'submission', 'create'],
      ['grades', 'self', 'read'],
      ['leave', 'self', 'request'],
    ],
  },
  {
    key: 'PARENT_GUARDIAN',
    displayName: 'Parent / Guardian',
    permissions: [
      ['children', 'linked', 'read'],
      ['attendance', 'children', 'read'],
      ['assignments', 'children', 'read'],
      ['grades', 'children', 'read'],
      ['fees', 'children', 'read'],
      ['fees', 'payments', 'create'],
      ['communication', 'teachers', 'create'],
    ],
  },
] as const;
