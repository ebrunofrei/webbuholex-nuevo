/**
 * Hermes Runtime Execution Service
 * Governing: docs/hermes/HERMES-PROD-A3.1-CONTROLS-DESIGN.md
 * Phase: HERMES-PROD-A3.6 / HERMES-PROD-A3.6B
 *
 * Authoritative application-level composition service.
 * Coordinates identity, commercial entitlement, read-only document preparation,
 * quota reservation, concurrency lease acquisition, exactly-once provider execution,
 * schema validation, citation grounding, terminal finalization, and lease release.
 *
 * CARDINAL INVARIANTS:
 * 1. Zero provider HTTP calls before A3.5 beginProviderDispatch returns kind = "started".
 * 2. Zero provider HTTP calls inside any PostgreSQL transaction, row-lock scope, or advisory lock scope.
 * 3. Exactly-once provider execution (retryCount = 0; no provider retries on any failure).
 * 4. Terminal finalization retry applies ONLY to the database finalizer, never to the remote provider.
 * 5. Bounded finalizer retries retry ONLY the SAME target finalizer; never downgrade known outcomes to outcome_unknown.
 * 6. Concurrency lease is unconditionally released best-effort in a finally block after boundary entry.
 * 7. Fail closed if provider timeout exceeds 30000ms.
 */

import { jurisprudenceInterpretationSchema } from "../contracts/jurisprudence-interpretation";
import type { JurisprudenceInterpretation } from "../contracts/jurisprudence-interpretation";
import type { HermesProviderPort } from "../contracts/hermes-provider-port";
import type { HermesProviderOutcome } from "../contracts/hermes-envelope";
import type {
  HermesOperationStatus,
} from "../control/hermes-control-contracts";
import type {
  HermesSubjectRepository,
  HermesSubjectIdentityInput,
} from "../control/hermes-subject-repository";
import type { HermesEntitlementRepository } from "../control/hermes-entitlement-repository";
import { evaluateSubjectEntitlementGate } from "../control/hermes-entitlement-policy";
import type {
  HermesQuotaCoordinator,
  HermesOperationReservationInput,
  HermesFinalizationResult,
} from "../control/hermes-quota-coordinator";
import {
  type HermesProviderBoundaryCoordinator,
  type HermesProviderBoundaryLimits,
  MIN_HERMES_LEASE_TTL_SECONDS,
  MAX_HERMES_LEASE_TTL_SECONDS,
  DEFAULT_HERMES_LEASE_TTL_SECONDS,
} from "../control/hermes-provider-boundary-coordinator";
import type {
  JurisprudenceInterpretationOrchestrator,
  JurisprudencePreparationResult,
} from "@/lib/domain/services/jurisprudence-interpretation-orchestrator";

export {
  MIN_HERMES_LEASE_TTL_SECONDS,
  MAX_HERMES_LEASE_TTL_SECONDS,
  DEFAULT_HERMES_LEASE_TTL_SECONDS,
};

export const FROZEN_HERMES_MAX_PROVIDER_TIMEOUT_MS = 30000;
export const DEFAULT_HERMES_PROVIDER_TIMEOUT_MS = 30000;

export const MIN_HERMES_RESERVATION_TTL_SECONDS = 90;
export const MAX_HERMES_RESERVATION_TTL_SECONDS = 120;
export const DEFAULT_HERMES_RESERVATION_TTL_SECONDS = 105;

export const MIN_HERMES_FINALIZER_ATTEMPTS = 1;
export const MAX_HERMES_FINALIZER_ATTEMPTS = 3;
export const DEFAULT_HERMES_FINALIZER_ATTEMPTS = 3;

const STRICT_POSITIVE_DECIMAL_INTEGER_REGEX = /^[1-9]\d*$/;

