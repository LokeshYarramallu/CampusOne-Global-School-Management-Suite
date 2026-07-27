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
  type LogLevel,
  type NodeEnv,
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

  if (problems.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n${problems.map((p) => `  - ${p}`).join('\n')}\n` +
        `Copy .env.example to .env and fill in the missing values.`,
    );
  }

  return raw;
}
