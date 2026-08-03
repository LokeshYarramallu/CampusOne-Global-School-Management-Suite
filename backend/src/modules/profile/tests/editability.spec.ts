import type { AuthPrincipal } from '../../../core/auth/auth.types';
import type { TenantService } from '../../tenant/tenant.service';
import type { PanelResolverService } from '../panel-resolver.service';
import { ProfileService } from '../profile.service';
import {
  EDITABILITY,
  FIELD_EDITABILITY,
  isSelfEditable,
} from '../profile.constants';
import type { UserProfileRepository } from '../repositories/user-profile.repository';

function principal(): AuthPrincipal {
  return {
    userId: 'user-1',
    email: 'teacher@school.test',
    roleKey: 'TEACHER',
    roleName: 'Teacher',
    tenantId: '11111111-1111-1111-1111-111111111111',
    authMode: 'local-dev',
  };
}

function createService() {
  const profiles = {
    updatePhone: jest.fn().mockResolvedValue(undefined),
    savePreferences: jest.fn().mockResolvedValue(undefined),
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
    it('marks only genuinely self-service fields as SELF', () => {
      const selfEditable = Object.entries(FIELD_EDITABILITY)
        .filter(([, tier]) => tier === EDITABILITY.SELF)
        .map(([field]) => field)
        .sort();

      expect(selfEditable).toEqual([
        'appearance',
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
        expect(isSelfEditable(field)).toBe(false);
      }
    });

    it('keeps name and email behind approval while the workflow is deferred', () => {
      expect(FIELD_EDITABILITY.givenName).toBe(EDITABILITY.APPROVAL);
      expect(FIELD_EDITABILITY.familyName).toBe(EDITABILITY.APPROVAL);
      expect(FIELD_EDITABILITY.email).toBe(EDITABILITY.APPROVAL);
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
