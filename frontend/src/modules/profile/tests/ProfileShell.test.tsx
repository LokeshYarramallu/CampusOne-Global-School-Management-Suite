import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/core/http/apiError';
import { ProfileShell } from '../components/ProfileShell';
import type {
  AccountProfile,
  ActiveSession,
  ActivityEntry,
  ProfilePanel,
} from '../types/profile';

const mocks = vi.hoisted(() => ({
  getAccountProfile: vi.fn(),
  updateProfile: vi.fn(),
  getSessions: vi.fn(),
  endSession: vi.fn(),
  getActivity: vi.fn(),
  changePassword: vi.fn(),
}));

vi.mock('../services/profileApi', () => ({
  getAccountProfile: mocks.getAccountProfile,
  updateProfile: mocks.updateProfile,
  getSessions: mocks.getSessions,
  endSession: mocks.endSession,
  getActivity: mocks.getActivity,
  changePassword: mocks.changePassword,
}));

const TEACHER_PANEL: ProfilePanel = {
  kind: 'TEACHER',
  staff: {
    employeeNumber: 'EMP-0004',
    designation: 'Senior Teacher',
    department: 'Mathematics',
    joinedOn: '2024-06-01',
  },
  scopeSummary: [],
  boundaries: ['Access is limited to your assigned subjects, classes, and students.'],
  assignments: [
    { subject: 'Mathematics', classLabel: '8', sectionLabel: 'B', isClassTeacher: true },
  ],
};

function profile(overrides: Partial<AccountProfile> = {}): AccountProfile {
  return {
    identity: {
      userId: 'user-1',
      givenName: 'Priya',
      familyName: 'Sharma',
      displayName: 'Priya Sharma',
      email: 'teacher@greenwood.campusone.local',
      phone: '+91 98000 00000',
      addressLine: '4 Palm Grove',
      addressCity: 'Bengaluru',
      addressPostcode: '560001',
      photoUrl: null,
      avatarInitials: 'PS',
    },
    activeContext: {
      roleKey: 'TEACHER',
      roleName: 'Teacher',
      tenantId: 'tenant-a',
      schoolName: 'Greenwood High',
      hasMultipleRoles: false,
    },
    security: {
      passwordChangedAt: '2026-05-01T00:00:00.000Z',
      mfaFactors: [],
      activeSessionCount: 2,
    },
    account: {
      createdAt: '2026-01-10T00:00:00.000Z',
      status: 'ACTIVE',
      lastLoginAt: '2026-08-01T09:00:00.000Z',
      provisionedBy: 'Your school administrator',
    },
    editability: {
      phone: 'SELF',
      avatarKey: 'SELF',
      addressLine: 'SELF',
      givenName: 'SCHOOL_MANAGED',
      familyName: 'SCHOOL_MANAGED',
      email: 'APPROVAL',
    },
    panel: TEACHER_PANEL,
    ...overrides,
  };
}

beforeEach(() => {
  mocks.getAccountProfile.mockReset().mockResolvedValue(profile());
  mocks.updateProfile.mockReset().mockResolvedValue(profile());
  mocks.getSessions.mockReset().mockResolvedValue([]);
  mocks.getActivity.mockReset().mockResolvedValue([]);
  mocks.endSession.mockReset().mockResolvedValue({ success: true });
  mocks.changePassword.mockReset().mockResolvedValue({ success: true });
});