/**
 * Reads and validates the Hermes reservation TTL configuration from environment.
 * If absent, returns DEFAULT_HERMES_RESERVATION_TTL_SECONDS (105).
 * If present, strictly enforces canonical positive decimal integer syntax (^[1-9]\d*$)
 * without signs, leading zeros, decimals, exponents, or whitespace.
 * Enforces safe integer and range: 90 <= reservationTtlSeconds <= 120.
 * Fails closed on any invalid representation.
 */
export function readHermesReservationTtlConfig(
  env: Partial<NodeJS.ProcessEnv> = process.env
): number {
  const rawReservationTtl = env.HERMES_RESERVATION_TTL_SECONDS;
  if (rawReservationTtl === undefined) {
    return DEFAULT_HERMES_RESERVATION_TTL_SECONDS;
  }
  if (!STRICT_POSITIVE_DECIMAL_INTEGER_REGEX.test(rawReservationTtl)) {
    throw new Error(
      "HERMES_RESERVATION_TTL_SECONDS must be a canonical positive decimal integer string without signs, leading zeros, decimals, exponents, or whitespace"
    );
  }
  const parsedReservation = Number(rawReservationTtl);
  if (
    !Number.isSafeInteger(parsedReservation) ||
    parsedReservation < MIN_HERMES_RESERVATION_TTL_SECONDS ||
    parsedReservation > MAX_HERMES_RESERVATION_TTL_SECONDS
  ) {
    throw new Error(
      `HERMES_RESERVATION_TTL_SECONDS must be an integer between ${MIN_HERMES_RESERVATION_TTL_SECONDS} and ${MAX_HERMES_RESERVATION_TTL_SECONDS}`
    );
  }
  return parsedReservation;
}

export interface HermesRuntimeLimitsConfig extends HermesProviderBoundaryLimits {
  readonly concurrencyLimit: number;
  readonly dailyProviderCallLimit: number;
  readonly leaseTtlSeconds: number;
  readonly reservationTtlSeconds: number;
}

/**
 * Reads and strictly validates Hermes provider boundary capacity limits from environment.
 * Fails closed if concurrency or daily limits are missing or invalid.
 * Accepts only canonical positive decimal integer strings (^[1-9]\d*$).
 * Never supplies permissive silent defaults.
 */
export function readHermesRuntimeLimitsConfig(
  env: Partial<NodeJS.ProcessEnv> = process.env
): HermesRuntimeLimitsConfig {
  const rawConcurrency = env.HERMES_CONCURRENCY_LIMIT;
  const rawDaily = env.HERMES_DAILY_PROVIDER_CALL_LIMIT;
  const rawLeaseTtl = env.HERMES_CONCURRENCY_LEASE_TTL_SECONDS;

  if (rawConcurrency === undefined || rawConcurrency === "") {
    throw new Error(
      "HERMES_CONCURRENCY_LIMIT is required and must be an explicit positive integer"
    );
  }
  if (!STRICT_POSITIVE_DECIMAL_INTEGER_REGEX.test(rawConcurrency)) {
    throw new Error(
      "HERMES_CONCURRENCY_LIMIT must be a canonical positive decimal integer string without signs, leading zeros, decimals, exponents, or whitespace"
    );
  }
  const concurrencyLimit = Number(rawConcurrency);
  if (!Number.isSafeInteger(concurrencyLimit) || concurrencyLimit <= 0) {
    throw new Error(
      "HERMES_CONCURRENCY_LIMIT must be an explicit positive safe integer"
    );
  }

  if (rawDaily === undefined || rawDaily === "") {
    throw new Error(
      "HERMES_DAILY_PROVIDER_CALL_LIMIT is required and must be an explicit positive integer"
    );
  }
  if (!STRICT_POSITIVE_DECIMAL_INTEGER_REGEX.test(rawDaily)) {
    throw new Error(
      "HERMES_DAILY_PROVIDER_CALL_LIMIT must be a canonical positive decimal integer string without signs, leading zeros, decimals, exponents, or whitespace"
    );
  }
  const dailyProviderCallLimit = Number(rawDaily);
  if (!Number.isSafeInteger(dailyProviderCallLimit) || dailyProviderCallLimit <= 0) {
    throw new Error(
      "HERMES_DAILY_PROVIDER_CALL_LIMIT must be an explicit positive safe integer"
    );
  }

  let leaseTtlSeconds = DEFAULT_HERMES_LEASE_TTL_SECONDS;
  if (rawLeaseTtl !== undefined) {
    if (!STRICT_POSITIVE_DECIMAL_INTEGER_REGEX.test(rawLeaseTtl)) {
      throw new Error(
        "HERMES_CONCURRENCY_LEASE_TTL_SECONDS must be a canonical positive decimal integer string without signs, leading zeros, decimals, exponents, or whitespace"
      );
    }
    const parsedLease = Number(rawLeaseTtl);
    if (
      !Number.isSafeInteger(parsedLease) ||
      parsedLease < MIN_HERMES_LEASE_TTL_SECONDS ||
      parsedLease > MAX_HERMES_LEASE_TTL_SECONDS
    ) {
      throw new Error(
        `HERMES_CONCURRENCY_LEASE_TTL_SECONDS must be an integer between ${MIN_HERMES_LEASE_TTL_SECONDS} and ${MAX_HERMES_LEASE_TTL_SECONDS}`
      );
    }
    leaseTtlSeconds = parsedLease;
  }

  const reservationTtlSeconds = readHermesReservationTtlConfig(env);

  return {
    concurrencyLimit,
    dailyProviderCallLimit,
    leaseTtlSeconds,
    reservationTtlSeconds,
  };
}

const UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * Strict server-side execution input contract for Hermes jurisprudence interpretation.
 * Contains only data authenticated or derived by the HTTP boundary.
 */
export interface HermesExecuteJurisprudenceInput {
  readonly identity: HermesSubjectIdentityInput;
  readonly idempotencyKey: string;
  readonly recordId: string;
  readonly recordVersion: number;
}

/**
 * Authoritative discriminated execution result returned to caller.
 * Never exposes raw DB errors, prompts, tokens, or unmasked idempotency keys.
 */
export type HermesRuntimeExecutionResult =
  | {
      readonly ok: true;
      readonly operationId: string;
      readonly interpretation: JurisprudenceInterpretation;
    }
  | {
      readonly ok: false;
      readonly code: "finalization_unavailable";
      readonly operationId: string;
      readonly targetStatus: HermesOperationStatus;
      readonly providerOutcomeKnown: boolean;
      readonly reason?: string;
    }
  | {
      readonly ok: false;
      readonly code:
        | "idempotency_key_invalid"
        | "subject_resolution_failed"
        | "feature_not_entitled"
        | "account_inactive"
        | "record_not_found"
        | "record_version_mismatch"
        | "source_too_large"
        | "quota_exhausted"
        | "duplicate_in_flight"
        | "already_completed"
        | "active_document_conflict"
        | "subject_concurrency_conflict"
        | "concurrency_capacity_exceeded"
        | "daily_limit_exhausted"
        | "already_started"
        | "already_finalized"
        | "reservation_expired"
        | "provider_transport_failure"
        | "validation_failure"
        | "grounding_failure"
        | "control_unavailable";
      readonly operationId?: string;
      readonly targetStatus?: HermesOperationStatus;
      readonly providerOutcomeKnown?: boolean;
      readonly requestedUnits?: number;
      readonly monthlyQuota?: number;
      readonly recordId?: string;
      readonly recordVersion?: number;
      readonly reason?: string;
    };

export interface HermesRuntimeExecutionServicePort {
  executeJurisprudenceInterpretation(
    input: HermesExecuteJurisprudenceInput
  ): Promise<HermesRuntimeExecutionResult>;
}

