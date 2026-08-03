/**
 * Startup environment validation.
 *
 * The application must fail clearly at boot when configuration is missing or
 * malformed, rather than at first request (AGENTS.md, "Configuration and
 * Environment Variables"). Every problem is reported at once so a
 * misconfigured deployment can be fixed in one pass.
 */

import {
  LOG_LEVELS,
  NODE_ENVS,
  AUTH_MODES,
  type LogLevel,
  type NodeEnv,
  type AuthMode,
} from './configuration';

type RawEnv = Record<string, unknown>;

/** Environment values arrive as strings; anything else is treated as unset. */
function asString(value: unknown): string | undefined {
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value !== 'string') {
    return undefined;
  }
  const text = value.trim();
  return text.length > 0 ? text : undefined;
}

export function validateEnv(raw: RawEnv): RawEnv {
  const problems: string[] = [];

  const nodeEnv = asString(raw.NODE_ENV) ?? 'development';
  if (!NODE_ENVS.includes(nodeEnv as NodeEnv)) {
    problems.push(
      `NODE_ENV must be one of ${NODE_ENVS.join(' | ')}, got "${nodeEnv}"`,
    );
  }

  const rawPort = asString(raw.PORT);
  const port = Number(rawPort ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    problems.push(
      `PORT must be an integer between 1 and 65535, got "${rawPort ?? ''}"`,
    );
  }

  const logLevel = asString(raw.LOG_LEVEL) ?? 'log';
  if (!LOG_LEVELS.includes(logLevel as LogLevel)) {
    problems.push(
      `LOG_LEVEL must be one of ${LOG_LEVELS.join(' | ')}, got "${logLevel}"`,
    );
  }

  const corsOrigins = (asString(raw.CORS_ORIGINS) ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  for (const origin of corsOrigins) {
    if (origin === '*') {
      problems.push(
        'CORS_ORIGINS must not contain "*". This API is credentialed; list explicit origins.',
      );
      continue;
    }
    if (!URL.canParse(origin)) {
      problems.push(`CORS_ORIGINS contains an invalid origin: "${origin}"`);
    }
  }

  // A deployed environment that accepts no origins would reject the web app
  // outright; catching it at boot beats debugging CORS failures in a browser.
  if (corsOrigins.length === 0 && nodeEnv !== 'test') {
    problems.push('CORS_ORIGINS must list at least one allowed origin');
  }

  const databaseUrl = asString(raw.DATABASE_URL);
  if (!databaseUrl && nodeEnv !== 'test') {
    problems.push('DATABASE_URL is required outside the test environment');
  } else if (databaseUrl && !URL.canParse(databaseUrl)) {
    problems.push(`DATABASE_URL is not a valid URL: "${databaseUrl}"`);
  }

  const authMode = asString(raw.AUTH_MODE) ?? 'local-dev';
  if (!AUTH_MODES.includes(authMode as AuthMode)) {
    problems.push(
      `AUTH_MODE must be one of ${AUTH_MODES.join(' | ')}, got "${authMode}"`,
    );
  }

  const jwtSecret = asString(raw.JWT_SECRET);
  if (!jwtSecret && nodeEnv !== 'test') {
    problems.push('JWT_SECRET is required outside the test environment');
  } else if (nodeEnv === 'production' && jwtSecret && jwtSecret.length < 32) {
    problems.push('JWT_SECRET must be at least 32 characters in production');
  }

  const jwtExpiresInSeconds = Number(raw.JWT_EXPIRES_IN_SECONDS ?? 3600);
  if (!Number.isInteger(jwtExpiresInSeconds) || jwtExpiresInSeconds <= 0) {
    problems.push('JWT_EXPIRES_IN_SECONDS must be a positive integer');
  }

  const devAdminEmail = asString(raw.DEV_PLATFORM_ADMIN_EMAIL);
  if (
    authMode === 'local-dev' &&
    devAdminEmail &&
    !devAdminEmail.includes('@')
  ) {
    problems.push('DEV_PLATFORM_ADMIN_EMAIL must be a valid email address');
  }

  if (nodeEnv === 'production' && authMode === 'local-dev') {
    problems.push('AUTH_MODE=local-dev is not allowed in production');
  }

  // Brute-force protection has two independent layers, and a misconfigured
  // value silently disables one of them — so both are checked at boot.
  const positiveIntegers: Array<[string, unknown, number]> = [
    ['LOGIN_RATE_LIMIT_ATTEMPTS', raw.LOGIN_RATE_LIMIT_ATTEMPTS, 10],
    [
      'LOGIN_RATE_LIMIT_WINDOW_SECONDS',
      raw.LOGIN_RATE_LIMIT_WINDOW_SECONDS,
      60,
    ],
    ['LOGIN_MAX_FAILED_ATTEMPTS', raw.LOGIN_MAX_FAILED_ATTEMPTS, 5],
    ['LOGIN_LOCKOUT_MINUTES', raw.LOGIN_LOCKOUT_MINUTES, 15],
  ];

  for (const [name, value, fallback] of positiveIntegers) {
    const parsed = Number(asString(value) ?? fallback);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      problems.push(
        `${name} must be a positive integer, got "${asString(value) ?? ''}"`,
      );
    }
  }

  if (problems.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n${problems.map((p) => `  - ${p}`).join('\n')}\n` +
        `Copy .env.example to .env and fill in the missing values.`,
    );
  }

  return raw;
}
