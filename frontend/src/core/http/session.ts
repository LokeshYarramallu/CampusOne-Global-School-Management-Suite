/**
 * The session cookie's name, shared by the identity module and the routing
 * proxy.
 *
 * It lives in `core/` rather than in the identity module because `proxy.ts`
 * must read it without pulling a React component tree into the proxy bundle.
 * The value itself is set and cleared exclusively by the API — the cookie is
 * httpOnly, so nothing here can read its contents, only observe that it exists.
 */
export const SESSION_COOKIE_NAME = 'campusone_access_token';
