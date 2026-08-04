import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { CALENDAR_EVENT_TYPES, CALENDAR_SCOPES } from '../calendar.constants';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A request to create an event.
 *
 * Which scopes a caller may actually use is a role decision the service makes
 * against the RBAC catalog — the DTO only shapes the payload. `class_label`
 * and `section_label` are required exactly when the scope is CLASS.
 */
export class CreateEventDto {
  @IsIn(CALENDAR_SCOPES)
  scope!: string;

  @ValidateIf((o: CreateEventDto) => o.scope === 'CLASS')
  @IsString()
  @MaxLength(16)
  classLabel?: string;

  @ValidateIf((o: CreateEventDto) => o.scope === 'CLASS')
  @IsString()
  @MaxLength(16)
  sectionLabel?: string;

  @IsIn(CALENDAR_EVENT_TYPES)
  type!: string;

  @IsString()
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @Matches(DATE, { message: 'eventDate must be an ISO date (YYYY-MM-DD)' })
  eventDate!: string;

  @IsOptional()
  @Matches(TIME, { message: 'startTime must be HH:MM (24-hour)' })
  startTime?: string;

  @IsOptional()
  @Matches(TIME, { message: 'endTime must be HH:MM (24-hour)' })
  endTime?: string;
}
