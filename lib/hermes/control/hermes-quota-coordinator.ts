/**
 * Hermes Quota & Operation Accounting Coordinator
 * Governing: docs/hermes/HERMES-PROD-A3.1-CONTROLS-DESIGN.md
 * Phase: HERMES-PROD-A3.4 / HERMES-PROD-A3.4C
 */

import { eq, and, gte, lte, inArray, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@/database/schema";
import {
  analysisOperations,
  subjectQuotaUsage,
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
  canTransitionOperationStatus,
  getExpectedCoherentStatuses,
  isValidOperationStatusCombination,
  assertValidOperationStatusCombination,
  isValidLifecycleTimestamps,
} from "./hermes-control-state-machine";
import type { HermesControlRoleRunner } from "./hermes-subject-repository";

/**
 * Validation error for operation reservation input.
 */
export class HermesOperationReservationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HermesOperationReservationValidationError";
  }
}

/**
 * Internal signal thrown exclusively inside a transaction to force PostgreSQL
 * transaction rollback when quota reservation yields zero capacity after an operation insert.
 * Never exposed externally.
 */
class QuotaExhaustedRollbackSignal extends Error {
  readonly requestedUnits: number;
  readonly monthlyQuota: number;

  constructor(requestedUnits: number, monthlyQuota: number) {
    super("quota_exhausted_rollback");
    this.name = "QuotaExhaustedRollbackSignal";
    this.requestedUnits = requestedUnits;
    this.monthlyQuota = monthlyQuota;
  }
}

/**
 * Strictly validated server-side operation reservation input.
 */
export interface HermesOperationReservationInput {
  readonly subjectId: string;
  readonly idempotencyKey: string;
  readonly recordId: string;
  readonly recordVersion: number;
  readonly quotaPeriodStart: Date;
  readonly quotaPeriodEnd: Date;
  readonly monthlyQuota: number;
  readonly units?: number;
  readonly reservedExpiresAt: Date;
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

function parseNullableDate(val: unknown): Date | null {
  if (val === null || val === undefined) {
    return null;
  }
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    return val;
  }
  throw new HermesControlPersistenceError("persistence_inconsistency");
}

/**
 * Validates cross-status coherence and lifecycle timestamps on a loaded operation row.
 * Fails closed immediately if persistent state violates A3.2 frozen rules.
 */
function assertSourceOperationCoherent(op: {
  status: HermesOperationStatus;
  platformCostStatus: HermesPlatformCostStatus;
  userQuotaStatus: HermesUserQuotaStatus;
  dispatchStartedAt: Date | null;
  completedAt: Date | null;
}): void {
  if (!isValidOperationStatusCombination(op.status, op.platformCostStatus, op.userQuotaStatus)) {
    throw new HermesControlPersistenceError("persistence_inconsistency");
  }
  if (!isValidLifecycleTimestamps(op)) {
    throw new HermesControlPersistenceError("persistence_inconsistency");
  }
}

/**
 * Validates candidate reservation input against Hermes control constraints:
 * - referenceNow: valid Date instance, finite timestamp;
 * - subjectId: non-empty string <= 128 chars, no leading/trailing whitespace;
 * - idempotencyKey: non-empty string <= 64 chars, no leading/trailing whitespace;
 * - recordId: non-empty string <= 64 chars, no leading/trailing whitespace;
 * - recordVersion: positive integer > 0;
 * - quotaPeriodStart / quotaPeriodEnd: valid finite Dates, end > start;
 * - monthlyQuota: non-negative integer >= 0;
 * - units: positive integer >= 1 (defaults to 1);
 * - reservedExpiresAt: valid finite future Date strictly > referenceNow.
 */
