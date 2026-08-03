import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { StrictRateLimit } from '../../core/http/rate-limit.guard';
import {
  JwtAuthGuard,
  type AuthenticatedRequest,
} from '../../core/auth/jwt-auth.guard';
import {
  RequirePermission,
  RequirePermissionGuard,
} from '../../core/auth/require-permission.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';
import { SessionService } from './session.service';

/**
 * The account page's endpoints.
 *
 * Every route takes its subject from the authenticated session. None accepts a
 * user identifier from the caller, so there is no path by which one person can
 * read or change another's profile (FR-028).
 *
 * These realise the `/me` namespace reserved by feature 001's contract rather
 * than creating a parallel `/profile/*` one — duplicate endpoints for the same
 * resource are forbidden.
 */
@Controller()
@UseGuards(JwtAuthGuard, RequirePermissionGuard)
export class ProfileController {
  constructor(
    private readonly profile: ProfileService,
    private readonly sessions: SessionService,
  ) {}

  @Get('me')
  getMe(@Req() request: AuthenticatedRequest) {
    return this.profile.getAccountProfile(request.user);
  }

  @Patch('me')
  @HttpCode(200)
  async updateMe(
    @Req() request: AuthenticatedRequest,
    @Body() changes: UpdateProfileDto,
  ) {
    await this.profile.updateProfile(request.user, changes);
    return this.profile.getAccountProfile(request.user);
  }

  @Get('me/preferences')
  getPreferences(@Req() request: AuthenticatedRequest) {
    return this.profile.getPreferences(request.user);
  }

  @Patch('me/preferences')
  @HttpCode(200)
  async updatePreferences(
    @Req() request: AuthenticatedRequest,
    @Body() changes: UpdatePreferencesDto,
  ) {
    await this.profile.updatePreferences(request.user, changes);
    return this.profile.getPreferences(request.user);
  }

  /**
   * Rate limited on the same bucket as sign-in: it accepts a credential, and
   * an unlimited endpoint that verifies the current password is a password
   * oracle.
   */
  @Post('me/password')
  @StrictRateLimit()
  @HttpCode(200)
  async changePassword(
    @Req() request: AuthenticatedRequest,
    @Body() body: ChangePasswordDto,
  ): Promise<{ success: true }> {
    await this.profile.changePassword(request.user, body);
    return { success: true };
  }

  @Get('me/activity')
  @RequirePermission('profile', 'self', 'read')
  getActivity(@Req() request: AuthenticatedRequest) {
    return this.profile.getActivity(request.user);
  }

  @Get('auth/sessions')
  listSessions(@Req() request: AuthenticatedRequest) {
    return this.sessions.listForPrincipal(request);
  }

  /**
   * Ending a session you do not own is indistinguishable from ending one that
   * does not exist — otherwise the endpoint enumerates other people's sessions.
   */
  @Delete('auth/sessions/:id')
  @HttpCode(200)
  async endSession(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) sessionId: string,
  ): Promise<{ success: true }> {
    await this.sessions.endOwnSession(request.user, sessionId);
    return { success: true };
  }
}
