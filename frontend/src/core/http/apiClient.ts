/**
 * The single HTTP entry point for the application.
 *
 * Module `services/` folders call this; components never call `fetch`
 * directly (AGENTS.md, "Frontend Rules"). Centralising requests here is what
 * makes timeouts, the error envelope, and credential handling consistent.
 */

import { env } from '@/core/config/env';
import { ApiError, CLIENT_ERROR_CODES, apiErrorFromResponse } from './apiError';

export interface RequestOptions extends Omit<RequestInit, 'body' | 'method'> {
  /** Serialised as JSON unless it is already a BodyInit. */
  body?: unknown;
  /** Appended as a query string; null and undefined values are dropped. */
  query?: Record<string, string | number | boolean | null | undefined>;
  /** Overrides NEXT_PUBLIC_API_TIMEOUT_MS for this request. */
  timeoutMs?: number;
  /**
   * Validates and narrows the response body at the module boundary. Response
   * shapes are not trusted (AGENTS.md, "Frontend Rules").
   */
  parse?: (data: unknown) => unknown;
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${env.apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== null && value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

function isBodyInit(value: unknown): value is BodyInit {
  return (
    typeof value === 'string' ||
    value instanceof FormData ||
    value instanceof Blob ||
    value instanceof ArrayBuffer ||
    value instanceof URLSearchParams ||
    value instanceof ReadableStream
  );
}

async function request<T>(method: Method, path: string, options: RequestOptions = {}): Promise<T> {
  const { body, query, timeoutMs, parse, headers, signal, ...init } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs ?? env.apiTimeoutMs);

  // Honour a caller-supplied signal alongside the timeout.
  signal?.addEventListener('abort', () => controller.abort(), { once: true });

  const serialisedBody =
    body === undefined ? undefined : isBodyInit(body) ? body : JSON.stringify(body);

  const requestHeaders = new Headers(headers);
  if (serialisedBody !== undefined && !isBodyInit(body)) {
    requestHeaders.set('Content-Type', 'application/json');
  }
  requestHeaders.set('Accept', 'application/json');

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      ...init,
      method,
      headers: requestHeaders,
      body: serialisedBody,
      signal: controller.signal,
      // Session cookies are httpOnly and set by the API; tokens are never
      // read by or stored in client JavaScript.
      credentials: 'include',
    });
  } catch (cause) {
    const timedOut = controller.signal.aborted;
    throw new ApiError({
      code: timedOut ? CLIENT_ERROR_CODES.TIMEOUT : CLIENT_ERROR_CODES.NETWORK,
      message: timedOut
        ? 'The request took too long. Please try again.'
        : 'Could not reach the server. Check your connection and try again.',
      status: 0,
      details: cause,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw await apiErrorFromResponse(response);
  }

  if (response.status === 204 || response.headers.get('Content-Length') === '0') {
    return undefined as T;
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (cause) {
    throw new ApiError({
      code: CLIENT_ERROR_CODES.MALFORMED_RESPONSE,
      message: 'The server returned an unreadable response.',
      status: response.status,
      details: cause,
    });
  }

  return (parse ? parse(data) : data) as T;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, options?: RequestOptions) => request<T>('POST', path, options),
  patch: <T>(path: string, options?: RequestOptions) => request<T>('PATCH', path, options),
  put: <T>(path: string, options?: RequestOptions) => request<T>('PUT', path, options),
  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),
};
