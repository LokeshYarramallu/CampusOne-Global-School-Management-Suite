import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/core/http/apiError';
import { ProfileShell } from '../components/ProfileShell';
import type { AccountProfile, ProfilePanel } from '../types/profile';

const mocks = vi.hoisted(() => ({
  getAccountProfile: vi.fn(),
  updateProfile: vi.fn(),
}));

vi.mock('../services/profileApi', () => ({
  getAccountProfile: mocks.getAccountProfile,
  updateProfile: mocks.updateProfile,
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
    editability: {
      phone: 'SELF',
      givenName: 'APPROVAL',
      familyName: 'APPROVAL',
      email: 'APPROVAL',
    },
    panel: TEACHER_PANEL,
    ...overrides,
  };
}

beforeEach(() => {
  mocks.getAccountProfile.mockReset().mockResolvedValue(profile());
  mocks.updateProfile.mockReset().mockResolvedValue(profile());
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

    const phone = screen.getByLabelText(/phone number/i);
    await user.clear(phone);
    await user.type(phone, '+91 90000 11111');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() =>
      expect(mocks.updateProfile).toHaveBeenCalledWith({
        phone: '+91 90000 11111',
      }),
    );
  });

  it('rejects a malformed phone number without calling the API', async () => {
    const user = userEvent.setup();
    render(<ProfileShell />);
    await screen.findByRole('heading', { level: 1 });

    const phone = screen.getByLabelText(/phone number/i);
    await user.clear(phone);
    await user.type(phone, 'not a phone');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

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

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /maintained by your school/i,
    );
  });
});

describe('ProfileShell — editability (FR-023)', () => {
  it('explains who manages a field the person cannot edit', async () => {
    render(<ProfileShell />);
    await screen.findByRole('heading', { level: 1 });

    const explanations = screen.getAllByText(/school administrator/i);
    expect(explanations.length).toBeGreaterThan(0);
  });

  it('leaves no non-editable field without an explanation', async () => {
    render(<ProfileShell />);
    await screen.findByRole('heading', { level: 1 });

    // Name and email are approval-gated; each must carry a reason.
    const nameTerm = screen.getByText('Full name').closest('div');
    const emailTerm = screen.getByText('Email address').closest('div');
    expect(nameTerm?.textContent).toMatch(/approval|administrator/i);
    expect(emailTerm?.textContent).toMatch(/approval|administrator/i);
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
