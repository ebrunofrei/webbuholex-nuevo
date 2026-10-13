/**
 * Hermes Control State Machine & Cross-Status Invariant Validator
 * Pure, deterministic functions with zero external dependencies, DB access, or HTTP.
 * Governing: docs/hermes/HERMES-PROD-A3.1-CONTROLS-DESIGN.md
 */

import {
  HermesOperationStatus,
  HermesPlatformCostStatus,
  HermesUserQuotaStatus,
  HERMES_TERMINAL_OPERATION_STATUSES,
} from "./hermes-control-contracts";

/**
 * Returns true if the operation status is terminal or ambiguous (cannot proceed to further stages).
 */
export function isTerminalOperationStatus(status: HermesOperationStatus): boolean {
  return (HERMES_TERMINAL_OPERATION_STATUSES as readonly string[]).includes(status);
}

/**
 * Returns the immutable list of allowed subsequent statuses from a given status.
 */
export function getAllowedNextOperationStatuses(
  status: HermesOperationStatus
): readonly HermesOperationStatus[] {
  switch (status) {
    case "reserved":
      return ["released", "expired_before_dispatch", "provider_dispatch_started"] as const;
    case "provider_dispatch_started":
      return [
        "completed_success",
        "completed_validation_failure",
        "completed_grounding_failure",
        "outcome_unknown",
      ] as const;
    case "released":
    case "expired_before_dispatch":
    case "completed_success":
    case "completed_validation_failure":
    case "completed_grounding_failure":
    case "outcome_unknown":
      // All terminal or ambiguous reconciliation states have zero further forward transitions.
      return [] as const;
  }
}

/**
 * Determines whether a status transition is permissible under the Hermes state machine.
 */
export function canTransitionOperationStatus(
  from: HermesOperationStatus,
  to: HermesOperationStatus
): boolean {
  if (from === to) {
    return false;
  }
  const allowed = getAllowedNextOperationStatuses(from);
  return (allowed as readonly string[]).includes(to);
}

/**
 * Asserts that a status transition is valid, throwing a descriptive Error otherwise.
 */
export function assertOperationStatusTransition(
  from: HermesOperationStatus,
  to: HermesOperationStatus
): void {
  if (!canTransitionOperationStatus(from, to)) {
    if (isTerminalOperationStatus(from) && to === "provider_dispatch_started") {
      throw new Error(
        `[HermesStateMachine] Cardinal invariant violation: Cannot reopen provider dispatch from terminal or ambiguous state '${from}'.`
      );
    }
    if (isTerminalOperationStatus(from)) {
      throw new Error(
        `[HermesStateMachine] Forbidden transition: Operation in terminal state '${from}' cannot transition to '${to}'.`
      );
    }
    if (from === "reserved" && to.startsWith("completed_")) {
      throw new Error(
        `[HermesStateMachine] Forbidden transition: Operation cannot jump directly from '${from}' to '${to}' without committing 'provider_dispatch_started'.`
      );
    }
    throw new Error(
      `[HermesStateMachine] Illegal operation status transition from '${from}' to '${to}'.`
    );
  }
}

export interface CoherentOperationStatuses {
  platformCostStatus: HermesPlatformCostStatus;
  userQuotaStatus: HermesUserQuotaStatus;
}

/**
 * Returns the exact expected platform_cost_status and user_quota_status
 * corresponding to a given operation status under A3.1 rules.
 */