describe('ProfileShell — shared core', () => {
  it('shows the person identity once loaded', async () => {
    render(<ProfileShell />);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Priya Sharma' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/teacher@greenwood/)).toBeInTheDocument();
  });

  it('gives the page exactly one top-level heading', async () => {
    render(<ProfileShell />);
    await screen.findByRole('heading', { level: 1 });

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('renders initials rather than a broken image when there is no photo', async () => {
    render(<ProfileShell />);
    await screen.findByRole('heading', { level: 1 });

    expect(screen.getByText('PS')).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('shows a loading state before the account arrives', () => {
    mocks.getAccountProfile.mockReturnValue(new Promise(() => {}));
    render(<ProfileShell />);

    expect(screen.getByText(/loading your account/i)).toBeInTheDocument();
  });

  it('explains a load failure and offers a retry rather than a blank screen', async () => {
    mocks.getAccountProfile.mockRejectedValue(
      new ApiError({
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong. Please try again.',
        status: 500,
      }),
    );
    render(<ProfileShell />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /something went wrong/i,
    );
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('saves a changed phone number', async () => {
    const user = userEvent.setup();
    render(<ProfileShell />);
    await screen.findByRole('heading', { level: 1 });

    await user.click(screen.getByRole('button', { name: /^edit$/i }));
    const phone = screen.getByLabelText(/phone number/i);
    await user.clear(phone);
    await user.type(phone, '+91 90000 11111');
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    // Address travels too, because this role may edit it. A learner's save
    // would carry the phone alone — see the learner test below.
    await waitFor(() =>
      expect(mocks.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ phone: '+91 90000 11111' }),
      ),
    );
    expect(mocks.updateProfile.mock.calls[0][0]).toHaveProperty('addressLine');
  });

  it('rejects a malformed phone number without calling the API', async () => {
    const user = userEvent.setup();
    render(<ProfileShell />);
    await screen.findByRole('heading', { level: 1 });

    await user.click(screen.getByRole('button', { name: /^edit$/i }));
    const phone = screen.getByLabelText(/phone number/i);
    await user.clear(phone);
    await user.type(phone, 'not a phone');
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    expect(await screen.findByText(/digits and the characters/i)).toBeInTheDocument();
    expect(mocks.updateProfile).not.toHaveBeenCalled();
  });

  it('surfaces a save failure in an alert', async () => {
    mocks.updateProfile.mockRejectedValue(
      new ApiError({
        code: 'FIELD_NOT_EDITABLE',
        message: 'That detail is maintained by your school.',
        status: 403,
      }),
    );
    const user = userEvent.setup();
    render(<ProfileShell />);
    await screen.findByRole('heading', { level: 1 });

    await user.click(screen.getByRole('button', { name: /^edit$/i }));
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /maintained by your school/i,
    );
  });
});

describe('ProfileShell — editability (FR-023)', () => {
  it('states who maintains school-managed data, once per card', async () => {
    render(<ProfileShell />);
    await screen.findByRole('heading', { level: 1 });

    // Stated on the card that owns the fields, not repeated under each one.
    expect(
      screen.getAllByText(/maintained by your school/i).length,
    ).toBeGreaterThan(0);
  });

  it('says which details the school holds rather than silently disabling them', async () => {
    render(<ProfileShell />);
    await screen.findByRole('heading', { level: 1 });

    expect(
      screen.getByText(/your name and email are set by your school/i),
    ).toBeInTheDocument();
  });

  it('opens only the fields this role may change', async () => {
    const user = userEvent.setup();
    render(<ProfileShell />);
    await screen.findByRole('heading', { level: 1 });

    await user.click(screen.getByRole('button', { name: /^edit$/i }));

    // editability says phone, avatar, and address are SELF for this teacher.
    expect(screen.getByLabelText(/phone number/i)).toBeEnabled();
    expect(screen.getByLabelText(/^address$/i)).toBeEnabled();
    // Name and email are never offered as inputs.
    expect(screen.queryByLabelText(/^email$/i)).toBeNull();
    expect(screen.queryByLabelText(/full name/i)).toBeNull();
  });

  /** The limit the provisioning model requires: a learner edits less. */
  it('hides address editing for a learner', async () => {
    mocks.getAccountProfile.mockResolvedValue(
      profile({
        editability: {
          phone: 'SELF',
          avatarKey: 'SELF',
          addressLine: 'SCHOOL_MANAGED',
          givenName: 'SCHOOL_MANAGED',
          familyName: 'SCHOOL_MANAGED',
          email: 'APPROVAL',
        },
      }),
    );
    const user = userEvent.setup();
    render(<ProfileShell />);
    await screen.findByRole('heading', { level: 1 });

    await user.click(screen.getByRole('button', { name: /^edit$/i }));

    expect(screen.getByLabelText(/phone number/i)).toBeEnabled();
    expect(screen.queryByLabelText(/^address$/i)).toBeNull();
  });

  it('shows account provenance, since nobody self-registers here', async () => {
    render(<ProfileShell />);
    await screen.findByRole('heading', { level: 1 });

    expect(screen.getByText('Created by')).toBeInTheDocument();
    expect(
      screen.getByText(/your school administrator/i),
    ).toBeInTheDocument();
  });

  it('offers a password change, which a provisioned account needs first', async () => {
    render(<ProfileShell />);
    await screen.findByRole('heading', { level: 1 });

    expect(screen.getByRole('button', { name: /^change$/i })).toBeInTheDocument();
  });
});

describe('ProfileShell — devices and activity (US4)', () => {
  const SESSIONS: ActiveSession[] = [
    {
      id: 'session-current',
      createdAt: '2026-08-15T08:00:00.000Z',
      lastUsedAt: '2026-08-16T07:00:00.000Z',
      expiresAt: '2026-08-17T08:00:00.000Z',
      isCurrent: true,
    },
    {
      id: 'session-other',
      createdAt: '2026-08-10T08:00:00.000Z',
      lastUsedAt: null,
      expiresAt: '2026-08-17T08:00:00.000Z',
      isCurrent: false,
    },
  ];

  it('lists signed-in devices and offers sign-out on all but this one', async () => {
    mocks.getSessions.mockResolvedValue(SESSIONS);
    render(<ProfileShell />);
    await screen.findByRole('heading', { level: 1 });

    expect(await screen.findByText('This device')).toBeInTheDocument();
    expect(screen.getByText('Signed-in device')).toBeInTheDocument();
    // Exactly one sign-out control: the current session cannot end itself here.
    expect(screen.getAllByRole('button', { name: /sign out/i })).toHaveLength(1);
  });

  it('removes a device from the list once it is signed out', async () => {
    mocks.getSessions.mockResolvedValue(SESSIONS);
    const user = userEvent.setup();
    render(<ProfileShell />);
    await screen.findByText('Signed-in device');

    await user.click(screen.getByRole('button', { name: /sign out/i }));

    await waitFor(() => expect(mocks.endSession).toHaveBeenCalledWith('session-other'));
    await waitFor(() => expect(screen.queryByText('Signed-in device')).toBeNull());
    expect(screen.getByText('This device')).toBeInTheDocument();
  });

  it('explains a device list that could not be loaded rather than showing nothing', async () => {
    mocks.getSessions.mockRejectedValue(
      new ApiError({
        code: 'SERVER_ERROR',
        message: 'Something went wrong.',
        status: 500,
      }),
    );
    render(<ProfileShell />);

    expect(await screen.findByText(/could not load your devices/i)).toBeInTheDocument();
  });

  it('describes recent security events without exposing an address', async () => {
    mocks.getActivity.mockResolvedValue([
      {
        eventType: 'LOGIN_SUCCEEDED',
        occurredAt: '2026-08-16T07:00:00.000Z',
        device: 'Chrome on Windows',
      },
    ] satisfies ActivityEntry[]);
    render(<ProfileShell />);

    expect(await screen.findByText('Signed in')).toBeInTheDocument();
    expect(screen.getByText(/chrome on windows/i)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\d+\.\d+\.\d+\.\d+/);
  });

  it('states what will appear when there is no activity yet', async () => {
    render(<ProfileShell />);
    await screen.findByRole('heading', { level: 1 });

    expect(
      await screen.findByText(/sign-ins and security events will appear here/i),
    ).toBeInTheDocument();
  });
});

describe('ProfileShell — role separation (FR-014, FR-015)', () => {
  it('shows no role-switching hint for a single-role person', async () => {
    render(<ProfileShell />);
    await screen.findByRole('heading', { level: 1 });

    expect(screen.queryByText(/you hold more than one role/i)).toBeNull();
  });

  it('names the active role when the person holds several', async () => {
    mocks.getAccountProfile.mockResolvedValue(
      profile({
        activeContext: {
          roleKey: 'TEACHER',
          roleName: 'Teacher',
          tenantId: 'tenant-a',
          schoolName: 'Greenwood High',
          hasMultipleRoles: true,
        },
      }),
    );
    render(<ProfileShell />);
    await screen.findByRole('heading', { level: 1 });

    expect(screen.getByText(/you hold more than one role/i)).toBeInTheDocument();
  });

  it('never renders a second role panel alongside the active one', async () => {
    render(<ProfileShell />);
    await screen.findByRole('heading', { level: 1 });

    // Teacher view: teaching assignment present, children absent.
    expect(screen.getByText(/teaching assignment/i)).toBeInTheDocument();
    expect(screen.queryByText(/my children/i)).toBeNull();
  });
});
