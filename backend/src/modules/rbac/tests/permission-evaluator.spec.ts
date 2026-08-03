import { PermissionEvaluatorService } from '../permission-evaluator.service';

describe('PermissionEvaluatorService', () => {
  const evaluator = new PermissionEvaluatorService();

  describe('can', () => {
    it('grants a permission the role holds', () => {
      expect(
        evaluator.can('STUDENT', {
          module: 'profile',
          feature: 'self',
          action: 'read',
        }),
      ).toBe(true);
    });

    it('denies a permission the role does not hold', () => {
      expect(
        evaluator.can('STUDENT', {
          module: 'fees',
          feature: 'operations',
          action: 'manage',
        }),
      ).toBe(false);
    });

    it('denies an unknown role rather than defaulting to allow', () => {
      expect(
        evaluator.can('NOT_A_ROLE', {
          module: 'profile',
          feature: 'self',
          action: 'read',
        }),
      ).toBe(false);
    });

    it('does not grant a different action on the same feature', () => {
      // Student may read their own profile; that must not imply managing it.
      expect(
        evaluator.can('STUDENT', {
          module: 'profile',
          feature: 'self',
          action: 'manage',
        }),
      ).toBe(false);
    });

    it('does not grant the same action on a different module', () => {
      expect(
        evaluator.can('TEACHER', {
          module: 'fees',
          feature: 'class',
          action: 'manage',
        }),
      ).toBe(false);
    });

    /** PRD §3.5: an Accountant has no access to modify academic records. */
    it('denies the Accountant any grade management', () => {
      expect(
        evaluator.can('ACCOUNTANT', {
          module: 'grades',
          feature: 'class',
          action: 'manage',
        }),
      ).toBe(false);
    });
  });

  describe('scopeFor', () => {
    it.each([
      ['STUDENT', 'profile', 'self', 'read', 'self'],
      ['PARENT_GUARDIAN', 'children', 'linked', 'read', 'linked'],
      ['TEACHER', 'students', 'assigned', 'read', 'assigned'],
      ['TEACHER', 'attendance', 'class', 'manage', 'assigned'],
      ['PRINCIPAL', 'attendance', 'school', 'read', 'school'],
      ['PLATFORM_SUPER_ADMIN', 'platform', 'tenant', 'manage', 'platform'],
    ])(
      '%s reading %s/%s/%s resolves to %s scope',
      (roleKey, module, feature, action, expected) => {
        expect(evaluator.scopeFor(roleKey, { module, feature, action })).toBe(
          expected,
        );
      },
    );

    it('returns null when the role lacks the permission entirely', () => {
      expect(
        evaluator.scopeFor('STUDENT', {
          module: 'fees',
          feature: 'operations',
          action: 'manage',
        }),
      ).toBeNull();
    });

    it('never widens a parent beyond their linked children', () => {
      expect(
        evaluator.scopeFor('PARENT_GUARDIAN', {
          module: 'attendance',
          feature: 'children',
          action: 'read',
        }),
      ).toBe('linked');
    });

    it('never widens a teacher beyond their assigned classes', () => {
      const scope = evaluator.scopeFor('TEACHER', {
        module: 'grades',
        feature: 'class',
        action: 'manage',
      });
      expect(scope).toBe('assigned');
      expect(scope).not.toBe('school');
    });
  });

  describe('permissionsOf', () => {
    it('returns the role catalog entries for presentation', () => {
      expect(evaluator.permissionsOf('ACCOUNTANT')).toContainEqual([
        'fees',
        'payments',
        'record',
      ]);
    });

    it('returns nothing for an unknown role', () => {
      expect(evaluator.permissionsOf('NOT_A_ROLE')).toEqual([]);
    });
  });
});
