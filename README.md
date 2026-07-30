# Avunta — Unified School Management Platform

Multi-tenant, enterprise-grade SaaS for school operations: student information, attendance, academics, examinations, fees, communication, transport, library, hostel, inventory, and HR — delivered through a web application and one unified mobile application that adapts to each user's role.

The signature differentiator is the **unified parent identity**: a single global account through which a parent manages all of their children across any number of independent schools on the platform.

Full product requirements: [PRD.md](PRD.md) (v2.0). Engineering rules: [AGENTS.md](AGENTS.md).

---

## Repository Layout

```text
.
├── frontend/    Next.js 16 web application
├── backend/     NestJS 11 API
├── docs/        architecture decisions and cross-cutting documentation
├── scripts/     repository tooling
├── PRD.md       product requirements — source of truth for behaviour
└── AGENTS.md    engineering rules — source of truth for how it is built
```

Both applications follow a feature-based modular architecture. Read [AGENTS.md](AGENTS.md) before writing code.

---

## Prerequisites

* Node.js 22 or later
* npm 10 or later

---

## Getting Started

Clone, then set up each application. They are independent npm projects — there is no root `package.json` or workspace tooling yet.

### Backend

```bash
cd backend && npm install && cp .env.example .env && npm run start:dev
```

Serves on `http://localhost:3001`. Health check: `http://localhost:3001/api/v1/health`.

### Frontend

```bash
cd frontend && npm install && cp .env.example .env.local && npm run dev
```

Serves on `http://localhost:3000`.

Start the backend first — the frontend's `NEXT_PUBLIC_API_BASE_URL` points at it.

---

## Common Commands

Run from within `frontend/` or `backend/`.

| Command | Purpose |
|---|---|
| `npm run dev` / `npm run start:dev` | development server with hot reload |
| `npm run build` | production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm run test` | unit tests |
| `npm run test:e2e` | end-to-end tests (backend only) |
| `npm run format` | Prettier |

---

## Current Status

Foundation only. Both applications are scaffolded with configuration, error handling, HTTP plumbing, and the module directory structure in place. No product modules are implemented yet.

Per PRD Appendix C, Phase 1 (months 1–6) covers the platform foundation — identity, tenancy, unified parent identity, notifications — plus School Administration, core SIS, Attendance, and the unified mobile app with Parent View.

Four decisions are open and blocking for persisted features: database and ORM, tenant isolation strategy, auth provider, and mobile application stack. See the "Open Decisions" section of [AGENTS.md](AGENTS.md).

---

## Security

This platform holds children's personal, health, academic, and family financial data, and is subject to FERPA, GDPR, and COPPA. Cross-tenant data exposure is rated a Critical risk in the PRD.

Never commit `.env` files or real credentials. Every tenant-owned query must be tenant-scoped. Authorization is enforced on the backend, always. See the multi-tenancy, authorization, and privacy sections of [AGENTS.md](AGENTS.md).
