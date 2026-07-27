import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  AppException,
  ERROR_CODES,
  type ApiErrorBody,
  type ErrorCode,
} from './api-error';

/** Statuses are compared as plain numbers; `HttpStatus` is only used to name them. */
function isServerError(status: number): boolean {
  return status >= 500;
}

/** Narrows a ValidationPipe rejection: `{ message: string[], error, statusCode }`. */
function validationMessagesOf(payload: unknown): string[] | null {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('message' in payload)
  ) {
    return null;
  }

  const { message } = payload;
  return Array.isArray(message) &&
    message.every((item) => typeof item === 'string')
    ? message
    : null;
}

/**
 * Converts every thrown error into the one agreed envelope, so no endpoint
 * can invent its own error shape (AGENTS.md, "API Contract Rules").
 *
 * Internal detail never reaches the client: unexpected errors are logged with
 * their stack and returned as a generic INTERNAL_ERROR.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, code, message, details } = this.describe(exception);

    // 5xx means we broke; log the stack. 4xx is the caller's problem — record
    // it at debug so logs stay readable at scale.
    const context = `${request.method} ${request.url}`;
    if (isServerError(status)) {
      this.logger.error(
        `${context} -> ${code}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.debug(`${context} -> ${status} ${code}`);
    }

    const body: ApiErrorBody = { error: { code, message, details } };
    response.status(status).json(body);
  }

  private describe(exception: unknown): {
    status: number;
    code: ErrorCode;
    message: string;
    details: unknown;
  } {
    if (exception instanceof AppException) {
      return {
        status: exception.getStatus(),
        code: exception.code,
        message: exception.message,
        details: exception.details,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      // Surface field-level validation messages as details so the UI can
      // attach them to inputs (PRD §11: "field-level validation guidance").
      const validationMessages = validationMessagesOf(payload);

      if (validationMessages) {
        return {
          status,
          code: ERROR_CODES.VALIDATION_FAILED,
          message: 'The submitted data is not valid.',
          details: validationMessages,
        };
      }

      return {
        status,
        code: this.codeForStatus(status),
        message: exception.message,
        details: null,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ERROR_CODES.INTERNAL_ERROR,
      message: 'Something went wrong. Please try again.',
      details: null,
    };
  }

  private codeForStatus(status: number): ErrorCode {
    const known: Record<number, ErrorCode> = {
      [HttpStatus.BAD_REQUEST]: ERROR_CODES.VALIDATION_FAILED,
      [HttpStatus.UNAUTHORIZED]: ERROR_CODES.UNAUTHENTICATED,
      [HttpStatus.FORBIDDEN]: ERROR_CODES.FORBIDDEN,
      [HttpStatus.NOT_FOUND]: ERROR_CODES.NOT_FOUND,
      [HttpStatus.CONFLICT]: ERROR_CODES.CONFLICT,
      [HttpStatus.TOO_MANY_REQUESTS]: ERROR_CODES.RATE_LIMITED,
    };

    return (
      known[status] ??
      (isServerError(status)
        ? ERROR_CODES.INTERNAL_ERROR
        : ERROR_CODES.VALIDATION_FAILED)
    );
  }
}
