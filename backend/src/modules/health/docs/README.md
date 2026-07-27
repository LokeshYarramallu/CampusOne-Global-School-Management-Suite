# Health Module

## Purpose

Reports whether this API process is alive and serving traffic. Consumed by load balancers, container orchestrators, deployment smoke tests, and external uptime monitoring.

This module also serves as the **reference implementation** of the module structure defined in [AGENTS.md](../../../../../AGENTS.md) — a controller, a service, a `@Module()` that declares its public API through `exports`, plus `tests/` and `docs/`. Copy its shape when adding a feature module.

## Responsibilities

### Owns

* The `GET /api/v1/health` endpoint.
* The liveness response contract (`HealthStatus`).

### Does not own

* Readiness checks for downstream dependencies (database, cache, queue, payment providers). Those arrive with the infrastructure they check — likely as a separate `GET /health/ready`, since liveness and readiness must stay distinct: a failing dependency should not cause an orchestrator to kill an otherwise-healthy process.
* Metrics and tracing. Observability instrumentation is cross-cutting and belongs in `src/core`.

## Public Interface

`HealthModule` exports `HealthService`, whose `check()` returns:

```typescript
interface HealthStatus {
  status: 'ok';
  environment: 'development' | 'test' | 'staging' | 'production';
  uptimeSeconds: number;
  timestamp: string;  // ISO-8601
}
```

## Dependencies

`ConfigService` from `src/core/config`, for the active environment name. No database, no external services — deliberately, so the endpoint stays available when dependencies are down.

## Design Decisions

**The endpoint is unauthenticated.** Load balancers cannot present credentials. The consequence is that the response is public, so it must never include configuration values, dependency hostnames, credentials, version-disclosure detail, or anything tenant-specific. Keep the response minimal when extending it.

**Liveness only.** It answers "is this process running?", not "can it serve every feature?". Conflating the two causes healthy processes to be restarted during a downstream outage.

## Testing

```bash
npm run test -- health      # unit
npm run test:e2e            # includes the endpoint contract
```

## Known Limitations

No readiness probe and no dependency checks yet — both are blocked on the database and infrastructure decisions still open in AGENTS.md.
