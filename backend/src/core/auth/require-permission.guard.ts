/**
 * Backend authorization, enforced on every request it guards.
 *
 * Frontend role checks are presentation only (constitution Principle V), so
 * this is the only place a permission decision is actually made.
 *
 * The guard proves the caller may perform the *action*. It also resolves the
 * caller's **scope** and attaches it to the request, because "a teacher may
 * read attendance" is only half a rule — "for their assigned classes" is the
 * other half, and services need it to decide which rows to return.
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  type CustomDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppException } from '../http/api-error';
import {
  PermissionEvaluatorService,
  type PermissionQuery,
  type ScopeKind,
} from '../../modules/rbac/permission-evaluator.service';
import type { AuthenticatedRequest } from './jwt-auth.guard';

export const REQUIRED_PERMISSION_KEY = 'campusone:required-permission';

export type ScopedRequest = AuthenticatedRequest & {
  /** Set by this guard; never trusted from the client. */
  permissionScope?: ScopeKind;
};

export const RequirePermission = (
  module: string,
  feature: string,
  action: string,
): CustomDecorator =>
  SetMetadata(REQUIRED_PERMISSION_KEY, { module, feature, action });

@Injectable()
export class RequirePermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionEvaluatorService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermissionQuery>(
      REQUIRED_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No declared requirement means this guard has nothing to say. Routes that
    // need protection declare it; JwtAuthGuard still handles authentication.
    if (!required) return true;

    const request = context.switchToHttp().getRequest<ScopedRequest>();
    const principal = request.user;

    if (!principal) throw AppException.unauthenticated();

    const scope = this.permissions.scopeFor(principal.roleKey, required);
    if (scope === null) {
      throw AppException.forbidden();
    }

    request.permissionScope = scope;
    return true;
  }
}
