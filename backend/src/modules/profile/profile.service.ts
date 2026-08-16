import { Injectable, Logger, Optional } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { AuthPrincipal } from '../../core/auth/auth.types';
import { AppException } from '../../core/http/api-error';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { TenantService } from '../tenant/tenant.service';
import {
  PanelResolverService,
  type ProfilePanel,
} from './panel-resolver.service';
import {
  EDITABILITY,
  PROFILE_ERROR_CODES,
  avatarPathFor,
  editabilityFor,
  isSelfEditable,
} from './profile.constants';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { UpdatePreferencesDto } from './dto/update-preferences.dto';
import type { ChangePasswordDto } from './dto/change-password.dto';
import { UserProfileRepository } from './repositories/user-profile.repository';

export interface AccountProfile {
  identity: {
    userId: string;
    givenName: string;
    familyName: string;
    displayName: string;
    email: string;
    phone: string | null;
    addressLine: string | null;
    addressCity: string | null;
    addressPostcode: string | null;
    photoUrl: string | null;
    avatarInitials: string;
  };
  activeContext: {
    roleKey: string;
    roleName: string;
    tenantId: string | null;
    schoolName: string | null;
    hasMultipleRoles: boolean;
  };
  security: {
    passwordChangedAt: string | null;
    mfaFactors: Array<{ factorType: string; verified: boolean }>;
    activeSessionCount: number;
  };
  /** Provenance: every account here was created by someone above it. */
  account: {
    createdAt: string;
    status: string;
    lastLoginAt: string | null;
    provisionedBy: string;
  };
  editability: Record<string, string>;
  panel: ProfilePanel;
}

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    private readonly profiles: UserProfileRepository,
    private readonly panelResolver: PanelResolverService,
    private readonly tenants: TenantService,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  /**
   * The whole account page in one response.
   *
   * The subject is the authenticated principal — there is no code path here
   * that accepts a user id from a caller (FR-028).
   */
  async getAccountProfile(principal: AuthPrincipal): Promise<AccountProfile> {
    // Two phases, deliberately.
    //
    // Everything here is a plain query, so issuing them together costs one
    // round trip rather than six. The role panel is *not* in this batch: it
    // opens an interactive transaction, which holds a connection for its whole
    // duration. Running it alongside six concurrent queries starves it of a
    // connection and it fails with "Unable to start a transaction in the given
    // time" — which is how this was found.
    const [profile, contact, sessions, mfaFactors, roleCount, account, school] =
      await Promise.all([
        this.profiles.findProfile(principal.userId),
        this.profiles.findContact(principal.userId),
        this.profiles.findActiveSessions(principal.userId),
        this.profiles.findMfaFactors(principal.userId),
        this.profiles.countRoleAssignments(principal.userId),
        this.profiles.findAccountMeta(principal.userId),
        principal.tenantId
          ? this.tenants.findById(principal.tenantId)
          : Promise.resolve(null),
      ]);

    if (!profile || !contact) {
      // A signed-in person with no profile row is a seeding defect, not
      // something the person did wrong.
      this.logger.error('Signed-in principal has no profile row');
      throw new AppException({
        code: PROFILE_ERROR_CODES.PROFILE_NOT_FOUND,
        message: 'Your profile could not be loaded. Please contact support.',
        status: 404,
      });
    }

    const displayName =
      profile.displayName ?? `${profile.givenName} ${profile.familyName}`;

    return {
      identity: {
        userId: principal.userId,
        givenName: profile.givenName,
        familyName: profile.familyName,
        displayName,
        email: contact.email,
        phone: contact.phone,
        addressLine: profile.addressLine,
        addressCity: profile.addressCity,
        addressPostcode: profile.addressPostcode,
        // A path this server chose, from the key catalogue — never a value the
        // client supplied. Null falls back to the initials block.
        photoUrl: profile.photoReference,
        avatarInitials: ProfileService.initialsOf(
          profile.givenName,
          profile.familyName,
        ),
      },
      activeContext: {
        roleKey: principal.roleKey,
        roleName: principal.roleName,
        tenantId: principal.tenantId ?? null,
        schoolName: school?.displayName ?? null,
        hasMultipleRoles: roleCount > 1,
      },
      security: {
        passwordChangedAt: contact.updatedAt.toISOString(),
        mfaFactors,
        activeSessionCount: sessions.length,
      },
      account: {
        createdAt: account?.createdAt.toISOString() ?? '',
        status: account?.status ?? 'ACTIVE',
        lastLoginAt: account?.lastLoginAt?.toISOString() ?? null,
        provisionedBy: ProfileService.provisionedBy(principal.roleKey),
      },
      editability: editabilityFor(principal.roleKey),
      // Phase two: the pool is free again, so the transaction starts at once.
      panel: await this.panelResolver.resolve(principal),
    };
  }

  /**
   * Re-checks editability rather than trusting the DTO whitelist alone. The
   * DTO is a contract; this is the authorization decision (FR-024, FR-025).
   */
  async updateProfile(
    principal: AuthPrincipal,
    changes: UpdateProfileDto,
  ): Promise<void> {
    // Checked against *this role's* rules. A learner sending an address change
    // is rejected here even though the same field is editable for their parent.
    for (const field of Object.keys(changes)) {
      if (!isSelfEditable(principal.roleKey, field)) {
        throw new AppException({
          code: PROFILE_ERROR_CODES.FIELD_NOT_EDITABLE,
          message: ProfileService.notEditableMessage(principal.roleKey, field),
          status: 403,
        });
      }
    }

    if (changes.phone !== undefined) {
      await this.profiles.updatePhone(principal.userId, changes.phone.trim());
    }

    // A key, never a path. The mapping happens here so a client cannot point
    // the portrait at an arbitrary URL.
    if (changes.avatarKey !== undefined) {
      await this.profiles.updatePhoto(
        principal.userId,
        avatarPathFor(changes.avatarKey),
      );
    }

    const address = {
      ...(changes.addressLine !== undefined
        ? { addressLine: changes.addressLine.trim() }
        : {}),
      ...(changes.addressCity !== undefined
        ? { addressCity: changes.addressCity.trim() }
        : {}),
      ...(changes.addressPostcode !== undefined
        ? { addressPostcode: changes.addressPostcode.trim() }
        : {}),
    };
    if (Object.keys(address).length > 0) {
      await this.profiles.updateAddress(principal.userId, address);
    }
  }

  async getPreferences(principal: AuthPrincipal) {
    const preferences = await this.profiles.findPreferences(principal.userId);
    return {
      language: preferences?.language ?? 'en',
      appearance: preferences?.appearance ?? 'system',
      notificationPreferences: preferences?.notificationPreferences ?? {},
    };
  }

  async updatePreferences(
    principal: AuthPrincipal,
    changes: UpdatePreferencesDto,
  ): Promise<void> {
    if (changes.language !== undefined && principal.tenantId) {
      const school = await this.tenants.findById(principal.tenantId);
      if (school && !school.languages.includes(changes.language)) {
        throw new AppException({
          code: PROFILE_ERROR_CODES.PREFERENCE_INVALID,
          message: `Your school does not offer that language. Available: ${school.languages.join(', ')}.`,
          status: 400,
        });
      }
    }

    await this.profiles.savePreferences(principal.userId, {
      ...(changes.language !== undefined ? { language: changes.language } : {}),
      ...(changes.appearance !== undefined
        ? { appearance: changes.appearance }
        : {}),
      ...(changes.notificationPreferences !== undefined
        ? { notificationPreferences: changes.notificationPreferences }
        : {}),
    });
  }

  async changePassword(
    principal: AuthPrincipal,
    request: ChangePasswordDto,
  ): Promise<void> {
    if (!this.prisma) throw new Error('Database is not available');

    const identity = await this.prisma.userIdentity.findUnique({
      where: { id: principal.userId },
      select: { passwordHash: true },
    });

    const matches =
      identity?.passwordHash != null &&
      (await bcrypt.compare(request.currentPassword, identity.passwordHash));

    if (!matches) {
      throw new AppException({
        code: PROFILE_ERROR_CODES.CURRENT_PASSWORD_INCORRECT,
        message: 'Your current password is incorrect.',
        status: 401,
      });
    }

    await this.prisma.userIdentity.update({
      where: { id: principal.userId },
      data: { passwordHash: await bcrypt.hash(request.newPassword, 12) },
    });

    await this.prisma.securityEvent.create({
      data: { userIdentityId: principal.userId, eventType: 'PASSWORD_CHANGED' },
    });
  }

  async listSessions(principal: AuthPrincipal, currentTokenHash?: string) {
    const sessions = await this.profiles.findActiveSessions(principal.userId);
    return sessions.map((session) => ({
      id: session.id,
      createdAt: session.createdAt.toISOString(),
      lastUsedAt: session.lastUsedAt?.toISOString() ?? null,
      expiresAt: session.expiresAt.toISOString(),
      isCurrent:
        currentTokenHash !== undefined && session.id === currentTokenHash,
    }));
  }

  async getActivity(principal: AuthPrincipal) {
    const events = await this.profiles.findRecentActivity(principal.userId);
    return events.map((event) => ({
      eventType: event.eventType,
      occurredAt: event.occurredAt.toISOString(),
      // Coarse only. The stored ipHash never leaves the server (FR-012).
      device: ProfileService.describeUserAgent(event.userAgent),
    }));
  }

  /**
   * Who creates this kind of account, per the provisioning model: the platform
   * registers schools, a school creates its staff and learners, and creating a
   * learner brings their guardian's account into being.
   */
  private static provisionedBy(roleKey: string): string {
    if (roleKey === 'PLATFORM_SUPER_ADMIN') return 'CampusOne platform';
    if (roleKey === 'PARENT_GUARDIAN')
      return 'Created automatically when your child was enrolled';
    if (roleKey === 'STUDENT') return 'Your school office';
    return 'Your school administrator';
  }

  private static initialsOf(givenName: string, familyName: string): string {
    return `${givenName.charAt(0)}${familyName.charAt(0)}`.toUpperCase();
  }

  private static notEditableMessage(roleKey: string, field: string): string {
    const tier = editabilityFor(roleKey)[field];
    if (tier === EDITABILITY.SCHOOL_MANAGED) {
      return 'That detail is maintained by your school. Contact your school administrator to request a correction.';
    }
    if (tier === EDITABILITY.APPROVAL || tier === EDITABILITY.VERIFICATION) {
      return 'That detail needs approval before it can change. Contact your school administrator to request a correction.';
    }
    return 'That detail cannot be changed here.';
  }

  /** Enough to recognise a device, not enough to fingerprint one. */
  private static describeUserAgent(userAgent: string | null): string {
    if (!userAgent) return 'Unknown device';
    if (/mobile|android|iphone/i.test(userAgent)) return 'Mobile browser';
    if (/curl|wget|postman/i.test(userAgent)) return 'API client';
    if (/edg\//i.test(userAgent)) return 'Edge on desktop';
    if (/chrome/i.test(userAgent)) return 'Chrome on desktop';
    if (/safari/i.test(userAgent)) return 'Safari on desktop';
    if (/firefox/i.test(userAgent)) return 'Firefox on desktop';
    return 'Desktop browser';
  }
}
