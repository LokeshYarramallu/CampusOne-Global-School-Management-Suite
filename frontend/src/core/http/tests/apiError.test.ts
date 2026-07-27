import { describe, expect, it } from 'vitest';
import { ApiError, CLIENT_ERROR_CODES, apiErrorFromResponse, isApiError } from '../apiError';

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('apiErrorFromResponse', () => {
  it('reads code, message, and details from the standard envelope', async () => {
    const response = jsonResponse(
      { error: { code: 'STUDENT_NOT_FOUND', message: 'Student was not found', details: null } },
      404,
    );

    const error = await apiErrorFromResponse(response);

    expect(error.code).toBe('STUDENT_NOT_FOUND');
    expect(error.message).toBe('Student was not found');
    expect(error.status).toBe(404);
  });

  it('falls back to MALFORMED_RESPONSE when the body is not the agreed envelope', async () => {
    const response = jsonResponse({ message: 'Bad Gateway' }, 502);

    const error = await apiErrorFromResponse(response);

    expect(error.code).toBe(CLIENT_ERROR_CODES.MALFORMED_RESPONSE);
    expect(error.status).toBe(502);
    expect(error.details).toEqual({ message: 'Bad Gateway' });
  });

  it('falls back to MALFORMED_RESPONSE when the body is not JSON at all', async () => {
    const response = new Response('<html>504 Gateway Timeout</html>', { status: 504 });

    const error = await apiErrorFromResponse(response);

    expect(error.code).toBe(CLIENT_ERROR_CODES.MALFORMED_RESPONSE);
    expect(error.status).toBe(504);
  });
});

describe('ApiError classification', () => {
  const build = (status: number) => new ApiError({ code: 'X', message: 'x', status });

  it('treats transport failures and transient server faults as retryable', () => {
    expect(build(0).isRetryable).toBe(true);
    expect(build(429).isRetryable).toBe(true);
    expect(build(503).isRetryable).toBe(true);
  });

  it('does not treat client faults as retryable', () => {
    expect(build(400).isRetryable).toBe(false);
    expect(build(404).isRetryable).toBe(false);
  });

  it('distinguishes unauthenticated from forbidden', () => {
    expect(build(401).isUnauthenticated).toBe(true);
    expect(build(401).isForbidden).toBe(false);
    expect(build(403).isForbidden).toBe(true);
  });

  it('narrows unknown values with isApiError', () => {
    expect(isApiError(build(500))).toBe(true);
    expect(isApiError(new Error('plain'))).toBe(false);
  });
});
