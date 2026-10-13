# HERMES-PROD-A3.1-CONTROLS-DESIGN
USAGE, ENTITLEMENT, COST, CONCURRENCY & IDEMPOTENCY CONTROLS
ARCHITECTURAL AUDIT & HARDENED CONTROL LAYER DESIGN FOR HERMES JURISPRUDENCE ANALYSIS
DOCUMENTATION ONLY — ZERO SOURCE IMPLEMENTATION IN THIS PHASE

---

## 1. Executive Summary & Design Identity

- **Document Identifier**: `HERMES-PROD-A3.1-CONTROLS-DESIGN`
- **Scope**: Comprehensive architectural audit and server-side control layer design for Hermes jurisprudence analysis (`POST /api/jurisprudence/interpret`).
- **Objective**: Establish production-grade protections for:
  1. Entitlement and authorization to consume Hermes;
  2. Usage quotas and accounting;
  3. LLM provider cost protection;
  4. Server-side concurrency control across multi-instance serverless runtimes;
  5. Duplicate paid-call prevention and true operation idempotency;
  6. Atomic provider-boundary transaction combining daily call ceiling and durable dispatch marker;
  7. Usage reservation, commit, and release lifecycle semantics;
  8. Safe, privacy-preserving failure modes and kill switch mechanisms.
- **Status**: `AUDIT & DESIGN ONLY` (Zero code changes, zero migrations, zero database writes, zero OpenAI calls, zero deployments).
- **Target Repository**: `C:\Projects\Buholex-rev\WebBuholex`
- **Baseline Git HEAD**: `7b1b318ac8a51b80cfef8841d1032bdcc6d2d8dc` (`7b1b318 feat: add authenticated Hermes jurisprudence analysis`)
- **Governing Documents**:
  - [`docs/hermes/HERMES-PROD-A2-FREEZE.md`](./HERMES-PROD-A2-FREEZE.md) (Core, Orchestrator, Grounding, Roles, HTTP Endpoint)
  - [`docs/hermes/HERMES-PROD-A2.4-FREEZE.md`](./HERMES-PROD-A2.4-FREEZE.md) (Safe `returnTo` + `intent=analyze` boundary)
  - [`docs/hermes/HERMES-PROD-A2.5-DESIGN.md`](./HERMES-PROD-A2.5-DESIGN.md) (Frontend Entry Point Design)

---

## 2. Audited Current State (A2.6 Baseline)

### 2.1 Public Frontend Entry (`/jurisprudencia/[slug]`)
- **Route File**: [`app/jurisprudencia/[slug]/page.tsx`](../../app/jurisprudencia/[slug]/page.tsx)
  - Server Component calling `getWorkspaceSession()` server-side.
  - Extracts strictly `const isAuthenticated = session.status === "authenticated"` and forwards only this boolean to client components.
  - Zero session tokens, user IDs, or internal identifiers are exposed in public component props.
- **Client Components**:
  - [`components/jurisprudence/jurisprudence-public-detail.tsx`](../../components/jurisprudence/jurisprudence-public-detail.tsx): Enforces strict intent parsing (`extractIntentAnalyze` requiring exactly `["analyze"]`). Mounts the analysis panel only when projection data resolves successfully.
  - [`components/jurisprudence/jurisprudence-analysis-panel.tsx`](../../components/jurisprudence/jurisprudence-analysis-panel.tsx): Manages user confirmation, client-side synchronous lock (`inFlightRef`), single-owner anonymous navigation (`<a href={loginTarget} role="button">`), state machine (`idle`, `ready`, `submitting`, `success`, `error`), and `AbortController` cancellation.
  - [`components/jurisprudence/jurisprudence-interpretation-view.tsx`](../../components/jurisprudence/jurisprudence-interpretation-view.tsx): Renders structured interpretation with verbatim grounding quotes, reference locators, and `machine_generated_unverified` banner.

### 2.2 HTTP Endpoint & Core Handlers
- **Route File**: [`app/api/jurisprudence/interpret/route.ts`](../../app/api/jurisprudence/interpret/route.ts)
  - `export const runtime = "nodejs";`
  - `export const dynamic = "force-dynamic";`
  - Forwards `POST` requests to `handleJurisprudenceInterpretPost(request)`.
- **HTTP Handler**: [`lib/jurisprudence/jurisprudence-interpret-http-handler.ts`](../../lib/jurisprudence/jurisprudence-interpret-http-handler.ts)
  - Validates HTTP method (`POST`), Content-Type (`application/json`), body size (max 2048 bytes), body schema (`{ slug: string }`), and origin header.
  - Enforces `WorkspaceSession` status (`session.status === "authenticated"`).
  - Resolves public slug to canonical record reference (`recordId`, `recordVersion`) via `jurisprudencePublicSlugResolver`.
  - Executes rate limiting via `PostgresJurisprudenceRateLimiter`.
  - Executes orchestration via `JurisprudenceInterpretationOrchestrator.interpret(recordId, recordVersion)`.
  - Maps domain results to standard HTTP error envelopes (`400`, `401`, `403`, `404`, `409`, `422`, `429`, `502`, `503`, `500`).
- **Rate Limiting Engine**:
  - Uses table `jurisprudence_public.jurisprudence_rate_limits`.
  - Scope `subject`: Hashed client IP address (`hashRateLimitSubject(secret, rawIp)`).
  - Scope `global`: Hashed string `"global"`.
  - Implements a fixed-window request counter in Postgres via single atomic `INSERT ... ON CONFLICT DO UPDATE ... RETURNING request_count`.

---

## 3. Existing Commercial, Usage & Security Infrastructure Inventory

An exhaustive audit of the codebase revealed the exact inventory of pre-existing schemas, modules, and capabilities:

| Domain / Concept | Existing Tables / Files | Current Functionality & Owner | Reusable for Hermes? |
|---|---|---|---|
| **Payment Orders & Quotes** | `payments_private.payment_quotes`<br>`payments_private.payment_orders`<br>`payments_private.payment_checkout_sessions` | Manages one-off purchases (e.g. professional consultation) via Culqi payment gateway in Peruvian Soles (PEN). Owned by `lib/payments/*`. | **NO**. These model transactional checkout orders, not SaaS recurring plans, LLM token meters, or automated quotas. |
| **Payment Idempotency** | `payments_private.payment_orders.idempotency_key`<br>`payments_private.payment_attempts.operation_key`<br>`payments_private.payment_provider_events.deduplication_key` | Guarantees single-execution payment attempts and deduplicates webhook events from Culqi. | **PATTERN ONLY**. Architectural model (unique constraint on key) is valid, but table belongs strictly to `payments_private`. |
| **Operator RBAC** | `authorization.operators`<br>`authorization.external_identity_bindings`<br>`authorization.operator_capabilities`<br>`authorization.operator_jurisprudence_roles` | Authorizes administrative operators (`complaints:respond`, `payments:read`, etc.) by mapping Auth0 `sub` to internal `operator_id`. Owned by `database/repositories/authorization.*`. | **PATTERN ONLY**. Demonstrates how to map Auth0 `sub` to internal UUIDs without leaking Auth0 strings, but applies only to staff operators. |
| **Command Idempotency** | `jurisprudence_internal.jurisprudence_idempotency`<br>`jurisprudence_internal.jurisprudence_publication_idempotency`<br>`jurisprudence_internal.jurisprudence_editorial_idempotency` | Enforces command fingerprinting and result deduplication for editorial and publication ingestion workflows. | **PATTERN ONLY**. Tables are located in `jurisprudence_internal` and restricted to admin ingestion commands. |
| **Rate Limiter** | `jurisprudence_public.jurisprudence_rate_limits`<br>`lib/security/postgres-jurisprudence-rate-limiter.ts` | Tracks IP flood limits (e.g. 10 reqs/60s) via unlogged/logged Postgres table using `withJurisprudencePublicWriteRole`. | **PRESERVE AS IS**. Must remain the front-line flood barrier, but is completely separate from commercial quota. |
| **Subscriptions / Plans** | *None* | No subscription tables, tier tables, or user plan definitions exist in the database. | **DOES NOT EXIST**. Must be established in the control layer. |
| **User Quotas / Allowances** | *None* | No periodic credit balance or interpretation count ledger exists for regular users. | **DOES NOT EXIST**. Must be established in the control layer. |
| **Concurrency Leases** | *None* | No distributed semaphore or concurrency lock table exists for LLM provider operations. | **DOES NOT EXIST**. Must be established in the control layer. |
| **Kill Switch / Budgets** | `lib/hermes/config/openai-hermes-config.ts` | Configures model (`gpt-6.1-sol`), API key, and timeout (30s). No global kill switch or daily budget cap exists. | **PARTIAL**. Needs application-level disable flag and daily ceiling. |

