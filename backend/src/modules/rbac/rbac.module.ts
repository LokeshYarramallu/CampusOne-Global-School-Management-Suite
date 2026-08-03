import { Global, Module } from '@nestjs/common';
import { PermissionEvaluatorService } from './permission-evaluator.service';

/**
 * RBAC composition root.
 *
 * Global because authorization is a cross-cutting concern: `RequirePermissionGuard`
 * lives in `core/auth` and every feature module's routes depend on it. The
 * exported surface is deliberately one service — nothing outside this module
 * reaches into the catalog directly.
 */
@Global()
@Module({
  providers: [PermissionEvaluatorService],
  exports: [PermissionEvaluatorService],
})
export class RbacModule {}
