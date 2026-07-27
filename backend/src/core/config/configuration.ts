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

export interface AppConfig {
  nodeEnv: NodeEnv;
  isProduction: boolean;
  port: number;
  corsOrigins: string[];
  logLevel: LogLevel;
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
  };
}