---

## 4. Authenticated Subject Identity & Entitlement Scope

### 4.1 Session Identity Audit
In [`lib/auth/session.ts`](../../lib/auth/session.ts) and [`types/auth.ts`](../../types/auth.ts):
```ts
export interface WorkspaceSession {
  status: "authenticated" | "unauthenticated" | "loading" | "not_configured";
  sessionId: string | null;         // Extracted from Auth0 internal.sid
  providerSubjectId: string | null; // Extracted from session.user.sub
  issuedAt: string | null;
  expiresAt: string | null;
  provider: "auth0" | null;
}
```

- **`sessionId` (Session ID)**:
  - Sourced from Auth0 cookie metadata `internal.sid`.
  - **Ephemeral**: Rotates on re-login, session renewal, or cookie expiration.
  - **UNSUITABLE** as an entitlement or quota accounting key.
- **`providerSubjectId` (Provider Subject)**:
  - Sourced from Auth0 `session.user.sub` (e.g., `auth0|64f2a...` or `google-oauth2|10293...`).
  - **Stable**: Persists across user logins, browser restarts, and device handoffs.
  - **SUITABLE** as the primary identity anchor for entitlement and quota evaluation.
- **Internal User / Account ID**:
  - The repository currently does **not** have a public user profile table in PostgreSQL. Auth0 is the sole identity authority for regular users.
  - Storing raw Auth0 subject strings directly as foreign keys in all usage tables would couple the database to a third-party identity provider schema.
  - **Recommendation**: Create an internal subject binding table `hermes_control.subject_identities` that maps `(provider, provider_subject_id)` to an immutable internal `subject_id` (standard PostgreSQL UUID generated via `gen_random_uuid()`).
  - **Composite Uniqueness**: Enforce `UNIQUE (provider, provider_subject_id)` to ensure provider namespaces cannot collide if multiple identity providers are supported in the future.

### 4.2 Entitlement Scope: User-Scoped Only
- **Current Architecture**: The application operates strictly on an individual authenticated user model. While `/app` is named "workspace", there are no multi-tenant team accounts, shared organizational budgets, or workspace member permission tables for public users in PostgreSQL.
- **Decision**: Hermes entitlement is **strictly user-scoped** (`subject_id`).
- **No Speculative Schema Columns**: We do **not** add speculative `workspace_id` columns to control tables in this phase. If team/workspace subscriptions are introduced in a future milestone, a dedicated migration will introduce workspace accounts, organizational ledgers, and membership mappings intentionally.

---

## 5. Architectural Separation: Six Control Layers + Provider Execution Layer

The Hermes architecture strictly freezes the separation between the **Six Control Layers** and the **Provider Execution Layer**:

