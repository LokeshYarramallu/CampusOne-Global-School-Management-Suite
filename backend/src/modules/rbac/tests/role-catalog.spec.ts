import { INITIAL_ROLE_DEFINITIONS } from '../role-catalog';

describe('initial RBAC role catalog', () => {
  it('contains the approved seven roles with unique stable keys', () => {
    expect(INITIAL_ROLE_DEFINITIONS).toHaveLength(7);
    expect(new Set(INITIAL_ROLE_DEFINITIONS.map((role) => role.key)).size).toBe(
      7,
    );
    expect(INITIAL_ROLE_DEFINITIONS.map((role) => role.key)).toEqual([
      'PLATFORM_SUPER_ADMIN',
      'SCHOOL_ADMIN_OFFICE',
      'PRINCIPAL',
      'ACCOUNTANT',
      'TEACHER',
      'STUDENT',
      'PARENT_GUARDIAN',
    ]);
  });

  it('keeps parent/guardian access in a single role', () => {
    expect(
      INITIAL_ROLE_DEFINITIONS.some(
        (role) => (role.key as string) === 'GUARDIAN',
      ),
    ).toBe(false);
    expect(
      INITIAL_ROLE_DEFINITIONS.some((role) => role.key === 'PARENT_GUARDIAN'),
    ).toBe(true);
  });
});
