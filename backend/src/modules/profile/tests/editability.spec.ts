import type { AuthPrincipal } from '../../../core/auth/auth.types';
import type { TenantService } from '../../tenant/tenant.service';
import type { PanelResolverService } from '../panel-resolver.service';
import { ProfileService } from '../profile.service';
import {
  EDITABILITY,
  editabilityFor,
  isSelfEditable,
} from '../profile.constants';
import type { UserProfileRepository } from '../repositories/user-profile.repository';

function principal(roleKey = 'TEACHER'): AuthPrincipal {
  return {
    userId: 'user-1',
    email: 'person@school.test',
    roleKey,
    roleName: roleKey,
    tenantId: '11111111-1111-1111-1111-111111111111',
    authMode: 'local-dev',
  };
}

function createService() {
  const profiles = {
    updatePhone: jest.fn().mockResolvedValue(undefined),
    savePreferences: jest.fn().mockResolvedValue(undefined),
    updatePhoto: jest.fn().mockResolvedValue(undefined),
    updateAddress: jest.fn().mockResolvedValue(undefined),
    findPreferences: jest.fn().mockResolvedValue(null),
  } as unknown as UserProfileRepository;

  const tenants = {
    findById: jest.fn().mockResolvedValue({
      id: 't',
      slug: 's',
      displayName: 'School',
      isActive: true,
      languages: ['en', 'hi'],
    }),
  } as unknown as TenantService;

  const panelResolver = {
    resolve: jest.fn().mockResolvedValue({ kind: 'STAFF' }),
  } as unknown as PanelResolverService;

  return {
    service: new ProfileService(profiles, panelResolver, tenants),
    profiles,
  };
}

