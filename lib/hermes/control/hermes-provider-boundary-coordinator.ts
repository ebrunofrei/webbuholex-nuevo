/**
 * Hermes Provider Boundary & Concurrency Lease Coordinator
 * Governing: docs/hermes/HERMES-PROD-A3.1-CONTROLS-DESIGN.md
 * Phase: HERMES-PROD-A3.5
 *
 * CANONICAL LOCK ORDER & DEADLOCK MINIMIZATION:
 * Inside beginProviderDispatch(), locks are acquired in strictly one order:
 *   1. analysis_operations row lock (SELECT ... FOR UPDATE)
 *   2. pg_advisory_xact_lock(1048576, 1) global transaction advisory lock
 *   3. concurrency_leases expired lease DELETE
 *   4. concurrency queries (active lease counts)
 *   5. concurrency_leases INSERT
 *   6. provider_daily_usage atomic UPSERT
 *   7. analysis_operations UPDATE (status = provider_dispatch_started)
 *   8. COMMIT
 *
 * Adhering to this consistent order across all dispatch calls minimizes deadlock risk.
 * Note: Deadlock minimization is an architectural property; physical concurrency proof
 * under multi-connection PostgreSQL requires live integration testing with migration 0041 applied.
 */

import { eq, and, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@/database/schema";
import {
  analysisOperations,
} from "@/database/schema/hermes-control";
import { withHermesControlRole, type HermesControlTransaction } from "@/database/roles";
import {
  type HermesOperationStatus,
  type HermesUserQuotaStatus,
  type HermesPlatformCostStatus,
} from "./hermes-control-contracts";
import {
  HermesControlPersistenceError,
} from "./hermes-control-errors";
import {
  isTerminalOperationStatus,
  canTransitionOperationStatus,
  isValidOperationStatusCombination,
  assertValidOperationStatusCombination,
  isValidLifecycleTimestamps,
} from "./hermes-control-state-machine";
import type { HermesControlRoleRunner } from "./hermes-subject-repository";

/**
 * Frozen lease TTL calibration constants from A3.1 §12.
 */
export const MIN_HERMES_LEASE_TTL_SECONDS = 60;
export const MAX_HERMES_LEASE_TTL_SECONDS = 90;
export const DEFAULT_HERMES_LEASE_TTL_SECONDS = 75;

/**
 * Validation error for provider boundary inputs or limits.
 */
export class HermesProviderBoundaryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HermesProviderBoundaryValidationError";
  }
}

/**
 * Internal rollback-only signals thrown inside transactions to force PostgreSQL
 * transaction rollback. Never exposed externally to callers or HTTP layers.
 */
class ConcurrencyCapacityExceededRollbackSignal extends Error {
  constructor() {
    super("concurrency_capacity_exceeded_rollback");
    this.name = "ConcurrencyCapacityExceededRollbackSignal";
  }
}

class SubjectConcurrencyConflictRollbackSignal extends Error {
  constructor() {
    super("subject_concurrency_conflict_rollback");
    this.name = "SubjectConcurrencyConflictRollbackSignal";
  }
}

class DailyLimitExhaustedRollbackSignal extends Error {
  constructor() {
    super("daily_limit_exhausted_rollback");
    this.name = "DailyLimitExhaustedRollbackSignal";
  }
}

class ReservationExpiredRollbackSignal extends Error {
  readonly operationId: string;
  readonly reservedExpiresAt: Date;

  constructor(operationId: string, reservedExpiresAt: Date) {
    super("reservation_expired_rollback");
    this.name = "ReservationExpiredRollbackSignal";
    this.operationId = operationId;
    this.reservedExpiresAt = reservedExpiresAt;
  }
}

/**
 * Strongly typed server-side limits contract.
 * Note: A3.5 receives these values explicitly; no default fallbacks are assumed.
 */
export interface HermesProviderBoundaryLimits {
  readonly concurrencyLimit: number;
  readonly dailyProviderCallLimit: number;
  readonly leaseTtlSeconds: number;
}

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null;
}