export interface HermesRuntimeExecutionServiceDependencies {
  readonly subjectRepository: HermesSubjectRepository;
  readonly entitlementRepository: HermesEntitlementRepository;
  readonly quotaCoordinator: HermesQuotaCoordinator;
  readonly providerBoundaryCoordinator: HermesProviderBoundaryCoordinator;
  readonly domainOrchestrator: Pick<
    JurisprudenceInterpretationOrchestrator,
    "prepareInterpretation" | "validateGrounding"
  >;
  readonly providerPort: HermesProviderPort;
  readonly limits: HermesProviderBoundaryLimits;
  readonly providerTimeoutMs?: number | undefined;
  readonly reservationTtlSeconds?: number | undefined;
  readonly maxFinalizerAttempts?: number | undefined;
  readonly now?: (() => Date) | undefined;
  readonly sleep?: ((ms: number) => Promise<void>) | undefined;
}

export class HermesRuntimeExecutionService implements HermesRuntimeExecutionServicePort {
  readonly #subjectRepository: HermesSubjectRepository;
  readonly #entitlementRepository: HermesEntitlementRepository;
  readonly #quotaCoordinator: HermesQuotaCoordinator;
  readonly #providerBoundaryCoordinator: HermesProviderBoundaryCoordinator;
  readonly #domainOrchestrator: Pick<
    JurisprudenceInterpretationOrchestrator,
    "prepareInterpretation" | "validateGrounding"
  >;
  readonly #providerPort: HermesProviderPort;

  readonly #concurrencyLimit: number;
  readonly #dailyProviderCallLimit: number;
  readonly #leaseTtlSeconds: number;
  readonly #reservationTtlSeconds: number;
  readonly #providerTimeoutMs: number;
  readonly #maxFinalizerAttempts: number;

  readonly #now: () => Date;
  readonly #sleep: (ms: number) => Promise<void>;

