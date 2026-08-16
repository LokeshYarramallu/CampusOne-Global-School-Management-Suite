/** The account page payload. Mirrors the backend contract in specs/002. */

export type Editability =
  | 'SELF'
  | 'VERIFICATION'
  | 'APPROVAL'
  | 'SCHOOL_MANAGED';

export interface StaffRecord {
  employeeNumber: string;
  designation: string;
  department: string | null;
  joinedOn: string;
}

export interface TeachingAssignment {
  subject: string;
  classLabel: string;
  sectionLabel: string;
  isClassTeacher: boolean;
}

export interface LinkedChild {
  name: string;
  relationship: string;
  classLabel: string | null;
  sectionLabel: string | null;
  isPrimaryContact: boolean;
  hasBillingResponsibility: boolean;
}

export interface LinkedSchool {
  schoolId: string;
  schoolName: string;
  children: LinkedChild[];
}

/**
 * A discriminated union: exactly one panel arrives per request, chosen
 * server-side from the active role. The client never picks.
 */
export type ProfilePanel =
  | { kind: 'PLATFORM'; scopeNote: string; auditNote: string }
  | {
      kind: 'STAFF';
      staff: StaffRecord | null;
      scopeSummary: string[];
      boundaries: string[];
      emptyReason?: string;
    }
  | {
      kind: 'TEACHER';
      staff: StaffRecord | null;
      scopeSummary: string[];
      boundaries: string[];
      assignments: TeachingAssignment[];
      emptyReason?: string;
    }
  | {
      kind: 'STUDENT';
      enrollment: {
        admissionNumber: string;
        classLabel: string;
        sectionLabel: string;
        rollNumber: string | null;
        admittedOn: string;
      } | null;
      guardians: Array<{ name: string; relationship: string }>;
      emptyReason?: string;
    }
  | { kind: 'PARENT'; schools: LinkedSchool[]; emptyReason?: string }
  | { kind: 'UNAVAILABLE'; reason: string };

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
  /**
   * Server-computed **per role**, so the read-only affordance cannot drift
   * from what the API accepts. A learner's map differs from their parent's.
   */
  editability: Record<string, Editability>;
  panel: ProfilePanel;
}

export interface Preferences {
  language: string;
  appearance: string;
  notificationPreferences: Record<string, unknown>;
}

export interface ActiveSession {
  id: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
  isCurrent: boolean;
}

export interface ActivityEntry {
  eventType: string;
  occurredAt: string;
  device: string;
}
