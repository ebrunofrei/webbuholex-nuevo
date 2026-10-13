/**
 * Hermes Control Domain Contracts & Types
 * Governing: docs/hermes/HERMES-PROD-A3.1-CONTROLS-DESIGN.md
 */

/**
 * Authoritative operation lifecycle statuses for Hermes jurisprudence analysis.
 * Stored in hermes_control.analysis_operations.status.
 */
export const HERMES_OPERATION_STATUSES = [
  "reserved",
  "released",
  "expired_before_dispatch",
  "provider_dispatch_started",
  "completed_success",
  "completed_validation_failure",
  "completed_grounding_failure",
  "outcome_unknown",
] as const;

export type HermesOperationStatus = (typeof HERMES_OPERATION_STATUSES)[number];

/**
 * Terminal or ambiguous operation statuses that cannot reopen provider execution.
 */
export const HERMES_TERMINAL_OPERATION_STATUSES = [
  "released",
  "expired_before_dispatch",
  "completed_success",
  "completed_validation_failure",
  "completed_grounding_failure",
  "outcome_unknown",
] as const;

export type HermesTerminalOperationStatus = (typeof HERMES_TERMINAL_OPERATION_STATUSES)[number];

/**
 * Platform cost status for Hermes LLM provider dispatch accounting.
 * Stored in hermes_control.analysis_operations.platform_cost_status.
 * Note: 'indeterminate' is used before provider execution finishes.
 * 'assumed_incurred' is only set after the remote HTTP provider returns.
 * No state claims verified token consumption as token counts are not measured.
 */
export const HERMES_PLATFORM_COST_STATUSES = [
  "none",
  "indeterminate",
  "assumed_incurred",
] as const;

export type HermesPlatformCostStatus = (typeof HERMES_PLATFORM_COST_STATUSES)[number];

/**
 * Commercial user quota status for Hermes analysis operations.
 * Stored in hermes_control.analysis_operations.user_quota_status.
 */
export const HERMES_USER_QUOTA_STATUSES = [
  "unreserved",
  "reserved",
  "committed",
  "policy_pending",
  "released",
] as const;

export type HermesUserQuotaStatus = (typeof HERMES_USER_QUOTA_STATUSES)[number];

/**
 * Feature keys supported by the daily provider counter.
 * Stored in hermes_control.provider_daily_usage.feature.
 */
export const HERMES_FEATURE_KEYS = [
  "jurisprudence_interpretation",
] as const;

export type HermesFeatureKey = (typeof HERMES_FEATURE_KEYS)[number];

/**
 * Commercial entitlement statuses for Hermes subjects.
 * Stored in hermes_control.subject_entitlements.status.
 */
export const HERMES_ENTITLEMENT_STATUSES = [
  "active",
  "suspended",
  "expired",
] as const;

export type HermesEntitlementStatus = (typeof HERMES_ENTITLEMENT_STATUSES)[number];

/**
 * Supported identity providers for Hermes subjects.
 * Stored in hermes_control.subject_identities.provider.
 */
export const HERMES_IDENTITY_PROVIDERS = [
  "auth0",
] as const;

export type HermesIdentityProvider = (typeof HERMES_IDENTITY_PROVIDERS)[number];
