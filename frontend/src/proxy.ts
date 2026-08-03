/**
 * Route-level session steering.
 *
 * Next 16 renamed the `middleware` convention to `proxy`; the behaviour is
 * unchanged (see node_modules/next/dist/docs/01-app/03-api-reference/
 * 03-file-conventions/proxy.md).
 *
 * This is an *optimistic* check, and deliberately nothing more. It only
 * observes whether the httpOnly session cookie is present — it cannot read or
 * verify it. Authentication and authorization are decided by the API on every
 * request (AGENTS.md, "Authorization Rules"); this exists so a signed-out
 * visitor lands on the sign-in page instead of watching a dashboard skeleton
 * redirect itself a moment later.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/core/http/session';

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE_NAME);

  if (pathname === '/') {
    return NextResponse.redirect(
      new URL(hasSession ? '/dashboard' : '/login', request.url),
    );
  }

  if (pathname.startsWith('/login') && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  const isProtected =
    pathname.startsWith('/dashboard') || pathname.startsWith('/profile');
  if (isProtected && !hasSession) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Without a matcher this would also run for _next assets and the favicon,
  // and the redirects above would break the page it is trying to protect.
  matcher: ['/', '/login/:path*', '/dashboard/:path*', '/profile/:path*'],
};
