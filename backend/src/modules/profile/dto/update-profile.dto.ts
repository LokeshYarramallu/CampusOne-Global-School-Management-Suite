import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { AVATAR_KEYS } from '../profile.constants';

/**
 * Only self-editable fields appear here.
 *
 * The global `ValidationPipe` runs with `forbidNonWhitelisted`, so a request
 * carrying `employeeNumber` or `givenName` is rejected outright rather than
 * silently ignored. The service re-checks against `FIELD_EDITABILITY` anyway —
 * a DTO is a contract, not an authorization decision (FR-024, FR-025).
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Matches(/^[+0-9 ()-]{6,32}$/, {
    message:
      'phone must contain only digits, spaces, and the characters + ( ) -',
  })
  phone?: string;

  /**
   * One of the known portrait keys. Not a URL — see `AVATAR_KEYS`.
   */
  @IsOptional()
  @IsIn(AVATAR_KEYS)
  avatarKey?: string;

  /**
   * Address is self-editable for adults and school-managed for learners; the
   * service decides by role. Declaring it here only makes it *expressible* —
   * `updateProfile` still rejects it for a student.
   */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  addressLine?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  addressCity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  addressPostcode?: string;
}