export function validateOperationReservationInput(
  input: unknown,
  referenceNow: Date
): Required<HermesOperationReservationInput> {
  if (!(referenceNow instanceof Date) || Number.isNaN(referenceNow.getTime())) {
    throw new HermesOperationReservationValidationError("reference_clock_invalid");
  }

  if (!isRecord(input)) {
    throw new HermesOperationReservationValidationError("reservation_input_invalid");
  }

  const {
    subjectId,
    idempotencyKey,
    recordId,
    recordVersion,
    quotaPeriodStart,
    quotaPeriodEnd,
    monthlyQuota,
    units,
    reservedExpiresAt,
  } = input;

  if (
    typeof subjectId !== "string" ||
    subjectId.length === 0 ||
    subjectId.length > 128 ||
    subjectId !== subjectId.trim()
  ) {
    throw new HermesOperationReservationValidationError("subject_id_invalid");
  }

  if (
    typeof idempotencyKey !== "string" ||
    idempotencyKey.length === 0 ||
    idempotencyKey.length > 64 ||
    idempotencyKey !== idempotencyKey.trim()
  ) {
    throw new HermesOperationReservationValidationError("idempotency_key_invalid");
  }

  if (
    typeof recordId !== "string" ||
    recordId.length === 0 ||
    recordId.length > 64 ||
    recordId !== recordId.trim()
  ) {
    throw new HermesOperationReservationValidationError("record_id_invalid");
  }

  if (typeof recordVersion !== "number" || !Number.isInteger(recordVersion) || recordVersion <= 0) {
    throw new HermesOperationReservationValidationError("record_version_invalid");
  }

  if (!(quotaPeriodStart instanceof Date) || Number.isNaN(quotaPeriodStart.getTime())) {
    throw new HermesOperationReservationValidationError("quota_period_start_invalid");
  }

  if (!(quotaPeriodEnd instanceof Date) || Number.isNaN(quotaPeriodEnd.getTime())) {
    throw new HermesOperationReservationValidationError("quota_period_end_invalid");
  }

  if (quotaPeriodEnd.getTime() <= quotaPeriodStart.getTime()) {
    throw new HermesOperationReservationValidationError("quota_period_inverted");
  }

  if (typeof monthlyQuota !== "number" || !Number.isInteger(monthlyQuota) || monthlyQuota < 0) {
    throw new HermesOperationReservationValidationError("monthly_quota_invalid");
  }

  const resolvedUnits = units === undefined ? 1 : units;
  if (typeof resolvedUnits !== "number" || !Number.isInteger(resolvedUnits) || resolvedUnits <= 0) {
    throw new HermesOperationReservationValidationError("units_invalid");
  }

  if (!(reservedExpiresAt instanceof Date) || Number.isNaN(reservedExpiresAt.getTime())) {
    throw new HermesOperationReservationValidationError("reserved_expires_at_invalid");
  }

  if (reservedExpiresAt.getTime() <= referenceNow.getTime()) {
    throw new HermesOperationReservationValidationError("reserved_expires_at_must_be_future");
  }

  return {
    subjectId,
    idempotencyKey,
    recordId,
    recordVersion,
    quotaPeriodStart,
    quotaPeriodEnd,
    monthlyQuota,
    units: resolvedUnits,
    reservedExpiresAt,
  };
}

/**
 * Discriminated result of an operation reservation attempt.
 */
export type HermesOperationReservationResult =
  | {
      readonly kind: "reserved";
      readonly operationId: string;
      readonly status: "reserved";
      readonly userQuotaStatus: "reserved";
      readonly platformCostStatus: "none";
      readonly units: number;
      readonly quotaPeriodStart: Date;
      readonly quotaPeriodEnd: Date;
      readonly reservedExpiresAt: Date;
    }
  | {
      readonly kind: "duplicate_in_flight";
      readonly operationId: string;
      readonly existingStatus: HermesOperationStatus;
      readonly existingUserQuotaStatus: HermesUserQuotaStatus;
    }
  | {
      readonly kind: "already_completed";
      readonly operationId: string;
      readonly existingStatus: HermesOperationStatus;
      readonly existingUserQuotaStatus: HermesUserQuotaStatus;
    }
  | {
      readonly kind: "active_document_conflict";
      readonly subjectId: string;
      readonly recordId: string;
      readonly recordVersion: number;
    }
  | {
      readonly kind: "quota_exhausted";
      readonly requestedUnits: number;
      readonly monthlyQuota: number;
    }
  | {
      readonly kind: "control_unavailable";
      readonly reason: "usage_control_unavailable";
    };

/**
 * Discriminated result of an operation finalization attempt.
 */
export type HermesFinalizationResult =
  | {
      readonly kind: "finalized";
      readonly operationId: string;
      readonly status: HermesOperationStatus;
      readonly userQuotaStatus: HermesUserQuotaStatus;
      readonly platformCostStatus: HermesPlatformCostStatus;
      readonly units: number;
    }
  | {
      readonly kind: "already_finalized";
      readonly operationId: string;
      readonly status: HermesOperationStatus;
      readonly userQuotaStatus: HermesUserQuotaStatus;
    }
  | {
      readonly kind: "not_expired";
      readonly operationId: string;
      readonly reservedExpiresAt: Date;
    }
  | {
      readonly kind: "not_found";
      readonly operationId: string;
    }
  | {
      readonly kind: "invalid_state";
      readonly operationId: string;
      readonly currentStatus: HermesOperationStatus;
      readonly currentUserQuotaStatus: HermesUserQuotaStatus;
    }
  | {
      readonly kind: "control_unavailable";
      readonly reason: "usage_control_unavailable";
    };

/**
 * Summary record of an expired reservation found for reaping.
 */
export interface HermesExpiredReservationRecord {
  readonly operationId: string;
  readonly subjectId: string;
  readonly reservedExpiresAt: Date;
  readonly units: number;
  readonly quotaPeriodStart: Date;
  readonly quotaPeriodEnd: Date;
}

/**
 * Discriminated result of an expired reservation scan attempt.
 */
export type HermesExpiredReservationScanResult =
  | {
      readonly kind: "found";
      readonly records: readonly HermesExpiredReservationRecord[];
    }
  | {
      readonly kind: "control_unavailable";
      readonly reason: "usage_control_unavailable";
    };

export type HermesAtomicQuotaUpsertFn = (
  tx: HermesControlTransaction,
  params: {
    readonly subjectId: string;
    readonly periodStart: Date;
    readonly periodEnd: Date;
    readonly units: number;
    readonly monthlyQuota: number;
  }
) => Promise<boolean>;

