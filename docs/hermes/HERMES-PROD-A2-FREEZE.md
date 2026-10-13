# HERMES-PROD-A2-FREEZE
DOCUMENTATION + ARCHITECTURAL FREEZE (READ-ONLY EXCEPT DOCUMENTATION)

---

## 1. Freeze identity

- **Repository**: `C:\Projects\Buholex-rev\WebBuholex`
- **Branch**: `main`
- **Frozen HEAD**: `183614225a6829d74d25cf0ce4dcdd4039f736fd` (`1836142`)
- **Freeze date**: `2026-10-12`
- **Status**: `FROZEN`
- **Next authorized phase**: `HERMES-PROD-A2.4`

---

## 2. Milestone history

The verified milestones and exact commit SHAs extracted from repository git history:

| Phase / Milestone | Commit SHA | Subject / Scope | Status |
|---|---|---|---|
| **Hermes trust boundaries** | `ae671b1b5d427f5833c364f1a8901d9cd63a0180` | `feat: establish Hermes provider-neutral trust boundaries` | VERIFIED / FROZEN |
| **Hermes backend foundations** | `662449a2dfc08dfcd4227ad3cc566593f0070112` | `feat: add jurisprudence interpretation backend foundation` | VERIFIED / FROZEN |
| **Hermes runtime & security infra** | `55abea8b9b1aa13548782c7a6fb074d253ac96d5` | `feat: add jurisprudence interpretation runtime foundations` | VERIFIED / FROZEN |
| **Hermes public route mount** | `d975eb25327ac58d480e34ccf885eb59b7243456` | `feat: add public jurisprudence interpretation route` | VERIFIED / FROZEN |
| **A1 exact grounding citations** | `c878c8f9a87731d6f0177a6b5e81c80d5e0d58b8` | `fix: require verbatim jurisprudence grounding citations` | VERIFIED / FROZEN |
| **A1 safe provider diagnostics** | `6b9b2f13c049fd04613a8ddc5aaadb087de5022a` | `chore: add safe Hermes provider failure diagnostics` | VERIFIED / FROZEN |
| **A1.13B legal reference binding** | `966644e4ae34ac86f1a1b9ddda1b9c8baa0d5e63` | `fix: bind Hermes legal references to grounded support` | VERIFIED / FROZEN |
| **Live Hermes jurisprudence E2E** | *Post-`966644e` Verification* | First successful live E2E against synthetic staging fixture | VERIFIED / FROZEN |
| **A2.1 authenticated endpoint** | `b311e44276ed9ae158814531ac6bee9155b2e9c6` | `fix: require authenticated session for Hermes interpretation` | VERIFIED / FROZEN |
| **A2.2 public slug resolver** | `80b59367e8507c2dacafe00447399b66eed4795a` | `feat: resolve public jurisprudence slug to canonical record` | VERIFIED / FROZEN |
| **A2.3 slug-only HTTP contract** | `183614225a6829d74d25cf0ce4dcdd4039f736fd` | `fix: resolve Hermes interpretation from public slug` | VERIFIED / FROZEN |
| **A2.3C typed boundary cleanup** | `183614225a6829d74d25cf0ce4dcdd4039f736fd` | Structural typing of `withJurisprudencePublicReadRole` / removal of `as any` | VERIFIED / FROZEN |

---

## 3. Frozen HTTP contract

### Endpoint
`POST /api/jurisprudence/interpret`

### Request Contract
```json
{
  "slug": "<public-jurisprudence-slug>"
}
```

- **Schema**: `jurisprudenceHttpInterpretRequestBodySchema` (`z.object({ slug: jurisprudencePublicSlugSchema }).strict()`).
- **Client MUST NOT send**:
  - `recordId`
  - `recordVersion`
  - `fullText`
  - canonical identifiers
  - any extraneous properties (rejected immediately with `400 invalid_request_schema`).