describe('editability enforcement', () => {
  describe('the tier map', () => {
    it('lets an adult edit their own contact details and portrait', () => {
      const selfEditable = Object.entries(editabilityFor('TEACHER'))
        .filter(([, tier]) => tier === EDITABILITY.SELF)
        .map(([field]) => field)
        .sort();

      expect(selfEditable).toEqual([
        'addressCity',
        'addressLine',
        'addressPostcode',
        'appearance',
        'avatarKey',
        'language',
        'notificationPreferences',
        'phone',
      ]);
    });

    it('never marks a school-maintained field as self-editable', () => {
      for (const field of [
        'employeeNumber',
        'designation',
        'admissionNumber',
        'classLabel',
        'rollNumber',
        'roleAssignments',
      ]) {
        expect(isSelfEditable('TEACHER', field)).toBe(false);
      }
    });

    /** Names come from the record the school entered when creating the account. */
    it('fixes names at account creation for every role', () => {
      for (const role of ['TEACHER', 'STUDENT', 'PARENT_GUARDIAN']) {
        expect(editabilityFor(role).givenName).toBe(EDITABILITY.SCHOOL_MANAGED);
        expect(editabilityFor(role).familyName).toBe(
          EDITABILITY.SCHOOL_MANAGED,
        );
      }
    });

    it('keeps email behind confirmation while delivery is deferred', () => {
      expect(editabilityFor('TEACHER').email).toBe(EDITABILITY.APPROVAL);
    });
  });

  describe('limits that depend on the role', () => {
    it('lets a parent edit their own address', () => {
      expect(isSelfEditable('PARENT_GUARDIAN', 'addressLine')).toBe(true);
    });

    it('does not let a learner edit the household address', () => {
      expect(isSelfEditable('STUDENT', 'addressLine')).toBe(false);
      expect(editabilityFor('STUDENT').addressLine).toBe(
        EDITABILITY.SCHOOL_MANAGED,
      );
    });

    it('still lets a learner edit their own phone and portrait', () => {
      expect(isSelfEditable('STUDENT', 'phone')).toBe(true);
      expect(isSelfEditable('STUDENT', 'avatarKey')).toBe(true);
    });

    it('lets no role edit guardian or child links directly', () => {
      for (const role of [
        'STUDENT',
        'PARENT_GUARDIAN',
        'SCHOOL_ADMIN_OFFICE',
      ]) {
        expect(isSelfEditable(role, 'guardians')).toBe(false);
        expect(isSelfEditable(role, 'children')).toBe(false);
      }
    });

    it('rejects a learner address change at the service, not just the interface', async () => {
      const { service, profiles } = createService();

      await expect(
        service.updateProfile(principal('STUDENT'), {
          addressLine: '12 New Street',
        }),
      ).rejects.toMatchObject({ code: 'FIELD_NOT_EDITABLE', status: 403 });

      expect(profiles.updateAddress).not.toHaveBeenCalled();
    });

    it('accepts the same change from that learner parent', async () => {
      const { service, profiles } = createService();

      await service.updateProfile(principal('PARENT_GUARDIAN'), {
        addressLine: '12 New Street',
      });

      expect(profiles.updateAddress).toHaveBeenCalledWith('user-1', {
        addressLine: '12 New Street',
      });
    });
  });

  describe('updateProfile (FR-024, FR-025)', () => {
    it('accepts a self-editable field', async () => {
      const { service, profiles } = createService();

      await service.updateProfile(principal(), { phone: ' +91 98000 12345 ' });

      expect(profiles.updatePhone).toHaveBeenCalledWith(
        'user-1',
        '+91 98000 12345',
      );
    });

    /**
     * The DTO whitelist would already strip this. The service checks again
     * because a whitelist is a contract, not an authorization decision — and
     * the two can drift.
     */
    it('rejects a school-managed field even if it reaches the service', async () => {
      const { service, profiles } = createService();

      await expect(
        service.updateProfile(principal(), {
          employeeNumber: 'HACKED',
        } as unknown as { phone?: string }),
      ).rejects.toMatchObject({ code: 'FIELD_NOT_EDITABLE', status: 403 });

      expect(profiles.updatePhone).not.toHaveBeenCalled();
    });

    it('rejects an approval-gated field', async () => {
      const { service } = createService();

      await expect(
        service.updateProfile(principal(), {
          givenName: 'Someone Else',
        } as unknown as { phone?: string }),
      ).rejects.toMatchObject({ code: 'FIELD_NOT_EDITABLE' });
    });

    it('records nothing at all when any field is rejected', async () => {
      const { service, profiles } = createService();

      await expect(
        service.updateProfile(principal(), {
          phone: '+91 98000 00000',
          designation: 'Principal',
        } as unknown as { phone?: string }),
      ).rejects.toThrow();

      // No partial write (FR-034).
      expect(profiles.updatePhone).not.toHaveBeenCalled();
    });

    it('tells the person who manages the field rather than just refusing', async () => {
      const { service } = createService();

      const error = await service
        .updateProfile(principal(), {
          designation: 'Principal',
        } as unknown as { phone?: string })
        .catch((thrown: Error) => thrown);

      expect((error as Error).message).toMatch(/school administrator/i);
    });
  });

  describe('portrait selection', () => {
    it('stores a path this server chose, never one the client sent', async () => {
      const { service, profiles } = createService();

      await service.updateProfile(principal(), {
        avatarKey: 'avatar-03',
      });

      expect(profiles.updatePhoto).toHaveBeenCalledWith(
        'user-1',
        '/avatars/avatar-03.svg',
      );
    });

    it('rejects a field carrying a path rather than a key', async () => {
      const { service, profiles } = createService();

      await expect(
        service.updateProfile(principal(), {
          photoReference: 'https://evil.test/tracker.gif',
        } as unknown as { phone?: string }),
      ).rejects.toMatchObject({ code: 'FIELD_NOT_EDITABLE' });

      expect(profiles.updatePhoto).not.toHaveBeenCalled();
    });
  });

  describe('preferences', () => {
    it('accepts a language the school offers', async () => {
      const { service, profiles } = createService();

      await service.updatePreferences(principal(), { language: 'hi' });

      expect(profiles.savePreferences).toHaveBeenCalledWith('user-1', {
        language: 'hi',
      });
    });

    it('rejects a language the school does not offer', async () => {
      const { service, profiles } = createService();

      await expect(
        service.updatePreferences(principal(), { language: 'fr' }),
      ).rejects.toMatchObject({ code: 'PREFERENCE_INVALID', status: 400 });

      expect(profiles.savePreferences).not.toHaveBeenCalled();
    });

    it('names the available languages in the message', async () => {
      const { service } = createService();

      const error = await service
        .updatePreferences(principal(), { language: 'fr' })
        .catch((thrown: Error) => thrown);

      expect((error as Error).message).toContain('en, hi');
    });

    it('writes only the keys the caller supplied', async () => {
      const { service, profiles } = createService();

      await service.updatePreferences(principal(), { appearance: 'dark' });

      expect(profiles.savePreferences).toHaveBeenCalledWith('user-1', {
        appearance: 'dark',
      });
    });
  });
});
