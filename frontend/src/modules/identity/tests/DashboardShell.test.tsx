import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/core/http/apiError';
import { DashboardShell } from '../components/DashboardShell';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  logout: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock('../services/authApi', () => ({
  getCurrentUser: mocks.getCurrentUser,
  logout: mocks.logout,
}));

beforeEach(() => {
  mocks.getCurrentUser.mockReset().mockResolvedValue({
    id: 'user-1',
    email: 'platform-admin@campusone.local',
    roleKey: 'PLATFORM_SUPER_ADMIN',
    roleName: 'Platform Super Admin',
  });
  mocks.logout.mockReset();
  mocks.replace.mockReset();
});

describe('DashboardShell', () => {
  it('names the signed-in person and their role', async () => {
    render(<DashboardShell />);

    expect(await screen.findByText('platform-admin@campusone.local')).toBeInTheDocument();
    expect(screen.getByText('Platform Super Admin')).toBeInTheDocument();
  });

  /**
   * Regression: the calendar shipped with no inbound link and the sign-in
   * redirect was repointed at it to compensate, which broke the redirect
   * contract. Every built surface is reachable from here until a shared
   * navigation chrome exists.
   */
  it.each([
    ['Calendar', '/calendar'],
    ['Your account', '/profile'],
  ])('links to %s', async (name, href) => {
    render(<DashboardShell />);
    await screen.findByRole('navigation', { name: /workspace/i });

    expect(screen.getByRole('link', { name: new RegExp(name, 'i') })).toHaveAttribute(
      'href',
      href,
    );
  });

  it('shows a loading state rather than an empty page', () => {
    render(<DashboardShell />);

    expect(screen.getByText(/loading your workspace/i)).toBeInTheDocument();
  });

  it('returns an unauthenticated visitor to sign-in', async () => {
    mocks.getCurrentUser.mockRejectedValue(
      new ApiError({ code: 'UNAUTHENTICATED', message: 'No session.', status: 401 }),
    );
    render(<DashboardShell />);

    await vi.waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/login'));
  });
});