export interface HermesQuotaCoordinatorHandler {
  readonly reserveOperationQuota?: (
    input: HermesOperationReservationInput
  ) => Promise<HermesOperationReservationResult>;
  readonly commitSuccess?: (
    operationId: string
  ) => Promise<HermesFinalizationResult>;
  readonly releaseReservation?: (
    operationId: string
  ) => Promise<HermesFinalizationResult>;
  readonly markPolicyPending?: (
    operationId: string,
    targetStatus: "completed_validation_failure" | "completed_grounding_failure" | "outcome_unknown"
  ) => Promise<HermesFinalizationResult>;
  readonly expireReservation?: (
    operationId: string,
    now?: Date
  ) => Promise<HermesFinalizationResult>;
  readonly findExpiredReservations?: (
    now?: Date,
    limit?: number
  ) => Promise<HermesExpiredReservationScanResult>;
}

export interface PostgresHermesQuotaCoordinatorDependencies {
  readonly db?: PostgresJsDatabase<typeof schema>;
  readonly roleRunner?: HermesControlRoleRunner;
  readonly handler?: HermesQuotaCoordinatorHandler;
  readonly atomicQuotaUpsert?: HermesAtomicQuotaUpsertFn;
  readonly now?: () => Date;
}

/**
 * Quota Coordinator Port.
 */
export interface HermesQuotaCoordinator {
  reserveOperationQuota(
    input: HermesOperationReservationInput
  ): Promise<HermesOperationReservationResult>;

  commitSuccess(
    operationId: string
  ): Promise<HermesFinalizationResult>;

  releaseReservation(
    operationId: string
  ): Promise<HermesFinalizationResult>;

  markPolicyPending(
    operationId: string,
    targetStatus: "completed_validation_failure" | "completed_grounding_failure" | "outcome_unknown"
  ): Promise<HermesFinalizationResult>;

  expireReservation(
    operationId: string,
    now?: Date
  ): Promise<HermesFinalizationResult>;

  findExpiredReservations(
    now?: Date,
    limit?: number
  ): Promise<HermesExpiredReservationScanResult>;
}

/**
 * PostgreSQL Implementation of HermesQuotaCoordinator.
 *
 * Coordinates analysis_operations and subject_quota_usage inside
 * single atomic PostgreSQL transactions under hermes_control_runtime role.
 */
export class PostgresHermesQuotaCoordinator implements HermesQuotaCoordinator {
  readonly #deps: PostgresHermesQuotaCoordinatorDependencies;

  constructor(deps?: PostgresHermesQuotaCoordinatorDependencies) {
    this.#deps = deps ?? {};
  }

