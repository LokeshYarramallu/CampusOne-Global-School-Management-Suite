# ADR 0002: Keycloak as the self-hosted Identity Provider

- **Status:** Accepted
- **Date:** 2026-08-01
- **Resolves:** Open Decision #2 (auth provider — self-hosted vs. managed IdP) in [AGENTS.md](../../AGENTS.md)

## Context

PRD §5.1 requires authentication that spans email/password, single sign-on via industry-standard federation with major productivity identity providers, device biometrics on mobile, multi-factor authentication via multiple channels with global/per-role/per-user enforcement, configurable per-tenant password policies, and full session management (view/terminate, admin force sign-out, concurrent session limits). AGENTS.md Open Decision #2 asks whether to self-host an identity provider or use a managed IdP.

The first feature spec (`specs/001-auth-multitenancy/`) needs an identity substrate before any of this can be planned. The constitution requires that an Open Decision be resolved with a recorded ADR before it constrains a plan, and that external integrations be isolated behind adapters in `backend/src/infrastructure/` so business modules never depend on a provider SDK directly (AGENTS.md → External Service Integration).

A related constraint: PRD §5.3 mandates a **unified parent identity** — one account, one credential set, spanning any number of schools. Any identity model that gives a multi-school parent a separate account per school directly violates this, so the IdP tenancy model must preserve a single user identity across tenants.

## Decision

Use **Keycloak** as a **self-hosted OpenID Connect identity provider**, integrated with the NestJS backend via **OIDC Authorization Code flow with PKCE**. Authentication concerns — sign-in, SSO federation, MFA, session issuance, and magic-link — are delegated to Keycloak; the application layer owns tenant context derivation, RBAC authorization (Module → Feature → Action → Scope), feature-gate evaluation, and the cross-tenant unified parent identity.

Concrete choices captured during spec clarification:

1. **Single shared Keycloak realm.** All users across every tenant live in one realm; each user record carries an attribute tying it to the tenant(s) it belongs to. This preserves one Keycloak account per person regardless of how many schools they belong to, satisfying PRD §5.3. Tenant isolation at the identity layer is enforced in the application layer (which it must be anyway for data isolation).
2. **Application-branded login UI; Keycloak headless.** The Next.js frontend renders the branded login surface and authenticates against Keycloak via OIDC. Keycloak does not host user-facing pages. (Full white-label branding per PRD §5.4 remains a separate feature; this ADR only fixes where the login UI lives architecturally.)
3. **Device biometrics are handled application-side on mobile.** After first sign-in, the mobile app stores a refresh credential in the device's biometric-protected secure storage; fingerprint/face unlocks that storage and refreshes the session. Keycloak is not involved in the biometric step beyond issuing the refresh credential. This lands with the mobile surface (P2), since the unified mobile app (PRD §6) is not yet in this repo (Open Decision #3).
4. **Magic-link passwordless sign-in is delivered via a Keycloak authentication flow.**
5. **MFA** (TOTP authenticator app + email codes) and **SSO federation** (Google, Microsoft, Apple) are delivered through Keycloak; enforcement granularity (global / per-role / per-user) is driven by tenant policy read from the application layer and applied at sign-in.
6. **Adapter isolation.** A `KeycloakIdentityAdapter` (or equivalent) in `backend/src/infrastructure/` wraps all Keycloak interaction. Business modules depend on an `IdentityProvider` interface, never on Keycloak APIs/SDKs directly, so a second provider can be added without touching business modules (AGENTS.md → External Service Integration, PRD Risk #11 multi-provider fallback).

## Alternatives Considered

- **Managed IdP (e.g. Auth0 / AWS Cognito / WorkOS).** Less operational burden, faster to stand up. Rejected for now: schools' data-residency requirements (PRD §12.2) and the need for deep per-tenant policy control favour a self-hosted substrate we fully control; cost scales per-MAU across thousands of schools. Revisit if operational cost proves excessive.
- **Build auth natively in NestJS** (email/password, MFA, sessions, password policy). Rejected: re-implementing federated SSO, WebAuthn, and battle-tested MFA/session handling is high-risk and diverges from PRD §5.1's breadth. Keycloak gives SSO, MFA, and standards-based sessions out of the box.
- **One Keycloak realm per tenant.** Strongest identity-layer isolation and per-tenant Keycloak policy. Rejected: a parent with children in multiple schools would receive a separate Keycloak account per realm, directly violating PRD §5.3's single-identity requirement, and stitching those accounts together at the app layer is more complex than maintaining a single shared realm with app-enforced isolation.

## Consequences

**Positive**

- Standards-based OIDC sign-in, SSO federation, MFA, and session management without re-implementing them.
- Single user identity across all tenants maps cleanly onto the unified parent identity (PRD §5.3).
- Adapter boundary keeps Keycloak swappable and satisfies the multi-provider-fallback principle.
- Self-hosting preserves data-residency control (PRD §12.2).

**Negative / Trade-offs**

- **Per-tenant password policy in a single shared realm is not native.** Keycloak password policy is realm-wide. To honour PRD §5.1's per-tenant password policy (complexity, rotation, reuse), the application layer must enforce tenant-specific policy at password-set/reset time (validate against the tenant's configured policy before delegating the credential write to Keycloak), or use Keycloak per-group policy if it proves sufficient. This trade-off is accepted here and detailed in `/speckit-plan` for this feature.
- **Identity-layer isolation is weaker than realm-per-tenant.** All users share one realm, so a misconfigured query could surface users across tenants. This is mitigated by app-layer tenant scoping on every query and the tenant-isolation tests required by the constitution — the same invariant the data layer must already meet.
- **Operational burden.** Keycloak is another service to deploy, upgrade, back up, and monitor. Its availability becomes the availability of sign-in for the whole platform.
- **Headless login UI + Keycloak** means the frontend implements the OIDC token dance and the backend validates tokens; more integration code than using Keycloak-hosted themes.

**Open items this does not decide**

- **Tenant isolation *strategy* for application data** (shared schema + discriminator vs. schema-per-tenant vs. database-per-tenant) remains Open Decision #1 and is decided in `/speckit-plan` for this feature, recorded as its own ADR. The shared-realm identity model is compatible with all three data-isolation strategies.
- **Biometrics delivery** is fixed as app-side, but the mobile app itself (Open Decision #3) is not yet in this repo; biometrics land at P2 of this feature, after the mobile surface exists.
- **Password policy enforcement mechanism** (app-layer validation vs. Keycloak per-group policy) is finalized in `/speckit-plan`.