### Success Response Contract (`200 OK`)
```json
{
  "ok": true,
  "data": {
    "slug": "<public-jurisprudence-slug>",
    "interpretation": {
      "summary": "...",
      "legalMatter": "...",
      "legalIssues": ["..."],
      "ratioDecidendi": {
        "status": "identified",
        "text": "...",
        "support": [
          {
            "quote": "...",
            "paragraphReference": "...",
            "pageReference": "..."
          }
        ]
      },
      "obiterDicta": [
        {
          "text": "...",
          "support": [
            {
              "quote": "...",
              "paragraphReference": "...",
              "pageReference": "..."
            }
          ]
        }
      ],
      "citedNorms": [
        {
          "reference": "...",
          "support": [
            {
              "quote": "...",
              "paragraphReference": "...",
              "pageReference": "..."
            }
          ]
        }
      ],
      "citedPrecedents": [
        {
          "reference": "...",
          "support": [
            {
              "quote": "...",
              "paragraphReference": "...",
              "pageReference": "..."
            }
          ]
        }
      ],
      "keyCriteria": ["..."],
      "scope": "...",
      "limitations": "...",
      "citations": [
        {
          "quote": "...",
          "paragraphReference": "...",
          "pageReference": "..."
        }
      ],
      "verificationStatus": "machine_generated_unverified"
    }
  }
}
```

- **Invariants**:
  - `recordId` and `recordVersion` are **NOT** public response fields.
  - Headers include `Cache-Control: no-store`, `Content-Type: application/json`, and opaque `x-request-id`.

---

## 4. Authentication boundary

### Invariants
1. **Authenticated session required**: The interpretation endpoint requires an authenticated workspace session (`WorkspaceSession` with `status === "authenticated"` via `getWorkspaceSession()`).
2. **Anonymous rejection**: Any anonymous or unauthenticated request returns HTTP `401` with error code `authentication_required`:
   ```json
   {
     "ok": false,
     "error": {
       "code": "authentication_required",
       "message": "Debes iniciar sesión para utilizar esta función."
     }
   }
   ```
3. **Execution order**: The authentication gate occurs **before** request body stream reading, JSON parsing, Zod schema validation, origin policy verification, public slug resolution, rate-limit bucket consumption, and orchestrator / provider execution.
4. **Side-effect isolation**: Anonymous requests never reach the resolver, rate limiter, orchestrator, or OpenAI provider (`provider calls = 0`, `rate limiter consumes = 0`, `resolver calls = 0`).
5. **No secret leakage**: The 401 response never leaks session IDs, tokens, claims, cookies, or secrets.

