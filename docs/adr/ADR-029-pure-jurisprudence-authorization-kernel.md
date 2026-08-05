# ADR 029: Pure Jurisprudence Authorization Kernel

**Date**: 2026-07-30
**Status**: Accepted

## Context
During Phase 11.R, the system needed an authorization layer to validate requests originating from the Jurisprudence module. However, enabling a real authentication gateway or tying authorization immediately to the live routing system would pose a security risk due to incomplete deployment stages. Furthermore, the contracts existing in `types/jurisprudence-security.ts` provided permissions for actions (like publish, unpublish, and audit) that did not have direct mapped executable operations defined in `JurisprudenceSecurityOperation`.

## Decision
1. We will implement the authorization system as a "pure kernel" using exclusively pure functions (`evaluateJurisprudenceAuthorization`).
2. We strictly adhere to the 10 existing operations in `JurisprudenceSecurityOperation`. We will **not** alter the contract to invent new operations like `publish_record`.
3. The permissions `jurisprudence.internal.publish`, `jurisprudence.internal.unpublish`, and `jurisprudence.internal.audit` are mapped as effective capabilities belonging to certain roles (Publisher, Auditor, Admin) but are treated as reserved capabilities with no executable operations mapped against them in Phase 11.R.
4. All real integration components (`middleware.ts`, `session.ts`, `workspace-guard.ts`) remain strictly untouched, ensuring no unauthorized exposure occurs.

## Consequences
- **Positive**: We can test the whole policy deterministically with 100% isolation. A default-deny behavior is safely vetted before connecting it to live routes. No existing components are compromised.
- **Negative**: Certain roles (like `jurisprudence_publisher`) cannot currently execute their defining operations (publish) because the operation string does not exist in the domain. A future phase will need to formalize these operations in the types and implement their route handlers.
