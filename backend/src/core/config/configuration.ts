/**
 * Typed application configuration.
 *
 * This is the only place the backend reads `process.env`. Modules inject
 * `ConfigService<AppConfig, true>` and read from here — never `process.env`
 * directly (AGENTS.md, "Backend Rules").
 */

export const NODE_ENVS = [
  'development',
  'test',
  'staging',
  'production',
] as const;
export type NodeEnv = (typeof NODE_ENVS)[number];

export const LOG_LEVELS = ['error', 'warn', 'log', 'debug', 'verbose'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export const AUTH_MODES = ['local-dev', 'keycloak'] as const;
export type AuthMode = (typeof AUTH_MODES)[number];

export interface AppConfig {
  nodeEnv: NodeEnv;
  isProduction: boolean;
  port: number;
  corsOrigins: string[];
  logLevel: LogLevel;
  databaseUrl: string;
  authMode: AuthMode;
  jwtSecret: string;
  jwtExpiresInSeconds: number;
  devPlatformAdminEmail: string;
  devPlatformAdminPasswordHash: string;
  /** Requests allowed per IP, per window, against the sign-in endpoints. */
  loginRateLimitAttempts: number;
  loginRateLimitWindowSeconds: number;
  /** Consecutive failures before an account is temporarily locked. */
  loginMaxFailedAttempts: number;
  loginLockoutMinutes: number;
}

/**
 * Builds the config object from already-validated environment variables.
 * Validation runs first — see `validateEnv`.
 */
export function loadConfiguration(): AppConfig {
  const nodeEnv = (process.env.NODE_ENV ?? 'development') as NodeEnv;

  return {
    nodeEnv,
    isProduction: nodeEnv === 'production',
    port: Number(process.env.PORT ?? 3001),
    corsOrigins: (process.env.CORS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    logLevel: (process.env.LOG_LEVEL ?? 'log') as LogLevel,
    databaseUrl:
      process.env.DATABASE_URL ?? 'postgresql://localhost:5432/campusone',
    authMode: (process.env.AUTH_MODE ?? 'local-dev') as AuthMode,
    jwtSecret: process.env.JWT_SECRET ?? 'test-only-jwt-secret',
    jwtExpiresInSeconds: Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 3600),
    devPlatformAdminEmail: (
      process.env.DEV_PLATFORM_ADMIN_EMAIL ?? 'platform-admin@campusone.local'
    ).toLowerCase(),
    devPlatformAdminPasswordHash:
      process.env.DEV_PLATFORM_ADMIN_PASSWORD_HASH ??
      '$2b$12$Z7wzlqSHxF8PM1WsOjfyG.qjsKY3fiBCvhtH.4htCjaTKuqZffZV6',
    loginRateLimitAttempts: Number(process.env.LOGIN_RATE_LIMIT_ATTEMPTS ?? 10),
    loginRateLimitWindowSeconds: Number(
      process.env.LOGIN_RATE_LIMIT_WINDOW_SECONDS ?? 60,
    ),
    loginMaxFailedAttempts: Number(process.env.LOGIN_MAX_FAILED_ATTEMPTS ?? 5),
    loginLockoutMinutes: Number(process.env.LOGIN_LOCKOUT_MINUTES ?? 15),
  };
}
