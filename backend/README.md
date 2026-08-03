# CampusOne — Backend

NestJS 11 API for the Unified School Management Platform.

Engineering rules: [../AGENTS.md](../AGENTS.md). Product requirements: [../PRD.md](../PRD.md).

---

## Getting Started

```bash
npm install && cp .env.example .env && npm run start:dev
```

Verify:

```bash
curl http://localhost:3001/api/v1/health
```

---

## Stack

NestJS 11 · TypeScript strict · Express · `@nestjs/config` · `class-validator` + `class-transformer` · Jest · ESLint · Prettier

PostgreSQL and Prisma are wired for the authentication and multi-tenant foundation. A development-only JWT login is available for the sample Platform Super Admin; Keycloak remains the planned production identity provider.

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run start:dev` | development server, watch mode |
| `npm run start:debug` | development server with inspector |
| `npm run build` | compile to `dist/` |
| `npm run start:prod` | run the compiled build |
| `npm run lint` | ESLint, autofix |
| `npm run typecheck` | TypeScript, no emit |
| `npm run test` | unit tests |
| `npm run test:cov` | unit tests with coverage |
| `npm run test:e2e` | end-to-end tests |
| `npm run format` | Prettier, write |

---

## Database setup

PostgreSQL and Prisma are wired for the authentication and multi-tenant
foundation. Copy `.env.example` to `.env`, set `DATABASE_URL`, and run:

```bash
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
```

The first migration creates tenant-aware identity/RBAC tables and PostgreSQL
RLS policies. Repositories must still apply application-level tenant filters.

## Structure

```text
src/
├── main.ts           bootstrap: prefix, validation, error filter, CORS
├── app.module.ts     composition root — a list of module imports, nothing else
├── core/             config, filters, guards, interceptors, logging
├── modules/          feature modules
├── shared/           business-neutral utilities
└── infrastructure/   database, cache, queue, storage, external SDK adapters
migrations/           database migrations (single head)
test/                 end-to-end tests
```

### Adding a Module

[`src/modules/health/`](src/modules/health) is the reference implementation — copy its shape.

```text
src/modules/attendance/
├── attendance.module.ts       @Module — its `exports` array IS the public API
├── attendance.controller.ts   thin: validate, delegate, map
├── attendance.service.ts      business logic
├── domain/                    entities, value objects, pure rules
├── repositories/              data access
├── dto/                       request DTOs with class-validator decorators
├── schemas/                   response contracts
├── tests/
└── docs/README.md + API.md
```

Register it in `app.module.ts`. Cross-module access goes through an exported service, never a deep import.

---

## Core

### Configuration — `src/core/config/`

`process.env` is read in exactly one place. `env.validation.ts` runs at boot and reports **every** problem at once, then the process exits — a misconfigured deployment fails immediately rather than at first request.

Modules inject `ConfigService<AppConfig, true>` and read typed values:

```typescript
constructor(private readonly config: ConfigService<AppConfig, true>) {}

const port = this.config.get('port', { infer: true });
```

To add a variable: add it to `.env.example` with a safe placeholder, validate it in `env.validation.ts`, map it in `configuration.ts`, and document it below — all in the same change.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `NODE_ENV` | no | `development` | `development` \| `test` \| `staging` \| `production` |
| `PORT` | no | `3001` | HTTP listen port |
| `CORS_ORIGINS` | yes | — | Comma-separated allowed browser origins. `*` is rejected — this API is credentialed |
| `LOG_LEVEL` | no | `log` | `error` \| `warn` \| `log` \| `debug` \| `verbose` |

`.env` and `.env.local` are gitignored and must never be committed. `.env.local` overrides `.env`.

### Error Handling — `src/core/http/`

`AllExceptionsFilter` is registered globally, so every failure — thrown, unhandled, or from the validation pipe — leaves in one envelope:

```json
{ "error": { "code": "STUDENT_NOT_FOUND", "message": "Student was not found", "details": null } }
```

Throw `AppException`, not a bare `HttpException`, so the failure carries a stable code:

```typescript
import { AppException } from '../../core/http/api-error';

throw AppException.notFound('Student was not found', 'STUDENT_NOT_FOUND');
throw AppException.conflict('This fee installment is already paid', 'FEE_ALREADY_PAID');
throw AppException.forbidden();
```

Platform-wide codes live in `ERROR_CODES`. Feature-specific codes belong to their owning module. Codes are `SCREAMING_SNAKE_CASE`, stable, and part of the public contract — the frontend branches on them, so renaming one is a breaking change.

Unexpected errors are logged with their stack and returned as a generic `INTERNAL_ERROR`. Stack traces and internal identifiers never reach the client.

Validation-pipe rejections become `VALIDATION_FAILED` with the field-level messages in `details`, which is what the UI attaches to individual inputs.

### Request Pipeline — `src/main.ts`

* **Global prefix** `api/v1` — every route is versioned.
* **`ValidationPipe`** with `whitelist` and `forbidNonWhitelisted`. Undeclared properties are stripped and the request is rejected, so a client cannot smuggle `tenantId` or `role` into a payload.
* **`AllExceptionsFilter`** for the error envelope.
* **CORS** restricted to `CORS_ORIGINS` with `credentials: true` for the httpOnly session cookie.
* **Shutdown hooks** so in-flight requests finish on SIGTERM during a rolling deploy.

`test/app.e2e-spec.ts` mirrors this pipeline. Keep the two in step — a difference means tests pass against a pipeline that does not exist in production.

---

## Testing

Jest. Unit tests live in each module's `tests/` folder as `*.spec.ts`; e2e tests live in `test/`.

```bash
npm run test
npm run test:e2e
```

Every module must cover the primary flow, input validation, error handling, permission behaviour **including scope**, and — once persistence exists — **tenant isolation**: a test proving tenant A cannot read or mutate tenant B's records. See AGENTS.md.

---

## Non-Negotiables

This API holds children's personal, health, academic, and family financial data under FERPA, GDPR, and COPPA. Cross-tenant exposure is a Critical risk in the PRD.

* Every tenant-owned query is tenant-scoped. No exceptions for "internal" or "admin" queries.
* Tenant and role come from the authenticated session, never from request input.
* Authorization is enforced here, on every request, including the scope dimension. Frontend role checks are presentation only.
* Never log student personal data, credentials, tokens, or authorization headers.
* Controllers stay thin. Business logic lives in services; data access lives in repositories.
