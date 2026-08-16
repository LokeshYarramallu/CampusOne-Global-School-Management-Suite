import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { SESSION_COOKIE_NAME } from '@/core/http/session';
import { config, proxy } from '@/proxy';

/**
 * Cross-module: the proxy steers every feature route, so a new page that
 * forgets to enrol here is served to signed-out visitors. `/calendar` did.
 */
function request(path: string, signedIn = false): NextRequest {
  const req = new NextRequest(`https://campusone.local${path}`);
  if (signedIn) req.cookies.set(SESSION_COOKIE_NAME, 'session-token');
  return req;
}

function locationOf(path: string, signedIn = false): string | null {
  return proxy(request(path, signedIn)).headers.get('location');
}

const PROTECTED = ['/dashboard', '/profile', '/calendar'];

describe('proxy — protected routes', () => {
  it.each(PROTECTED)('sends a signed-out visitor from %s to sign-in', (path) => {
    expect(locationOf(path)).toBe('https://campusone.local/login');
  });

  it.each(PROTECTED)('lets a signed-in visitor through to %s', (path) => {
    expect(locationOf(path, true)).toBeNull();
  });

  it.each(PROTECTED)('runs at all for %s — the matcher must include it', (path) => {
    expect(config.matcher).toContain(`${path}/:path*`);
  });
});

describe('proxy — entry points', () => {
  it('routes the root to sign-in without a session', () => {
    expect(locationOf('/')).toBe('https://campusone.local/login');
  });

  it('routes the root to the dashboard with one', () => {
    expect(locationOf('/', true)).toBe('https://campusone.local/dashboard');
  });

  it('keeps a signed-in visitor off the sign-in page', () => {
    expect(locationOf('/login', true)).toBe('https://campusone.local/dashboard');
  });

  it('leaves the sign-in page alone for a signed-out visitor', () => {
    expect(locationOf('/login')).toBeNull();
  });
});
