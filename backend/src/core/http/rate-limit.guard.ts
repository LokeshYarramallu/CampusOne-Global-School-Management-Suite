/**
 * Rate limiting that speaks the platform error envelope.
 *
 * Two buckets are configured in `app.module.ts`:
 *
 *   default — a generous ceiling every endpoint inherits.
 *   strict  — a tight ceiling for credential-accepting endpoints, applied
 *             only to handlers marked with `@StrictRateLimit()`.
 *
 * Nest applies every configured throttler to every route, so the strict
 * bucket opts *out* by default via `skipUnlessStrict`.
 */

import {
  Injectable,
  SetMetadata,
  type CustomDecorator,
  type ExecutionContext,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppException, ERROR_CODES } from './api-error';

export const STRICT_RATE_LIMIT_KEY = 'campusone:strict-rate-limit';

/** Opts a route into the strict bucket. Use on anything that takes credentials. */
export const StrictRateLimit = (): CustomDecorator =>
  SetMetadata(STRICT_RATE_LIMIT_KEY, true);

export function skipUnlessStrict(context: ExecutionContext): boolean {
  return (
    Reflect.getMetadata(STRICT_RATE_LIMIT_KEY, context.getHandler()) !== true
  );
}

@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  /**
   * `ThrottlerException`'s default message is "ThrottlerException: Too Many
   * Requests" — a framework class name leaking to end users. Replacing it with
   * an `AppException` keeps a throttled request indistinguishable in shape
   * from any other failure (AGENTS.md, "API Contract Rules").
   */
  protected throwThrottlingException(): Promise<void> {
    throw new AppException({
      code: ERROR_CODES.RATE_LIMITED,
      message: 'Too many attempts. Please wait a moment and try again.',
      status: 429,
    });
  }
}