```
══════════════════════════════════════════════════════════════════════════════════════════
SIX CONTROL LAYERS
══════════════════════════════════════════════════════════════════════════════════════════

┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. HTTP FLOOD / RATE LIMITING LAYER                                                    │
│    PostgresJurisprudenceRateLimiter (IP-based, short window: 60s, limit: 10 reqs)      │
│    Goal: Protect HTTP server from denial-of-service, scraping, and runaway loops.      │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 2. OPERATION IDEMPOTENCY LAYER                                                         │
│    Idempotency-Key Header + UNIQUE(subject_id, idempotency_key)                        │
│    Goal: Prevent double-spending or replay of the same user intent on network retry.   │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 3. ACTIVE RECORD DEDUPLICATION LAYER                                                   │
│    Partial unique index on (subject_id, record_id, record_version) in-flight           │
│    Goal: Prevent multi-tab concurrent analysis of the same document.                   │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 4. CONCURRENCY LEASE / CAPACITY LAYER                                                  │
│    Namespaced advisory-lock gate (Max 1 per user, Max N globally)                      │
│    Goal: Prevent simultaneous provider saturation, OpenAI rate limits, and spikes.     │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 5. DAILY PROVIDER CALL CEILING LAYER                                                   │
│    PostgreSQL-backed atomic daily feature counter (day_utc, feature)                   │
│    Goal: Bound total provider calls per day across all users before dispatch.          │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 6. COMMERCIAL ENTITLEMENT / QUOTA LAYER                                                │
│    Subject entitlement balance (explicitly provisioned quota per period)               │
│    Goal: Enforce commercial plan allowances over monthly/billing periods.              │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            ▼
══════════════════════════════════════════════════════════════════════════════════════════
PROVIDER EXECUTION LAYER
══════════════════════════════════════════════════════════════════════════════════════════
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 7. PROVIDER EXECUTION LAYER                                                            │
│    OpenAI Hermes Provider (gpt-6.1-sol execution via OpenAI SDK)                       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

| Layer | Responsibility | Primary Key / Anchor | Time Horizon | Unit | Cost Aware |
|---|---|---|---|---|---|
| **1. HTTP Flood** | Prevent DoS bursts | Client IP HMAC + Global | 10–60 seconds | HTTP Requests | No |
| **2. Operation Idempotency** | Prevent duplicate execution of same intent | Client `Idempotency-Key` + Subject | 30 days row retention | Unique Client Action | Yes |
| **3. Active Record Dedup** | Prevent concurrent calls on same doc | `(subject_id, record_id, record_version)` | Duration of call (in-flight) | Canonical Record Version | Yes |
| **4. Concurrency Lease** | Prevent simultaneous execution saturation | Subject ID + Namespaced Gate | 60–90 seconds (active lease) | Active In-Flight Leases | Yes |
| **5. Daily Call Ceiling** | Absolute daily platform provider bound | `(day_utc, feature)` | 1 UTC calendar day | Provider Execution Calls | Yes |
| **6. Commercial Quota** | Enforce periodic commercial caps | Subject ID / Entitlement Period | Authoritative entitlement period | Paid Analysis Units | Yes |
| **7. Provider Execution** | Structured output generation & grounding | Canonical Record ID | Request execution (max 30s) | Tokens / Model Computation | Yes |

---

## 6. Distinguishing Active Deduplication from True Request Idempotency

### 6.1 Vulnerability in Active Record Deduplication Alone
A partial unique index on:
```sql
UNIQUE ("subject_id", "record_id", "record_version")
WHERE "status" IN ('reserved', 'provider_dispatch_started');
```
is effective **only** while the operation is actively in-flight.

**The Failure Mode**:
Once Operation A finishes and transitions to a terminal state (`completed_success` or failure):
1. The partial index condition (`status IN ('reserved', 'provider_dispatch_started')`) no longer matches Operation A.
2. If a network drop, timeout retry, or automated client resubmits the original POST request:
3. The server sees no in-flight record for `(subject_id, record_id, record_version)`.
4. Without an explicit idempotency key, the server treats the retry as a brand new user intent.
5. A **second paid provider execution** is initiated and billed!

### 6.2 True Operation Identity: The `Idempotency-Key` Contract
To guarantee that the exact same user action can never trigger multiple paid executions, the endpoint must support a dedicated HTTP request header:

```http
Idempotency-Key: <opaque UUIDv4>
```

#### Properties:
1. **Client-Generated**: Generated by the frontend component exactly once per explicit user analysis click ("Analizar con Búho").
2. **Reused on Retries**: Reused automatically if the client performs a network retry, re-establishes connection, or resends the identical request.
3. **Rotated on New Action**: When the user explicitly clicks "Volver a analizar", a brand new `Idempotency-Key` is generated.
4. **Decoupled from Identifiers**:
   - Must **not** use `slug` alone.
   - Must **not** use `recordId` alone.
   - Must **never** expose internal canonical database IDs.
   - The HTTP request body remains strictly `{ "slug": string }`.
5. **Server-Side Uniqueness**:
   Enforced in `hermes_control.analysis_operations` via:
   ```sql
   UNIQUE ("subject_id", "idempotency_key")
   ```

### 6.3 Lifecycle Behavior for the Same Idempotency Key

When a request arrives with an `Idempotency-Key`, the server queries `hermes_control.analysis_operations`:

| Existing Operation State | Server Behavior | Provider Invoked? | Public HTTP Response |
|---|---|---|---|
| **A. Key Unseen (New)** | Insert operation in `reserved` state. Proceed to concurrency & execution. | Yes (if gates pass) | 200 OK (upon completion) |
| **B. Key Exists + `reserved` or `provider_dispatch_started`** | Active execution in-flight. **DO NOT** invoke provider. | **NO** | `409 Conflict`<br>`code: "operation_in_progress"` |
| **C. Key Exists + Completed (`completed_success` or completed failure)** | Operation already executed. **DO NOT** invoke provider. | **NO** | `409 Conflict`<br>`code: "operation_already_completed"` |
| **D. Key Exists + `released` before provider dispatch** | Operation was aborted prior to provider dispatch (e.g. concurrency full). Retry with same key is rejected; client must initiate a fresh action. | **NO** | `409 Conflict`<br>`code: "operation_already_completed"` |
| **E. Key Exists + `outcome_unknown`** | Ambiguous provider outcome (e.g. OpenAI timeout). **NEVER** initiate another provider call with the same key. | **NO** | `502 Bad Gateway`<br>`code: "provider_outcome_unknown"` |

> [!IMPORTANT]
> **Cardinal Invariant**: Under NO circumstances may the receipt of an already-seen `Idempotency-Key` cause a second provider execution.

### 6.4 Completed Idempotent Replay Policy
Because Hermes adheres to strict privacy minimization (Section 16), the generated legal interpretation JSON is **not** persisted in the `hermes_control` database.

Therefore:
- When a client replays an `Idempotency-Key` that is already in a completed terminal state, the server **cannot** re-synthesize or replay the previous interpretation from `hermes_control`.
- The server must **NOT** invent un-vetted interpretation persistence merely to support idempotency replay.
- **Authoritative Policy**:
  The endpoint returns HTTP `409 Conflict` with error code `operation_already_completed`:
  ```json
  {
    "ok": false,
    "error": {
      "code": "operation_already_completed",
      "message": "La operación con esta clave de idempotencia ya fue procesada anteriormente. Para solicitar un nuevo análisis, inicie una nueva acción."
    }
  }
  ```
  This completely eliminates double-billing while clearly informing the client that the operation has already been executed.

### 6.5 Concrete Idempotency Retention Mechanism (No Separate Tombstone Table)
To reconcile operational database size with the rule that old keys must never re-execute:
1. **Unified Table Model**: We do **not** introduce a separate speculative tombstone table. The minimal row in `hermes_control.analysis_operations` itself serves as the authoritative idempotency record for the entire **30-day idempotency retention horizon**.
2. **Pruning Nonessential Detail**: After an initial operational window (e.g. 48 hours), automated background cleanup may prune or nullify nonessential diagnostic columns (such as detailed runtime diagnostics or payload trace metadata). However, the core identity row containing `(subject_id, idempotency_key)`, the terminal status (`completed_success`, `completed_validation_failure`, `completed_grounding_failure`, `outcome_unknown`), and lifecycle timestamps remains strictly intact.
3. **Authoritative Constraint**: The table constraint `UNIQUE ("subject_id", "idempotency_key")` remains unbroken and actively enforced for the entire 30-day horizon.
4. **Purge Beyond 30 Days**: Only after the full supported 30-day idempotency retention horizon has elapsed may the minimal operation row be purged from PostgreSQL.
5. **Contract Horizon**: The product contract guarantees replay protection strictly within the supported 30-day retention window. Replaying an `Idempotency-Key` older than 30 days is treated as expired/unknown by the system and rejected; the product contract does not promise indefinite replay protection beyond the documented 30-day horizon.

---

## 7. Atomic Global & Subject Concurrency Algorithm

### 7.1 Elimination of the `count(*)` Race Condition
Under PostgreSQL `READ COMMITTED` isolation, a naïve:
`INSERT INTO concurrency_leases ... WHERE (SELECT count(*) ...) < MAX_CONCURRENT`
allows concurrent transactions executing across serverless instances in the same millisecond to observe the same count and insert over the limit.

### 7.2 Comparative Evaluation of Serialization Primitives
1. **Option A: Preallocated Numbered Slots**:
   Pre-seeding rows `1..N` and acquiring via PostgreSQL CTE row locking:
   ```sql
   WITH available_slot AS (
     SELECT "slot_id" FROM "hermes_control"."concurrency_slots"
     WHERE "expires_at" < now()
     LIMIT 1
     FOR UPDATE SKIP LOCKED
   )
   UPDATE "hermes_control"."concurrency_slots"
   SET "leased_to" = $1, "expires_at" = now() + interval '75 seconds'
   WHERE "slot_id" = (SELECT "slot_id" FROM available_slot)
   RETURNING "slot_id";
   ```
   Valid, but requires slot seeding and dynamic table maintenance.
2. **Option B: Single Row Counter with `SELECT FOR UPDATE`**:
   Row lock on hot row. Introduces high row contention on the capacity row.
3. **Option C: Explicitly Namespaced Transaction Advisory Lock**:
   Uses PostgreSQL's native transaction-scoped advisory lock:
   `SELECT pg_advisory_xact_lock(1048576, 1);`
   where `1048576` represents the Hermes subsystem namespace and `1` represents the global concurrency gate. This eliminates 32-bit hash collision risks completely.

### 7.3 Recommended Implementation: Option C (Namespaced Advisory Lock Gate)
Inside a dedicated mini-transaction with role `hermes_control_runtime`:

```sql
BEGIN;