  #now(): Date {
    const fn = this.#deps.now ?? (() => new Date());
    const d = fn();
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
      throw new HermesOperationReservationValidationError("clock_invalid");
    }
    return d;
  }

  /**
   * Atomically registers operation row first, then reserves aggregate quota in a single transaction.
   * If quota capacity is exhausted, an internal rollback signal is thrown to force PostgreSQL rollback,
   * leaving zero operation rows and an unburned idempotency key.
   */
  async reserveOperationQuota(
    rawInput: HermesOperationReservationInput
  ): Promise<HermesOperationReservationResult> {
    let now: Date;
    try {
      now = this.#now();
    } catch (err) {
      if (err instanceof HermesOperationReservationValidationError) {
        throw err;
      }
      return { kind: "control_unavailable", reason: "usage_control_unavailable" };
    }

    const input = validateOperationReservationInput(rawInput, now);

    if (this.#deps.handler?.reserveOperationQuota) {
      try {
        return await this.#deps.handler.reserveOperationQuota(input);
      } catch (error) {
        if (error instanceof HermesOperationReservationValidationError) {
          throw error;
        }
        return {
          kind: "control_unavailable",
          reason: "usage_control_unavailable",
        };
      }
    }

    try {
      const runner = this.#resolveRunner();

      return await runner(async (tx) => {
        // Step 1: Idempotency Lookup Pre-check
        const existing = await tx
          .select({
            id: analysisOperations.id,
            status: analysisOperations.status,
            userQuotaStatus: analysisOperations.userQuotaStatus,
          })
          .from(analysisOperations)
          .where(
            and(
              eq(analysisOperations.subjectId, input.subjectId),
              eq(analysisOperations.idempotencyKey, input.idempotencyKey)
            )
          )
          .limit(1);

        const existingRow = existing[0];
        if (existingRow) {
          const status = parseHermesOperationStatus(existingRow.status);
          const userQuotaStatus = parseHermesUserQuotaStatus(existingRow.userQuotaStatus);
          if (status === "reserved" || status === "provider_dispatch_started") {
            return {
              kind: "duplicate_in_flight",
              operationId: existingRow.id,
              existingStatus: status,
              existingUserQuotaStatus: userQuotaStatus,
            };
          }
          return {
            kind: "already_completed",
            operationId: existingRow.id,
            existingStatus: status,
            existingUserQuotaStatus: userQuotaStatus,
          };
        }

        // Step 2: Active Document Pre-check
        const activeDoc = await tx
          .select({ id: analysisOperations.id })
          .from(analysisOperations)
          .where(
            and(
              eq(analysisOperations.subjectId, input.subjectId),
              eq(analysisOperations.recordId, input.recordId),
              eq(analysisOperations.recordVersion, input.recordVersion),
              inArray(analysisOperations.status, ["reserved", "provider_dispatch_started"])
            )
          )
          .limit(1);

        if (activeDoc[0]) {
          return {
            kind: "active_document_conflict",
            subjectId: input.subjectId,
            recordId: input.recordId,
            recordVersion: input.recordVersion,
          };
        }

        // Step 3: Insert analysis_operations row FIRST with exact entitlement coordinates
        const inserted = await tx
          .insert(analysisOperations)
          .values({
            subjectId: input.subjectId,
            idempotencyKey: input.idempotencyKey,
            recordId: input.recordId,
            recordVersion: input.recordVersion,
            status: "reserved",
            platformCostStatus: "none",
            userQuotaStatus: "reserved",
            units: input.units,
            quotaPeriodStart: input.quotaPeriodStart,
            quotaPeriodEnd: input.quotaPeriodEnd,
            reservedExpiresAt: input.reservedExpiresAt,
          })
          .returning({
            id: analysisOperations.id,
            status: analysisOperations.status,
            userQuotaStatus: analysisOperations.userQuotaStatus,
            platformCostStatus: analysisOperations.platformCostStatus,
            units: analysisOperations.units,
            quotaPeriodStart: analysisOperations.quotaPeriodStart,
            quotaPeriodEnd: analysisOperations.quotaPeriodEnd,
            reservedExpiresAt: analysisOperations.reservedExpiresAt,
          });

        const opRow = inserted[0];
        if (!opRow) {
          throw new HermesControlPersistenceError("operation_insert_failed");
        }

        const opStatus = parseHermesOperationStatus(opRow.status);
        const opUserQuotaStatus = parseHermesUserQuotaStatus(opRow.userQuotaStatus);
        const opPlatformCostStatus = parseHermesPlatformCostStatus(opRow.platformCostStatus);

        if (
          opStatus !== "reserved" ||
          opUserQuotaStatus !== "reserved" ||
          opPlatformCostStatus !== "none"
        ) {
          throw new HermesControlPersistenceError("persistence_inconsistency");
        }

        // Step 4: Atomically reserve subject_quota_usage
        const quotaReserved = await this.#executeQuotaUpsert(tx, {
          subjectId: input.subjectId,
          periodStart: input.quotaPeriodStart,
          periodEnd: input.quotaPeriodEnd,
          units: input.units,
          monthlyQuota: input.monthlyQuota,
        });

        if (!quotaReserved) {
          // Zero rows returned: quota capacity exhausted.
          // Throw internal signal to trigger PostgreSQL ROLLBACK.
          // The newly inserted analysis_operations row is rolled back and disappears!
          throw new QuotaExhaustedRollbackSignal(input.units, input.monthlyQuota);
        }

        return {
          kind: "reserved",
          operationId: opRow.id,
          status: opStatus,
          userQuotaStatus: opUserQuotaStatus,
          platformCostStatus: opPlatformCostStatus,
          units: opRow.units,
          quotaPeriodStart: opRow.quotaPeriodStart,
          quotaPeriodEnd: opRow.quotaPeriodEnd,
          reservedExpiresAt: opRow.reservedExpiresAt,
        };
      });
    } catch (error) {
      if (error instanceof HermesOperationReservationValidationError) {
        throw error;
      }
      if (error instanceof QuotaExhaustedRollbackSignal) {
        return {
          kind: "quota_exhausted",
          requestedUnits: error.requestedUnits,
          monthlyQuota: error.monthlyQuota,
        };
      }
      if (isPostgresError(error) && error.code === "23505") {
        const constraintName = getPostgresConstraintName(error);
        if (constraintName === "analysis_operations_subject_idempotency_key_uniq") {
          return await this.#classifyIdempotencyConflictAfterRollback(input);
        }
        if (constraintName === "analysis_operations_active_doc_idx") {
          return {
            kind: "active_document_conflict",
            subjectId: input.subjectId,
            recordId: input.recordId,
            recordVersion: input.recordVersion,
          };
        }
      }
      return {
        kind: "control_unavailable",
        reason: "usage_control_unavailable",
      };
    }
  }

  async #classifyIdempotencyConflictAfterRollback(
    input: HermesOperationReservationInput
  ): Promise<HermesOperationReservationResult> {
    try {
      const runner = this.#resolveRunner();
      return await runner(async (tx) => {
        const rows = await tx
          .select({
            id: analysisOperations.id,
            status: analysisOperations.status,
            userQuotaStatus: analysisOperations.userQuotaStatus,
          })
          .from(analysisOperations)
          .where(
            and(
              eq(analysisOperations.subjectId, input.subjectId),
              eq(analysisOperations.idempotencyKey, input.idempotencyKey)
            )
          )
          .limit(1);

        const row = rows[0];
        if (!row) {
          return {
            kind: "control_unavailable",
            reason: "usage_control_unavailable",
          };
        }

        const status = parseHermesOperationStatus(row.status);
        const userQuotaStatus = parseHermesUserQuotaStatus(row.userQuotaStatus);

        if (status === "reserved" || status === "provider_dispatch_started") {
          return {
            kind: "duplicate_in_flight",
            operationId: row.id,
            existingStatus: status,
            existingUserQuotaStatus: userQuotaStatus,
          };
        }

        return {
          kind: "already_completed",
          operationId: row.id,
          existingStatus: status,
          existingUserQuotaStatus: userQuotaStatus,
        };
      });
    } catch {
      return {
        kind: "control_unavailable",
        reason: "usage_control_unavailable",
      };
    }
  }

  /**
   * Finalizes a successful interpretation:
   * Validates coherent provider_dispatch_started source state,
   * moves reserved_units -> committed_units using the operation's persisted quota period.
   */
  async commitSuccess(operationId: string): Promise<HermesFinalizationResult> {
    if (this.#deps.handler?.commitSuccess) {
      try {
        return await this.#deps.handler.commitSuccess(operationId);
      } catch {
        return { kind: "control_unavailable", reason: "usage_control_unavailable" };
      }
    }

    try {
      const runner = this.#resolveRunner();

      return await runner(async (tx) => {
        const op = await this.#lockOperation(tx, operationId);
        if (!op) {
          return { kind: "not_found", operationId };
        }

        // Enforce source row coherence and valid lifecycle timestamps fail-closed
        assertSourceOperationCoherent(op);

        if (op.status === "completed_success" && op.userQuotaStatus === "committed") {
          return {
            kind: "already_finalized",
            operationId,
            status: "completed_success",
            userQuotaStatus: "committed",
          };
        }

        if (op.status !== "provider_dispatch_started" || op.userQuotaStatus !== "reserved") {
          return {
            kind: "invalid_state",
            operationId,
            currentStatus: op.status,
            currentUserQuotaStatus: op.userQuotaStatus,
          };
        }

        if (!canTransitionOperationStatus(op.status, "completed_success")) {
          return {
            kind: "invalid_state",
            operationId,
            currentStatus: op.status,
            currentUserQuotaStatus: op.userQuotaStatus,
          };
        }

        assertValidOperationStatusCombination("completed_success", "assumed_incurred", "committed");
        const transitionAt = this.#now();

        // Aggregate mutation: reserved_units -= units, committed_units += units
        const quotaUpdated = await tx
          .update(subjectQuotaUsage)
          .set({
            reservedUnits: sql`${subjectQuotaUsage.reservedUnits} - ${op.units}`,
            committedUnits: sql`${subjectQuotaUsage.committedUnits} + ${op.units}`,
            updatedAt: sql`now()`, // Database audit timestamp
          })
          .where(
            and(
              eq(subjectQuotaUsage.subjectId, op.subjectId),
              eq(subjectQuotaUsage.periodStart, op.quotaPeriodStart),
              eq(subjectQuotaUsage.periodEnd, op.quotaPeriodEnd),
              gte(subjectQuotaUsage.reservedUnits, op.units)
            )
          )
          .returning({ subjectId: subjectQuotaUsage.subjectId });

        if (quotaUpdated.length !== 1) {
          throw new HermesControlPersistenceError("quota_aggregate_mutation_mismatch");
        }

        const opUpdated = await tx
          .update(analysisOperations)
          .set({
            status: "completed_success",
            userQuotaStatus: "committed",
            platformCostStatus: "assumed_incurred",
            completedAt: transitionAt,
            updatedAt: transitionAt,
          })
          .where(
            and(
              eq(analysisOperations.id, operationId),
              eq(analysisOperations.status, "provider_dispatch_started"),
              eq(analysisOperations.userQuotaStatus, "reserved"),
              eq(analysisOperations.platformCostStatus, "indeterminate")
            )
          )
          .returning({ id: analysisOperations.id });

        if (opUpdated.length !== 1) {
          throw new HermesControlPersistenceError("operation_status_mutation_mismatch");
        }

        return {
          kind: "finalized",
          operationId,
          status: "completed_success",
          userQuotaStatus: "committed",
          platformCostStatus: "assumed_incurred",
          units: op.units,
        };
      });
    } catch {
      return {
        kind: "control_unavailable",
        reason: "usage_control_unavailable",
      };
    }
  }

  /**
   * Releases quota reservation prior to provider dispatch.
   * Requires coherent reserved source state.
   */
  async releaseReservation(operationId: string): Promise<HermesFinalizationResult> {
    if (this.#deps.handler?.releaseReservation) {
      try {
        return await this.#deps.handler.releaseReservation(operationId);
      } catch {
        return { kind: "control_unavailable", reason: "usage_control_unavailable" };
      }
    }

    try {
      const runner = this.#resolveRunner();

      return await runner(async (tx) => {
        const op = await this.#lockOperation(tx, operationId);
        if (!op) {
          return { kind: "not_found", operationId };
        }

        // Enforce source row coherence and valid lifecycle timestamps fail-closed
        assertSourceOperationCoherent(op);

        if (op.status === "released" && op.userQuotaStatus === "released") {
          return {
            kind: "already_finalized",
            operationId,
            status: "released",
            userQuotaStatus: "released",
          };
        }

        if (
          op.status !== "reserved" ||
          op.userQuotaStatus !== "reserved" ||
          op.platformCostStatus !== "none"
        ) {
          return {
            kind: "invalid_state",
            operationId,
            currentStatus: op.status,
            currentUserQuotaStatus: op.userQuotaStatus,
          };
        }

        if (!canTransitionOperationStatus(op.status, "released")) {
          return {
            kind: "invalid_state",
            operationId,
            currentStatus: op.status,
            currentUserQuotaStatus: op.userQuotaStatus,
          };
        }

        assertValidOperationStatusCombination("released", "none", "released");
        const transitionAt = this.#now();

        // Aggregate mutation: reserved_units -= units
        const quotaUpdated = await tx
          .update(subjectQuotaUsage)
          .set({
            reservedUnits: sql`${subjectQuotaUsage.reservedUnits} - ${op.units}`,
            updatedAt: sql`now()`, // Database audit timestamp
          })
          .where(
            and(
              eq(subjectQuotaUsage.subjectId, op.subjectId),
              eq(subjectQuotaUsage.periodStart, op.quotaPeriodStart),
              eq(subjectQuotaUsage.periodEnd, op.quotaPeriodEnd),
              gte(subjectQuotaUsage.reservedUnits, op.units)
            )
          )
          .returning({ subjectId: subjectQuotaUsage.subjectId });

        if (quotaUpdated.length !== 1) {
          throw new HermesControlPersistenceError("quota_aggregate_mutation_mismatch");
        }

        const opUpdated = await tx
          .update(analysisOperations)
          .set({
            status: "released",
            userQuotaStatus: "released",
            platformCostStatus: "none",
            completedAt: transitionAt,
            updatedAt: transitionAt,
          })
          .where(
            and(
              eq(analysisOperations.id, operationId),
              eq(analysisOperations.status, "reserved"),
              eq(analysisOperations.userQuotaStatus, "reserved"),
              eq(analysisOperations.platformCostStatus, "none")
            )
          )
          .returning({ id: analysisOperations.id });

        if (opUpdated.length !== 1) {
          throw new HermesControlPersistenceError("operation_status_mutation_mismatch");
        }

        return {
          kind: "finalized",
          operationId,
          status: "released",
          userQuotaStatus: "released",
          platformCostStatus: "none",
          units: op.units,
        };
      });
    } catch {
      return {
        kind: "control_unavailable",
        reason: "usage_control_unavailable",
      };
    }
  }

  /**
   * Finalizes an ambiguous outcome into policy_pending review:
   * Moves reserved_units -> pending_units using the operation's persisted quota period.
   * Requires coherent provider_dispatch_started source state.
   */
  async markPolicyPending(
    operationId: string,
    targetStatus: "completed_validation_failure" | "completed_grounding_failure" | "outcome_unknown"
  ): Promise<HermesFinalizationResult> {
    if (this.#deps.handler?.markPolicyPending) {
      try {
        return await this.#deps.handler.markPolicyPending(operationId, targetStatus);
      } catch {
        return { kind: "control_unavailable", reason: "usage_control_unavailable" };
      }
    }

    try {
      const runner = this.#resolveRunner();

      return await runner(async (tx) => {
        const op = await this.#lockOperation(tx, operationId);
        if (!op) {
          return { kind: "not_found", operationId };
        }

        // Enforce source row coherence and valid lifecycle timestamps fail-closed
        assertSourceOperationCoherent(op);

        if (op.status === targetStatus && op.userQuotaStatus === "policy_pending") {
          return {
            kind: "already_finalized",
            operationId,
            status: targetStatus,
            userQuotaStatus: "policy_pending",
          };
        }

        if (!canTransitionOperationStatus(op.status, targetStatus) || op.userQuotaStatus !== "reserved") {
          return {
            kind: "invalid_state",
            operationId,
            currentStatus: op.status,
            currentUserQuotaStatus: op.userQuotaStatus,
          };
        }

        const expected = getExpectedCoherentStatuses(targetStatus);
        assertValidOperationStatusCombination(targetStatus, expected.platformCostStatus, expected.userQuotaStatus);
        const transitionAt = this.#now();

        // Aggregate mutation: reserved_units -= units, pending_units += units
        const quotaUpdated = await tx
          .update(subjectQuotaUsage)
          .set({
            reservedUnits: sql`${subjectQuotaUsage.reservedUnits} - ${op.units}`,
            pendingUnits: sql`${subjectQuotaUsage.pendingUnits} + ${op.units}`,
            updatedAt: sql`now()`, // Database audit timestamp
          })
          .where(
            and(
              eq(subjectQuotaUsage.subjectId, op.subjectId),
              eq(subjectQuotaUsage.periodStart, op.quotaPeriodStart),
              eq(subjectQuotaUsage.periodEnd, op.quotaPeriodEnd),
              gte(subjectQuotaUsage.reservedUnits, op.units)
            )
          )
          .returning({ subjectId: subjectQuotaUsage.subjectId });

        if (quotaUpdated.length !== 1) {
          throw new HermesControlPersistenceError("quota_aggregate_mutation_mismatch");
        }

        const opUpdated = await tx
          .update(analysisOperations)
          .set({
            status: targetStatus,
            userQuotaStatus: expected.userQuotaStatus,
            platformCostStatus: expected.platformCostStatus,
            completedAt: transitionAt,
            updatedAt: transitionAt,
          })
          .where(
            and(
              eq(analysisOperations.id, operationId),
              eq(analysisOperations.status, op.status),
              eq(analysisOperations.userQuotaStatus, "reserved"),
              eq(analysisOperations.platformCostStatus, "indeterminate")
            )
          )
          .returning({ id: analysisOperations.id });

        if (opUpdated.length !== 1) {
          throw new HermesControlPersistenceError("operation_status_mutation_mismatch");
        }

        return {
          kind: "finalized",
          operationId,
          status: targetStatus,
          userQuotaStatus: expected.userQuotaStatus,
          platformCostStatus: expected.platformCostStatus,
          units: op.units,
        };
      });
    } catch {
      return {
        kind: "control_unavailable",
        reason: "usage_control_unavailable",
      };
    }
  }

  /**
   * Reclaims a stale reservation that expired before provider dispatch:
   * Moves reserved_units -= units using the operation's persisted quota period.
   * Requires coherent reserved source state.
   */
  async expireReservation(
    operationId: string,
    now?: Date
  ): Promise<HermesFinalizationResult> {
    let referenceNow: Date;
    try {
      referenceNow = now ?? this.#now();
    } catch {
      return { kind: "control_unavailable", reason: "usage_control_unavailable" };
    }

    if (!(referenceNow instanceof Date) || Number.isNaN(referenceNow.getTime())) {
      return { kind: "control_unavailable", reason: "usage_control_unavailable" };
    }

    if (this.#deps.handler?.expireReservation) {
      try {
        return await this.#deps.handler.expireReservation(operationId, referenceNow);
      } catch {
        return { kind: "control_unavailable", reason: "usage_control_unavailable" };
      }
    }

    try {
      const runner = this.#resolveRunner();

      return await runner(async (tx) => {
        const op = await this.#lockOperation(tx, operationId);
        if (!op) {
          return { kind: "not_found", operationId };
        }

        // Enforce source row coherence and valid lifecycle timestamps fail-closed
        assertSourceOperationCoherent(op);

        if (op.status === "expired_before_dispatch" && op.userQuotaStatus === "released") {
          return {
            kind: "already_finalized",
            operationId,
            status: "expired_before_dispatch",
            userQuotaStatus: "released",
          };
        }

        if (op.status !== "reserved" || op.userQuotaStatus !== "reserved") {
          return {
            kind: "invalid_state",
            operationId,
            currentStatus: op.status,
            currentUserQuotaStatus: op.userQuotaStatus,
          };
        }

        if (op.reservedExpiresAt.getTime() > referenceNow.getTime()) {
          return {
            kind: "not_expired",
            operationId,
            reservedExpiresAt: op.reservedExpiresAt,
          };
        }

        if (!canTransitionOperationStatus(op.status, "expired_before_dispatch")) {
          return {
            kind: "invalid_state",
            operationId,
            currentStatus: op.status,
            currentUserQuotaStatus: op.userQuotaStatus,
          };
        }

        assertValidOperationStatusCombination("expired_before_dispatch", "none", "released");
        const transitionAt = referenceNow;

        // Aggregate mutation: reserved_units -= units
        const quotaUpdated = await tx
          .update(subjectQuotaUsage)
          .set({
            reservedUnits: sql`${subjectQuotaUsage.reservedUnits} - ${op.units}`,
            updatedAt: sql`now()`, // Database audit timestamp
          })
          .where(
            and(
              eq(subjectQuotaUsage.subjectId, op.subjectId),
              eq(subjectQuotaUsage.periodStart, op.quotaPeriodStart),
              eq(subjectQuotaUsage.periodEnd, op.quotaPeriodEnd),
              gte(subjectQuotaUsage.reservedUnits, op.units)
            )
          )
          .returning({ subjectId: subjectQuotaUsage.subjectId });

        if (quotaUpdated.length !== 1) {
          throw new HermesControlPersistenceError("quota_aggregate_mutation_mismatch");
        }

        const opUpdated = await tx
          .update(analysisOperations)
          .set({
            status: "expired_before_dispatch",
            userQuotaStatus: "released",
            platformCostStatus: "none",
            completedAt: transitionAt,
            updatedAt: transitionAt,
          })
          .where(
            and(
              eq(analysisOperations.id, operationId),
              eq(analysisOperations.status, "reserved"),
              eq(analysisOperations.userQuotaStatus, "reserved"),
              eq(analysisOperations.platformCostStatus, "none")
            )
          )
          .returning({ id: analysisOperations.id });

        if (opUpdated.length !== 1) {
          throw new HermesControlPersistenceError("operation_status_mutation_mismatch");
        }

        return {
          kind: "finalized",
          operationId,
          status: "expired_before_dispatch",
          userQuotaStatus: "released",
          platformCostStatus: "none",
          units: op.units,
        };
      });
    } catch {
      return {
        kind: "control_unavailable",
        reason: "usage_control_unavailable",
      };
    }
  }

  /**
   * Deterministically finds candidate stale reservations expired before dispatch.
   * Validates clock and limit strictly. Returns typed HermesExpiredReservationScanResult.
   * Never schedules crons or mutates state.
   */
  async findExpiredReservations(
    now?: Date,
    limit?: number
  ): Promise<HermesExpiredReservationScanResult> {
    let referenceNow: Date;
    try {
      referenceNow = now ?? this.#now();
    } catch {
      return { kind: "control_unavailable", reason: "usage_control_unavailable" };
    }

    if (!(referenceNow instanceof Date) || Number.isNaN(referenceNow.getTime())) {
      return { kind: "control_unavailable", reason: "usage_control_unavailable" };
    }

    const resolvedLimit = limit === undefined ? 50 : limit;
    if (
      typeof resolvedLimit !== "number" ||
      !Number.isInteger(resolvedLimit) ||
      resolvedLimit < 1 ||
      resolvedLimit > 100
    ) {
      return { kind: "control_unavailable", reason: "usage_control_unavailable" };
    }

    if (this.#deps.handler?.findExpiredReservations) {
      try {
        return await this.#deps.handler.findExpiredReservations(referenceNow, resolvedLimit);
      } catch {
        return { kind: "control_unavailable", reason: "usage_control_unavailable" };
      }
    }

    try {
      const runner = this.#resolveRunner();

      return await runner(async (tx) => {
        const rows = await tx
          .select({
            operationId: analysisOperations.id,
            subjectId: analysisOperations.subjectId,
            reservedExpiresAt: analysisOperations.reservedExpiresAt,
            units: analysisOperations.units,
            quotaPeriodStart: analysisOperations.quotaPeriodStart,
            quotaPeriodEnd: analysisOperations.quotaPeriodEnd,
          })
          .from(analysisOperations)
          .where(
            and(
              eq(analysisOperations.status, "reserved"),
              eq(analysisOperations.userQuotaStatus, "reserved"),
              lte(analysisOperations.reservedExpiresAt, referenceNow)
            )
          )
          .orderBy(analysisOperations.reservedExpiresAt)
          .limit(resolvedLimit);

        return {
          kind: "found",
          records: rows.map((r) => ({
            operationId: r.operationId,
            subjectId: r.subjectId,
            reservedExpiresAt: r.reservedExpiresAt,
            units: r.units,
            quotaPeriodStart: r.quotaPeriodStart,
            quotaPeriodEnd: r.quotaPeriodEnd,
          })),
        };
      });
    } catch {
      return { kind: "control_unavailable", reason: "usage_control_unavailable" };
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
    units: number;
    quotaPeriodStart: Date;
    quotaPeriodEnd: Date;
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
        units: analysisOperations.units,
        quotaPeriodStart: analysisOperations.quotaPeriodStart,
        quotaPeriodEnd: analysisOperations.quotaPeriodEnd,
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

    return {
      id: row.id,
      subjectId: row.subjectId,
      status: parseHermesOperationStatus(row.status),
      userQuotaStatus: parseHermesUserQuotaStatus(row.userQuotaStatus),
      platformCostStatus: parseHermesPlatformCostStatus(row.platformCostStatus),
      units: row.units,
      quotaPeriodStart: row.quotaPeriodStart,
      quotaPeriodEnd: row.quotaPeriodEnd,
      reservedExpiresAt: row.reservedExpiresAt,
      dispatchStartedAt: parseNullableDate(row.dispatchStartedAt),
      completedAt: parseNullableDate(row.completedAt),
    };
  }

  async #executeQuotaUpsert(
    tx: HermesControlTransaction,
    params: {
      subjectId: string;
      periodStart: Date;
      periodEnd: Date;
      units: number;
      monthlyQuota: number;
    }
  ): Promise<boolean> {
    if (this.#deps.atomicQuotaUpsert) {
      return await this.#deps.atomicQuotaUpsert(tx, params);
    }

    const result = await tx.execute<{ subject_id: string }>(
      sql`
      INSERT INTO "hermes_control"."subject_quota_usage" (
        "subject_id",
        "period_start",
        "period_end",
        "reserved_units",
        "committed_units",
        "pending_units",
        "updated_at"
      )
      SELECT
        ${params.subjectId}::uuid,
        ${params.periodStart}::timestamptz,
        ${params.periodEnd}::timestamptz,
        ${params.units}::integer,
        0,
        0,
        now()
      WHERE ${params.monthlyQuota}::integer >= ${params.units}::integer
      ON CONFLICT ("subject_id", "period_start", "period_end")
      DO UPDATE SET
        "reserved_units" = "hermes_control"."subject_quota_usage"."reserved_units" + ${params.units}::integer,
        "updated_at" = now()
      WHERE
        "hermes_control"."subject_quota_usage"."reserved_units"
        + "hermes_control"."subject_quota_usage"."committed_units"
        + "hermes_control"."subject_quota_usage"."pending_units"
        + ${params.units}::integer
        <= ${params.monthlyQuota}::integer
      RETURNING "subject_id";
      `
    );

    return Array.isArray(result) && result.length === 1;
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
