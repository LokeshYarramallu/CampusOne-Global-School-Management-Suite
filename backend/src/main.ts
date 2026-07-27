import {
  Logger,
  LogLevel as NestLogLevel,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import type { AppConfig, LogLevel } from './core/config/configuration';
import { AllExceptionsFilter } from './core/http/all-exceptions.filter';

/** Nest log levels are cumulative — enabling `debug` implies everything above it. */
const LOG_LEVELS_BY_THRESHOLD: Record<LogLevel, NestLogLevel[]> = {
  error: ['error'],
  warn: ['error', 'warn'],
  log: ['error', 'warn', 'log'],
  debug: ['error', 'warn', 'log', 'debug'],
  verbose: ['error', 'warn', 'log', 'debug', 'verbose'],
};

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Configuration is validated during module init, so reaching this line
  // means the environment is sound.
  const config = app.get(ConfigService<AppConfig, true>);

  app.useLogger(
    LOG_LEVELS_BY_THRESHOLD[config.get('logLevel', { infer: true })],
  );

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      // Strip properties that have no DTO decorator, and reject requests that
      // send them. This prevents mass assignment: a client cannot smuggle
      // `tenantId` or `role` into a payload (AGENTS.md, "Authorization Rules").
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Every failure leaves through here, in the one agreed envelope.
  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors({
    origin: config.get('corsOrigins', { infer: true }),
    // The session cookie is httpOnly, so the browser must be allowed to send it.
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // Lets in-flight requests finish on SIGTERM during a rolling deploy.
  app.enableShutdownHooks();

  const port = config.get('port', { infer: true });
  await app.listen(port);

  Logger.log(
    `Avunta API listening on http://localhost:${port}/api/v1 ` +
      `[${config.get('nodeEnv', { infer: true })}]`,
    'Bootstrap',
  );
}

void bootstrap();
