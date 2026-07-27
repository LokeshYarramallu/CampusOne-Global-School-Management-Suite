/**
 * The single place this application reads `process.env`.
 *
 * Next.js inlines `NEXT_PUBLIC_*` at build time only when referenced as a
 * static literal, so each variable is destructured explicitly below rather
 * than looked up dynamically.
 *
 * Every variable here is public and readable in the browser bundle. Secrets
 * must never be given a `NEXT_PUBLIC_` prefix.
 */

const APP_ENVIRONMENTS = ['development', 'staging', 'production'] as const;

export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

export interface Env {
  apiBaseUrl: string;
  apiTimeoutMs: number;
  appEnv: AppEnvironment;
  isProduction: boolean;
}

class EnvValidationError extends Error {
  constructor(problems: string[]) {
    super(
      `Invalid environment configuration:\n${problems.map((p) => `  - ${p}`).join('\n')}\n` +
        `Copy .env.example to .env.local and fill in the missing values.`,
    );
    this.name = 'EnvValidationError';
  }
}

function parse(): Env {
  const problems: string[] = [];

  const rawApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const rawApiTimeoutMs = process.env.NEXT_PUBLIC_API_TIMEOUT_MS;
  const rawAppEnv = process.env.NEXT_PUBLIC_APP_ENV;

  if (!rawApiBaseUrl) {
    problems.push('NEXT_PUBLIC_API_BASE_URL is required');
  } else if (!URL.canParse(rawApiBaseUrl)) {
    problems.push(`NEXT_PUBLIC_API_BASE_URL is not a valid URL: "${rawApiBaseUrl}"`);
  }

  const apiTimeoutMs = rawApiTimeoutMs ? Number(rawApiTimeoutMs) : 15_000;
  if (!Number.isFinite(apiTimeoutMs) || apiTimeoutMs <= 0) {
    problems.push(`NEXT_PUBLIC_API_TIMEOUT_MS must be a positive number, got "${rawApiTimeoutMs}"`);
  }

  const appEnv = (rawAppEnv ?? 'development') as AppEnvironment;
  if (!APP_ENVIRONMENTS.includes(appEnv)) {
    problems.push(
      `NEXT_PUBLIC_APP_ENV must be one of ${APP_ENVIRONMENTS.join(' | ')}, got "${rawAppEnv}"`,
    );
  }

  if (problems.length > 0) {
    throw new EnvValidationError(problems);
  }

  return {
    // Trailing slashes are stripped so callers can always join with a leading "/".
    apiBaseUrl: rawApiBaseUrl!.replace(/\/+$/, ''),
    apiTimeoutMs,
    appEnv,
    isProduction: appEnv === 'production',
  };
}

export const env: Env = parse();
