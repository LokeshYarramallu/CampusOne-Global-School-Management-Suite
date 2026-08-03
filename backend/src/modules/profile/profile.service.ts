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
  FIELD_EDITABILITY,
  PROFILE_ERROR_CODES,
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
    const [
      profile,
      contact,
      sessions,
      mfaFactors,
      passwordChangedAt,
      roleCount,
    ] = await Promise.all([
      this.profiles.findProfile(principal.userId),
      this.profiles.findContact(principal.userId),
      this.profiles.findActiveSessions(principal.userId),
      this.profiles.findMfaFactors(principal.userId),
      this.profiles.findPasswordChangedAt(principal.userId),
      this.profiles.countRoleAssignments(principal.userId),
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

    const school = principal.tenantId
      ? await this.tenants.findById(principal.tenantId)
      : null;

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
        // Always null: photo upload is deferred until file storage exists
        // (research R2). The column is present so no migration is needed then.
        photoUrl: null,
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
        passwordChangedAt: passwordChangedAt?.toISOString() ?? null,
        mfaFactors,
        activeSessionCount: sessions.length,
      },
      editability: FIELD_EDITABILITY,
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
    for (const field of Object.keys(changes)) {
      if (!isSelfEditable(field)) {
        throw new AppException({
          code: PROFILE_ERROR_CODES.FIELD_NOT_EDITABLE,
          message: ProfileService.notEditableMessage(field),
          status: 403,
        });
      }
    }

    if (changes.phone !== undefined) {
      await this.profiles.updatePhone(principal.userId, changes.phone.trim());
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

  private static initialsOf(givenName: string, familyName: string): string {
    return `${givenName.charAt(0)}${familyName.charAt(0)}`.toUpperCase();
  }

  private static notEditableMessage(field: string): string {
    const tier = FIELD_EDITABILITY[field];
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