interface PostgresStructuredError {
  readonly code: string;
  readonly constraint_name?: string;
  readonly constraint?: string;
}

function isPostgresError(err: unknown): err is PostgresStructuredError {
  if (!isRecord(err)) {
    return false;
  }
  const code = err["code"];
  if (typeof code !== "string") {
    return false;
  }
  const constraintName = err["constraint_name"];
  if (constraintName !== undefined && typeof constraintName !== "string") {
    return false;
  }
  const constraint = err["constraint"];
  if (constraint !== undefined && typeof constraint !== "string") {
    return false;
  }
  return true;
}

function getPostgresConstraintName(err: PostgresStructuredError): string | undefined {
  return err.constraint_name ?? err.constraint;
}

function isHermesOperationStatus(val: unknown): val is HermesOperationStatus {
  return (
    val === "reserved" ||
    val === "released" ||
    val === "expired_before_dispatch" ||
    val === "provider_dispatch_started" ||
    val === "completed_success" ||
    val === "completed_validation_failure" ||
    val === "completed_grounding_failure" ||
    val === "outcome_unknown"
  );
}

function parseHermesOperationStatus(val: unknown): HermesOperationStatus {
  if (isHermesOperationStatus(val)) {
    return val;
  }
  throw new HermesControlPersistenceError("persistence_inconsistency");
}

function isHermesUserQuotaStatus(val: unknown): val is HermesUserQuotaStatus {
  return (
    val === "unreserved" ||
    val === "reserved" ||
    val === "committed" ||
    val === "policy_pending" ||
    val === "released"
  );
}

function parseHermesUserQuotaStatus(val: unknown): HermesUserQuotaStatus {
  if (isHermesUserQuotaStatus(val)) {
    return val;
  }
  throw new HermesControlPersistenceError("persistence_inconsistency");
}

function isHermesPlatformCostStatus(val: unknown): val is HermesPlatformCostStatus {
  return (
    val === "none" ||
    val === "indeterminate" ||
    val === "assumed_incurred"
  );
}

function parseHermesPlatformCostStatus(val: unknown): HermesPlatformCostStatus {
  if (isHermesPlatformCostStatus(val)) {
    return val;
  }
  throw new HermesControlPersistenceError("persistence_inconsistency");
}

/**
 * Strict fail-closed parser for nullable date fields.
 * Accepts ONLY:
 * - null: valid persisted SQL NULL
 * - Date: valid persisted Date object
 * Rejects undefined (missing selected field), invalid Date, or any other type.
 * Throws HermesControlPersistenceError("persistence_inconsistency").
 */
export function parseNullableDate(val: unknown): Date | null {
  if (val === null) {
    return null;
  }
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    return val;
  }
  throw new HermesControlPersistenceError("persistence_inconsistency");
}

export function parseRequiredDate(val: unknown): Date {
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    return val;
  }
  throw new HermesControlPersistenceError("persistence_inconsistency");
}

export interface ParsedDailyUsageResult {
  readonly dayUtc: string | Date;
  readonly callCount: number;
}

/**
 * Strict fail-closed parser for provider_daily_usage UPSERT results.
 * Accepts ONLY an array containing exactly one record with:
 * - day_utc: canonical string (YYYY-MM-DD) or valid Date matching PostgreSQL date column
 * - call_count: canonical positive integer >= 1 and <= dailyProviderCallLimit
 * Rejects empty array, multi-row arrays, missing properties, invalid/whitespace call_count,
 * non-integers, counts > limit, non-dates, etc.
 * Throws HermesControlPersistenceError("persistence_inconsistency").
 */
