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
        photoReference: true,
      },
    });
  }

  async findContact(
    userId: string,
  ): Promise<{ email: string; phone: string | null } | null> {
    return this.db.userIdentity.findUnique({
      where: { id: userId },
      select: { email: true, phone: true },
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

  async findPasswordChangedAt(userId: string): Promise<Date | null> {
    const row = await this.db.userIdentity.findUnique({
      where: { id: userId },
      select: { updatedAt: true },
    });
    return row?.updatedAt ?? null;
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
