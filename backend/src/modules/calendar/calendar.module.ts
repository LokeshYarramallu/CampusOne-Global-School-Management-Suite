import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { CalendarRepository } from './repositories/calendar.repository';

/**
 * The calendar feature.
 *
 * PermissionEvaluatorService (global RbacModule) and TenantScopedPrisma
 * (global PrismaModule) arrive by injection; this module owns only the
 * calendar's own service, controller, and repository. IdentityModule is
 * imported so the JwtAuthGuard used by the controller can resolve
 * AuthService.
 */
@Module({
  imports: [IdentityModule],
  controllers: [CalendarController],
  providers: [CalendarService, CalendarRepository],
  exports: [CalendarService],
})
export class CalendarModule {}
