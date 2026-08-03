import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { APPEARANCES } from '../profile.constants';

export class UpdatePreferencesDto {
  /** Validated against the school's configured languages in the service. */
  @IsOptional()
  @IsString()
  @MaxLength(35)
  language?: string;

  @IsOptional()
  @IsIn(APPEARANCES)
  appearance?: string;

  @IsOptional()
  @IsObject()
  notificationPreferences?: Record<string, unknown>;
}
