import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/core/http/apiError';
import { LoginForm } from '../components/LoginForm';
import { REDIRECT_DELAY_MS } from '../constants';

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));

vi.mock('../services/authApi', () => ({ login: mocks.login }));

const VALID_EMAIL = 'platform-admin@campusone.local';
const VALID_PASSWORD = 'CampusOneAdmin!2026';

/**
 * Real timers throughout. `userEvent` schedules its own timers between
 * keystrokes and deadlocks against `vi.useFakeTimers()`, so the redirect delay
 * is waited out rather than fast-forwarded.
 */
function setup() {
  const user = userEvent.setup();
  const { unmount } = render(<LoginForm />);
  return {
    user,
    unmount,
    emailField: screen.getByLabelText(/email address/i),
    passwordField: screen.getByLabelText(/^password$/i),
  };
}

/**
 * The redirect is scheduled for REDIRECT_DELAY_MS; the slack on top absorbs a
 * loaded machine running the suite's files in parallel. A multiple of the delay
 * looked tighter but only held on an idle host.
 */
const REDIRECT_TIMEOUT = REDIRECT_DELAY_MS + 4000;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function signIn(
  user: ReturnType<typeof userEvent.setup>,
  email = VALID_EMAIL,
  password = VALID_PASSWORD,
) {
  await user.type(screen.getByLabelText(/email address/i), email);
  await user.type(screen.getByLabelText(/^password$/i), password);
  await user.click(screen.getByRole('button', { name: /sign in/i }));
}

beforeEach(() => {
  mocks.login.mockReset().mockResolvedValue({
    user: {},
    expiresInSeconds: 3600,
  });
  mocks.push.mockReset();
  mocks.refresh.mockReset();
});