### Implementation and Test Files
- **Implementation**: [`lib/jurisprudence/jurisprudence-interpret-http-handler.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/jurisprudence/jurisprudence-interpret-http-handler.ts), [`lib/auth/session.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/auth/session.ts)
- **Tests**: [`tests/jurisprudence/jurisprudence-interpret-route.test.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/tests/jurisprudence/jurisprudence-interpret-route.test.ts) (`HERMES-PROD-A2.1 Server-Side Auth Gate`, CASE 1–8, ORDER CHECK)

---

## 5. Public slug resolution boundary

### Flow
```
Client slug
  → Public projection lookup (jurisprudence_published_records)
  → Server-side canonical reference { recordId, recordVersion }
  → Hermes orchestrator (interpret(canonicalRef.recordId, canonicalRef.recordVersion))
```

### Invariants
1. **Public projection only**: The resolver queries only `jurisprudencePublishedRecords` in the `jurisprudence_public` schema via `withJurisprudencePublicReadRole`.
2. **Zero internal fallback**: There is no fallback or query mechanism to the internal jurisprudence table (`jurisprudence_records`).
3. **Unpublished records cannot resolve**: Records with publication status `draft`, `in_review`, or `approved` do not exist in the public projection and return `not_found` (HTTP `404 jurisprudence_not_found`).
4. **Withdrawn records cannot resolve**: Withdrawn records removed from `jurisprudence_published_records` return `not_found`.
5. **Zero client-selected canonical IDs**: Clients cannot supply or override `recordId` or `recordVersion`. Attempts to pass canonical IDs fail strict Zod parsing with `400 invalid_request_schema`.
6. **Canonical IDs remain server-side**: Canonical identifiers remain confined to server-side memory and are never serialized into public HTTP responses.

### Implementation and Test Files
- **Resolver**: [`lib/jurisprudence/jurisprudence-public-slug-resolver.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/jurisprudence/jurisprudence-public-slug-resolver.ts)
- **Repository read path**: [`lib/jurisprudence/postgres-jurisprudence-public-read-repository.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/jurisprudence/postgres-jurisprudence-public-read-repository.ts)
- **Tests**: [`tests/jurisprudence/jurisprudence-public-slug-resolver.test.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/tests/jurisprudence/jurisprudence-public-slug-resolver.test.ts) (CASE 1–12), [`tests/jurisprudence/jurisprudence-interpret-route.test.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/tests/jurisprudence/jurisprudence-interpret-route.test.ts) (CASE 1–17)

---

## 6. Public / authenticated product boundary

### PUBLIC
- Jurisprudence public search (`/api/jurisprudence/search`, search UI catalog)
- Jurisprudence public detail read (`/jurisprudencia/[slug]`, public projection `getBySlug`)

### AUTHENTICATED
- Hermes interpretation endpoint (`POST /api/jurisprudence/interpret`)

### NOT YET IMPLEMENTED (PENDING)
- Frontend "Analyze with Búho" UI flow
- `returnTo` + intent preservation across login flow
- Free / Premium entitlement check runtime
- User-level monthly/daily quotas
- Cost guard / budget enforcement
- Concurrency limiter per user/organization
- Jurisprudence comparison flow
- Applicability reasoning flow
- General legal assistant / ungrounded RAG flow

---

## 7. Hermes grounding invariants

### Normalization Formula
```ts
normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
```

### Exact Grounding Requirements
Every evidentiary quote must be a verbatim substring of the canonical source text after whitespace normalization:
```ts
const normalizedQuote = this.normalizeText(citation.quote);
if (!normalizedSource.includes(normalizedQuote)) return false;
```

Grounding validation is **strictly mandatory** for:
- `citations[].quote`
- `ratioDecidendi.support[].quote`
- `obiterDicta[].support[].quote`
- `citedNorms[].support[].quote`
- `citedPrecedents[].support[].quote`

### Strictness Invariants (Do Not Relax)
- **Case**: Grounding checks are case-sensitive. Capitalization alterations fail (`grounding_failed`).
- **Punctuation**: Punctuation alterations, commas, dots, and typographical replacements fail.
- **Diacritics**: Accent / tilde modifications fail.
- **Substring exactness**: Added words, omitted words, or paraphrased sentences fail. Only whitespace collapse (`\s+` to `" "`) and edge trimming are permitted.

---

## 8. A1.13B reference binding invariants

The reference binding algorithm implemented in `JurisprudenceInterpretationOrchestrator.checkReference(reference, support, normalizedSource)` enforces:

```
Algorithm Steps:
1. Empty reference -> FAIL (false).
2. Literal source match: If normalizeText(reference) is an exact substring of normalizedSource -> PASS (true).
3. Nonliteral reference requires support: If support.length === 0 -> FAIL (false).
4. Grounded support: All citations in support[] must be verbatim grounded in normalizedSource -> if not, FAIL (false).
5. Extract numeric anchors:
   anchors = Array.from(new Set(reference.match(/\d+/g) ?? []))
6. Zero numeric anchors -> FAIL (false). Nonliteral references without numeric anchors cannot be bound deterministically.
7. Support binding: At least one grounded citation in support[] must contain ALL extracted anchors:
   support.some((citation) =>
     anchors.every((anchor) => containsAnchor(normalizeText(citation.quote), anchor))
   )
8. Word-boundary matching: Anchor containment uses word boundaries:
   new RegExp(`\\b${anchor}\\b`).test(quoteText)
```

- **Implementation**: [`lib/domain/services/jurisprudence-interpretation-orchestrator.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/domain/services/jurisprudence-interpretation-orchestrator.ts#L112-L153)
- **Tests**: [`tests/hermes/jurisprudence-orchestrator-b1.test.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/tests/hermes/jurisprudence-orchestrator-b1.test.ts) (`Legal Reference Semantics vs Strict Quote Grounding`, CASE 1–18)

---

## 9. Provider/runtime invariants

### Verified Runtime Parameters
- **Retries**: `0` (`retryCount: 0` in diagnostics; no automatic retries configured).
- **Fallback provider**: None. Failures fail closed to a safe neutral outcome.
- **Concurrency**: No parallel provider calls for a single request.
- **Timeout**: `30000 ms` (`DEFAULT_OPENAI_TIMEOUT_MS = 30000`; bounds: `1000 ms` to `300000 ms`).
- **Maximum Source Length**: `100000` characters (`JurisprudenceInterpretationOrchestrator.MAX_SOURCE_LENGTH`).
- **Public failure contract**:
  - Provider failure -> HTTP `502` with `{ "code": "provider_failure", "message": "El proveedor de análisis presentó una falla temporal." }`.
  - Schema mismatch -> HTTP `502` with `{ "code": "invalid_interpretation", "message": "La interpretación obtenida no cumple con la estructura esperada." }`.
  - Grounding failure -> HTTP `422` with `{ "code": "grounding_failed", "message": "La interpretación no pudo ser respaldada con citas exactas del texto canónico." }`.
  - Source too large -> HTTP `422` with `{ "code": "source_too_large", "message": "El texto canónico del registro supera el límite de procesamiento permitido." }`.
- **Secret & Diagnostic Protection**:
  - `OPENAI_API_KEY` is never printed, logged, or returned in diagnostic payloads.
  - Prompts and system policies are never emitted in diagnostics or public error responses.
  - Diagnostic logger outputs structured single-line JSON with failure class, elapsed time, model, and upstream status.

### Model Policy
- **Jurisprudence Model**: `gpt-6.1-sol` (via `BUHOLEX_JURISPRUDENCE_MODEL` environment variable). Any alteration requires explicit phase authorization.

---

## 10. Rate limiting boundary

### Execution Order & Pipeline
```
1. Method Check (POST)
2. Content-Type Check (application/json)
3. Auth Session Gate (getWorkspaceSession)
4. Body Length & JSON Parsing (max 2048 bytes)
5. Request Body Schema Validation (slug strict parsing)
6. Origin Validation Gate
7. Public Slug -> Canonical Record Resolution
8. Rate Limiter Consumption:
   a. Subject Limiter (scope = "subject", limit = subjectMax, window = subjectWindowSeconds)
   b. Global Limiter (scope = "global", limit = globalMax, window = globalWindowSeconds)
9. Canonical Orchestration (interpret)
```

### Limiter Semantics
- **Resolver precedes limiter**: The public slug resolver executes **before** rate limit token consumption. Non-existent or invalid slugs return 404 or 400 without depleting the user's quota.
- **Subject Limiter**:
  - Default: `5` requests per `60` seconds (`DEFAULT_RATE_LIMIT_SUBJECT_MAX = 5`, `DEFAULT_RATE_LIMIT_SUBJECT_WINDOW_SECONDS = 60`).
  - Scope: `"subject"`.
- **Global Limiter**:
  - Default: `60` requests per `3600` seconds (`DEFAULT_RATE_LIMIT_GLOBAL_MAX = 60`, `DEFAULT_RATE_LIMIT_GLOBAL_WINDOW_SECONDS = 3600`).
  - Scope: `"global"`.
- **HMAC Subject Derivation**:
  - Subject hash is derived using HMAC-SHA256: `hashRateLimitSubject(secret, rawIp)`.
  - Generates a 64-character lowercase hex digest.
  - Raw client IP addresses are **never** persisted to the rate limit table.
- **Atomic PostgreSQL Primitive**:
  - Executed via `INSERT ... ON CONFLICT ("scope", "subject_hash") DO UPDATE ... RETURNING ...` under `withJurisprudencePublicWriteRole`.
  - PostgreSQL authoritative server clock (`now()`) determines window expiration.
- **Fail Closed**: Database or limiter failure returns HTTP `503 limiter_unavailable`.

---

## 11. PostgreSQL role boundary

### Runtime & Transaction Contract
Role helper: `withJurisprudencePublicReadRole` in [`database/roles.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/database/roles.ts).

```ts
export interface JurisprudenceRoleTransactionScope {
  execute(query: unknown): Promise<unknown>;
}

export interface JurisprudenceRoleDatabaseScope<
  TTx extends JurisprudenceRoleTransactionScope = JurisprudenceTransaction
> {
  transaction<T>(
    transaction: (tx: TTx) => Promise<T>,
    config?: {
      isolationLevel?: "read uncommitted" | "read committed" | "repeatable read" | "serializable";
      accessMode?: "read only" | "read write";
      deferrable?: boolean;
    }
  ): Promise<T>;
}

export async function withJurisprudencePublicReadRole<
  T,
  TTx extends JurisprudenceRoleTransactionScope = JurisprudenceTransaction,
>(
  db: JurisprudenceRoleDatabaseScope<TTx>,
  callback: (tx: TTx) => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    // FAIL CLOSED: If SET LOCAL ROLE fails, an error is thrown and callback is NEVER executed.
    await tx.execute(sql`SET LOCAL ROLE jurisprudence_public_read_runtime`);
    return await callback(tx);
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}
```

### Rationale (HERMES-PROD-A2.3C)
- The transaction scope is parameterized generically with `TTx extends JurisprudenceRoleTransactionScope = JurisprudenceTransaction`.
- Production code defaults to Drizzle's real `JurisprudenceTransaction`.
- Tests and repositories can supply structurally typed database abstractions **without** resorting to `as any` or unsafe type assertions.
- `SET LOCAL ROLE jurisprudence_public_read_runtime` is guaranteed before the callback.
- Isolation level is hardcoded to `repeatable read` and access mode to `read only`.
- Fail-closed semantics are preserved: if role switching fails, the callback is never executed.

---

## 12. Type-safety invariant

### Prohibited Escape Hatches
In Hermes and BúhoLex production code and tests, the following are strictly **PROHIBITED** unless an explicit new phase justifies and authorizes an exception:
- `as any`
- `as unknown as <Target>`
- `@ts-ignore`
- `@ts-expect-error`
- Blanket `eslint-disable`
- `Function` type as compatibility escape hatch
- Casts that conceal real contract incompatibility

### Principle
Types must be resolved at the real architectural boundary using structural interfaces and Zod runtime schema assertions.

---

## 13. Protected files / architectural boundaries

The following files constitute the frozen Hermes production core and perimeter. Casual or unauthorized modifications to these files are prohibited. Any future changes require a named, approved phase.

### Hermes Core
- [`lib/hermes/adapters/openai-hermes-adapter.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/hermes/adapters/openai-hermes-adapter.ts)
- [`lib/hermes/adapters/openai-hermes-config.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/hermes/adapters/openai-hermes-config.ts)
- [`lib/hermes/config/openai-hermes-config.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/hermes/config/openai-hermes-config.ts)
- [`lib/hermes/contracts/hermes-provider-port.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/hermes/contracts/hermes-provider-port.ts)
- [`lib/hermes/contracts/hermes-envelope.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/hermes/contracts/hermes-envelope.ts)
- [`lib/hermes/contracts/hermes-messages.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/hermes/contracts/hermes-messages.ts)
- [`lib/hermes/contracts/hermes-provider-error.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/hermes/contracts/hermes-provider-error.ts)
- [`lib/hermes/contracts/hermes-data-classification.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/hermes/contracts/hermes-data-classification.ts)
- [`lib/hermes/contracts/jurisprudence-interpretation.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/hermes/contracts/jurisprudence-interpretation.ts)
- [`lib/hermes/boundaries/jurisprudence-system-policy-boundary.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/hermes/boundaries/jurisprudence-system-policy-boundary.ts)
- [`lib/hermes/boundaries/jurisprudence-user-content-boundary.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/hermes/boundaries/jurisprudence-user-content-boundary.ts)
- [`lib/domain/services/jurisprudence-interpretation-orchestrator.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/domain/services/jurisprudence-interpretation-orchestrator.ts)
- [`lib/domain/repositories/jurisprudence-interpretation-source-port.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/domain/repositories/jurisprudence-interpretation-source-port.ts)

### HTTP Boundary
- [`app/api/jurisprudence/interpret/route.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/app/api/jurisprudence/interpret/route.ts)
- [`lib/jurisprudence/jurisprudence-interpret-http-handler.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/jurisprudence/jurisprudence-interpret-http-handler.ts)
- [`lib/schemas/jurisprudence-http.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/schemas/jurisprudence-http.ts)

### Public Resolver & Projection Read Path
- [`lib/jurisprudence/jurisprudence-public-slug-resolver.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/jurisprudence/jurisprudence-public-slug-resolver.ts)
- [`lib/jurisprudence/postgres-jurisprudence-public-read-repository.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/jurisprudence/postgres-jurisprudence-public-read-repository.ts)
- [`lib/jurisprudence/canonical-jurisprudence-interpretation-source-adapter.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/jurisprudence/canonical-jurisprudence-interpretation-source-adapter.ts)
- [`lib/jurisprudence/jurisprudence-interpretation-runtime.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/jurisprudence/jurisprudence-interpretation-runtime.ts)
- [`lib/schemas/jurisprudence-public-search-gateway.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/schemas/jurisprudence-public-search-gateway.ts)

### Auth & Session Boundary
- [`lib/auth/session.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/auth/session.ts)
- [`lib/auth/auth0.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/auth/auth0.ts)
- [`types/auth.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/types/auth.ts)

### Security & Rate Limiting
- [`lib/security/jurisprudence-rate-limiter-port.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/security/jurisprudence-rate-limiter-port.ts)
- [`lib/security/jurisprudence-rate-limiter-config.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/security/jurisprudence-rate-limiter-config.ts)
- [`lib/security/postgres-jurisprudence-rate-limiter.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/security/postgres-jurisprudence-rate-limiter.ts)
- [`lib/security/rate-limit-subject.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/lib/security/rate-limit-subject.ts)

### Database Role Boundary
- [`database/roles.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/database/roles.ts)
- [`database/client.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/database/client.ts)
- [`database/config.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/database/config.ts)
- [`database/schema/jurisprudence.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/database/schema/jurisprudence.ts)

---

## 14. Regression test map

| Invariant | Test File | What It Proves |
|---|---|---|
| **Auth Session Gate** | [`tests/jurisprudence/jurisprudence-interpret-route.test.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/tests/jurisprudence/jurisprudence-interpret-route.test.ts) | Unauthenticated callers receive 401 `authentication_required`; zero calls to provider, limiter, or resolver; auth gate rejects before body parsing. |
| **Slug-Only Input Contract** | [`tests/jurisprudence/jurisprudence-interpret-route.test.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/tests/jurisprudence/jurisprudence-interpret-route.test.ts) | Request accepts only `{ "slug": "..." }`; missing, empty, or malformed slugs return 400. |
| **Canonical ID Injection Rejection** | [`tests/jurisprudence/jurisprudence-interpret-route.test.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/tests/jurisprudence/jurisprudence-interpret-route.test.ts) | Passing `recordId`, `recordVersion`, or other properties fails strict Zod validation with 400. |
| **Public Slug Resolver** | [`tests/jurisprudence/jurisprudence-public-slug-resolver.test.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/tests/jurisprudence/jurisprudence-public-slug-resolver.test.ts) | Maps valid public slug to canonical `{ recordId, recordVersion }`; queries public projection table only. |
| **Withdrawn / Unpublished Absence** | [`tests/jurisprudence/jurisprudence-public-slug-resolver.test.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/tests/jurisprudence/jurisprudence-public-slug-resolver.test.ts) | Records not in `jurisprudence_published_records` return `not_found` (HTTP 404); no internal DB fallback. |
| **Resolver Failure Handling** | [`tests/jurisprudence/jurisprudence-interpret-route.test.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/tests/jurisprudence/jurisprudence-interpret-route.test.ts) | Resolver unexpected throw returns safe 500 without leaking DB or SQL internals; orchestrator not called. |
| **Rate Limiter Pipeline** | [`tests/jurisprudence/jurisprudence-interpret-route.test.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/tests/jurisprudence/jurisprudence-interpret-route.test.ts), [`tests/security/postgres-jurisprudence-rate-limiter.test.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/tests/security/postgres-jurisprudence-rate-limiter.test.ts) | Subject and global rate limits return 429 with `Retry-After`; limiter failure fails closed with 503; resolver executes before rate limit consumption. |
| **HMAC Subject Privacy** | [`tests/security/rate-limit-subject.test.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/tests/security/rate-limit-subject.test.ts) | Client IP is normalized and hashed with HMAC-SHA256 (64-char hex); raw IP is never passed to limiter. |
| **Safe Provider Diagnostics & Public Code** | [`tests/hermes/openai-hermes-adapter-diagnostics.test.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/tests/hermes/openai-hermes-adapter-diagnostics.test.ts) | Provider errors map to structured diagnostic event and safe public 502 `provider_failure` without leaking API keys or prompts. |
| **Exact Grounding Enforcement** | [`tests/hermes/jurisprudence-orchestrator-b1.test.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/tests/hermes/jurisprudence-orchestrator-b1.test.ts) | Case alterations, punctuation edits, added words, or paraphrasing fail with 422 `grounding_failed`. |
| **A1.13B Legal Reference Binding** | [`tests/hermes/jurisprudence-orchestrator-b1.test.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/tests/hermes/jurisprudence-orchestrator-b1.test.ts) | Nonliteral references require grounded support containing all numeric anchors with word boundary matching. |
| **Canonical ID Non-Exposure** | [`tests/jurisprudence/jurisprudence-interpret-route.test.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/tests/jurisprudence/jurisprudence-interpret-route.test.ts) | Successful response serialized JSON contains neither `recordId` nor `recordVersion`. |
| **PostgreSQL Public Read Role & Types** | [`tests/phase-13-j1c-postgres-public-read-repository.test.ts`](file:///c:/Projects/Buholex-rev/WebBuholex/tests/phase-13-j1c-postgres-public-read-repository.test.ts) | Verifies `SET LOCAL ROLE jurisprudence_public_read_runtime` in same transaction with repeatable read / read only; typed without `as any`. |
| **Public Search & Detail Regression** | [`tests/phase-11-n-jurisprudence-public-search-experience.test.tsx`](file:///c:/Projects/Buholex-rev/WebBuholex/tests/phase-11-n-jurisprudence-public-search-experience.test.tsx), [`tests/phase-11-o-jurisprudence-public-detail-experience.test.tsx`](file:///c:/Projects/Buholex-rev/WebBuholex/tests/phase-11-o-jurisprudence-public-detail-experience.test.tsx) | Verifies public search and detail interfaces operate normally against public models. |

---

## 15. Known live-E2E checkpoint

- **Status**: VERIFIED & COMPLETED
- **Description**: The first proven live Hermes jurisprudence end-to-end execution succeeded against the staging environment.
- **Fixture Type**: Synthetic staging fixture (isolated non-catalog test record).
- **Outcome**: The OpenAI provider returned valid structured output adhering to `buholex_jurisprudence_interpretation`, which passed all schema checks, verbatim quote grounding validations, and A1.13B numeric anchor reference bindings.
- **Policy**: Do NOT repeat live provider calls against this fixture merely to reconfirm already-proven behavior. Paid model calls must be preserved for actual new functionality.
- **Security Checkpoint**: No API keys, database credentials, or secret connection strings are stored in documentation or source control.

---

## 16. Explicitly frozen synthetic fixture

- **Fixture Identifier**: `hermes-synthetic-legal-test-1-6d8b2a1e-4c3f-4e9b-b2a1-8e7c6d5a4b3c`
- **Record Version**: `1`
- **Operational Rules**:
  - `DO NOT MODIFY`
  - `DO NOT REPUBLISH`
  - `DO NOT INSERT INTO PUBLIC CATALOG`
  - `DO NOT REUSE FOR UNNECESSARY PAID PROVIDER CALLS`

---

## 17. Next phase

### Next Authorized Phase
`HERMES-PROD-A2.4`: `RETURNTO + INTENT=ANALYZE`

### Authorized Scope
1. Preserve selected jurisprudence `slug` across the user login flow.
2. Safe internal relative `returnTo` handling only (strict URL parsing / validation).
3. Strictly prevent open redirects.
4. No canonical IDs in URL parameters (slug only).
5. No changes to Hermes core orchestrator, provider adapters, or trust boundaries.
6. No user quotas or subscription plan enforcement yet.
7. No live OpenAI provider calls required for implementation.

---

## 18. Re-entry protocol

Before beginning ANY future Hermes phase (including `HERMES-PROD-A2.4`):

1. **Read this freeze document** in full.
2. **Verify current HEAD**: Run `git rev-parse HEAD` and compare with the frozen HEAD (`183614225a6829d74d25cf0ce4dcdd4039f736fd`).
3. **Audit protected files**: Check whether any protected files listed in Section 13 have drifted. If unexpected alterations are detected:
   - **STOP IMMEDIATELY**.
   - Perform an architectural audit before making further modifications.
4. **Run regression test suite**:
   ```bash
   npm test tests/jurisprudence/jurisprudence-interpret-route.test.ts
   npm test tests/jurisprudence/jurisprudence-public-slug-resolver.test.ts
   npm test tests/hermes/jurisprudence-orchestrator-b1.test.ts
   npm test tests/hermes/openai-hermes-adapter-diagnostics.test.ts
   npm test tests/phase-13-j1c-postgres-public-read-repository.test.ts
   ```
5. **Preserve invariants**: Do not silently weaken or alter frozen invariants, grounding strictness, auth gates, rate limit sequences, or type safety rules.