  constructor(deps: HermesRuntimeExecutionServiceDependencies) {
    this.#subjectRepository = deps.subjectRepository;
    this.#entitlementRepository = deps.entitlementRepository;
    this.#quotaCoordinator = deps.quotaCoordinator;
    this.#providerBoundaryCoordinator = deps.providerBoundaryCoordinator;
    this.#domainOrchestrator = deps.domainOrchestrator;
    this.#providerPort = deps.providerPort;

    const timeoutMs = deps.providerTimeoutMs ?? DEFAULT_HERMES_PROVIDER_TIMEOUT_MS;
    if (typeof timeoutMs !== "number" || !Number.isInteger(timeoutMs) || timeoutMs < 1000) {
      throw new Error("Hermes provider timeout must be an integer >= 1000 ms");
    }
    if (timeoutMs > FROZEN_HERMES_MAX_PROVIDER_TIMEOUT_MS) {
      throw new Error(
        `Hermes provider timeout (${timeoutMs}ms) exceeds frozen maximum of ${FROZEN_HERMES_MAX_PROVIDER_TIMEOUT_MS}ms`
      );
    }
    this.#providerTimeoutMs = timeoutMs;

    const limits = deps.limits;
    if (
      !limits ||
      typeof limits.concurrencyLimit !== "number" ||
      !Number.isSafeInteger(limits.concurrencyLimit) ||
      limits.concurrencyLimit <= 0
    ) {
      throw new Error(
        "Hermes capacity limits invalid: concurrencyLimit must be an explicit positive integer"
      );
    }
    if (
      typeof limits.dailyProviderCallLimit !== "number" ||
      !Number.isSafeInteger(limits.dailyProviderCallLimit) ||
      limits.dailyProviderCallLimit <= 0
    ) {
      throw new Error(
        "Hermes capacity limits invalid: dailyProviderCallLimit must be an explicit positive integer"
      );
    }
    const leaseTtl = limits.leaseTtlSeconds ?? DEFAULT_HERMES_LEASE_TTL_SECONDS;
    if (
      typeof leaseTtl !== "number" ||
      !Number.isSafeInteger(leaseTtl) ||
      leaseTtl < MIN_HERMES_LEASE_TTL_SECONDS ||
      leaseTtl > MAX_HERMES_LEASE_TTL_SECONDS
    ) {
      throw new Error(
        `Hermes capacity limits invalid: leaseTtlSeconds must be an integer between ${MIN_HERMES_LEASE_TTL_SECONDS} and ${MAX_HERMES_LEASE_TTL_SECONDS}`
      );
    }
    this.#concurrencyLimit = limits.concurrencyLimit;
    this.#dailyProviderCallLimit = limits.dailyProviderCallLimit;
    this.#leaseTtlSeconds = leaseTtl;

    const reservationTtl =
      deps.reservationTtlSeconds ?? DEFAULT_HERMES_RESERVATION_TTL_SECONDS;
    if (
      typeof reservationTtl !== "number" ||
      !Number.isSafeInteger(reservationTtl) ||
      reservationTtl < MIN_HERMES_RESERVATION_TTL_SECONDS ||
      reservationTtl > MAX_HERMES_RESERVATION_TTL_SECONDS
    ) {
      throw new Error(
        `Hermes reservation TTL invalid: reservationTtlSeconds must be an integer between ${MIN_HERMES_RESERVATION_TTL_SECONDS} and ${MAX_HERMES_RESERVATION_TTL_SECONDS}`
      );
    }
    if (reservationTtl <= leaseTtl + 15) {
      throw new Error(
        `Hermes reservation TTL invalid: reservationTtlSeconds (${reservationTtl}) must be strictly greater than leaseTtlSeconds (${leaseTtl}) + 15`
      );
    }
    this.#reservationTtlSeconds = reservationTtl;

    const finalizerAttempts =
      deps.maxFinalizerAttempts ?? DEFAULT_HERMES_FINALIZER_ATTEMPTS;
    if (
      typeof finalizerAttempts !== "number" ||
      !Number.isSafeInteger(finalizerAttempts) ||
      finalizerAttempts < MIN_HERMES_FINALIZER_ATTEMPTS ||
      finalizerAttempts > MAX_HERMES_FINALIZER_ATTEMPTS
    ) {
      throw new Error(
        `Hermes maxFinalizerAttempts must be an integer between ${MIN_HERMES_FINALIZER_ATTEMPTS} and ${MAX_HERMES_FINALIZER_ATTEMPTS}`
      );
    }
    this.#maxFinalizerAttempts = finalizerAttempts;
    this.#now = deps.now ?? (() => new Date());
    this.#sleep = deps.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  /**
   * Executes the full guarded runtime composition sequence:
   * 1. Validate input strictly (UUID idempotency key, record identifiers).
   * 2. A3.3: Resolve canonical subject identity.
   * 3. A3.3: Evaluate commercial entitlement.
   * 4. Domain: Read-only document retrieval and prompt preparation.
   * 5. A3.4: Quota reservation & active document deduplication.
   * 6. A3.5: Concurrency lease & daily limit boundary entry (PostgreSQL COMMIT).
   * 7. Provider: Exactly-once HTTP dispatch outside any DB transaction.
   * 8. Validation: Structured Zod schema parsing.
   * 9. Grounding: Deterministic citation verification.
   * 10. A3.4: Terminal finalization with bounded same-target DB retries.
   * 11. A3.5: Best-effort concurrency lease release in finally block.
   */
  async executeJurisprudenceInterpretation(
    input: HermesExecuteJurisprudenceInput
  ): Promise<HermesRuntimeExecutionResult> {
    const referenceNow = this.#resolveNow();

    // Step 1: Input validation
    if (
      typeof input.idempotencyKey !== "string" ||
      !UUID_REGEX.test(input.idempotencyKey) ||
      input.idempotencyKey !== input.idempotencyKey.trim()
    ) {
      return { ok: false, code: "idempotency_key_invalid" };
    }

    if (
      typeof input.recordId !== "string" ||
      input.recordId.length === 0 ||
      input.recordId.length > 64 ||
      input.recordId !== input.recordId.trim()
    ) {
      return { ok: false, code: "record_not_found" };
    }

    if (
      typeof input.recordVersion !== "number" ||
      !Number.isInteger(input.recordVersion) ||
      input.recordVersion <= 0
    ) {
      return { ok: false, code: "record_version_mismatch" };
    }

    // Step 2: A3.3 Subject Identity Resolution
    let subjectId: string;
    try {
      const subjectRes = await this.#subjectRepository.resolveOrCreateSubject(input.identity);
      if (subjectRes.kind === "unavailable") {
        return { ok: false, code: "control_unavailable" };
      }
      subjectId = subjectRes.subjectId;
    } catch {
      return { ok: false, code: "subject_resolution_failed" };
    }

    // Step 3: A3.3 Entitlement Gate
    let entitlementPeriodStart: Date;
    let entitlementPeriodEnd: Date;
    let monthlyQuota: number;

    try {
      const gateRes = await evaluateSubjectEntitlementGate(
        this.#entitlementRepository,
        subjectId,
        referenceNow
      );

      if (!gateRes.allowed) {
        if (gateRes.kind === "control_failure") {
          return { ok: false, code: "control_unavailable" };
        }
        if (gateRes.reason === "feature_not_entitled") {
          return { ok: false, code: "feature_not_entitled" };
        }
        if (gateRes.reason === "account_inactive") {
          return { ok: false, code: "account_inactive" };
        }
        if (gateRes.reason === "entitlement_not_current") {
          return { ok: false, code: "account_inactive" };
        }
        return { ok: false, code: "control_unavailable" };
      }

      entitlementPeriodStart = gateRes.entitlement.periodStart;
      entitlementPeriodEnd = gateRes.entitlement.periodEnd;
      monthlyQuota = gateRes.entitlement.monthlyQuota;
    } catch {
      return { ok: false, code: "control_unavailable" };
    }

    // Step 4: Read-Only Document Preparation Before Quota Consumption
    let prepRes: JurisprudencePreparationResult;
    try {
      prepRes = await this.#domainOrchestrator.prepareInterpretation(
        input.recordId,
        input.recordVersion
      );
      if (!prepRes.ok) {
        return { ok: false, code: prepRes.code };
      }
    } catch {
      return { ok: false, code: "control_unavailable" };
    }

    // Step 5: A3.4 Operation Quota Reservation & Active Document Dedup
    let operationId: string;
    try {
      const reservationInput: HermesOperationReservationInput = {
        subjectId,
        idempotencyKey: input.idempotencyKey,
        recordId: prepRes.recordId,
        recordVersion: prepRes.recordVersion,
        quotaPeriodStart: entitlementPeriodStart,
        quotaPeriodEnd: entitlementPeriodEnd,
        monthlyQuota,
        units: 1,
        reservedExpiresAt: new Date(
          referenceNow.getTime() + this.#reservationTtlSeconds * 1000
        ),
      };

      const resOutcome = await this.#quotaCoordinator.reserveOperationQuota(reservationInput);

      if (resOutcome.kind === "quota_exhausted") {
        return {
          ok: false,
          code: "quota_exhausted",
          requestedUnits: resOutcome.requestedUnits,
          monthlyQuota: resOutcome.monthlyQuota,
        };
      }
      if (resOutcome.kind === "duplicate_in_flight") {
        return {
          ok: false,
          code: "duplicate_in_flight",
          operationId: resOutcome.operationId,
        };
      }
      if (resOutcome.kind === "already_completed") {
        return {
          ok: false,
          code: "already_completed",
          operationId: resOutcome.operationId,
        };
      }
      if (resOutcome.kind === "active_document_conflict") {
        return {
          ok: false,
          code: "active_document_conflict",
          recordId: resOutcome.recordId,
          recordVersion: resOutcome.recordVersion,
        };
      }
      if (resOutcome.kind === "control_unavailable") {
        return { ok: false, code: "control_unavailable" };
      }

      operationId = resOutcome.operationId;
    } catch {
      return { ok: false, code: "control_unavailable" };
    }

    // Step 6: A3.5 Provider Boundary & Concurrency Lease Acquisition
    const limits: HermesProviderBoundaryLimits = {
      concurrencyLimit: this.#concurrencyLimit,
      dailyProviderCallLimit: this.#dailyProviderCallLimit,
      leaseTtlSeconds: this.#leaseTtlSeconds,
    };

    let boundaryEntered = false;
    try {
      const boundaryRes = await this.#providerBoundaryCoordinator.beginProviderDispatch(
        operationId,
        limits
      );

      if (boundaryRes.kind === "started") {
        boundaryEntered = true;
      } else {
        if (boundaryRes.kind === "subject_concurrency_conflict") {
          await this.#safeReleaseReservation(operationId);
          return { ok: false, code: "subject_concurrency_conflict" };
        }
        if (boundaryRes.kind === "concurrency_capacity_exceeded") {
          await this.#safeReleaseReservation(operationId);
          return { ok: false, code: "concurrency_capacity_exceeded" };
        }
        if (boundaryRes.kind === "daily_limit_exhausted") {
          await this.#safeReleaseReservation(operationId);
          return { ok: false, code: "daily_limit_exhausted" };
        }
        if (boundaryRes.kind === "reservation_expired") {
          // Fresh expiry: use quota coordinator's trusted clock, NOT stale request-start referenceNow
          await this.#safeExpireReservation(operationId);
          return { ok: false, code: "reservation_expired", operationId };
        }
        if (boundaryRes.kind === "already_started") {
          // Cardinal invariant: NEVER release reservation, NEVER redispatch on already_started
          return { ok: false, code: "already_started", operationId };
        }
        if (boundaryRes.kind === "already_finalized") {
          // Cardinal invariant: NEVER release reservation, NEVER redispatch on already_finalized
          return { ok: false, code: "already_finalized", operationId };
        }
        // control_unavailable: transaction state may be ambiguous (e.g. commit drop),
        // therefore DO NOT issue potentially unsafe releaseReservation. Leave for safe reconciliation/expiry.
        return { ok: false, code: "control_unavailable" };
      }
    } catch {
      // Persistence error calling beginProviderDispatch: boundary outcome is ambiguous; do NOT release
      return { ok: false, code: "control_unavailable" };
    }

