import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * The single error envelope every endpoint returns
 * (AGENTS.md, "API Contract Rules"):
 *
 *   { "error": { "code": "STUDENT_NOT_FOUND", "message": "...", "details": null } }
 *
 * Error codes are SCREAMING_SNAKE_CASE, stable, and part of the public
 * contract — the frontend branches on them. Renaming one is a breaking change.
 */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details: unknown;
  };
}

/**
 * Platform-wide error codes. Feature-specific codes (`FEE_ALREADY_PAID`,
 * `ATTENDANCE_ALREADY_SUBMITTED`) belong to their owning module, not here.
 */
export const ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode =
  (typeof ERROR_CODES)[keyof typeof ERROR_CODES] | (string & {});

/**
 * Throw this — not a bare `HttpException` — so every failure carries a stable
 * code and lands in the standard envelope.
 *
 * `message` is shown to end users. It must never contain a stack trace, an
 * internal identifier, or student personal data (AGENTS.md, "Student Data
 * Privacy").
 */
export class AppException extends HttpException {
  readonly code: ErrorCode;
  readonly details: unknown;

  constructor(params: {
    code: ErrorCode;
    message: string;
    status: HttpStatus;
    details?: unknown;
  }) {
    super(params.message, params.status);
    this.code = params.code;
    this.details = params.details ?? null;
  }

  static notFound(
    message: string,
    code: ErrorCode = ERROR_CODES.NOT_FOUND,
  ): AppException {
    return new AppException({ code, message, status: HttpStatus.NOT_FOUND });
  }

  static forbidden(
    message = 'You do not have permission to perform this action.',
  ): AppException {
    return new AppException({
      code: ERROR_CODES.FORBIDDEN,
      message,
      status: HttpStatus.FORBIDDEN,
    });
  }

  static unauthenticated(
    message = 'Authentication is required.',
  ): AppException {
    return new AppException({
      code: ERROR_CODES.UNAUTHENTICATED,
      message,
      status: HttpStatus.UNAUTHORIZED,
    });
  }

  static conflict(
    message: string,
    code: ErrorCode = ERROR_CODES.CONFLICT,
  ): AppException {
    return new AppException({ code, message, status: HttpStatus.CONFLICT });
  }

  static validation(message: string, details?: unknown): AppException {
    return new AppException({
      code: ERROR_CODES.VALIDATION_FAILED,
      message,
      status: HttpStatus.BAD_REQUEST,
      details,
    });
  }

  static externalService(message: string, details?: unknown): AppException {
    return new AppException({
      code: ERROR_CODES.EXTERNAL_SERVICE_ERROR,
      message,
      status: HttpStatus.BAD_GATEWAY,
      details,
    });
  }
}
