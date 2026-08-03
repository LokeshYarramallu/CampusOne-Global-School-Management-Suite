# CampusOne — Frontend

Next.js 16 web application for the Unified School Management Platform.

Engineering rules: [../AGENTS.md](../AGENTS.md). Product requirements: [../PRD.md](../PRD.md).

---

## Getting Started

```bash
npm install && cp .env.example .env.local && npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Start the backend first — the app reads `NEXT_PUBLIC_API_BASE_URL`.

---

## Stack

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4 · Vitest + Testing Library · ESLint · Prettier

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | development server |
| `npm run build` | production build |
| `npm run start` | serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm run test` | Vitest, single run |
| `npm run test:watch` | Vitest, watch mode |
| `npm run format` | Prettier, write |
| `npm run format:check` | Prettier, verify |

---

## Structure

```text
src/
├── app/        App Router routes ONLY — thin. Business logic here is a defect.
├── modules/    feature modules (attendance, fee-management, ...)
├── shared/     cross-module components, hooks, utilities
└── core/       config, HTTP client, error contract
tests/          cross-module and app-level tests
```

### Adding a Module

Create `src/modules/<kebab-case-name>/` and add only the folders the module needs:

```text
src/modules/attendance/
├── components/     feature UI
├── hooks/          client-side hooks
├── services/       API calls — the only place that talks to the backend
├── stores/         feature state
├── schemas/        runtime validation of API responses
├── types/
├── tests/
├── docs/README.md  purpose, ownership, public interface, flows, limitations
└── index.ts        the module's public API
```

Import across modules only from the module root:

```typescript
import { useAttendanceRoster } from '@/modules/attendance';              // yes
import { rosterStore } from '@/modules/attendance/stores/rosterStore';   // no
```

---

## Core

### Configuration — `src/core/config/env.ts`

The single place `process.env` is read. Variables are validated at import time and the error lists every problem at once, so a misconfigured app fails immediately rather than at first request.

To add a variable: add it to `.env.example` with a safe placeholder, destructure it explicitly in `env.ts` (Next.js only inlines `NEXT_PUBLIC_*` when referenced as a static literal), validate it, and document it in the table below — all in the same change.

**Every `NEXT_PUBLIC_*` value is compiled into the browser bundle and is publicly readable. Never put a secret behind that prefix.**

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | yes | — | Base URL of the API, including the `/api/v1` prefix |
| `NEXT_PUBLIC_API_TIMEOUT_MS` | no | `15000` | Milliseconds before a request is aborted |
| `NEXT_PUBLIC_APP_ENV` | no | `development` | `development` \| `staging` \| `production` |

### HTTP — `src/core/http/`

`apiClient.ts` is the only place the application calls `fetch`. Module `services/` folders use it; components never call it directly.

It handles timeouts via `AbortSignal`, JSON serialisation, query-string building, `credentials: 'include'` for the httpOnly session cookie, and translation of every failure into an `ApiError`.

`apiError.ts` defines the error contract. The API returns one envelope for every failure:

```json
{ "error": { "code": "STUDENT_NOT_FOUND", "message": "Student was not found", "details": null } }
```

`ApiError` exposes `code`, `status`, `details`, and the classifiers `isRetryable`, `isUnauthenticated`, and `isForbidden`, so UI can choose between a retry affordance, a re-authentication prompt, and a permission message.

Example service:

```typescript
// src/modules/attendance/services/attendanceApi.ts
import { apiClient } from '@/core/http/apiClient';
import { parseAttendanceRoster } from '../schemas/attendanceSchema';
import type { AttendanceRoster } from '../types/attendance.types';

export function fetchRoster(classId: string): Promise<AttendanceRoster> {
  return apiClient.get<AttendanceRoster>('/attendance/roster', {
    query: { classId },
    parse: parseAttendanceRoster,
  });
}
```

Pass `parse` to validate the response at the module boundary. Response shapes are not trusted.

---

## Testing

Vitest with jsdom and Testing Library. Module tests live in each module's `tests/` folder; cross-module tests live in `tests/`.

```bash
npm run test
```

## Login flow

The login screen is available at `/login` (and `/`). In development, use:

- Email: `platform-admin@campusone.local`
- Password: `CampusOneAdmin!2026`

The form calls `POST /api/v1/auth/login`. The backend sets an httpOnly JWT
cookie, so the browser never stores or reads the token. The dashboard validates
the cookie through `GET /api/v1/auth/me`.

Every feature should cover the primary flow, input validation, error handling, permission behaviour, and empty/loading/error UI states.

---

## Conventions

* Default to Server Components. Add `"use client"` only where interactivity or browser APIs require it, and push it as far down the tree as possible.
* `src/app/` is routing only — wire params, metadata, and layout, then render a module component.
* Keep components small; keep business logic out of them.
* Every list, dashboard, and detail view defines its empty, loading, and error states before build (PRD §11).
* Role checks in the UI are presentation only. Authorization is enforced by the backend, always.

Next.js 16 has breaking changes from earlier versions — see [AGENTS.md](AGENTS.md) in this directory and the guides in `node_modules/next/dist/docs/`.