-- 1. Acquire transaction-level advisory lock (namespaced 64-bit domain; blocks concurrent acquirers for ~2-4ms)
SELECT pg_advisory_xact_lock(1048576, 1);

-- 2. Purge expired leases
DELETE FROM "hermes_control"."concurrency_leases"
WHERE "expires_at" <= now();

-- 3. Check subject concurrency cap (strictly 1 active lease per subject)
SELECT count(*) FROM "hermes_control"."concurrency_leases"
WHERE "subject_id" = $1 AND "expires_at" > now();
-- IF subject_count >= 1 -> ROLLBACK and RETURN "operation_in_progress"

-- 4. Check global capacity cap
SELECT count(*) FROM "hermes_control"."concurrency_leases"
WHERE "expires_at" > now();
-- IF global_count >= MAX_GLOBAL_CONCURRENT -> ROLLBACK and RETURN "capacity_exceeded"

-- 5. Insert new lease row
INSERT INTO "hermes_control"."concurrency_leases" (
  "lease_id",
  "operation_id",
  "subject_id",
  "acquired_at",
  "expires_at"
) VALUES (
  $2, -- lease_id (UUID)
  $3, -- operation_id (UUID)
  $1, -- subject_id (UUID)
  now(),
  now() + ($4 * interval '1 second') -- TTL (e.g. 75 seconds)
);

