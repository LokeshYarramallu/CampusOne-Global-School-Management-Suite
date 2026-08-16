import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { ACTIVITY_WINDOW_LIMIT } from '../profile.constants';

/**
 * Identity-level reads and writes.
 *
 * These tables belong to the person, not to a school, so they carry no
 * `tenant_id` and no row-level policy — and therefore do not go through
 * `TenantScopedPrisma`. A parent with children at three schools is one person
 * with one name (PRD §5.3).
 */

export interface PersonProfileRow {
  givenName: string;
  familyName: string;
  displayName: string | null;
  addressLine: string | null;
  addressCity: string | null;
  addressPostcode: string | null;
  photoReference: string | null;
}

export interface PersonPreferenceRow {
  language: string;
  appearance: string;
  notificationPreferences: unknown;
}

export interface SecurityActivityRow {
  eventType: string;
  occurredAt: Date;
  userAgent: string | null;
}

export interface ActiveSessionRow {
  id: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date;
}

@Injectable()
export class UserProfileRepository {
  constructor(@Optional() private readonly prisma?: PrismaService) {}

  private get db(): PrismaService {
    if (!this.prisma) throw new Error('Database is not available');
    return this.prisma;
  }

  async findProfile(userId: string): Promise<PersonProfileRow | null> {
    return this.db.userProfile.findUnique({
      where: { userIdentityId: userId },
      select: {
        givenName: true,
        familyName: true,
        displayName: true,
        addressLine: true,
        addressCity: true,
        addressPostcode: true,
        photoReference: true,
      },
    });
  }

  /**
   * Contact details and the password timestamp in one query — they live on the
   * same row, and the account page needs both. Two round trips for one row is
   * exactly the kind of avoidable load that turns into pool pressure.
   */
  async findContact(userId: string): Promise<{
    email: string;
    phone: string | null;
    updatedAt: Date;
  } | null> {
    return this.db.userIdentity.findUnique({
      where: { id: userId },
      select: { email: true, phone: true, updatedAt: true },
    });
  }

  async updateAddress(
    userId: string,
    address: Partial<{
      addressLine: string;
      addressCity: string;
      addressPostcode: string;
    }>,
  ): Promise<void> {
    await this.db.userProfile.update({
      where: { userIdentityId: userId },
      data: address,
    });
  }

  async updatePhoto(userId: string, photoReference: string): Promise<void> {
    await this.db.userProfile.update({
      where: { userIdentityId: userId },
      data: { photoReference },
    });
  }

  /**
   * Account provenance. Accounts are provisioned from above — the platform
   * creates a school, the school creates staff and learners, and a learner's
   * record creates the guardian's account. Nobody self-registers, so "when was
   * this account made, and is it active" is information the holder cannot get
   * anywhere else.
   */
  async findAccountMeta(userId: string): Promise<{
    createdAt: Date;
    status: string;
    lastLoginAt: Date | null;
  } | null> {
    return this.db.userIdentity.findUnique({
      where: { id: userId },
      select: { createdAt: true, status: true, lastLoginAt: true },
    });
  }

  async updatePhone(userId: string, phone: string): Promise<void> {
    await this.db.userIdentity.update({
      where: { id: userId },
      data: { phone },
    });
  }

  async findPreferences(userId: string): Promise<PersonPreferenceRow | null> {
    return this.db.userPreference.findUnique({
      where: { userIdentityId: userId },
      select: {
        language: true,
        appearance: true,
        notificationPreferences: true,
      },
    });
  }

  /** Upsert: a person seeded before preferences existed still gets defaults. */
  async savePreferences(
    userId: string,
    values: Partial<{
      language: string;
      appearance: string;
      notificationPreferences: object;
    }>,
  ): Promise<void> {
    await this.db.userPreference.upsert({
      where: { userIdentityId: userId },
      update: values,
      create: { userIdentityId: userId, ...values },
    });
  }

  async findActiveSessions(userId: string): Promise<ActiveSessionRow[]> {
    return this.db.authSession.findMany({
      where: {
        userIdentityId: userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true, createdAt: true, lastUsedAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * `ipHash` is deliberately not selected. It is a keyed hash rather than a raw
   * address, but it is still a correlation handle and the page has no use for
   * it (FR-012).
   */
  async findRecentActivity(userId: string): Promise<SecurityActivityRow[]> {
    return this.db.securityEvent.findMany({
      where: { userIdentityId: userId },
      select: { eventType: true, occurredAt: true, userAgent: true },
      orderBy: { occurredAt: 'desc' },
      take: ACTIVITY_WINDOW_LIMIT,
    });
  }

  async findMfaFactors(
    userId: string,
  ): Promise<Array<{ factorType: string; verified: boolean }>> {
    const factors = await this.db.mfaFactor.findMany({
      where: { userIdentityId: userId, disabledAt: null },
      select: { factorType: true, verifiedAt: true },
    });
    return factors.map((factor) => ({
      factorType: factor.factorType,
      verified: factor.verifiedAt !== null,
    }));
  }

  async countRoleAssignments(userId: string): Promise<number> {
    return this.db.roleAssignment.count({ where: { userId } });
  }
}
