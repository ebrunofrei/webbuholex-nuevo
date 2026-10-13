# HERMES-PROD-A2.4-FREEZE
SAFE RETURNTO + INTENT=ANALYZE BOUNDARY ARCHITECTURAL FREEZE
DOCUMENTATION ONLY — INCREMENTAL FREEZE TO HERMES-PROD-A2-FREEZE

---

## A. Freeze Identity

- **Repository**: `C:\Projects\Buholex-rev\WebBuholex`
- **Branch**: `main`
- **Frozen HEAD SHA**: `1ce17cf70839159caa1da10a9898cc5e7f810903` (`1ce17cf`)
- **Commit Subject**: `feat: preserve Hermes analyze intent across login`
- **Freeze Date**: `2026-10-13`
- **Status**: `FROZEN`
- **Relationship to Prior Freeze**:
  - `HERMES-PROD-A2.4` extends authentication and navigation return-path behavior only.
  - The `HERMES-PROD-A2.3` Hermes functional core, orchestrator, provider adapters, slug-only HTTP contract, grounding, and database role boundaries remain completely unchanged.
  - Baseline freeze reference: [`docs/hermes/HERMES-PROD-A2-FREEZE.md`](file:///c:/Projects/Buholex-rev/WebBuholex/docs/hermes/HERMES-PROD-A2-FREEZE.md) (left unmodified).

---

## B. Authorized Safe Return Targets

The `sanitizeSafeReturnTo` / `sanitizeWorkspaceReturnTo` contract strictly authorizes exactly two classes of internal destination paths:

### 1. Existing Workspace Destinations
- **Path Classes**:
  - `/app`
  - `/app/*`
- **Semantics**:
  - Full backward compatibility with existing workspace navigation is preserved.
  - Historical query parameter (`parsed.search`) and fragment/hash (`parsed.hash`) semantics are preserved for workspace-internal destinations (e.g., `/app/proyectos?view=active#section-1`).
  - Workspace-local parameters such as `/app?recordId=...` within `/app` routes remain supported for existing workspace tooling.

### 2. Jurisprudence Analysis Destination
- **Path Pattern**:
  - `/jurisprudencia/<VALID_PUBLIC_SLUG>?intent=analyze`
- **Slug Validation**:
  - `VALID_PUBLIC_SLUG` is strictly validated using the single authoritative canonical public slug schema:
    `jurisprudencePublicSlugSchema` from [`lib/schemas/jurisprudence-public-search-gateway.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/schemas/jurisprudence-public-search-gateway.ts).
  - Schema definition: `z.string().trim().min(3).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)`.
  - **No duplicate regex contract**: `lib/auth/return-to.ts` directly imports and reuses `jurisprudencePublicSlugSchema`, avoiding redundant or diverging slug grammar implementations.
- **Query Restriction**:
  - The query string must strictly and exclusively equal `?intent=analyze`.
  - Any additional, altered, or duplicated parameters are rejected.

---

## C. Single Owner Auth Flow

The authentication redirect and Auth0 path construction are centralized under explicit single-owner functions in [`lib/auth/return-to.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/auth/return-to.ts):