export function parseDailyUsageResult(
  rows: unknown,
  dailyProviderCallLimit: number
): ParsedDailyUsageResult {
  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new HermesControlPersistenceError("persistence_inconsistency");
  }
  const row = rows[0];
  if (!isRecord(row) || !("day_utc" in row) || !("call_count" in row)) {
    throw new HermesControlPersistenceError("persistence_inconsistency");
  }

  const rawDayUtc = row["day_utc"];
  let dayUtc: string | Date;
  if (rawDayUtc instanceof Date && !Number.isNaN(rawDayUtc.getTime())) {
    dayUtc = rawDayUtc;
  } else if (
    typeof rawDayUtc === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(rawDayUtc) &&
    !Number.isNaN(Date.parse(rawDayUtc))
  ) {
    dayUtc = rawDayUtc;
  } else {
    throw new HermesControlPersistenceError("persistence_inconsistency");
  }

  const rawCallCount = row["call_count"];
  let callCount: number;
  if (typeof rawCallCount === "number") {
    if (
      !Number.isInteger(rawCallCount) ||
      rawCallCount < 1 ||
      rawCallCount > dailyProviderCallLimit
    ) {
      throw new HermesControlPersistenceError("persistence_inconsistency");
    }
    callCount = rawCallCount;
  } else if (typeof rawCallCount === "string") {
    if (!/^\d+$/.test(rawCallCount)) {
      throw new HermesControlPersistenceError("persistence_inconsistency");
    }
    const parsed = Number(rawCallCount);
    if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > dailyProviderCallLimit) {
      throw new HermesControlPersistenceError("persistence_inconsistency");
    }
    callCount = parsed;
  } else {
    throw new HermesControlPersistenceError("persistence_inconsistency");
  }

  return { dayUtc, callCount };
}

/**
 * Strict fail-closed parser for SQL COUNT results.
 * Accepts ONLY an array containing exactly one record with a valid non-negative integer count.
 * Rejects missing, NaN, Infinity, negative, fractional, non-numeric strings, empty arrays, or malformed data.
 * Throws HermesControlPersistenceError("persistence_inconsistency") on any deviation.
 */
export function parseConcurrencyCount(rows: unknown): number {
  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new HermesControlPersistenceError("persistence_inconsistency");
  }
  const first = rows[0];
  if (!isRecord(first) || !("count" in first)) {
    throw new HermesControlPersistenceError("persistence_inconsistency");
  }
  const countRaw = first["count"];
  if (typeof countRaw === "number") {
    if (!Number.isInteger(countRaw) || countRaw < 0) {
      throw new HermesControlPersistenceError("persistence_inconsistency");
    }
    return countRaw;
  }
  if (typeof countRaw === "string") {
    if (!/^\d+$/.test(countRaw)) {
      throw new HermesControlPersistenceError("persistence_inconsistency");
    }
    const parsed = Number(countRaw);
    if (!Number.isSafeInteger(parsed) || parsed < 0) {
      throw new HermesControlPersistenceError("persistence_inconsistency");
    }
    return parsed;
  }
  throw new HermesControlPersistenceError("persistence_inconsistency");
}

/**
 * Validates limits shape strictly:
 * - concurrencyLimit: non-negative integer >= 0
 * - dailyProviderCallLimit: non-negative integer >= 0
 * - leaseTtlSeconds: integer in [MIN_HERMES_LEASE_TTL_SECONDS, MAX_HERMES_LEASE_TTL_SECONDS]
 */
export function validateProviderBoundaryLimits(
  limits: unknown
): HermesProviderBoundaryLimits {
  if (!isRecord(limits)) {
    throw new HermesProviderBoundaryValidationError("limits_invalid");
  }

  const { concurrencyLimit, dailyProviderCallLimit, leaseTtlSeconds } = limits;

  if (
    typeof concurrencyLimit !== "number" ||
    !Number.isInteger(concurrencyLimit) ||
    concurrencyLimit < 0
  ) {
    throw new HermesProviderBoundaryValidationError("concurrency_limit_invalid");
  }

  if (
    typeof dailyProviderCallLimit !== "number" ||
    !Number.isInteger(dailyProviderCallLimit) ||
    dailyProviderCallLimit < 0
  ) {
    throw new HermesProviderBoundaryValidationError("daily_limit_invalid");
  }

  if (
    typeof leaseTtlSeconds !== "number" ||
    !Number.isInteger(leaseTtlSeconds) ||
    leaseTtlSeconds < MIN_HERMES_LEASE_TTL_SECONDS ||
    leaseTtlSeconds > MAX_HERMES_LEASE_TTL_SECONDS
  ) {
    throw new HermesProviderBoundaryValidationError("lease_ttl_invalid");
  }

  return {
    concurrencyLimit,
    dailyProviderCallLimit,
    leaseTtlSeconds,
  };
}

const UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * Validates operationId strictly as a canonical UUID string.
 * Preserves exact accepted input without lowercase/trim/normalization.
 */
export function validateOperationId(operationId: unknown): string {
  if (
    typeof operationId !== "string" ||
    !UUID_REGEX.test(operationId)
  ) {
    throw new HermesProviderBoundaryValidationError("operation_id_invalid");
  }
  return operationId;
}

/**
 * Discriminated result of a provider boundary acquisition attempt.
 */
export type HermesProviderBoundaryResult =
  | {
      readonly kind: "started";
      readonly operationId: string;
      readonly leaseId: string;
      readonly status: "provider_dispatch_started";
      readonly platformCostStatus: "indeterminate";
      readonly userQuotaStatus: "reserved";
      readonly dispatchStartedAt: Date;
    }
  | {
      readonly kind: "already_started";
      readonly operationId: string;
    }
  | {
      readonly kind: "already_finalized";
      readonly operationId: string;
      readonly existingStatus: HermesOperationStatus;
    }
  | {
      readonly kind: "not_found";
      readonly operationId: string;
    }
  | {
      readonly kind: "reservation_expired";
      readonly operationId: string;
      readonly reservedExpiresAt: Date;
    }
  | {
      readonly kind: "subject_concurrency_conflict";
    }
  | {
      readonly kind: "concurrency_capacity_exceeded";
    }
  | {
      readonly kind: "daily_limit_exhausted";
    }
  | {
      readonly kind: "control_unavailable";
      readonly reason: "usage_control_unavailable";
    };

/**
 * Discriminated result of an idempotent concurrency lease release attempt.
 */
export type HermesLeaseReleaseResult =
  | {
      readonly kind: "released";
      readonly operationId: string;
      readonly leaseId: string;
    }
  | {
      readonly kind: "already_absent";
      readonly operationId: string;
    }
  | {
      readonly kind: "control_unavailable";
      readonly reason: "usage_control_unavailable";
    };

export interface HermesProviderBoundaryCoordinatorHandler {
  readonly beginProviderDispatch?: (
    operationId: string,
    limits: HermesProviderBoundaryLimits
  ) => Promise<HermesProviderBoundaryResult>;
  readonly releaseConcurrencyLease?: (
    operationId: string
  ) => Promise<HermesLeaseReleaseResult>;
}

export interface PostgresHermesProviderBoundaryCoordinatorDependencies {
  readonly db?: PostgresJsDatabase<typeof schema>;
  readonly roleRunner?: HermesControlRoleRunner;
  readonly handler?: HermesProviderBoundaryCoordinatorHandler;
  readonly now?: () => Date;
}

export interface HermesProviderBoundaryCoordinator {
  beginProviderDispatch(
    operationId: string,
    limits: HermesProviderBoundaryLimits
  ): Promise<HermesProviderBoundaryResult>;

  releaseConcurrencyLease(
    operationId: string
  ): Promise<HermesLeaseReleaseResult>;
}

/**
 * PostgreSQL Implementation of HermesProviderBoundaryCoordinator.
 *
 * Coordinates concurrency lease acquisition, daily call counter consumption,
 * and operation transition to provider_dispatch_started in ONE short atomic
 * transaction under hermes_control_runtime role.
 */
export class PostgresHermesProviderBoundaryCoordinator implements HermesProviderBoundaryCoordinator {
  readonly #deps: PostgresHermesProviderBoundaryCoordinatorDependencies;