export function getExpectedCoherentStatuses(
  status: HermesOperationStatus
): CoherentOperationStatuses {
  switch (status) {
    case "reserved":
      return { platformCostStatus: "none", userQuotaStatus: "reserved" };
    case "provider_dispatch_started":
      return { platformCostStatus: "indeterminate", userQuotaStatus: "reserved" };
    case "completed_success":
      return { platformCostStatus: "assumed_incurred", userQuotaStatus: "committed" };
    case "completed_validation_failure":
      return { platformCostStatus: "assumed_incurred", userQuotaStatus: "policy_pending" };
    case "completed_grounding_failure":
      return { platformCostStatus: "assumed_incurred", userQuotaStatus: "policy_pending" };
    case "outcome_unknown":
      return { platformCostStatus: "indeterminate", userQuotaStatus: "policy_pending" };
    case "released":
      return { platformCostStatus: "none", userQuotaStatus: "released" };
    case "expired_before_dispatch":
      return { platformCostStatus: "none", userQuotaStatus: "released" };
  }
}

/**
 * Validates cross-status coherence across status, platformCostStatus, and userQuotaStatus.
 */
export function isValidOperationStatusCombination(
  status: HermesOperationStatus,
  platformCostStatus: HermesPlatformCostStatus,
  userQuotaStatus: HermesUserQuotaStatus
): boolean {
  const expected = getExpectedCoherentStatuses(status);
  return (
    expected.platformCostStatus === platformCostStatus &&
    expected.userQuotaStatus === userQuotaStatus
  );
}

/**
 * Asserts cross-status coherence, throwing an Error if incoherent.
 */
export function assertValidOperationStatusCombination(
  status: HermesOperationStatus,
  platformCostStatus: HermesPlatformCostStatus,
  userQuotaStatus: HermesUserQuotaStatus
): void {
  const expected = getExpectedCoherentStatuses(status);
  if (expected.platformCostStatus !== platformCostStatus) {
    throw new Error(
      `[HermesStateMachine] Incoherent platform cost status for operation status '${status}': expected '${expected.platformCostStatus}', got '${platformCostStatus}'.`
    );
  }
  if (expected.userQuotaStatus !== userQuotaStatus) {
    throw new Error(
      `[HermesStateMachine] Incoherent user quota status for operation status '${status}': expected '${expected.userQuotaStatus}', got '${userQuotaStatus}'.`
    );
  }
}

export interface LifecycleTimestampsInput {
  status: HermesOperationStatus;
  dispatchStartedAt: Date | string | null;
  completedAt: Date | string | null;
}

/**
 * Validates that lifecycle timestamps match operation status requirements:
 * - reserved: dispatchStartedAt MUST be null, completedAt MUST be null.
 * - provider_dispatch_started: dispatchStartedAt MUST be non-null, completedAt MUST be null.
 * - completed_*: dispatchStartedAt MUST be non-null, completedAt MUST be non-null.
 * - outcome_unknown: dispatchStartedAt MUST be non-null.
 * - released / expired_before_dispatch: dispatchStartedAt MUST be null.
 */
export function isValidLifecycleTimestamps(input: LifecycleTimestampsInput): boolean {
  const { status, dispatchStartedAt, completedAt } = input;
  switch (status) {
    case "reserved":
      return dispatchStartedAt === null && completedAt === null;
    case "provider_dispatch_started":
      return dispatchStartedAt !== null && completedAt === null;
    case "completed_success":
    case "completed_validation_failure":
    case "completed_grounding_failure":
      return dispatchStartedAt !== null && completedAt !== null;
    case "outcome_unknown":
      // Provider dispatch was authorized and marked, so dispatchStartedAt must be set.
      // completedAt may be null or set if reconciled.
      return dispatchStartedAt !== null;
    case "released":
    case "expired_before_dispatch":
      // Pre-provider dispatch aborts; dispatch was never started.
      return dispatchStartedAt === null;
  }
}

/**
 * Asserts that lifecycle timestamps are coherent with operation status.
 */
export function assertValidLifecycleTimestamps(input: LifecycleTimestampsInput): void {
  if (!isValidLifecycleTimestamps(input)) {
    throw new Error(
      `[HermesStateMachine] Incoherent lifecycle timestamps for status '${input.status}': dispatchStartedAt=${input.dispatchStartedAt}, completedAt=${input.completedAt}.`
    );
  }
}