describe('LoginForm — successful sign-in', () => {
  it('submits the credentials and redirects to the dashboard', async () => {
    const { user } = setup();

    await signIn(user);

    await waitFor(() =>
      expect(mocks.login).toHaveBeenCalledWith(VALID_EMAIL, VALID_PASSWORD),
    );
    expect(mocks.push).not.toHaveBeenCalled();

    await waitFor(
      () => expect(mocks.push).toHaveBeenCalledWith('/dashboard'),
      { timeout: REDIRECT_TIMEOUT },
    );
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it('trims surrounding whitespace from the email', async () => {
    const { user } = setup();

    await signIn(user, `  ${VALID_EMAIL}  `);

    await waitFor(() =>
      expect(mocks.login).toHaveBeenCalledWith(VALID_EMAIL, VALID_PASSWORD),
    );
  });

  /**
   * Regression: the submit handler's `finally` block read a stale `isSuccess`
   * from its own closure and re-enabled the button, leaving a live window in
   * which a second click opened a second session.
   */
  it('stays disabled between success and the redirect', async () => {
    const { user } = setup();

    await signIn(user);

    const button = await screen.findByRole('button', {
      name: /workspace ready/i,
    });
    expect(button).toBeDisabled();

    await user.click(button);

    expect(mocks.login).toHaveBeenCalledTimes(1);
  });

  /** The pending redirect must not fire against a router the page has left. */
  it('does not redirect after the form unmounts', async () => {
    const { user, unmount } = setup();

    await signIn(user);
    await waitFor(() => expect(mocks.login).toHaveBeenCalled());
    unmount();

    await wait(REDIRECT_TIMEOUT);

    expect(mocks.push).not.toHaveBeenCalled();
  });
});

describe('LoginForm — client-side validation', () => {
  it('rejects a malformed email without calling the API', async () => {
    const { user } = setup();

    await signIn(user, 'not-an-email');

    expect(await screen.findByText(/valid email address/i)).toBeInTheDocument();
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it('rejects a password below the API minimum without calling the API', async () => {
    const { user } = setup();

    await signIn(user, VALID_EMAIL, 'short');

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it('marks the invalid field for assistive technology', async () => {
    const { user, emailField } = setup();

    await signIn(user, 'not-an-email');

    await waitFor(() => expect(emailField).toHaveAttribute('aria-invalid', 'true'));
    const describedBy = emailField.getAttribute('aria-describedby');
    expect(describedBy).toBe('email-error');
    expect(document.getElementById(describedBy!)).toHaveTextContent(
      /valid email address/i,
    );
  });
});

describe('LoginForm — server errors', () => {
  it('shows the message the API sent for bad credentials', async () => {
    mocks.login.mockRejectedValue(
      new ApiError({
        code: 'INVALID_CREDENTIALS',
        message: 'The email or password is incorrect.',
        status: 401,
      }),
    );
    const { user } = setup();

    await signIn(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The email or password is incorrect.',
    );
  });

  it('shows the lockout message rather than a generic failure', async () => {
    mocks.login.mockRejectedValue(
      new ApiError({
        code: 'ACCOUNT_LOCKED',
        message:
          'Too many failed sign-in attempts. Try again in 15 minutes, or contact your school administrator.',
        status: 401,
      }),
    );
    const { user } = setup();

    await signIn(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(/try again in 15 minutes/i);
  });

  it('shows the throttling message when the API rate limits the attempt', async () => {
    mocks.login.mockRejectedValue(
      new ApiError({
        code: 'RATE_LIMITED',
        message: 'Too many attempts. Please wait a moment and try again.',
        status: 429,
      }),
    );
    const { user } = setup();

    await signIn(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(/too many attempts/i);
  });

  it('attaches server field messages to the field that produced them', async () => {
    mocks.login.mockRejectedValue(
      new ApiError({
        code: 'VALIDATION_FAILED',
        message: 'The submitted data is not valid.',
        status: 400,
        details: ['password must be longer than or equal to 8 characters'],
      }),
    );
    const { user, passwordField } = setup();

    await signIn(user);

    expect(
      await screen.findByText(/password must be longer than or equal to 8/i),
    ).toBeInTheDocument();
    expect(passwordField).toHaveAttribute('aria-invalid', 'true');
    // The generic envelope message is not what the user sees on the field.
    expect(screen.queryByText('The submitted data is not valid.')).toBeNull();
  });

  it('falls back to a plain message for a non-API failure', async () => {
    mocks.login.mockRejectedValue(new Error('boom'));
    const { user } = setup();

    await signIn(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /could not sign you in/i,
    );
  });

  it('moves focus to the error so a keyboard user lands on it', async () => {
    mocks.login.mockRejectedValue(
      new ApiError({
        code: 'INVALID_CREDENTIALS',
        message: 'The email or password is incorrect.',
        status: 401,
      }),
    );
    const { user } = setup();

    await signIn(user);

    await waitFor(() => expect(screen.getByRole('alert')).toHaveFocus());
  });

  it('re-enables the form so the attempt can be retried', async () => {
    mocks.login.mockRejectedValue(
      new ApiError({
        code: 'INVALID_CREDENTIALS',
        message: 'The email or password is incorrect.',
        status: 401,
      }),
    );
    const { user } = setup();

    await signIn(user);
    await screen.findByRole('alert');

    expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled();
    expect(screen.getByLabelText(/email address/i)).toBeEnabled();
  });

  it('dismisses the error when asked', async () => {
    mocks.login.mockRejectedValue(
      new ApiError({
        code: 'INVALID_CREDENTIALS',
        message: 'The email or password is incorrect.',
        status: 401,
      }),
    );
    const { user } = setup();

    await signIn(user);
    await user.click(await screen.findByRole('button', { name: /dismiss/i }));

    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('LoginForm — accessibility and disclosure', () => {
  it('gives the page exactly one top-level heading', () => {
    setup();

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Welcome back');
  });

  it('toggles password visibility without exposing it by default', async () => {
    const { user, passwordField } = setup();

    expect(passwordField).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: /show password/i }));
    expect(passwordField).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: /hide password/i }));
    expect(passwordField).toHaveAttribute('type', 'password');
  });

  it('marks the form busy while the request is in flight', async () => {
    let resolveLogin: (value: unknown) => void = () => {};
    mocks.login.mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve;
      }),
    );
    const { user } = setup();

    await signIn(user);

    const form = document.querySelector('form');
    await waitFor(() => expect(form).toHaveAttribute('aria-busy', 'true'));

    resolveLogin({ user: {}, expiresInSeconds: 3600 });
  });

  it('never renders the demo account password', () => {
    setup();

    expect(screen.queryByText(/CampusOneAdmin/)).toBeNull();
    expect(document.body.textContent).not.toMatch(/CampusOneAdmin/);
  });

  it('offers the demo email and says where the password lives', async () => {
    const { user, emailField } = setup();

    expect(screen.getByText(/never sent to the browser/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /fill the demo email/i }));

    expect(emailField).toHaveValue(VALID_EMAIL);
  });
});
