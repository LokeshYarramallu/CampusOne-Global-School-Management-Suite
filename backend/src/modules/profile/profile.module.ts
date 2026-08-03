import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { TenantModule } from '../tenant/tenant.module';
import { PanelResolverService } from './panel-resolver.service';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { SessionService } from './session.service';
import { PanelRepository } from './repositories/panel.repository';
import { ParentLinkRepository } from './repositories/parent-link.repository';
import { UserProfileRepository } from './repositories/user-profile.repository';

/**
 * The account profile module.
 *
 * Depends on `IdentityModule` and `TenantModule` through their exported
 * services only — never on their internals. `PermissionEvaluatorService`
 * arrives via the global `RbacModule`.
 */
@Module({
  imports: [IdentityModule, TenantModule],
  controllers: [ProfileController],
  providers: [
    ProfileService,
    SessionService,
    PanelResolverService,
    UserProfileRepository,
    PanelRepository,
    ParentLinkRepository,
  ],
  exports: [ProfileService],
})
export class ProfileModule {}
