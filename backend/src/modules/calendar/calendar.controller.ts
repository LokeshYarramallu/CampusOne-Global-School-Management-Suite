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
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  JwtAuthGuard,
  type AuthenticatedRequest,
} from '../../core/auth/jwt-auth.guard';
import {
  RequirePermission,
  RequirePermissionGuard,
} from '../../core/auth/require-permission.guard';
import { AppException } from '../../core/http/api-error';
import { CalendarService } from './calendar.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

/**
 * Calendar endpoints, all under `/api/v1/calendar`.
 *
 * `@RequirePermission('calendar','view','read')` gates every route: it proves
 * the caller is a calendar participant at all (accountant and parent hold only
 * this; platform admin holds none). The finer question — *which* events they
 * see, and *which* scopes they may create — is decided in the service, because
 * it depends on membership and on the request body, which a single permission
 * tuple cannot express.
 *
 * Subject and tenant come from the session, never from the client (FR-028).
 */
@Controller('calendar')
@UseGuards(JwtAuthGuard, RequirePermissionGuard)
@RequirePermission('calendar', 'view', 'read')
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  @Get()
  getMonth(
    @Req() request: AuthenticatedRequest,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const now = new Date();
    const y = parseWindow(year, now.getUTCFullYear(), 2000, 2100);
    const m = parseWindow(month, now.getUTCMonth() + 1, 1, 12);
    return this.calendar.getMonth(request.user, y, m);
  }

  @Post()
  @HttpCode(201)
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreateEventDto) {
    return this.calendar.create(request.user, dto);
  }

  @Patch(':id')
  @HttpCode(200)
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.calendar.update(request.user, id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: true }> {
    await this.calendar.remove(request.user, id);
    return { success: true };
  }
}

/** Parse a query integer within bounds, falling back to a default. */
function parseWindow(
  raw: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw AppException.validation(`Value out of range: ${raw}`);
  }
  return value;
}
