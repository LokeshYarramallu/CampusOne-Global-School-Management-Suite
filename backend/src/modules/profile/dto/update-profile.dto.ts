import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

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
}
