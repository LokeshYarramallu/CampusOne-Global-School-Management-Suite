/**
 * The error envelope every Avunta API endpoint returns, and the client-side
 * error type modules should catch.
 *
 * Contract (see AGENTS.md, "API Contract Rules"):
 *
 *   { "error": { "code": "STUDENT_NOT_FOUND", "message": "...", "details": null } }
 */

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Error codes produced by the client itself rather than by the API. Server
 * codes are defined by the backend and are not enumerated here.
 */
export const CLIENT_ERROR_CODES = {
  /** The request exceeded NEXT_PUBLIC_API_TIMEOUT_MS. */
  TIMEOUT: 'CLIENT_TIMEOUT',
  /** The request never reached the server — offline, DNS, CORS. */
  NETWORK: 'CLIENT_NETWORK_ERROR',
  /** The server responded, but not with the agreed error envelope. */
  MALFORMED_RESPONSE: 'CLIENT_MALFORMED_RESPONSE',
} as const;

export class ApiError extends Error {
  readonly code: string;
  /** HTTP status, or 0 when the request never completed. */
  readonly status: number;
  readonly details?: unknown;

  constructor(params: { code: string; message: string; status: number; details?: unknown }) {
    super(params.message);
    this.name = 'ApiError';
    this.code = params.code;
    this.status = params.status;
    this.details = params.details;
  }

  /** Retrying is worthwhile: transport failure or a transient server fault. */
  get isRetryable(): boolean {
    return this.status === 0 || this.status === 408 || this.status === 429 || this.status >= 500;
  }

  get isUnauthenticated(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

function hasErrorEnvelope(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  const { error } = value as { error: unknown };
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { code?: unknown }).code === 'string' &&
    typeof (error as { message?: unknown }).message === 'string'
  );
}

/**
 * Turns a non-OK response into an ApiError, tolerating servers that fail
 * outside the application (proxies, load balancers) and so cannot produce the
 * standard envelope.
 */
export async function apiErrorFromResponse(response: Response): Promise<ApiError> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return new ApiError({
      code: CLIENT_ERROR_CODES.MALFORMED_RESPONSE,
      message: `Request failed with status ${response.status}.`,
      status: response.status,
    });
  }

  if (!hasErrorEnvelope(body)) {
    return new ApiError({
      code: CLIENT_ERROR_CODES.MALFORMED_RESPONSE,
      message: `Request failed with status ${response.status}.`,
      status: response.status,
      details: body,
    });
  }

  return new ApiError({
    code: body.error.code,
    message: body.error.message,
    status: response.status,
    details: body.error.details,
  });
}