### 1. `buildLoginRedirect(returnTo)`
- **Owner**: [`lib/auth/return-to.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/auth/return-to.ts#L76-L79)
- **Responsibility**: Sanitizes the raw target via `sanitizeSafeReturnTo` and builds the internal application login redirect URL:
  `/iniciar-sesion?returnTo=<encodedSafeReturnTo>`

### 2. `buildAuth0LoginPath(returnTo)`
- **Owner**: [`lib/auth/return-to.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/auth/return-to.ts#L81-L84)
- **Responsibility**: Sanitizes the raw target via `sanitizeSafeReturnTo` and builds the Auth0 upstream route handler destination:
  `/auth/login?returnTo=<encodedSafeReturnTo>`

### 3. Consumption in `app/iniciar-sesion/page.tsx`
- [`app/iniciar-sesion/page.tsx`](file:///c:/Projects/Buholex-rev/WebBuholex/app/iniciar-sesion/page.tsx#L17) consumes `buildAuth0LoginPath(rawReturnTo)` directly on the primary login action CTA (`Link href={buildAuth0LoginPath(rawReturnTo)}`).
- **Elimination of Duplication**: No manual or ad-hoc URL construction (`/auth/login?returnTo=${encodeURIComponent(...)}`) remains anywhere in application route components.

---

## D. Security Invariants

The `sanitizeSafeReturnTo` pipeline evaluates candidate URLs against an authoritative dummy origin (`https://workspace.buholex.invalid`) and strictly enforces the following protections. Any violation fails closed to `/app` (`DEFAULT_SAFE_RETURN_TO`):

1. **Absolute External URLs**: Rejected (e.g., `https://evil.example/path`, `http://evil.example/app`).
2. **Protocol-Relative URLs**: Rejected (e.g., `//evil.example/path`, `///evil.example`).
3. **Dangerous Schemes**: Rejected (e.g., `javascript:alert(1)`, `data:text/html,...`, `vbscript:...`, `file:///etc/passwd`).
4. **Backslash Redirect Variants**: Rejected (e.g., `\evil.example`, `/\evil.example`, `/\\evil.example`, `/app\evil`, `/jurisprudencia/<slug>\evil?intent=analyze`).
5. **Malformed Percent-Encoding**: Rejected (e.g., `/app/%`, `/app/%ZZ`, `/jurisprudencia/slug%ZZ?intent=analyze`).
6. **Invalid Public Slug**: Rejected (e.g., uppercase letters, lengths `< 3` or `> 180`, underscores, leading/trailing hyphens, consecutive hyphens, spaces).
7. **Unsupported Intents**: Rejected (e.g., `?intent=compare`, `?intent=applicability`, or missing `?intent=analyze`).
8. **Extra Query Parameters**: Rejected (e.g., `?intent=analyze&extra=param`, `?foo=bar&intent=analyze`, `?intent=analyze&mode=strict`).
9. **Duplicate Intent Parameters**: Rejected (e.g., `?intent=analyze&intent=analyze`).
10. **Canonical Identifier Injections**: Rejected on the jurisprudence route (e.g., `?recordId=...`, `?recordVersion=...`, `?canonicalId=...`, alone or combined with `?intent=analyze`).
11. **Fragments on Jurisprudence Route**: Rejected (e.g., `?intent=analyze#section-1`, `#?intent=analyze`, `?intent=analyze#`).
12. **Dot-Segment Normalization Bypass Attempts**: Rejected (e.g., `/jurisprudencia/foo/../<slug>?intent=analyze`, `/jurisprudencia/./<slug>?intent=analyze`). Raw path before query/hash must strictly equal `/jurisprudencia/${parsedSlug.data}`.
13. **Encoded Dot-Segment / Path Manipulation Variants**: Rejected (e.g., `/%2f/`, `/%5c`, `/jurisprudencia/%2e%2e/<slug>?intent=analyze`, `/%2e/`).
14. **Null / Undefined / Empty Input**: Safely defaults to `/app`.

**Default Fallback**: `/app` (`DEFAULT_SAFE_RETURN_TO`).

---

## E. Canonical Identifier Boundary

The authentication and navigation return-path boundary maintains the strict canonical isolation established in `HERMES-PROD-A2`:

- **Slug-Only Boundary**: The browser, query strings, and login URL carry **only** the public jurisprudence `slug`.
- **Server-Side Isolation**: `recordId` and `recordVersion` remain strictly server-side and are resolved exclusively within the server execution boundary via `jurisprudencePublicSlugResolver`.
- **A2.3 Contract Invariance**: The frozen A2.3 Hermes HTTP contract (`POST /api/jurisprudence/interpret` accepting only `{ "slug": "..." }`) remains identical.
- **Zero Canonical ID Exposure**: No canonical identifier (`recordId`, `recordVersion`, `canonicalId`) is introduced into `returnTo`, login redirect URLs, or Auth0 parameters.

---

## F. No Hermes Core Changes

The `HERMES-PROD-A2.4` commit and milestone introduced zero modifications to the Hermes functional engine or its supporting infrastructure. Specifically, A2.4 did **NOT** modify:

1. **Hermes Provider Adapter**: [`lib/hermes/adapters/openai-hermes-adapter.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/hermes/adapters/openai-hermes-adapter.ts)
2. **Hermes Orchestrator**: [`lib/domain/services/jurisprudence-interpretation-orchestrator.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/domain/services/jurisprudence-interpretation-orchestrator.ts)
3. **Exact Grounding Engine**: Normalized substring exactness invariants and verification algorithms.
4. **A1.13B Reference Binding**: Numeric anchor extraction, word-boundary matching, and grounded support binding.
5. **Hermes Interpretation Handler**: [`lib/jurisprudence/jurisprudence-interpret-http-handler.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/jurisprudence/jurisprudence-interpret-http-handler.ts)
6. **Interpretation Request Schema**: [`lib/schemas/jurisprudence-http.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/schemas/jurisprudence-http.ts)
7. **Public Slug Resolver**: [`lib/jurisprudence/jurisprudence-public-slug-resolver.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/jurisprudence/jurisprudence-public-slug-resolver.ts)
8. **Rate Limiting Engine**: [`lib/security/postgres-jurisprudence-rate-limiter.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/security/postgres-jurisprudence-rate-limiter.ts), [`lib/security/rate-limit-subject.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/security/rate-limit-subject.ts)
9. **PostgreSQL Hermes Roles**: `withJurisprudencePublicReadRole`, `withJurisprudencePublicWriteRole` in [`database/roles.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/database/roles.ts)
10. **OpenAI Config / Model Policy**: [`lib/hermes/config/openai-hermes-config.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/hermes/config/openai-hermes-config.ts), model `gpt-6.1-sol`
11. **Frozen Synthetic Staging Fixture**: `hermes-synthetic-legal-test-1-6d8b2a1e-4c3f-4e9b-b2a1-8e7c6d5a4b3c`

---

## G. Regression Test Map

### 1. Direct Milestone Tests
- [`tests/auth-return-to.test.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/tests/auth-return-to.test.ts): **27 tests** (PASS)
  - Proves `/app` and `/app/*` acceptance and backward compatibility (Cases 1–2).
  - Proves `/jurisprudencia/<slug>?intent=analyze` valid slug acceptance and Auth0 round-trip (Cases 3–4).
  - Proves rejection of open redirects, protocol-relative paths, dangerous schemes, and backslashes (Cases 5–8, 21).
  - Proves rejection of malformed encoding, invalid slugs, missing/unsupported intents, and extra query params (Cases 9–14).
  - Proves rejection of `recordId`, `recordVersion`, and canonical identifier injections (Cases 15–17, 20).
  - Proves rejection of fragments, null/undefined handling, and decoupling from Hermes backend (Cases 18–19, 22–23).
  - Proves A2.4A path normalization hardening (duplicate intent, dot-segments, encoded dot-segments, single-owner contract).
- [`tests/workspace-guard.test.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/tests/workspace-guard.test.ts): **4 tests** (PASS)
  - Proves workspace access evaluation, redirection to `buildLoginRedirect`, and open redirect blocking.

### 2. Frozen Hermes Regression Suite
- **Total Tests**: **116 tests across 5 files** (PASS)
  1. [`tests/jurisprudence/jurisprudence-interpret-route.test.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/tests/jurisprudence/jurisprudence-interpret-route.test.ts): 53 tests
  2. [`tests/hermes/jurisprudence-orchestrator-b1.test.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/tests/hermes/jurisprudence-orchestrator-b1.test.ts): 30 tests
  3. [`tests/jurisprudence/jurisprudence-public-slug-resolver.test.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/tests/jurisprudence/jurisprudence-public-slug-resolver.test.ts): 13 tests
  4. [`tests/hermes/openai-hermes-adapter-diagnostics.test.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/tests/hermes/openai-hermes-adapter-diagnostics.test.ts): 13 tests
  5. [`tests/phase-13-j1c-postgres-public-read-repository.test.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/tests/phase-13-j1c-postgres-public-read-repository.test.ts): 7 tests

### 3. Static Verification
- **Typecheck**: `tsc --noEmit` -> **PASS**
- **Lint**: `eslint app/iniciar-sesion/page.tsx lib/auth/return-to.ts tests/auth-return-to.test.ts` -> **PASS** (0 errors, 0 warnings)

### 4. Operational Invariants
- **OpenAI Calls**: `0`
- **Database Mutations**: `0`
- **Auth0 Network Calls**: `0`
- **Deployments**: `0`

---

## H. Re-Entry Protocol

Any future engineering phase touching:
1. Authentication preparation or login flows (`/iniciar-sesion`, `/auth/login`)
2. Return-to URL parsing or sanitization (`lib/auth/return-to.ts`)
3. Jurisprudence intent preservation (`intent=analyze`)
4. Public jurisprudence detail page entry points (`/jurisprudencia/[slug]`)

**MUST read both freeze documents in full before proceeding**:
- Prior baseline: [`docs/hermes/HERMES-PROD-A2-FREEZE.md`](file:///c:/Projects/Buholex-rev/WebBuholex/docs/hermes/HERMES-PROD-A2-FREEZE.md)
- Incremental auth freeze: [`docs/hermes/HERMES-PROD-A2.4-FREEZE.md`](file:///c:/Projects/Buholex-rev/WebBuholex/docs/hermes/HERMES-PROD-A2.4-FREEZE.md)

**Mandatory Pre-Flight Audit**:
Any unexpected divergence or drift in the following files must trigger an immediate halt and architectural audit:
- [`app/iniciar-sesion/page.tsx`](file:///c:/Projects/Buholex-rev/WebBuholex/app/iniciar-sesion/page.tsx)
- [`lib/auth/return-to.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/auth/return-to.ts)
- [`tests/auth-return-to.test.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/tests/auth-return-to.test.ts)

---

## I. Next Phase

**NEXT PRODUCT STEP**:
Audit and design authenticated jurisprudence analysis entry from `/jurisprudencia/[slug]` using the newly frozen returnTo contract.

**Strict Phase Boundaries**:
- No provider call authorization.
- No DB mutation authorization.
- No quota or entitlement implementation authorization yet.