COMMIT;
-- Advisory lock is automatically released upon COMMIT/ROLLBACK.
```

#### Properties:
- **Zero Race Condition**: The advisory lock serializes only the lease acquisition step (a 3ms query), eliminating oversubscription.
- **Serverless Safe**: 100% authoritative across all Vercel serverless containers connecting to PostgreSQL.
- **No HTTP Lock**: The advisory lock is released *immediately* upon transaction commit, well *before* the OpenAI HTTP request begins.
- **Subject Concurrency**: Enforced atomically during the same serialized check and backed by `UNIQUE (subject_id)` on `concurrency_leases`.

---

## 8. Authoritative Daily Provider-Call Ceiling & Atomic Provider-Boundary Transaction

To prevent runaway billing across all users on a given day:

### 8.1 PostgreSQL-Backed Atomic Counter Table
```sql
CREATE TABLE "hermes_control"."provider_daily_usage" (
  "day_utc" date NOT NULL,
  "feature" varchar(32) NOT NULL,
  "call_count" integer NOT NULL DEFAULT 0,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "provider_daily_usage_pk" PRIMARY KEY ("day_utc", "feature")
);
```

### 8.2 Daily Counter Table Semantics
- **UTC Bucket Boundary**: Bucketed strictly using the PostgreSQL expression `(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date`. This expression is completely session- and database-timezone independent, guaranteeing that no local server or client timezone configuration can alter the daily ceiling rollover boundary.
- **Authorized Dispatch Counts Only**: The counter counts **only** operations that have passed all six control layers and successfully committed the provider boundary transaction.
- **Does NOT Count**: Invalid HTTP requests, entitlement rejections, quota exhaustion, concurrency drops, or pre-provider validation failures.
- **NOT Monetary Spend**: Bounded to operational call count; does not equal token-weighted financial spend. Do not call it exact provider billing usage.

### 8.3 Idempotent Daily Counter Invariant
A replay of an already-seen `Idempotency-Key` **MUST NOT** re-enter the daily provider-call reservation transaction.
The execution pipeline guarantees:
`Idempotency Lookup / Registration` -> `Existing Key Handling (Rejection)` -> `Only NEW Authorized Operations Enter Daily Reservation`.
Therefore:
> **One explicit user action = At most one daily call increment = At most one provider execution attempt.**

### 8.4 The Atomic Provider-Boundary Transaction
The daily provider-call counter increment and the durable `provider_dispatch_started` transition **MUST NOT** be two independent database transactions. They are executed together inside a **single short PostgreSQL transaction** immediately prior to HTTP dispatch:

```sql
BEGIN;

-- 1. Verify operation is still in 'reserved' state and authorized for provider dispatch
SELECT "status" FROM "hermes_control"."analysis_operations"
WHERE "id" = $operation_id AND "status" = 'reserved'
FOR UPDATE;
-- IF NOT FOUND -> ROLLBACK and abort.

-- 2. Atomically reserve/increment the daily provider-call counter:
-- Enforces ceiling for BOTH first bucket insert (requiring $configured_daily_limit >= 1) and subsequent increments:
INSERT INTO "hermes_control"."provider_daily_usage" (
  "day_utc",
  "feature",
  "call_count",
  "updated_at"
)
SELECT
  (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date,
  'jurisprudence_interpretation',
  1,
  now()
WHERE $configured_daily_limit >= 1
ON CONFLICT ("day_utc", "feature")
DO UPDATE SET
  "call_count" = "hermes_control"."provider_daily_usage"."call_count" + 1,
  "updated_at" = now()
WHERE "hermes_control"."provider_daily_usage"."call_count" < $configured_daily_limit
RETURNING "call_count";
-- IF ZERO ROWS RETURNED -> Daily ceiling reached (or limit is 0); ROLLBACK; provider MUST NOT start.

-- 3. In the SAME transaction: transition operation to provider_dispatch_started:
-- platform_cost_status is explicitly 'indeterminate' because remote delivery is authorized but not yet proven:
UPDATE "hermes_control"."analysis_operations"
SET "status" = 'provider_dispatch_started',
    "platform_cost_status" = 'indeterminate',
    "dispatch_started_at" = now(),
    "updated_at" = now()
WHERE "id" = $operation_id;

COMMIT;
-- Transaction completes in < 5ms. ONLY AFTER SUCCESSFUL COMMIT is HTTP dispatch attempted.
```

### 8.5 Comprehensive Failure Semantics

| Scenario | Database / System State | Provider Invoked? | Quota / Lease Action | Resulting Public Response |
|---|---|---|---|---|
| **Case A: Daily Ceiling Exhausted** (0 rows returned) | Transaction rolls back. Daily counter not incremented; dispatch marker not written. | **NO** | Lease deleted; quota reservation released (`reserved_units -= 1`); operation marked `released`. | `503 Service Unavailable`<br>`service_unavailable` |
| **Case B: DB Error Before COMMIT** | Transaction rolls back. Counter not incremented; dispatch marker not written. | **NO** | Lease deleted; quota reservation released (`reserved_units -= 1`); operation marked `released`. | `503 Service Unavailable`<br>`usage_control_unavailable` |
| **Case C: COMMIT Succeeds, Worker Dies Before/During Dispatch** | Daily counter increment is durable; `provider_dispatch_started` is durable. | Unknown / Dropped | Daily slot remains consumed; `platform_cost_status` remains `indeterminate`; reaper moves to `outcome_unknown`; user quota moves to `policy_pending` (fail-closed against double-spend); SAME idempotency key cannot re-dispatch. | Timeout / Client Disconnect (502 on retry) |
| **Case D: Provider HTTP Dispatch Returns** | Call completed; continues to validation and terminal finalization. `platform_cost_status` transitions to `assumed_incurred`. | **YES** | Concurrency lease released in `finally`. User quota resolved conditionally: `committed` if validation and grounding pass; `policy_pending` if validation/grounding fails. | 200 OK (or mapped error) |

> [!IMPORTANT]
> **Strict Concurrency Rule**: No PostgreSQL transaction or advisory lock is ever held across the external provider HTTP request.

---

## 9. Provider-Start Semantics & Platform Cost vs. User Quota

### 9.1 The Dual-Write Gap & Accurate Dispatch Semantics
There is an unavoidable distributed systems gap between committing a database transaction and dispatching an HTTP request to an external provider:
- A database record cannot prove that remote OpenAI servers received the HTTP request.
- Therefore, the transition immediately before HTTP dispatch must not lie about external reality.
- **Conceptual State**: `provider_dispatch_started`.
- **Formal Definition**:
  > "Durable provider-dispatch boundary / execution attempt authorized. From this point forward, the platform must conservatively treat provider cost as possibly incurred if process outcome becomes ambiguous."

### 9.2 Execution Stages Delineation
1. **Provider Dispatch Authorized & Marked**: Committed in PostgreSQL (`status = 'provider_dispatch_started'`).
2. **Provider Request Attempted**: HTTP POST dispatched to OpenAI endpoint.
3. **Provider Outcome Known**: HTTP response headers and body received from OpenAI (or timeout/network error raised).
4. **Provider Result Validated**: Zod structure validated and verbatim grounding verified against canonical text.

### 9.3 Platform Cost vs. User Quota Separation
```sql
CREATE TYPE "hermes_control"."platform_cost_status" AS ENUM (
  'none',             -- Provider was never dispatched; zero expense incurred
  'indeterminate',    -- Provider dispatch boundary committed, but remote execution outcome not yet received or ambiguous (timeout, network drop, worker crash)
  'assumed_incurred'  -- Provider returned an HTTP response; cost accounted against platform budget (operational call count; does not claim verified token count)
);

CREATE TYPE "hermes_control"."user_quota_status" AS ENUM (
  'unreserved',       -- No quota held
  'reserved',         -- Quota held in-flight during pre-flight and provider dispatch
  'committed',        -- Quota permanently consumed upon successful validated and grounded response
  'policy_pending',   -- Provider incurred cost or outcome ambiguous, but output failed validation/grounding; awaiting commercial policy resolution (held against balance without premature debit)
  'released'          -- Quota returned to user balance prior to provider dispatch
);
```

- **Platform Cost**:
  - **Before Provider HTTP Dispatch**: When the atomic boundary transaction commits `status = 'provider_dispatch_started'`, `platform_cost_status` is initialized to `'indeterminate'`. The platform has authorized dispatch and consumed a daily call slot, but cannot prove the remote provider received or processed the request.
  - **After Provider Response Returns**: When the provider returns an HTTP response, `platform_cost_status` transitions to `'assumed_incurred'`. This accounts operational cost against the platform budget. It does **not** claim verified token consumption because token usage metadata is not captured in this phase.
  - **On Timeout / Socket Drop / Crash**: If the external call times out, drops connection, or the process dies after the boundary transaction commits, `platform_cost_status` remains `'indeterminate'` (conservatively accounted as possible platform cost).
- **User Quota**:
  - Held in `'reserved'` during execution.
  - Debited to `'committed'` **only** upon successful Zod validation and verbatim grounding.
  - If output fails Zod validation or verbatim grounding, or if the provider call times out (`outcome_unknown`), user quota transitions to `'policy_pending'`. The reserved unit is preserved against commercial oversubscription without freezing an unapproved charging rule that penalizes users for provider hallucinations or network drops.
  - Released back to the user balance (`'released'`) if the operation fails *before* the provider boundary transaction commits (e.g. concurrency full, daily ceiling reached).

---

## 10. Fail-Closed Entitlement & Authoritative Commercial Quota Accounting

### 10.1 Administrative Commercial Authority: `subject_entitlements` (Read-Only to Runtime)
`subject_entitlements` defines commercial plan provisioning and periodic allowances. It is maintained exclusively by administrative or subscription billing processes:

```sql
CREATE TABLE "hermes_control"."subject_entitlements" (
  "subject_id" uuid PRIMARY KEY REFERENCES "hermes_control"."subject_identities"("id") ON DELETE RESTRICT,
  "plan_tier" varchar(32) NOT NULL,
  "status" varchar(32) NOT NULL,
  "monthly_quota" integer NOT NULL,
  "period_start" timestamptz NOT NULL,
  "period_end" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
```

#### Administrative Invariants:
1. **No Implicit Free Allowance**: We do **not** default `monthly_quota` to 10 or `plan_tier` to `'free'`.
2. **No Implicit Active Status**: We do **not** default `status` to `'active'`.
3. **Read-Only to Hermes Runtime**: Normal web runtime has strictly `SELECT` privilege on this table; it can **never** mutate plan tiers, status, monthly quotas, or billing cycle timestamps.
4. **Fail-Closed Evaluation**:
   - If no row exists for `subject_id` -> **DENY** (`feature_not_entitled`).
   - If `status !== 'active'` -> **DENY** (`account_inactive`).
   - If `now() < period_start` or `now() >= period_end` -> **DENY** (`feature_not_entitled`).

### 10.2 Mutable Runtime Usage & Accounting: `subject_quota_usage`
To track commercial consumption without mutating administrative entitlement configurations, runtime quota accounting is maintained in a distinct, mutable ledger table:

```sql
CREATE TABLE "hermes_control"."subject_quota_usage" (
  "subject_id" uuid NOT NULL REFERENCES "hermes_control"."subject_identities"("id") ON DELETE RESTRICT,
  "period_start" timestamptz NOT NULL,
  "period_end" timestamptz NOT NULL,
  "reserved_units" integer NOT NULL DEFAULT 0,
  "committed_units" integer NOT NULL DEFAULT 0,
  "pending_units" integer NOT NULL DEFAULT 0,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "subject_quota_usage_pk" PRIMARY KEY ("subject_id", "period_start", "period_end"),
  CONSTRAINT "subject_quota_usage_non_negative" CHECK (
    "reserved_units" >= 0 AND "committed_units" >= 0 AND "pending_units" >= 0
  )
);
```

### 10.3 Period Consistency & Atomic Quota Lifecycle Operations
1. **Strict Period Consistency**:
   - Quota usage binds strictly to the exact entitlement period `(period_start, period_end)` defined in `subject_entitlements`.
   - The runtime **never** independently infers calendar-month boundaries. If an entitlement period runs from 2026-10-15 to 2026-11-15, `subject_quota_usage` partitions by those exact timestamps.
2. **Atomic RESERVE (Pre-Flight Quota Gate)**:
   Executed via atomic UPSERT with capacity predicate:
   ```sql
   INSERT INTO "hermes_control"."subject_quota_usage" (
     "subject_id",
     "period_start",
     "period_end",
     "reserved_units",
     "committed_units",
     "pending_units",
     "updated_at"
   )
   VALUES (
     $subject_id,
     $period_start,
     $period_end,
     1,
     0,
     0,
     now()
   )
   ON CONFLICT ("subject_id", "period_start", "period_end")
   DO UPDATE SET
     "reserved_units" = "hermes_control"."subject_quota_usage"."reserved_units" + 1,
     "updated_at" = now()
   WHERE ("hermes_control"."subject_quota_usage"."reserved_units"
          + "hermes_control"."subject_quota_usage"."committed_units"
          + "hermes_control"."subject_quota_usage"."pending_units") < $monthly_quota
   RETURNING "reserved_units", "committed_units", "pending_units";
   ```
   - If zero rows returned: Quota exhausted (`(reserved + committed + pending) >= monthly_quota`). Return `429 quota_exhausted`. No provider dispatch.
3. **Atomic RELEASE BEFORE PROVIDER** (Concurrency full, daily ceiling reached, or pre-dispatch abort):
   ```sql
   UPDATE "hermes_control"."subject_quota_usage"
   SET "reserved_units" = "reserved_units" - 1,
       "updated_at" = now()
   WHERE "subject_id" = $subject_id
     AND "period_start" = $period_start
     AND "period_end" = $period_end
     AND "reserved_units" > 0;
   ```
4. **Atomic COMMIT SUCCESS** (Provider returns valid response passing Zod and verbatim grounding):
   ```sql
   UPDATE "hermes_control"."subject_quota_usage"
   SET "reserved_units" = "reserved_units" - 1,
       "committed_units" = "committed_units" + 1,
       "updated_at" = now()
   WHERE "subject_id" = $subject_id
     AND "period_start" = $period_start
     AND "period_end" = $period_end
     AND "reserved_units" > 0;
   ```
5. **Atomic POLICY_PENDING** (Validation failure, grounding failure, timeout, or crash after provider boundary):
   ```sql
   UPDATE "hermes_control"."subject_quota_usage"
   SET "reserved_units" = "reserved_units" - 1,
       "pending_units" = "pending_units" + 1,
       "updated_at" = now()
   WHERE "subject_id" = $subject_id
     AND "period_start" = $period_start
     AND "period_end" = $period_end
     AND "reserved_units" > 0;
   ```
   - **Representation of Policy Pending**: The unit is transferred from `reserved_units` to `pending_units`. Because the reservation check sums `(reserved_units + committed_units + pending_units) < monthly_quota`, the pending unit remains counted against the user's total period allowance. This strictly prevents quota oversubscription and gaming via repeated failed queries. Concurrently, it is distinct from `committed_units`, ensuring the user is not definitively charged until policy reconciliation.
6. **Anti-Oversubscription Guarantees**:
   - Zero "read-then-update" races: all transitions use atomic SQL statements with row predicates.
   - Check constraint `CHECK (reserved_units >= 0 AND committed_units >= 0 AND pending_units >= 0)` guarantees no negative counters.
   - Web runtime only executes SELECT, INSERT, UPDATE on `subject_quota_usage`, with zero DELETE privileges and read-only access to `subject_entitlements`.

---

## 11. Hardened Operation State Machine & Timestamp Model

```
                              ┌───────────────┐
                              │   RESERVED    │ (TTL: 90–120s)
                              └───────┬───────┘
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         │ (Pre-dispatch failure:     │ (Atomic boundary txn       │ (Stale reservation
         │  concurrency/daily ceiling)│  committed)                │  before dispatch)
         ▼                            ▼                            ▼
┌──────────────────┐     ┌───────────────────────────┐  ┌───────────────────────────────┐
│     RELEASED     │     │ PROVIDER_DISPATCH_STARTED │  │    EXPIRED_BEFORE_DISPATCH    │
└──────────────────┘     └─────────────┬─────────────┘  └───────────────────────────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         │ (OpenAI returns response)   │ (OpenAI timeout / drop)     │ (Worker crash during
         │                             │                             │  external call)
         ▼                             ▼                             ▼
┌──────────────────┐     ┌───────────────────────────┐  ┌───────────────────────────────┐
│  RESULT CHECKED  │     │      OUTCOME_UNKNOWN      │  │        OUTCOME_UNKNOWN        │
└────────┬─────────┘     └───────────────────────────┘  └───────────────────────────────┘
         │
         ├─────────────────────────────────────────────┐
         │ (Passed Zod & Grounding)                    │ (Failed Zod or Grounding)
         ▼                                             ▼
┌──────────────────┐                       ┌───────────────────────────────┐
│COMPLETED_SUCCESS │                       │ COMPLETED_VALIDATION_FAILURE  │
└──────────────────┘                       │              OR               │
                                           │  COMPLETED_GROUNDING_FAILURE  │
                                           └───────────────────────────────┘
```

### 11.1 Explicit Lifecycle Timestamps in `analysis_operations`
```sql
CREATE TABLE "hermes_control"."analysis_operations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "subject_id" uuid NOT NULL REFERENCES "hermes_control"."subject_identities"("id") ON DELETE RESTRICT,
  "idempotency_key" varchar(64) NOT NULL,
  "record_id" varchar(64) NOT NULL,
  "record_version" integer NOT NULL,
  "status" varchar(32) NOT NULL DEFAULT 'reserved',
  "platform_cost_status" varchar(32) NOT NULL DEFAULT 'none',
  "user_quota_status" varchar(32) NOT NULL DEFAULT 'reserved',
  "units" integer NOT NULL DEFAULT 1,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "reserved_expires_at" timestamptz NOT NULL,
  "dispatch_started_at" timestamptz,
  "completed_at" timestamptz,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "analysis_operations_subject_idempotency_key_uniq" UNIQUE ("subject_id", "idempotency_key")
);

CREATE UNIQUE INDEX "analysis_operations_active_doc_idx"
ON "hermes_control"."analysis_operations" ("subject_id", "record_id", "record_version")
WHERE "status" IN ('reserved', 'provider_dispatch_started');
```

### 11.2 State-Sensitive Background Reaper
A background cleanup job inspects lifecycle timestamps deterministically:
```sql
-- 1. Safely reclaim reservations that expired BEFORE dispatch was ever attempted:
UPDATE "hermes_control"."analysis_operations"
SET "status" = 'expired_before_dispatch',
    "user_quota_status" = 'released',
    "platform_cost_status" = 'none',
    "updated_at" = now()
WHERE "status" = 'reserved'
  AND "reserved_expires_at" <= now();

-- Also release the held quota in subject_quota_usage:
UPDATE "hermes_control"."subject_quota_usage" squ
SET "reserved_units" = squ."reserved_units" - 1,
    "updated_at" = now()
FROM "hermes_control"."analysis_operations" op
WHERE op."id" = $operation_id
  AND squ."subject_id" = op."subject_id"
  AND squ."reserved_units" > 0;

-- 2. Identify orphaned operations where dispatch DID start but process died:
-- NEVER restore quota automatically; transition user quota to policy_pending:
UPDATE "hermes_control"."analysis_operations"
SET "status" = 'outcome_unknown',
    "platform_cost_status" = 'indeterminate',
    "user_quota_status" = 'policy_pending',
    "updated_at" = now()
WHERE "status" = 'provider_dispatch_started'
  AND "dispatch_started_at" <= now() - interval '120 seconds';

-- Also transition the held quota to pending_units:
UPDATE "hermes_control"."subject_quota_usage" squ
SET "reserved_units" = squ."reserved_units" - 1,
    "pending_units" = squ."pending_units" + 1,
    "updated_at" = now()
FROM "hermes_control"."analysis_operations" op
WHERE op."id" = $operation_id
  AND squ."subject_id" = op."subject_id"
  AND squ."reserved_units" > 0;
```

---

## 12. Bounded TTL Rationale & Calibration

- **OpenAI Timeout**: 30 seconds (`OPENAI_TIMEOUT_MS = 30000`).
- **Downstream Verification**: < 1-2 seconds.
- **Concurrency Lease TTL (`HERMES_CONCURRENCY_LEASE_TTL_SECONDS`)**:
  - **Calibration**: 60 to 90 seconds (default: `75s`). Provides a 45s buffer over the 30s OpenAI timeout.
- **Usage Reservation TTL (`HERMES_RESERVATION_TTL_SECONDS`)**:
  - **Calibration**: 90 to 120 seconds (default: `105s`). Strictly exceeds lease TTL (`Reservation TTL > Lease TTL + 15s`) to prevent premature reaper reclamation while a lease is active.

---

## 13. Recommended Hardened Execution Pipeline

The complete execution sequence inside `handleJurisprudenceInterpretPost`:

```
 1. HTTP Method Gate (405 method_not_allowed)
 2. Correlation ID Resolution (x-request-id)
 3. Content-Type Gate (415 unsupported_media_type)
 4. Auth Session Gate (getWorkspaceSession() -> status === "authenticated") -> 401
 5. Body Size Limit & Parsing (readBodyWithLimit, 2048 bytes) -> 400 / 413
 6. Slug Syntax SafeParse (jurisprudenceHttpInterpretRequestBodySchema) -> 400
 7. Idempotency-Key Header Extraction & Format Validation (UUIDv4) -> 400 idempotency_key_malformed
 8. Origin Policy Gate (validateOrigin) -> 403 origin_not_allowed
 9. Administrative Kill Switch Check (HERMES_ANALYSIS_ENABLED !== "false") -> 503 service_unavailable
10. IP Flood Rate Limiter (rateLimiter.consume({ scope: "subject" })) -> 429 / 503
11. Public Slug -> Canonical Record Resolution (resolveJurisprudenceCanonicalRecordBySlug) -> 404 / 400
12. Source Length Pre-Flight Gate (canonicalRecord.fullText.length <= 100000) -> 422 source_too_large
13. Subject Entitlement Check (check explicit plan tier & active status) -> 403 feature_not_entitled / account_inactive
14. Idempotent Operation Lookup & Registration:
    - Look up (subject_id, idempotency_key)
    - If terminal state -> 409 operation_already_completed
    - If in-flight -> 409 operation_in_progress
    - If unseen -> atomically register operation in `reserved` state with TTL
15. Active Document Deduplication Gate:
    - Verify no active operation exists for (subject_id, record_id, record_version)
    - If active -> rollback reservation & return 409 operation_in_progress
16. Commercial Quota Reservation:
    - Query `hermes_control.subject_entitlements` to fetch `monthly_quota`, `period_start`, `period_end`
    - Atomically insert/update `hermes_control.subject_quota_usage` for the exact entitlement period:
      `WHERE (reserved_units + committed_units + pending_units) < monthly_quota`
    - If 0 rows returned (quota exhausted) -> rollback reservation in `analysis_operations` & return 429 quota_exhausted
17. Atomic Concurrency Lease Acquisition (Advisory Lock Gate Option C):
    - Acquire pg_advisory_xact_lock(1048576, 1)
    - Verify subject leases == 0 and global leases < MAX_GLOBAL_CONCURRENT
    - Insert concurrency lease row
    - If failed -> release quota reservation in `subject_quota_usage` (`reserved_units -= 1`) & return 429 / 503 capacity_exceeded
18. ATOMIC PROVIDER-BOUNDARY DATABASE TRANSACTION:
    - BEGIN
    - Verify operation status == 'reserved' FOR UPDATE
    - Atomically increment `provider_daily_usage` with ceiling check on both first insert and increment:
      `INSERT INTO ... SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date, 'jurisprudence_interpretation', 1, now() WHERE $configured_daily_limit >= 1 ON CONFLICT ... DO UPDATE ... WHERE call_count < $configured_daily_limit RETURNING call_count;`
    - If ceiling exhausted (0 rows returned) -> ROLLBACK; release concurrency lease, release quota reservation in `subject_quota_usage` (`reserved_units -= 1`), transition operation to `released`, and return 503 service_unavailable
    - In SAME transaction: transition operation to `provider_dispatch_started`, `platform_cost_status = 'indeterminate'`, with `dispatch_started_at = now()`
    - COMMIT
19. External Provider HTTP Dispatch:
    - Execute ONLY after successful COMMIT of step 18
    - Dispatch orchestrator.interpret(recordId, recordVersion) -> calls OpenAI gpt-6.1-sol
    - No database transaction or advisory lock held during this network call
    - When provider returns an HTTP response -> platform_cost_status transitions to `assumed_incurred`
20. Validation & Verbatim Grounding Verification:
    - Validate Zod structure & exact citations against canonical source
21. Usage & Cost Finalization:
    - If successful (passed Zod & Grounding) -> transition operation to `completed_success`, `platform_cost_status = 'assumed_incurred'`, `user_quota_status = 'committed'`, update `subject_quota_usage` (`reserved_units -= 1, committed_units += 1`)
    - If Zod validation fails -> transition operation to `completed_validation_failure`, `platform_cost_status = 'assumed_incurred'`, `user_quota_status = 'policy_pending'`, update `subject_quota_usage` (`reserved_units -= 1, pending_units += 1`)
    - If Grounding fails -> transition operation to `completed_grounding_failure`, `platform_cost_status = 'assumed_incurred'`, `user_quota_status = 'policy_pending'`, update `subject_quota_usage` (`reserved_units -= 1, pending_units += 1`)
    - If Timeout / Network Error -> transition operation to `outcome_unknown`, `platform_cost_status = 'indeterminate'`, `user_quota_status = 'policy_pending'`, update `subject_quota_usage` (`reserved_units -= 1, pending_units += 1`)
22. Concurrency Lease Release (Executed unconditionally in `finally` block):
    - Delete concurrency lease row
23. HTTP Response Delivery:
    - Return 200 OK with interpretation envelope, Cache-Control: no-store, and x-request-id (or mapped error)
```

---

## 14. Safe Failure Policy & Public Error Mapping

| Failure Condition | HTTP Status | Public Error Code | User-Facing Message |
|---|---|---|---|
| **Malformed Idempotency Key** | `400` | `idempotency_key_malformed` | `"El encabezado Idempotency-Key no contiene un identificador válido."` |
| **Feature Not Entitled** | `403` | `feature_not_entitled` | `"Tu cuenta no tiene habilitada la función de análisis asistido de jurisprudencia."` |
| **Account Suspended / Inactive** | `403` | `account_inactive` | `"Tu cuenta se encuentra inactiva. Contacta al soporte para más información."` |
| **Operation In Progress (Same Key or Record)** | `409` | `operation_in_progress` | `"Ya se encuentra en curso un análisis para esta solicitud. Por favor espera a que finalice."` |
| **Operation Already Completed (Replay)** | `409` | `operation_already_completed` | `"Esta solicitud ya fue completada anteriormente. Para un nuevo análisis, inicie una nueva acción."` |
| **Quota Exhausted** | `429` | `quota_exhausted` | `"Has alcanzado el límite de análisis asignados a tu cuenta para este período."` |
| **Global Capacity Full** | `503` | `capacity_exceeded` | `"El servicio de análisis se encuentra temporalmente con alta demanda. Inténtalo en unos instantes."` |
| **Ambiguous Provider Timeout** | `502` | `provider_outcome_unknown` | `"El proveedor de análisis no respondió a tiempo. La operación fue registrada para conciliación."` |
| **Administrative Kill Switch / Daily Ceiling** | `503` | `service_unavailable` | `"El servicio de análisis se encuentra temporalmente no disponible. Inténtalo nuevamente más tarde."` |
| **Control DB Persistence Failure** | `503` | `usage_control_unavailable` | `"El servicio de verificación de uso no se encuentra disponible. Inténtalo nuevamente más tarde."` |

---

## 15. Least-Privilege Database Role Design

Instead of granting blanket permissions on all tables, `hermes_control_runtime` must adhere to strict per-table least privilege:

```sql
CREATE ROLE hermes_control_runtime WITH NOINHERIT;
GRANT USAGE ON SCHEMA hermes_control TO hermes_control_runtime;

-- Subject identities: lookup and registration only
GRANT SELECT, INSERT ON "hermes_control"."subject_identities" TO hermes_control_runtime;

-- Subject entitlements: read-only for web runtime (administrative provisioning only)
GRANT SELECT ON "hermes_control"."subject_entitlements" TO hermes_control_runtime;

-- Subject quota usage: atomic reservation, commit, and release for runtime accounting (no deletion permitted)
GRANT SELECT, INSERT, UPDATE ON "hermes_control"."subject_quota_usage" TO hermes_control_runtime;

-- Analysis operations: runtime lifecycle transitions (no deletion permitted)
GRANT SELECT, INSERT, UPDATE ON "hermes_control"."analysis_operations" TO hermes_control_runtime;

-- Concurrency leases: acquire and release only
GRANT SELECT, INSERT, DELETE ON "hermes_control"."concurrency_leases" TO hermes_control_runtime;

-- Daily provider counter: atomic increment and inspection (no deletion permitted)
GRANT SELECT, INSERT, UPDATE ON "hermes_control"."provider_daily_usage" TO hermes_control_runtime;
```

`hermes_control_runtime` has **zero** access to `complaints.*`, `payments_private.*`, and private jurisprudence draft records.

---

## 16. Observability & Privacy Minimization

- **NEVER** log raw `idempotencyKey`, Auth0 session tokens, cookies, prompts, fullText, or generated legal analysis.
- Emit structured JSON logs tagged with opaque correlation IDs:
  - `hermes_control.operation_registered`: `{ requestId, operationId }`
  - `hermes_control.lease_acquired`: `{ requestId, leaseId, activeGlobalLeases }`
  - `hermes_control.daily_counter_incremented`: `{ requestId, dayUtc, currentCount }`
  - `hermes_control.dispatch_started`: `{ requestId, operationId, model: "gpt-6.1-sol" }`
  - `hermes_control.completed`: `{ requestId, operationId, status, elapsedMs }`
  - `hermes_control.lease_released`: `{ requestId, leaseId }`

---

## 17. Phased Implementation Roadmap

| Phase | Milestone Name | Scope & Deliverables | Verification Strategy |
|---|---|---|---|
| **A3.2** | **Contracts, State Machine & Database Schema** | Drizzle schema for `hermes_control` establishing all six control tables:<br>1. `subject_identities`<br>2. `subject_entitlements`<br>3. `subject_quota_usage`<br>4. `analysis_operations`<br>5. `concurrency_leases`<br>6. `provider_daily_usage`<br>Types for state machine, migration `0041_hermes_control_schema.sql`, role `hermes_control_runtime`. | Schema check, migration test, role assertion test. |
| **A3.3** | **Identity & Entitlement Repository** | `PostgresHermesSubjectRepository` and `HermesEntitlementGate`. Resolves Auth0 subject to internal `subject_id` and verifies active plans fail-closed. | Unit tests with mock DB; fail-closed persistence tests. |
| **A3.4** | **Idempotent Operation & Daily Counter Coordinator** | `PostgresHermesOperationCoordinator` managing `Idempotency-Key` tracking, two-phase reservation, atomic daily ceiling counter + dispatch marker transaction, and state-sensitive reaper. | Unit tests covering all state transitions, daily limit saturation, atomic transaction rollback, and duplicate key replays. |
| **A3.5** | **Authoritative Concurrency Lease Engine** | Postgres namespaced advisory lock gate (Option C) for global & subject lease acquisition, lease release in `finally`, and TTL recovery. | Parallel stress tests (100 simultaneous simulated requests). |
| **A3.6** | **HTTP Pipeline Integration** | Wire control pipeline into `lib/jurisprudence/jurisprudence-interpret-http-handler.ts`. | Route integration tests covering all HTTP status codes. |
| **A3.7** | **Client Request-Key & Error UX** | Update `JurisprudenceAnalysisPanel` to generate `Idempotency-Key` header and handle `operation_in_progress`, `quota_exhausted`, etc. | Vitest React component tests for every new UI state. |
| **A3.8** | **Staging E2E Verification** | Live verification against synthetic staging fixture with real Supabase instance. | Synthetic runner confirming zero unmocked OpenAI calls in test mode. |

---

## 18. Protected Boundaries & Strict Invariants

The following files and contracts remain **STRICTLY PROTECTED**:
1. **Frozen Hermes HTTP Request Contract**: `POST /api/jurisprudence/interpret` body accepts strictly `{ "slug": string }`.
2. **Frozen Grounding Verification**: Verbatim normalized substring verification algorithm remains intact.
3. **Canonical Identifier Isolation**: Public URLs and request parameters carry only the public `slug`. Zero database IDs exposed.
4. **Frozen Database Roles**: Existing runtime roles remain strictly scoped to their respective schemas.

---

## 19. Unresolved Questions & Design Decisions

1. **Provider Token Usage Reporting**:
   - The current `HermesProviderPort` returns only `{ payload }` without token metrics.
   - *Design Choice*: Capture operational call counts in A3. In a future phase, extend `HermesProviderOutcome` with an optional `usage: { promptTokens, completionTokens }` field to support dollar spend accounting.
2. **Replay Window for Completed Operations**:
   - Currently, replaying a committed `Idempotency-Key` returns `409 operation_already_completed`.
   - *Future Consideration*: If an encrypted, short-lived cache (e.g. 10 minutes) is introduced in the future, idempotent replay of the cached result could be evaluated. For now, failing closed prevents double-billing.

---

## 20. Final Recommendation

**VERDICT: GO WITH CONDITIONS**

- **Recommendation**: Proceed to Phase **A3.2** (Contracts, State Machine & Database Schema) only after this design document is reviewed and frozen.
- **Conditions**:
  1. Do not modify provider adapter or prompt boundary code.
  2. Implement Postgres advisory lock concurrency, atomic provider-boundary transaction, and idempotent operations before touching the HTTP route handler.
  3. Keep the rate limiter as the outer perimeter; never replace it with quota logic.
  4. Preserve all existing 47 A2.6 frontend tests and 116 backend regression tests.
