/**
 * Hermes Post-Dispatch Orphan Reconciler
 * Governing: docs/hermes/HERMES-PROD-A3.1-CONTROLS-DESIGN.md
 * Phase: HERMES-PROD-A3.7C
 *
 * Reconciles operations that remain durably in provider_dispatch_started
 * after worker lease authority has expired.
 *
 * Invariant: Reconciles ONLY when no active lease exists at database wall-clock.
 * Terminal target: outcome_unknown / indeterminate / policy_pending.
 * Performs zero remote provider calls, zero redispatches, and zero physical lease deletions.
 */

import type {
  HermesQuotaCoordinator,
  HermesReconciliationResult,
} from "./hermes-quota-coordinator";

export interface HermesPostDispatchReconcilerDependencies {
  readonly quotaCoordinator: HermesQuotaCoordinator;
  readonly defaultLimit?: number;
}

export interface HermesReconcileBatchOptions {
  readonly limit?: number;
}

export interface HermesReconciliationBatchSummary {
  readonly scanned: number;
  readonly reconciled: number;
  readonly alreadyFinalized: number;
  readonly leaseStillActive: number;
  readonly invalidState: number;
  readonly notFound: number;
  readonly controlUnavailable: number;
}

export type HermesReconciliationBatchResult =
  | ({
      readonly kind: "completed";
    } & HermesReconciliationBatchSummary)
  | ({
      readonly kind: "control_unavailable";
      readonly reason: string;
    } & HermesReconciliationBatchSummary);

/**
 * Orchestrator service for post-dispatch orphan discovery and reconciliation.
 */
export class HermesPostDispatchReconciler {
  readonly #quotaCoordinator: HermesQuotaCoordinator;
  readonly #defaultLimit: number;

  constructor(dependencies: HermesPostDispatchReconcilerDependencies) {
    this.#quotaCoordinator = dependencies.quotaCoordinator;
    this.#defaultLimit = dependencies.defaultLimit ?? 50;
  }

  /**
   * Reconciles a single operation if no active lease exists at database wall-clock.
   */
  async reconcileOperation(operationId: string): Promise<HermesReconciliationResult> {
    return await this.#quotaCoordinator.reconcileOutcomeUnknownIfLeaseExpired(operationId);
  }

  /**
   * Discovers candidate orphaned operations and reconciles each under atomic row-lock.
   * Halts immediately fail-closed upon encountering any control_unavailable error.
   */
  async reconcilePostDispatchOrphans(
    options?: HermesReconcileBatchOptions
  ): Promise<HermesReconciliationBatchResult> {
    const rawLimit = options?.limit;
    const limit = rawLimit === undefined ? this.#defaultLimit : rawLimit;

    if (
      typeof limit !== "number" ||
      !Number.isInteger(limit) ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      return {
        kind: "control_unavailable",
        reason: "limit_invalid",
        scanned: 0,
        reconciled: 0,
        alreadyFinalized: 0,
        leaseStillActive: 0,
        invalidState: 0,
        notFound: 0,
        controlUnavailable: 0,
      };
    }

    const scanResult = await this.#quotaCoordinator.findPostDispatchOrphanCandidates(limit);
    if (scanResult.kind === "control_unavailable") {
      return {
        kind: "control_unavailable",
        reason: scanResult.reason,
        scanned: 0,
        reconciled: 0,
        alreadyFinalized: 0,
        leaseStillActive: 0,
        invalidState: 0,
        notFound: 0,
        controlUnavailable: 0,
      };
    }

    let reconciled = 0;
    let alreadyFinalized = 0;
    let leaseStillActive = 0;
    let invalidState = 0;
    let notFound = 0;
    let controlUnavailable = 0;
    const scanned = scanResult.records.length;

    for (const record of scanResult.records) {
      const outcome = await this.#quotaCoordinator.reconcileOutcomeUnknownIfLeaseExpired(
        record.operationId
      );

      if (outcome.kind === "reconciled") {
        reconciled++;
      } else if (outcome.kind === "already_finalized") {
        alreadyFinalized++;
      } else if (outcome.kind === "lease_still_active") {
        leaseStillActive++;
      } else if (outcome.kind === "invalid_state") {
        invalidState++;
      } else if (outcome.kind === "not_found") {
        notFound++;
      } else if (outcome.kind === "control_unavailable") {
        controlUnavailable++;
        // Conservative fail-closed behavior: halt batch execution immediately on control unavailable
        return {
          kind: "control_unavailable",
          reason: outcome.reason,
          scanned,
          reconciled,
          alreadyFinalized,
          leaseStillActive,
          invalidState,
          notFound,
          controlUnavailable,
        };
      }
    }

    return {
      kind: "completed",
      scanned,
      reconciled,
      alreadyFinalized,
      leaseStillActive,
      invalidState,
      notFound,
      controlUnavailable: 0,
    };
  }
}
