/**
 * Hermes Entitlement Policy & Pure Evaluation Engine
 * Governing: docs/hermes/HERMES-PROD-A3.1-CONTROLS-DESIGN.md
 */

import type {
  HermesEntitlementRecord,
  HermesEntitlementRepository,
} from "./hermes-entitlement-repository";

/**
 * Authoritative denial reasons for Hermes entitlement evaluation.
 */
export type HermesEntitlementDenialReason =
  | "feature_not_entitled"
  | "account_inactive"
  | "quota_configuration_invalid"
  | "entitlement_not_current";

/**
 * Pure discriminated decision outcome for entitlement evaluation.
 */
export type HermesEntitlementDecision =
  | {
      readonly allowed: true;
      readonly kind: "allow";
      readonly entitlement: HermesEntitlementRecord;
    }
  | {
      readonly allowed: false;
      readonly kind: "deny";
      readonly reason: HermesEntitlementDenialReason;
      readonly entitlement: HermesEntitlementRecord | null;
    };

/**
 * Pure, deterministic entitlement decision helper.
 * Zero side-effects, zero network calls, zero un-injected Date calls.
 *
 * Rules (A3.1 §10.1 & §13):
 * 1. now parameter must be a valid, finite Date instance; otherwise DENY quota_configuration_invalid.
 * 2. No entitlement row => DENY feature_not_entitled.
 * 3. Structural validation of entitlement record:
 *    - monthlyQuota must be a non-negative integer (Number.isInteger, >= 0);
 *    - planTier must be a non-empty string when trimmed;
 *    - periodStart and periodEnd must be valid finite Date instances;
 *    - periodEnd must be strictly greater than periodStart;
 *    otherwise DENY quota_configuration_invalid.
 * 4. status !== 'active' => DENY account_inactive.
 * 5. now < period_start => DENY entitlement_not_current.
 * 6. now >= period_end => DENY entitlement_not_current (end boundary inclusive of expiration).
 * 7. active + current period + valid quota (including 0) => ALLOW (ALLOW_TO_QUOTA_GATE).
 *
 * Note on zero-quota semantics:
 * Under A3.1, commercial entitlement evaluation (Gate 13) confirms only that the user holds
 * an active subscription. Consumed usage and available credit balance are owned exclusively
 * by Gate 16 (Quota Reservation in A3.4). An allowance with monthlyQuota = 0 permits proceeding
 * to the future quota reservation gate; the reservation gate will deterministically fail closed
 * (0 < 0 is false) and emit HTTP 429 quota_exhausted.
 */
export function evaluateHermesEntitlement(
  entitlement: HermesEntitlementRecord | null | undefined,
  now: Date
): HermesEntitlementDecision {
  // Validate now clock injection
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    return {
      allowed: false,
      kind: "deny",
      reason: "quota_configuration_invalid",
      entitlement: entitlement ?? null,
    };
  }

  // Rule A: no entitlement row => DENY feature_not_entitled
  if (!entitlement) {
    return {
      allowed: false,
      kind: "deny",
      reason: "feature_not_entitled",
      entitlement: null,
    };
  }

  // Structural validation of entitlement record
  const isMonthlyQuotaValid =
    typeof entitlement.monthlyQuota === "number" &&
    Number.isInteger(entitlement.monthlyQuota) &&
    entitlement.monthlyQuota >= 0;

  const isPlanTierValid =
    typeof entitlement.planTier === "string" &&
    entitlement.planTier.trim().length > 0;

  const isPeriodStartValid =
    entitlement.periodStart instanceof Date &&
    Number.isFinite(entitlement.periodStart.getTime());

  const isPeriodEndValid =
    entitlement.periodEnd instanceof Date &&
    Number.isFinite(entitlement.periodEnd.getTime());

  if (
    !isMonthlyQuotaValid ||
    !isPlanTierValid ||
    !isPeriodStartValid ||
    !isPeriodEndValid ||
    entitlement.periodEnd.getTime() <= entitlement.periodStart.getTime()
  ) {
    return {
      allowed: false,
      kind: "deny",
      reason: "quota_configuration_invalid",
      entitlement,
    };
  }

  // Rule B: status != active => DENY account_inactive
  if (entitlement.status !== "active") {
    return {
      allowed: false,
      kind: "deny",
      reason: "account_inactive",
      entitlement,
    };
  }

  const nowMs = now.getTime();
  const startMs = entitlement.periodStart.getTime();
  const endMs = entitlement.periodEnd.getTime();

  // Rule C: now < period_start => DENY entitlement_not_current
  if (nowMs < startMs) {
    return {
      allowed: false,
      kind: "deny",
      reason: "entitlement_not_current",
      entitlement,
    };
  }

  // Rule D: now >= period_end => DENY entitlement_not_current (now == periodEnd is denied)
  if (nowMs >= endMs) {
    return {
      allowed: false,
      kind: "deny",
      reason: "entitlement_not_current",
      entitlement,
    };
  }

  // Rule F: active + current period + valid quota (including 0) => ALLOW_TO_QUOTA_GATE
  return {
    allowed: true,
    kind: "allow",
    entitlement,
  };
}

/**
 * Discriminated result of evaluating an entire subject entitlement gate.
 */
export type HermesEntitlementGateResult =
  | {
      readonly allowed: true;
      readonly kind: "allow";
      readonly entitlement: HermesEntitlementRecord;
    }
  | {
      readonly allowed: false;
      readonly kind: "deny";
      readonly reason: HermesEntitlementDenialReason;
      readonly entitlement: HermesEntitlementRecord | null;
    }
  | {
      readonly allowed: false;
      readonly kind: "control_failure";
      readonly reason: "usage_control_unavailable";
      readonly entitlement: null;
    };

/**
 * Composite entitlement gate evaluator combining read-only repository lookup
 * and pure fail-closed entitlement policy.
 */
export async function evaluateSubjectEntitlementGate(
  entitlementRepo: HermesEntitlementRepository,
  subjectId: string,
  now: Date
): Promise<HermesEntitlementGateResult> {
  const lookup = await entitlementRepo.getEntitlement(subjectId);

  if (lookup.kind === "unavailable") {
    return {
      allowed: false,
      kind: "control_failure",
      reason: "usage_control_unavailable",
      entitlement: null,
    };
  }

  if (lookup.kind === "absent") {
    return evaluateHermesEntitlement(null, now);
  }

  return evaluateHermesEntitlement(lookup.entitlement, now);
}