  constructor(deps?: PostgresHermesProviderBoundaryCoordinatorDependencies) {
    this.#deps = deps ?? {};
  }

  #now(): Date {
    const fn = this.#deps.now ?? (() => new Date());
    const d = fn();
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
      throw new HermesControlPersistenceError("usage_control_unavailable");
    }
    return d;
  }

  /**
   * Atomically acquires concurrency capacity, increments daily counter, and marks
   * the operation as provider_dispatch_started before any provider HTTP call.
   */
  async beginProviderDispatch(
    rawOperationId: string,
    rawLimits: HermesProviderBoundaryLimits
  ): Promise<HermesProviderBoundaryResult> {
    const operationId = validateOperationId(rawOperationId);
    const limits = validateProviderBoundaryLimits(rawLimits);

    if (this.#deps.handler?.beginProviderDispatch) {
      try {
        return await this.#deps.handler.beginProviderDispatch(operationId, limits);
      } catch (error) {
        if (error instanceof HermesProviderBoundaryValidationError) {
          throw error;
        }
        return { kind: "control_unavailable", reason: "usage_control_unavailable" };
      }
    }

    try {
      const runner = this.#resolveRunner();

      return await runner(async (tx) => {
        // Step 1: Row lock on target operation
        const op = await this.#lockOperation(tx, operationId);
        if (!op) {
          return { kind: "not_found", operationId };
        }

        // Step 2: Classify existing operation state
        if (op.status === "provider_dispatch_started") {
          if (!isValidOperationStatusCombination(op.status, op.platformCostStatus, op.userQuotaStatus)) {
            throw new HermesControlPersistenceError("persistence_inconsistency");
          }
          if (!isValidLifecycleTimestamps(op)) {
            throw new HermesControlPersistenceError("persistence_inconsistency");
          }
          return { kind: "already_started", operationId };
        }

        if (isTerminalOperationStatus(op.status)) {
          if (!isValidOperationStatusCombination(op.status, op.platformCostStatus, op.userQuotaStatus)) {
            throw new HermesControlPersistenceError("persistence_inconsistency");
          }
          if (!isValidLifecycleTimestamps(op)) {
            throw new HermesControlPersistenceError("persistence_inconsistency");
          }
          return {
            kind: "already_finalized",
            operationId,
            existingStatus: op.status,
          };
        }

        // Step 3: Verify source coherence for eligible 'reserved' state
        if (op.status !== "reserved") {
          throw new HermesControlPersistenceError("persistence_inconsistency");
        }
        if (!isValidOperationStatusCombination(op.status, op.platformCostStatus, op.userQuotaStatus)) {
          throw new HermesControlPersistenceError("persistence_inconsistency");
        }
        if (!isValidLifecycleTimestamps(op)) {
          throw new HermesControlPersistenceError("persistence_inconsistency");
        }

        // Step 4: Early Reservation Expiry Check at Boundary
        const earlyNow = this.#now();
        if (op.reservedExpiresAt.getTime() <= earlyNow.getTime()) {
          return {
            kind: "reservation_expired",
            operationId,
            reservedExpiresAt: op.reservedExpiresAt,
          };
        }

        // Step 5: Evaluate zero limits AFTER operation classification
        if (limits.concurrencyLimit <= 0) {
          return { kind: "concurrency_capacity_exceeded" };
        }
        if (limits.dailyProviderCallLimit <= 0) {
          return { kind: "daily_limit_exhausted" };
        }

        // Step 6: Acquire transaction-scoped global advisory lock
        await tx.execute(sql`SELECT pg_advisory_xact_lock(1048576, 1)`);

        // Step 7: Purge expired concurrency leases under advisory lock
        await tx.execute(
          sql`DELETE FROM "hermes_control"."concurrency_leases" WHERE "expires_at" <= now()`
        );

        // Step 8: Check subject concurrency (max 1 active lease per subject)
        const subjectLeaseRows = await tx.execute(
          sql`SELECT count(*) AS count FROM "hermes_control"."concurrency_leases" WHERE "subject_id" = ${op.subjectId}::uuid AND "expires_at" > now()`
        );
        const subjectCount = parseConcurrencyCount(subjectLeaseRows);
        if (subjectCount >= 1) {
          throw new SubjectConcurrencyConflictRollbackSignal();
        }

        // Step 9: Check global concurrency capacity
        const globalLeaseRows = await tx.execute(
          sql`SELECT count(*) AS count FROM "hermes_control"."concurrency_leases" WHERE "expires_at" > now()`
        );
        const globalCount = parseConcurrencyCount(globalLeaseRows);
        if (globalCount >= limits.concurrencyLimit) {
          throw new ConcurrencyCapacityExceededRollbackSignal();
        }

        // Step 10: Insert concurrency lease
        const leaseResult = await tx.execute(
          sql`
          INSERT INTO "hermes_control"."concurrency_leases" (
            "lease_id",
            "operation_id",
            "subject_id",
            "acquired_at",
            "expires_at"
          ) VALUES (
            gen_random_uuid(),
            ${operationId}::uuid,
            ${op.subjectId}::uuid,
            now(),
            now() + (${limits.leaseTtlSeconds}::integer * interval '1 second')
          )
          RETURNING "lease_id", "acquired_at", "expires_at"
          `
        );

        if (!Array.isArray(leaseResult) || leaseResult.length !== 1) {
          throw new HermesControlPersistenceError("lease_insert_failed");
        }
        const leaseRow = leaseResult[0];
        if (!isRecord(leaseRow) || typeof leaseRow["lease_id"] !== "string") {
          throw new HermesControlPersistenceError("lease_insert_failed");
        }
        const leaseId = leaseRow["lease_id"];

        // Step 11: Atomically consume daily provider slot
        const dailyResult = await tx.execute(
          sql`
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
          WHERE ${limits.dailyProviderCallLimit}::integer >= 1
          ON CONFLICT ("day_utc", "feature")
          DO UPDATE SET
            "call_count" = "hermes_control"."provider_daily_usage"."call_count" + 1,
            "updated_at" = now()
          WHERE "hermes_control"."provider_daily_usage"."call_count" < ${limits.dailyProviderCallLimit}::integer
          RETURNING "day_utc", "call_count"
          `
        );

        if (Array.isArray(dailyResult) && dailyResult.length === 0) {
          // Zero rows returned: daily limit reached; rollback entire transaction.
          throw new DailyLimitExhaustedRollbackSignal();
        }

        parseDailyUsageResult(dailyResult, limits.dailyProviderCallLimit);

        // Step 12: Resolve fresh transitionAt and perform final pre-commit expiry recheck
        const transitionAt = this.#now();
        if (op.reservedExpiresAt.getTime() <= transitionAt.getTime()) {
          throw new ReservationExpiredRollbackSignal(operationId, op.reservedExpiresAt);
        }

        // Step 13: Update operation to provider_dispatch_started
        if (!canTransitionOperationStatus("reserved", "provider_dispatch_started")) {
          throw new HermesControlPersistenceError("illegal_operation_transition");
        }
        assertValidOperationStatusCombination("provider_dispatch_started", "indeterminate", "reserved");

        const opUpdated = await tx
          .update(analysisOperations)
          .set({
            status: "provider_dispatch_started",
            platformCostStatus: "indeterminate",
            dispatchStartedAt: transitionAt,
            updatedAt: transitionAt,
          })
          .where(
            and(
              eq(analysisOperations.id, operationId),
              eq(analysisOperations.status, "reserved"),
              eq(analysisOperations.userQuotaStatus, "reserved"),
              eq(analysisOperations.platformCostStatus, "none"),
              sql`${analysisOperations.dispatchStartedAt} IS NULL`,
              sql`${analysisOperations.completedAt} IS NULL`
            )
          )
          .returning({ id: analysisOperations.id });

        if (opUpdated.length !== 1) {
          throw new HermesControlPersistenceError("operation_status_mutation_mismatch");
        }

        return {
          kind: "started",
          operationId,
          leaseId,
          status: "provider_dispatch_started",
          platformCostStatus: "indeterminate",
          userQuotaStatus: "reserved",
          dispatchStartedAt: transitionAt,
        };
      });
    } catch (error) {
      if (error instanceof HermesProviderBoundaryValidationError) {
        throw error;
      }
      if (error instanceof ConcurrencyCapacityExceededRollbackSignal) {
        return { kind: "concurrency_capacity_exceeded" };
      }
      if (error instanceof SubjectConcurrencyConflictRollbackSignal) {
        return { kind: "subject_concurrency_conflict" };
      }
      if (error instanceof DailyLimitExhaustedRollbackSignal) {
        return { kind: "daily_limit_exhausted" };
      }
      if (error instanceof ReservationExpiredRollbackSignal) {
        return {
          kind: "reservation_expired",
          operationId: error.operationId,
          reservedExpiresAt: error.reservedExpiresAt,
        };
      }
      if (isPostgresError(error) && error.code === "23505") {
        const constraint = getPostgresConstraintName(error);
        if (constraint === "concurrency_leases_subject_id_uniq") {
          return { kind: "subject_concurrency_conflict" };
        }
        if (constraint === "concurrency_leases_operation_id_uniq") {
          return await this.#safeClassifyOperationAfterRollback(operationId);
        }
      }
      return {
        kind: "control_unavailable",
        reason: "usage_control_unavailable",
      };
    }
  }

  async #safeClassifyOperationAfterRollback(
    operationId: string
  ): Promise<HermesProviderBoundaryResult> {
    try {
      const runner = this.#resolveRunner();
      return await runner(async (tx) => {
        const rows = await tx
          .select({
            id: analysisOperations.id,
            status: analysisOperations.status,
            userQuotaStatus: analysisOperations.userQuotaStatus,
            platformCostStatus: analysisOperations.platformCostStatus,
            reservedExpiresAt: analysisOperations.reservedExpiresAt,
            dispatchStartedAt: analysisOperations.dispatchStartedAt,
            completedAt: analysisOperations.completedAt,
          })
          .from(analysisOperations)
          .where(eq(analysisOperations.id, operationId))
          .limit(1);

        const row = rows[0];
        if (!row) {
          return { kind: "not_found", operationId };
        }

        const status = parseHermesOperationStatus(row.status);
        const userQuotaStatus = parseHermesUserQuotaStatus(row.userQuotaStatus);
        const platformCostStatus = parseHermesPlatformCostStatus(row.platformCostStatus);
        const reservedExpiresAt = parseRequiredDate(row.reservedExpiresAt);
        const dispatchStartedAt = parseNullableDate(row.dispatchStartedAt);
        const completedAt = parseNullableDate(row.completedAt);

        const op = {
          status,
          userQuotaStatus,
          platformCostStatus,
          reservedExpiresAt,
          dispatchStartedAt,
          completedAt,
        };

        if (status === "provider_dispatch_started") {
          if (!isValidOperationStatusCombination(status, platformCostStatus, userQuotaStatus)) {
            return { kind: "control_unavailable", reason: "usage_control_unavailable" };
          }
          if (!isValidLifecycleTimestamps(op)) {
            return { kind: "control_unavailable", reason: "usage_control_unavailable" };
          }
          return { kind: "already_started", operationId };
        }

        if (isTerminalOperationStatus(status)) {
          if (!isValidOperationStatusCombination(status, platformCostStatus, userQuotaStatus)) {
            return { kind: "control_unavailable", reason: "usage_control_unavailable" };
          }
          if (!isValidLifecycleTimestamps(op)) {
            return { kind: "control_unavailable", reason: "usage_control_unavailable" };
          }
          return { kind: "already_finalized", operationId, existingStatus: status };
        }

        return { kind: "control_unavailable", reason: "usage_control_unavailable" };
      });
    } catch {
      return { kind: "control_unavailable", reason: "usage_control_unavailable" };
    }
  }

  /**
   * Idempotent primitive to release an active concurrency lease for an operation.
   * Does NOT alter operation status, user quota, or daily counter.
   */
  async releaseConcurrencyLease(
    rawOperationId: string
  ): Promise<HermesLeaseReleaseResult> {
    let operationId: string;
    try {
      operationId = validateOperationId(rawOperationId);
    } catch {
      return { kind: "control_unavailable", reason: "usage_control_unavailable" };
    }

    if (this.#deps.handler?.releaseConcurrencyLease) {
      try {
        return await this.#deps.handler.releaseConcurrencyLease(operationId);
      } catch {
        return { kind: "control_unavailable", reason: "usage_control_unavailable" };
      }
    }

    try {
      const runner = this.#resolveRunner();

      return await runner(async (tx) => {
        const result = await tx.execute(
          sql`
          DELETE FROM "hermes_control"."concurrency_leases"
          WHERE "operation_id" = ${operationId}::uuid
          RETURNING "lease_id"
          `
        );

        if (!Array.isArray(result)) {
          throw new HermesControlPersistenceError("persistence_inconsistency");
        }

        if (result.length === 0) {
          return {
            kind: "already_absent",
            operationId,
          };
        }

        if (result.length === 1) {
          const row = result[0];
          if (
            isRecord(row) &&
            typeof row["lease_id"] === "string" &&
            row["lease_id"].length > 0
          ) {
            return {
              kind: "released",
              operationId,
              leaseId: row["lease_id"],
            };
          }
          throw new HermesControlPersistenceError("persistence_inconsistency");
        }

        throw new HermesControlPersistenceError("persistence_inconsistency");
      });
    } catch {
      return {
        kind: "control_unavailable",
        reason: "usage_control_unavailable",
      };
    }
  }

  async #lockOperation(
    tx: HermesControlTransaction,
    operationId: string
  ): Promise<{
    id: string;
    subjectId: string;
    status: HermesOperationStatus;
    userQuotaStatus: HermesUserQuotaStatus;
    platformCostStatus: HermesPlatformCostStatus;
    reservedExpiresAt: Date;
    dispatchStartedAt: Date | null;
    completedAt: Date | null;
  } | null> {
    const rows = await tx
      .select({
        id: analysisOperations.id,
        subjectId: analysisOperations.subjectId,
        status: analysisOperations.status,
        userQuotaStatus: analysisOperations.userQuotaStatus,
        platformCostStatus: analysisOperations.platformCostStatus,
        reservedExpiresAt: analysisOperations.reservedExpiresAt,
        dispatchStartedAt: analysisOperations.dispatchStartedAt,
        completedAt: analysisOperations.completedAt,
      })
      .from(analysisOperations)
      .where(eq(analysisOperations.id, operationId))
      .for("update");

    const row = rows[0];
    if (!row) {
      return null;
    }

    if (typeof row.id !== "string" || typeof row.subjectId !== "string") {
      throw new HermesControlPersistenceError("persistence_inconsistency");
    }

    return {
      id: row.id,
      subjectId: row.subjectId,
      status: parseHermesOperationStatus(row.status),
      userQuotaStatus: parseHermesUserQuotaStatus(row.userQuotaStatus),
      platformCostStatus: parseHermesPlatformCostStatus(row.platformCostStatus),
      reservedExpiresAt: parseRequiredDate(row.reservedExpiresAt),
      dispatchStartedAt: parseNullableDate(row.dispatchStartedAt),
      completedAt: parseNullableDate(row.completedAt),
    };
  }

  #resolveRunner(): HermesControlRoleRunner {
    if (this.#deps.roleRunner) {
      return this.#deps.roleRunner;
    }
    if (this.#deps.db) {
      const db = this.#deps.db;
      return async <T>(callback: (tx: HermesControlTransaction) => Promise<T>) =>
        withHermesControlRole(db, callback);
    }
    throw new HermesControlPersistenceError("usage_control_unavailable");
  }
}