    // Steps 7-11: Provider Execution & Lifecycle (under try-finally for unconditional lease release)
    try {
      // Step 7: Exactly-once remote provider dispatch (strictly OUTSIDE of any DB transaction)
      let providerOutcome: HermesProviderOutcome;
      try {
        providerOutcome = await this.#providerPort.generateStructuredOutput(prepRes.request);
      } catch {
        const finalRes = await this.#finalizeWithRetry(operationId, "outcome_unknown", () =>
          this.#quotaCoordinator.markPolicyPending(operationId, "outcome_unknown")
        );
        if (!finalRes.ok) {
          return {
            ok: false,
            code: "finalization_unavailable",
            operationId,
            targetStatus: "outcome_unknown",
            providerOutcomeKnown: false,
          };
        }
        return {
          ok: false,
          code: "provider_transport_failure",
          operationId,
        };
      }

      // Step 8: Provider transport/network failure handling
      if (!providerOutcome.ok) {
        const finalRes = await this.#finalizeWithRetry(operationId, "outcome_unknown", () =>
          this.#quotaCoordinator.markPolicyPending(operationId, "outcome_unknown")
        );
        if (!finalRes.ok) {
          return {
            ok: false,
            code: "finalization_unavailable",
            operationId,
            targetStatus: "outcome_unknown",
            providerOutcomeKnown: false,
          };
        }
        return {
          ok: false,
          code: "provider_transport_failure",
          operationId,
        };
      }

      // Step 9: Structured Output Schema Validation
      const parsedOutput = jurisprudenceInterpretationSchema.safeParse(providerOutcome.payload);
      if (!parsedOutput.success) {
        const finalRes = await this.#finalizeWithRetry(
          operationId,
          "completed_validation_failure",
          () =>
            this.#quotaCoordinator.markPolicyPending(
              operationId,
              "completed_validation_failure"
            )
        );

        if (!finalRes.ok) {
          return {
            ok: false,
            code: "finalization_unavailable",
            operationId,
            targetStatus: "completed_validation_failure",
            providerOutcomeKnown: true,
          };
        }

        return {
          ok: false,
          code: "validation_failure",
          operationId,
        };
      }

      // Step 10: Citation Grounding Verification
      const interpretation = parsedOutput.data;
      const isGrounded = this.#domainOrchestrator.validateGrounding(
        interpretation,
        prepRes.sourceText
      );

      if (!isGrounded) {
        const finalRes = await this.#finalizeWithRetry(
          operationId,
          "completed_grounding_failure",
          () =>
            this.#quotaCoordinator.markPolicyPending(
              operationId,
              "completed_grounding_failure"
            )
        );

        if (!finalRes.ok) {
          return {
            ok: false,
            code: "finalization_unavailable",
            operationId,
            targetStatus: "completed_grounding_failure",
            providerOutcomeKnown: true,
          };
        }

        return {
          ok: false,
          code: "grounding_failure",
          operationId,
        };
      }

      // Step 11: Terminal Success Finalization
      const commitRes = await this.#finalizeWithRetry(
        operationId,
        "completed_success",
        () => this.#quotaCoordinator.commitSuccess(operationId)
      );

      if (!commitRes.ok) {
        return {
          ok: false,
          code: "finalization_unavailable",
          operationId,
          targetStatus: "completed_success",
          providerOutcomeKnown: true,
        };
      }

      return {
        ok: true,
        operationId,
        interpretation,
      };
    } finally {
      // Step 12: Best-effort concurrency lease release in finally block
      if (boundaryEntered) {
        try {
          await this.#providerBoundaryCoordinator.releaseConcurrencyLease(operationId);
        } catch {
          // Best-effort: must never rewrite terminal outcome or throw
        }
      }
    }
  }

  async #safeReleaseReservation(operationId: string): Promise<void> {
    try {
      await this.#quotaCoordinator.releaseReservation(operationId);
    } catch {
      // Best-effort cleanup on pre-dispatch abort
    }
  }

  async #safeExpireReservation(operationId: string): Promise<void> {
    try {
      await this.#quotaCoordinator.expireReservation(operationId);
    } catch {
      // Best-effort cleanup on expired reservation
    }
  }

  /**
   * Bounded database finalization retry policy for a KNOWN target status.
   * Retries ONLY the SAME finalizer against PostgreSQL.
   * Never reinvokes the LLM provider.
   * Never downgrades a known outcome to outcome_unknown.
   */
  async #finalizeWithRetry(
    operationId: string,
    targetStatus: HermesOperationStatus,
    finalizer: () => Promise<HermesFinalizationResult>
  ): Promise<{ readonly ok: boolean; readonly result?: HermesFinalizationResult }> {
    const maxAttempts = this.#maxFinalizerAttempts;
    const delays = [50, 150];

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await finalizer();

        if (res.kind === "finalized") {
          return { ok: true, result: res };
        }

        if (res.kind === "already_finalized") {
          if (res.status === targetStatus) {
            return { ok: true, result: res };
          }
          // Conflicting terminal status detected
          return { ok: false, result: res };
        }

        if (res.kind === "control_unavailable") {
          if (attempt < maxAttempts) {
            const delay = delays[attempt - 1] ?? 150;
            await this.#sleep(delay);
            continue;
          }
          return { ok: false, result: res };
        }

        // not_found, invalid_state -> non-retryable
        return { ok: false, result: res };
      } catch {
        if (attempt < maxAttempts) {
          const delay = delays[attempt - 1] ?? 150;
          await this.#sleep(delay);
          continue;
        }
        return { ok: false };
      }
    }

    return { ok: false };
  }

  #resolveNow(): Date {
    const d = this.#now();
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
      throw new Error("HermesRuntimeExecutionService clock returned invalid Date");
    }
    return d;
  }
}
