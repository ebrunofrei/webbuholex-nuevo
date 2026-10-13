import {
  pgSchema,
  uuid,
  varchar,
  integer,
  timestamp,
  date,
  unique,
  uniqueIndex,
  index,
  primaryKey,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const hermesControlSchema = pgSchema("hermes_control");

/**
 * Subject Identities: Maps third-party authentication identities (Auth0 sub)
 * to internal immutable UUID subject anchors.
 */
export const subjectIdentities = hermesControlSchema.table(
  "subject_identities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: varchar("provider", { length: 32, enum: ["auth0"] }).notNull(),
    providerSubjectId: varchar("provider_subject_id", { length: 128 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("subject_identities_provider_subject_uniq").on(table.provider, table.providerSubjectId),
    check("subject_identities_provider_check", sql`${table.provider} IN ('auth0')`),
  ]
);

/**
 * Subject Entitlements: Administrative commercial authority defining tier and allowances.
 * Fail-closed: read-only to Hermes web runtime; missing row denies access.
 */
export const subjectEntitlements = hermesControlSchema.table(
  "subject_entitlements",
  {
    subjectId: uuid("subject_id")
      .primaryKey()
      .references(() => subjectIdentities.id, { onDelete: "restrict" }),
    planTier: varchar("plan_tier", { length: 32 }).notNull(),
    status: varchar("status", {
      length: 32,
      enum: ["active", "suspended", "expired"],
    }).notNull(),
    monthlyQuota: integer("monthly_quota").notNull(),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("subject_entitlements_monthly_quota_check", sql`${table.monthlyQuota} >= 0`),
    check("subject_entitlements_period_check", sql`${table.periodEnd} > ${table.periodStart}`),
    check(
      "subject_entitlements_status_check",
      sql`${table.status} IN ('active', 'suspended', 'expired')`
    ),
  ]
);

/**
 * Subject Quota Usage: Mutable ledger tracking in-flight reservations,
 * permanently committed analysis units, and policy-pending review units.
 */
export const subjectQuotaUsage = hermesControlSchema.table(
  "subject_quota_usage",
  {
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjectIdentities.id, { onDelete: "restrict" }),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    reservedUnits: integer("reserved_units").notNull().default(0),
    committedUnits: integer("committed_units").notNull().default(0),
    pendingUnits: integer("pending_units").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [table.subjectId, table.periodStart, table.periodEnd],
      name: "subject_quota_usage_pk",
    }),
    check(
      "subject_quota_usage_non_negative",
      sql`${table.reservedUnits} >= 0 AND ${table.committedUnits} >= 0 AND ${table.pendingUnits} >= 0`
    ),
  ]
);

/**
 * Analysis Operations: Authoritative state machine tracking each jurisprudence
 * interpretation request lifecycle, idempotency key, and cost/quota statuses.
 */
export const analysisOperations = hermesControlSchema.table(
  "analysis_operations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjectIdentities.id, { onDelete: "restrict" }),
    idempotencyKey: varchar("idempotency_key", { length: 64 }).notNull(),
    recordId: varchar("record_id", { length: 64 }).notNull(),
    recordVersion: integer("record_version").notNull(),
    status: varchar("status", {
      length: 32,
      enum: [
        "reserved",
        "released",
        "expired_before_dispatch",
        "provider_dispatch_started",
        "completed_success",
        "completed_validation_failure",
        "completed_grounding_failure",
        "outcome_unknown",
      ],
    })
      .notNull()
      .default("reserved"),
    platformCostStatus: varchar("platform_cost_status", {
      length: 32,
      enum: ["none", "indeterminate", "assumed_incurred"],
    })
      .notNull()
      .default("none"),
    userQuotaStatus: varchar("user_quota_status", {
      length: 32,
      enum: ["unreserved", "reserved", "committed", "policy_pending", "released"],
    })
      .notNull()
      .default("reserved"),
    units: integer("units").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    reservedExpiresAt: timestamp("reserved_expires_at", { withTimezone: true }).notNull(),
    dispatchStartedAt: timestamp("dispatch_started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("analysis_operations_subject_idempotency_key_uniq").on(
      table.subjectId,
      table.idempotencyKey
    ),
    uniqueIndex("analysis_operations_active_doc_idx")
      .on(table.subjectId, table.recordId, table.recordVersion)
      .where(sql`${table.status} IN ('reserved', 'provider_dispatch_started')`),
    check("analysis_operations_units_check", sql`${table.units} >= 1`),
    check("analysis_operations_record_version_check", sql`${table.recordVersion} > 0`),
    check(
      "analysis_operations_status_check",
      sql`${table.status} IN ('reserved', 'released', 'expired_before_dispatch', 'provider_dispatch_started', 'completed_success', 'completed_validation_failure', 'completed_grounding_failure', 'outcome_unknown')`
    ),
    check(
      "analysis_operations_platform_cost_status_check",
      sql`${table.platformCostStatus} IN ('none', 'indeterminate', 'assumed_incurred')`
    ),
    check(
      "analysis_operations_user_quota_status_check",
      sql`${table.userQuotaStatus} IN ('unreserved', 'reserved', 'committed', 'policy_pending', 'released')`
    ),
  ]
);

/**
 * Concurrency Leases: Active serverless execution locks ensuring at most 1 in-flight
 * analysis per subject, with TTL protection for graceful recovery.
 */
export const concurrencyLeases = hermesControlSchema.table(
  "concurrency_leases",
  {
    leaseId: uuid("lease_id").primaryKey().defaultRandom(),
    operationId: uuid("operation_id")
      .notNull()
      .references(() => analysisOperations.id, { onDelete: "restrict" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjectIdentities.id, { onDelete: "restrict" }),
    acquiredAt: timestamp("acquired_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("concurrency_leases_subject_id_uniq").on(table.subjectId),
    unique("concurrency_leases_operation_id_uniq").on(table.operationId),
    index("concurrency_leases_expires_at_idx").on(table.expiresAt),
  ]
);

/**
 * Provider Daily Usage: PostgreSQL-backed atomic daily feature call counter
 * bucketed strictly in UTC calendar days to enforce global platform ceilings.
 */
export const providerDailyUsage = hermesControlSchema.table(
  "provider_daily_usage",
  {
    dayUtc: date("day_utc").notNull(),
    feature: varchar("feature", {
      length: 32,
      enum: ["jurisprudence_interpretation"],
    }).notNull(),
    callCount: integer("call_count").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [table.dayUtc, table.feature],
      name: "provider_daily_usage_pk",
    }),
    check("provider_daily_usage_call_count_check", sql`${table.callCount} >= 0`),
    check(
      "provider_daily_usage_feature_check",
      sql`${table.feature} IN ('jurisprudence_interpretation')`
    ),
  ]
);
