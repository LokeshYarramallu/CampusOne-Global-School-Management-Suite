import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { CALENDAR_EVENT_TYPES } from '../calendar.constants';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Edits to an event's own fields. Scope and class targeting are fixed at
 * creation — moving an event between scopes would change who can see it, which
 * is a delete-and-recreate, not an edit. Only the creator may reach this
 * (enforced in the service).
 */
export class UpdateEventDto {
  @IsOptional()
  @IsIn(CALENDAR_EVENT_TYPES)
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @Matches(DATE, { message: 'eventDate must be an ISO date (YYYY-MM-DD)' })
  eventDate?: string;

  @IsOptional()
  @Matches(TIME, { message: 'startTime must be HH:MM (24-hour)' })
  startTime?: string;

  @IsOptional()
  @Matches(TIME, { message: 'endTime must be HH:MM (24-hour)' })
  endTime?: string;
}
