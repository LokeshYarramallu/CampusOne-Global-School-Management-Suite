# Tenant (backend)

Read-only access to a school's identity.

## Responsibilities

| Owns | Does not own |
|---|---|
| Resolving a school by id: name, slug, status, configured languages | Creating or registering a school |
| — | Editing tenant configuration |
| — | The Platform Super Admin's cross-tenant management surface |

Deliberately minimal. Everything in the right-hand column belongs to the
tenant-management feature (spec 001, FR-024 to FR-030). This module exists so
other modules can put a school's name on screen and validate a language
preference without reaching into the `tenant` table themselves.

Exported: `TenantService`. There is no controller — this module exposes no
routes yet.

## Why it does not use `TenantScopedPrisma`

`tenant` is a platform-level table, not a tenant-owned one — it *is* the tenant.
It carries no `tenant_id` and no row-level policy, so a tenant-scoped
transaction would have nothing to scope. Tenant-*owned* tables
(`tenant_configuration`, `role_assignment`, and the profile module's tables) do
go through it.

## Testing

No tests yet: the module has a single read method with no branching logic and no
tenant-owned access. The first behaviour worth asserting — suspension, or
configuration validation — arrives with the tenant-management feature, and that
is when this needs its own tests.

## Limitations

- **No provisioning.** Schools exist only via the seed until the
  tenant-management feature lands.
- **Suspension is exposed but not enforced here.** `isActive` is returned;
  acting on it (blocking sign-in for a suspended school) belongs to the identity
  module and is not yet wired.
- **Multi-campus** (PRD §7.1, spec 001 FR-028) is not modelled.
