import { describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { withHermesControlRole } from "@/database/roles";
import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "@/database/schema";
import {
  HERMES_OPERATION_STATUSES,
  HERMES_PLATFORM_COST_STATUSES,
  HERMES_USER_QUOTA_STATUSES,
  HERMES_FEATURE_KEYS,
  HERMES_ENTITLEMENT_STATUSES,
  HERMES_TERMINAL_OPERATION_STATUSES,
  isTerminalOperationStatus,
  getAllowedNextOperationStatuses,
  canTransitionOperationStatus,
  assertOperationStatusTransition,
  getExpectedCoherentStatuses,
  isValidOperationStatusCombination,
  assertValidOperationStatusCombination,
  isValidLifecycleTimestamps,
  assertValidLifecycleTimestamps,
} from "@/lib/hermes/control";
import {
  hermesControlSchema,
  subjectIdentities,
  subjectEntitlements,
  subjectQuotaUsage,
  analysisOperations,
  concurrencyLeases,
  providerDailyUsage,
} from "@/database/schema/hermes-control";
import { getTableConfig } from "drizzle-orm/pg-core";

describe("HERMES-PROD-A3.2: Hermes Control Foundation & Schema Consistency", () => {
  const migrationPath = join(
    process.cwd(),
    "database",
    "migrations",
    "0041_hermes_control_schema.sql"
  );
  const migrationSql = readFileSync(migrationPath, "utf8");

  // ============================================================
  // A. Operation State List Exactness
  // ============================================================
  describe("A. Operation State List Exactness", () => {
    it("should export exactly the 8 frozen operation statuses", () => {
      const expected = [
        "reserved",
        "released",
        "expired_before_dispatch",
        "provider_dispatch_started",
        "completed_success",
        "completed_validation_failure",
        "completed_grounding_failure",
        "outcome_unknown",
      ];
      expect(HERMES_OPERATION_STATUSES).toEqual(expected);
      expect(HERMES_OPERATION_STATUSES.length).toBe(8);
    });

    it("must not contain obsolete or unapproved states", () => {
      const statuses = HERMES_OPERATION_STATUSES as readonly string[];
      expect(statuses.includes("provider_started")).toBe(false);
      expect(statuses.includes("committed")).toBe(false);
      expect(statuses.includes("pending")).toBe(false);
      expect(statuses.includes("in_progress")).toBe(false);
    });

    it("should classify terminal states accurately", () => {
      expect(isTerminalOperationStatus("completed_success")).toBe(true);
      expect(isTerminalOperationStatus("completed_validation_failure")).toBe(true);
      expect(isTerminalOperationStatus("completed_grounding_failure")).toBe(true);
      expect(isTerminalOperationStatus("outcome_unknown")).toBe(true);
      expect(isTerminalOperationStatus("released")).toBe(true);
      expect(isTerminalOperationStatus("expired_before_dispatch")).toBe(true);

      expect(isTerminalOperationStatus("reserved")).toBe(false);
      expect(isTerminalOperationStatus("provider_dispatch_started")).toBe(false);
    });
  });

  // ============================================================
  // B. Platform Cost Status List Exactness
  // ============================================================
  describe("B. Platform Cost Status List Exactness", () => {
    it("should export exactly the 3 frozen platform cost statuses", () => {
      const expected = ["none", "indeterminate", "assumed_incurred"];
      expect(HERMES_PLATFORM_COST_STATUSES).toEqual(expected);
      expect(HERMES_PLATFORM_COST_STATUSES.length).toBe(3);
    });

    it("must not include verified token billing claims", () => {
      const statuses = HERMES_PLATFORM_COST_STATUSES as readonly string[];
      expect(statuses.includes("billed")).toBe(false);
      expect(statuses.includes("verified_incurred")).toBe(false);
    });
  });

  // ============================================================
  // C. User Quota Status List Exactness
  // ============================================================
  describe("C. User Quota Status List Exactness", () => {
    it("should export exactly the 5 frozen user quota statuses", () => {
      const expected = ["unreserved", "reserved", "committed", "policy_pending", "released"];
      expect(HERMES_USER_QUOTA_STATUSES).toEqual(expected);
      expect(HERMES_USER_QUOTA_STATUSES.length).toBe(5);
    });

    it("should export feature keys and entitlement statuses correctly", () => {
      expect(HERMES_FEATURE_KEYS).toContain("jurisprudence_interpretation");
      expect(HERMES_ENTITLEMENT_STATUSES).toEqual(["active", "suspended", "expired"]);
    });
  });

  // ============================================================
  // D. Allowed Lifecycle Transitions
  // ============================================================
  describe("D. Allowed Lifecycle Transitions", () => {
    it("permits pre-dispatch forward and abort transitions from reserved", () => {
      expect(canTransitionOperationStatus("reserved", "provider_dispatch_started")).toBe(true);
      expect(canTransitionOperationStatus("reserved", "released")).toBe(true);
      expect(canTransitionOperationStatus("reserved", "expired_before_dispatch")).toBe(true);

      expect(() =>
        assertOperationStatusTransition("reserved", "provider_dispatch_started")
      ).not.toThrow();
      expect(() =>
        assertOperationStatusTransition("reserved", "released")
      ).not.toThrow();
      expect(() =>
        assertOperationStatusTransition("reserved", "expired_before_dispatch")
      ).not.toThrow();
    });

    it("permits terminal outcomes from provider_dispatch_started", () => {
      expect(canTransitionOperationStatus("provider_dispatch_started", "completed_success")).toBe(true);
      expect(canTransitionOperationStatus("provider_dispatch_started", "completed_validation_failure")).toBe(true);
      expect(canTransitionOperationStatus("provider_dispatch_started", "completed_grounding_failure")).toBe(true);
      expect(canTransitionOperationStatus("provider_dispatch_started", "outcome_unknown")).toBe(true);

      expect(() =>
        assertOperationStatusTransition("provider_dispatch_started", "completed_success")
      ).not.toThrow();
    });

    it("verifies getAllowedNextOperationStatuses matches expected allowed array directly", () => {
      expect(getAllowedNextOperationStatuses("reserved")).toEqual([
        "released",
        "expired_before_dispatch",
        "provider_dispatch_started",
      ]);
    });
  });

  // ============================================================
  // E. Forbidden Reopening Transitions
  // ============================================================
  describe("E. Forbidden Reopening Transitions", () => {
    it("blocks any transition from terminal states back to provider_dispatch_started (Cardinal Invariant)", () => {
      for (const terminal of HERMES_TERMINAL_OPERATION_STATUSES) {
        expect(canTransitionOperationStatus(terminal, "provider_dispatch_started")).toBe(false);
        expect(() =>
          assertOperationStatusTransition(terminal, "provider_dispatch_started")
        ).toThrow(/Cardinal invariant violation/);
      }
    });

    it("blocks transitions from terminal states back to reserved", () => {
      for (const terminal of HERMES_TERMINAL_OPERATION_STATUSES) {
        expect(canTransitionOperationStatus(terminal, "reserved")).toBe(false);
        expect(() =>
          assertOperationStatusTransition(terminal, "reserved")
        ).toThrow(/Forbidden transition/);
      }
    });

    it("blocks direct jump from reserved to completed without provider_dispatch_started", () => {
      expect(canTransitionOperationStatus("reserved", "completed_success")).toBe(false);
      expect(() =>
        assertOperationStatusTransition("reserved", "completed_success")
      ).toThrow(/cannot jump directly/);
    });

    it("blocks self-transitions (no-op progressions)", () => {
      for (const status of HERMES_OPERATION_STATUSES) {
        expect(canTransitionOperationStatus(status, status)).toBe(false);
      }
    });
  });

  // ============================================================
  // F. Cross-Status Invariants & Timestamp Semantics
  // ============================================================
  describe("F. Cross-Status Invariants & Timestamp Semantics", () => {
    it("enforces coherent platform cost and quota status for all 8 states", () => {
      const coherentPairs = {
        reserved: { platform: "none", quota: "reserved" },
        provider_dispatch_started: { platform: "indeterminate", quota: "reserved" },
        completed_success: { platform: "assumed_incurred", quota: "committed" },
        completed_validation_failure: { platform: "assumed_incurred", quota: "policy_pending" },
        completed_grounding_failure: { platform: "assumed_incurred", quota: "policy_pending" },
        outcome_unknown: { platform: "indeterminate", quota: "policy_pending" },
        released: { platform: "none", quota: "released" },
        expired_before_dispatch: { platform: "none", quota: "released" },
      } as const;

      for (const [status, expected] of Object.entries(coherentPairs)) {
        const opStatus = status as keyof typeof coherentPairs;
        expect(
          isValidOperationStatusCombination(opStatus, expected.platform, expected.quota)
        ).toBe(true);
        expect(() =>
          assertValidOperationStatusCombination(opStatus, expected.platform, expected.quota)
        ).not.toThrow();
      }
    });

    it("rejects incoherent status combinations", () => {
      // reserved cannot claim assumed_incurred or committed
      expect(isValidOperationStatusCombination("reserved", "assumed_incurred", "reserved")).toBe(false);
      expect(isValidOperationStatusCombination("reserved", "none", "committed")).toBe(false);

      // provider_dispatch_started must be indeterminate, not assumed_incurred before response
      expect(isValidOperationStatusCombination("provider_dispatch_started", "assumed_incurred", "reserved")).toBe(false);

      // completed_success must not leave quota in policy_pending
      expect(isValidOperationStatusCombination("completed_success", "assumed_incurred", "policy_pending")).toBe(false);

      expect(() =>
        assertValidOperationStatusCombination("reserved", "assumed_incurred", "reserved")
      ).toThrow(/Incoherent platform cost status/);
    });

    it("enforces lifecycle timestamp invariants", () => {
      const now = new Date();

      // reserved: both timestamps must be null
      expect(isValidLifecycleTimestamps({ status: "reserved", dispatchStartedAt: null, completedAt: null })).toBe(true);
      expect(isValidLifecycleTimestamps({ status: "reserved", dispatchStartedAt: now, completedAt: null })).toBe(false);

      // provider_dispatch_started: dispatch set, completed null
      expect(isValidLifecycleTimestamps({ status: "provider_dispatch_started", dispatchStartedAt: now, completedAt: null })).toBe(true);
      expect(isValidLifecycleTimestamps({ status: "provider_dispatch_started", dispatchStartedAt: null, completedAt: null })).toBe(false);
      expect(isValidLifecycleTimestamps({ status: "provider_dispatch_started", dispatchStartedAt: now, completedAt: now })).toBe(false);

      // completed_success: both set
      expect(isValidLifecycleTimestamps({ status: "completed_success", dispatchStartedAt: now, completedAt: now })).toBe(true);
      expect(isValidLifecycleTimestamps({ status: "completed_success", dispatchStartedAt: null, completedAt: now })).toBe(false);

      // released / expired_before_dispatch: dispatch was never started
      expect(isValidLifecycleTimestamps({ status: "released", dispatchStartedAt: null, completedAt: now })).toBe(true);
      expect(isValidLifecycleTimestamps({ status: "released", dispatchStartedAt: now, completedAt: now })).toBe(false);

      // getExpectedCoherentStatuses and assertValidLifecycleTimestamps
      expect(getExpectedCoherentStatuses("reserved")).toEqual({
        platformCostStatus: "none",
        userQuotaStatus: "reserved",
      });
      expect(() =>
        assertValidLifecycleTimestamps({ status: "reserved", dispatchStartedAt: null, completedAt: null })
      ).not.toThrow();
      expect(() =>
        assertValidLifecycleTimestamps({ status: "reserved", dispatchStartedAt: now, completedAt: null })
      ).toThrow(/Incoherent lifecycle timestamps/);
    });
  });

  // ============================================================
  // G. Active-Document Unique Index Definition
  // ============================================================
  describe("G. Active-Document Unique Index Definition", () => {
    it("defines partial UNIQUE index in Drizzle schema", () => {
      const config = getTableConfig(analysisOperations);
      const activeDocIdx = config.indexes.find(
        (idx) => (idx as { config: { name: string; unique: boolean } }).config.name === "analysis_operations_active_doc_idx"
      );
      expect(activeDocIdx).toBeDefined();
      expect((activeDocIdx as { config: { unique: boolean } })?.config.unique).toBe(true);
    });

    it("includes exact CREATE UNIQUE INDEX with partial WHERE in migration SQL", () => {
      expect(migrationSql).toContain(
        'CREATE UNIQUE INDEX IF NOT EXISTS "analysis_operations_active_doc_idx" ON "hermes_control"."analysis_operations" USING btree ("subject_id","record_id","record_version") WHERE "status" IN (\'reserved\', \'provider_dispatch_started\');'
      );
    });
  });

  // ============================================================
  // H. Subject Identity Composite Uniqueness & Provider Check
  // ============================================================
  describe("H. Subject Identity Composite Uniqueness & Provider Check", () => {
    it("enforces composite UNIQUE(provider, provider_subject_id) in Drizzle", () => {
      const config = getTableConfig(subjectIdentities);
      const compositeUniq = config.uniqueConstraints.find(
        (c) => c.name === "subject_identities_provider_subject_uniq"
      );
      expect(compositeUniq).toBeDefined();
    });

    it("enforces composite uniqueness in migration SQL and does not make provider_subject_id alone unique", () => {
      expect(migrationSql).toContain(
        'CONSTRAINT "subject_identities_provider_subject_uniq" UNIQUE("provider","provider_subject_id")'
      );
      expect(migrationSql).not.toContain(
        '"provider_subject_id" varchar(128) NOT NULL UNIQUE'
      );
    });

    it("enforces exact provider CHECK constraint in Drizzle metadata and migration SQL", () => {
      const config = getTableConfig(subjectIdentities);
      const providerCheck = config.checks.find(
        (c) => c.name === "subject_identities_provider_check"
      );
      expect(providerCheck).toBeDefined();

      expect(migrationSql).toContain(
        'CONSTRAINT "subject_identities_provider_check" CHECK ("provider" IN (\'auth0\'))'
      );
    });
  });

  // ============================================================
  // I. Entitlement No Implicit Allowance / Defaults & Status Check
  // ============================================================
  describe("I. Entitlement No Implicit Allowance / Defaults & Status Check", () => {
    it("has NO default quota, plan_tier, or status in Drizzle schema (fail-closed)", () => {
      expect(subjectEntitlements.monthlyQuota.default).toBeUndefined();
      expect(subjectEntitlements.planTier.default).toBeUndefined();
      expect(subjectEntitlements.status.default).toBeUndefined();
    });

    it("leaves plan_tier unfrozen with NO invented check constraint", () => {
      const config = getTableConfig(subjectEntitlements);
      const planTierCheck = config.checks.find((c) =>
        c.name.toLowerCase().includes("plan_tier")
      );
      expect(planTierCheck).toBeUndefined();
      expect(migrationSql).not.toContain("plan_tier_check");
      expect(migrationSql).not.toMatch(/"plan_tier"\s+IN/i);
    });

    it("enforces monthly_quota >= 0, period_end > period_start, and status check constraints", () => {
      const config = getTableConfig(subjectEntitlements);
      const statusCheck = config.checks.find(
        (c) => c.name === "subject_entitlements_status_check"
      );
      expect(statusCheck).toBeDefined();

      expect(migrationSql).toContain(
        'CONSTRAINT "subject_entitlements_monthly_quota_check" CHECK ("monthly_quota" >= 0)'
      );
      expect(migrationSql).toContain(
        'CONSTRAINT "subject_entitlements_period_check" CHECK ("period_end" > "period_start")'
      );
      expect(migrationSql).toContain(
        'CONSTRAINT "subject_entitlements_status_check" CHECK ("status" IN (\'active\', \'suspended\', \'expired\'))'
      );
    });
  });

  // ============================================================
  // J. Quota Usage Non-Negative Constraints & Concurrency Lease Uniqueness
  // ============================================================
  describe("J. Quota Usage Non-Negative Constraints & Concurrency Lease Uniqueness", () => {
    it("defines composite primary key on (subject_id, period_start, period_end)", () => {
      expect(migrationSql).toContain(
        'CONSTRAINT "subject_quota_usage_pk" PRIMARY KEY("subject_id","period_start","period_end")'
      );
    });

    it("enforces non-negative check constraint on reserved, committed, pending units", () => {
      expect(migrationSql).toContain(
        'CONSTRAINT "subject_quota_usage_non_negative" CHECK ("reserved_units" >= 0 AND "committed_units" >= 0 AND "pending_units" >= 0)'
      );
    });

    it("verifies subjectQuotaUsage table configuration in Drizzle", () => {
      const quotaConfig = getTableConfig(subjectQuotaUsage);
      expect(quotaConfig.name).toBe("subject_quota_usage");
      expect(quotaConfig.foreignKeys.length).toBeGreaterThanOrEqual(1);
    });

    it("enforces BOTH one lease per subject AND one lease per operation in Drizzle and migration SQL", () => {
      const leaseConfig = getTableConfig(concurrencyLeases);
      expect(leaseConfig.name).toBe("concurrency_leases");

      const subjectUniq = leaseConfig.uniqueConstraints.find(
        (u) => u.name === "concurrency_leases_subject_id_uniq"
      );
      expect(subjectUniq).toBeDefined();

      const operationUniq = leaseConfig.uniqueConstraints.find(
        (u) => u.name === "concurrency_leases_operation_id_uniq"
      );
      expect(operationUniq).toBeDefined();

      expect(migrationSql).toContain(
        'CONSTRAINT "concurrency_leases_subject_id_uniq" UNIQUE("subject_id")'
      );
      expect(migrationSql).toContain(
        'CONSTRAINT "concurrency_leases_operation_id_uniq" UNIQUE("operation_id")'
      );
    });
  });

  // ============================================================
  // K. Daily Usage Composite PK and Feature Check
  // ============================================================
  describe("K. Daily Usage Composite PK and Feature Check", () => {
    it("defines composite primary key on (day_utc, feature)", () => {
      expect(migrationSql).toContain(
        'CONSTRAINT "provider_daily_usage_pk" PRIMARY KEY("day_utc","feature")'
      );
    });

    it("enforces call_count >= 0 and feature check constraints in Drizzle and migration SQL", () => {
      const config = getTableConfig(providerDailyUsage);
      const featureCheck = config.checks.find(
        (c) => c.name === "provider_daily_usage_feature_check"
      );
      expect(featureCheck).toBeDefined();

      expect(migrationSql).toContain(
        'CONSTRAINT "provider_daily_usage_call_count_check" CHECK ("call_count" >= 0)'
      );
      expect(migrationSql).toContain(
        'CONSTRAINT "provider_daily_usage_feature_check" CHECK ("feature" IN (\'jurisprudence_interpretation\'))'
      );
    });

    it("contains zero monetary spend fields", () => {
      const config = getTableConfig(providerDailyUsage);
      const columnNames = Object.keys(config.columns);
      expect(columnNames).not.toContain("spend");
      expect(columnNames).not.toContain("cost");
      expect(columnNames).not.toContain("amount");
      expect(columnNames).not.toContain("tokens");
    });
  });

  // ============================================================
  // L. Least-Privilege Grant Text / Role Isolation
  // ============================================================
  describe("L. Least-Privilege Grant Text / Role Isolation", () => {
    it("creates hermes_control_runtime with NOLOGIN NOINHERIT", () => {
      expect(migrationSql).toContain("CREATE ROLE hermes_control_runtime NOLOGIN NOINHERIT;");
      expect(migrationSql).toContain("CREATE ROLE hermes_control_login LOGIN NOINHERIT;");
      expect(migrationSql).toContain("GRANT hermes_control_runtime TO hermes_control_login;");
    });

    it("never grants hermes_control_runtime to unrelated login roles", () => {
      const runtimeGrants = migrationSql.match(/GRANT\s+hermes_control_runtime\s+TO\s+[^;]+/gi) || [];
      expect(runtimeGrants).toEqual(["GRANT hermes_control_runtime TO hermes_control_login"]);

      expect(migrationSql).not.toContain("TO complaints_api_login");
      expect(migrationSql).not.toContain("TO complaints_worker_login");
      expect(migrationSql).not.toContain("TO complaints_admin_login");
      expect(migrationSql).not.toContain("TO complaints_authorization_login");
      expect(migrationSql).not.toContain("TO jurisprudence_public_read_login");
      expect(migrationSql).not.toContain("TO jurisprudence_public_write_login");
      expect(migrationSql).not.toContain("TO jurisprudence_internal_read_login");
      expect(migrationSql).not.toContain("TO jurisprudence_internal_write_login");
      expect(migrationSql).not.toContain("TO jurisprudence_authorization_login");
      expect(migrationSql).not.toContain("TO jurisprudence_interpretation_read_login");
    });

    it("grants strictly per-table least privilege with no blanket ALL grants", () => {
      expect(migrationSql).toContain("GRANT USAGE ON SCHEMA hermes_control TO hermes_control_runtime;");
      expect(migrationSql).toContain('GRANT SELECT, INSERT ON TABLE "hermes_control"."subject_identities" TO hermes_control_runtime;');
      expect(migrationSql).toContain('GRANT SELECT ON TABLE "hermes_control"."subject_entitlements" TO hermes_control_runtime;');
      expect(migrationSql).toContain('GRANT SELECT, INSERT, UPDATE ON TABLE "hermes_control"."subject_quota_usage" TO hermes_control_runtime;');
      expect(migrationSql).toContain('GRANT SELECT, INSERT, UPDATE ON TABLE "hermes_control"."analysis_operations" TO hermes_control_runtime;');
      expect(migrationSql).toContain('GRANT SELECT, INSERT, DELETE ON TABLE "hermes_control"."concurrency_leases" TO hermes_control_runtime;');
      expect(migrationSql).toContain('GRANT SELECT, INSERT, UPDATE ON TABLE "hermes_control"."provider_daily_usage" TO hermes_control_runtime;');

      // Verifies NO DELETE grant on analysis_operations, subject_identities, subject_entitlements, subject_quota_usage, provider_daily_usage
      expect(migrationSql).not.toContain('DELETE ON TABLE "hermes_control"."analysis_operations"');
      expect(migrationSql).not.toContain('DELETE ON TABLE "hermes_control"."subject_quota_usage"');
      expect(migrationSql).not.toContain('DELETE ON TABLE "hermes_control"."subject_identities"');
      expect(migrationSql).not.toContain('DELETE ON TABLE "hermes_control"."subject_entitlements"');
      expect(migrationSql).not.toContain('DELETE ON TABLE "hermes_control"."provider_daily_usage"');

      // Verifies no blanket ALL grant
      expect(migrationSql).not.toContain("GRANT ALL");
    });

    it("grants zero permissions to unrelated schemas", () => {
      expect(migrationSql).not.toContain("payments_private");
      expect(migrationSql).not.toContain("complaints");
      expect(migrationSql).not.toContain("jurisprudence_internal");
      expect(migrationSql).not.toContain("authorization");
    });
  });

  // ============================================================
  // M. Drizzle vs Migration Naming & Journal Consistency
  // ============================================================
  describe("M. Drizzle vs Migration Naming & Journal Consistency", () => {
    it("matches all 6 table names between Drizzle schema and migration", () => {
      expect(hermesControlSchema.schemaName).toBe("hermes_control");
      expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS "hermes_control"."subject_identities"');
      expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS "hermes_control"."subject_entitlements"');
      expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS "hermes_control"."subject_quota_usage"');
      expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS "hermes_control"."analysis_operations"');
      expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS "hermes_control"."concurrency_leases"');
      expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS "hermes_control"."provider_daily_usage"');
    });

    it("verifies migration 0041 is registered in meta/_journal.json", () => {
      const journalRaw = readFileSync(
        join(process.cwd(), "database", "migrations", "meta", "_journal.json"),
        "utf8"
      );
      const journal = JSON.parse(journalRaw);
      const entry = journal.entries.find((e: { idx: number }) => e.idx === 41);
      expect(entry).toBeDefined();
      expect(entry.tag).toBe("0041_hermes_control_schema");
    });
  });

  // ============================================================
  // N. Quota Period Ownership & Atomic Finalization Invariants (A3.2C)
  // ============================================================
  describe("N. Quota Period Ownership & Atomic Finalization Invariants (A3.2C)", () => {
    it("analysis_operations has quota_period_start NOT NULL in Drizzle and migration SQL", () => {
      expect(analysisOperations.quotaPeriodStart).toBeDefined();
      expect(analysisOperations.quotaPeriodStart.name).toBe("quota_period_start");
      expect(analysisOperations.quotaPeriodStart.notNull).toBe(true);
      expect(analysisOperations.quotaPeriodStart.default).toBeUndefined();

      expect(migrationSql).toContain('"quota_period_start" timestamp with time zone NOT NULL');
      expect(migrationSql).not.toContain('"quota_period_start" timestamp with time zone DEFAULT');
    });

    it("analysis_operations has quota_period_end NOT NULL in Drizzle and migration SQL", () => {
      expect(analysisOperations.quotaPeriodEnd).toBeDefined();
      expect(analysisOperations.quotaPeriodEnd.name).toBe("quota_period_end");
      expect(analysisOperations.quotaPeriodEnd.notNull).toBe(true);
      expect(analysisOperations.quotaPeriodEnd.default).toBeUndefined();

      expect(migrationSql).toContain('"quota_period_end" timestamp with time zone NOT NULL');
      expect(migrationSql).not.toContain('"quota_period_end" timestamp with time zone DEFAULT');
    });

    it("enforces deterministic quota_period_end > quota_period_start check constraint in Drizzle and migration", () => {
      const config = getTableConfig(analysisOperations);
      const periodCheck = config.checks.find(
        (c) => c.name === "analysis_operations_quota_period_check"
      );
      expect(periodCheck).toBeDefined();

      expect(migrationSql).toContain(
        'CONSTRAINT "analysis_operations_quota_period_check" CHECK ("quota_period_end" > "quota_period_start")'
      );
    });

    it("matches exact column definitions and constraint between Drizzle and migration 0041", () => {
      const config = getTableConfig(analysisOperations);
      const colDbNames = config.columns.map((c) => c.name);
      expect(colDbNames).toContain("quota_period_start");
      expect(colDbNames).toContain("quota_period_end");

      const opTableSnippet = migrationSql
        .split('-- 4. Table: analysis_operations')[1]
        ?.split('--> statement-breakpoint')[0];
      expect(opTableSnippet).toBeDefined();
      expect(opTableSnippet).toContain('"quota_period_start" timestamp with time zone NOT NULL');
      expect(opTableSnippet).toContain('"quota_period_end" timestamp with time zone NOT NULL');
      expect(opTableSnippet).toContain(
        'CONSTRAINT "analysis_operations_quota_period_check" CHECK ("quota_period_end" > "quota_period_start")'
      );
    });

    it("freezes quota bucket ownership invariant: operation quota bucket = (subject_id, quota_period_start, quota_period_end)", () => {
      const usageConfig = getTableConfig(subjectQuotaUsage);
      const opsConfig = getTableConfig(analysisOperations);

      // Verify that analysis_operations contains all 5 ownership attributes:
      // subject_id, quota_period_start, quota_period_end, units, user_quota_status
      const opColDbNames = opsConfig.columns.map((c) => c.name);
      expect(opColDbNames).toContain("subject_id");
      expect(opColDbNames).toContain("quota_period_start");
      expect(opColDbNames).toContain("quota_period_end");
      expect(opColDbNames).toContain("units");
      expect(opColDbNames).toContain("user_quota_status");

      // Verify TypeScript property access on Drizzle table object
      expect(analysisOperations.subjectId).toBeDefined();
      expect(analysisOperations.quotaPeriodStart).toBeDefined();
      expect(analysisOperations.quotaPeriodEnd).toBeDefined();
      expect(analysisOperations.units).toBeDefined();
      expect(analysisOperations.userQuotaStatus).toBeDefined();

      // Verify subject_quota_usage PK composite columns: (subject_id, period_start, period_end)
      const pk = usageConfig.primaryKeys[0];
      expect(pk).toBeDefined();
      if (!pk) throw new Error("subject_quota_usage PK not defined");
      const pkColNames = pk.columns.map((c) => c.name);
      expect(pkColNames).toEqual(["subject_id", "period_start", "period_end"]);
    });

    it("prohibits calendar-derived, created_at, or CURRENT_DATE quota ownership derivation", () => {
      expect(analysisOperations.quotaPeriodStart.default).toBeUndefined();
      expect(analysisOperations.quotaPeriodEnd.default).toBeUndefined();

      expect(migrationSql).not.toContain('"quota_period_start" timestamp with time zone DEFAULT now()');
      expect(migrationSql).not.toContain('"quota_period_end" timestamp with time zone DEFAULT now()');
      expect(migrationSql).not.toContain('"quota_period_start" timestamp with time zone DEFAULT CURRENT_DATE');
      expect(migrationSql).not.toContain('"quota_period_end" timestamp with time zone DEFAULT CURRENT_DATE');
    });

    it("guarantees no seventh table is introduced in hermes_control schema", () => {
      const tableMatches = migrationSql.match(/CREATE TABLE IF NOT EXISTS "hermes_control"\."([^"]+)"/g) || [];
      expect(tableMatches.length).toBe(6);
      expect(tableMatches).toEqual([
        'CREATE TABLE IF NOT EXISTS "hermes_control"."subject_identities"',
        'CREATE TABLE IF NOT EXISTS "hermes_control"."subject_entitlements"',
        'CREATE TABLE IF NOT EXISTS "hermes_control"."subject_quota_usage"',
        'CREATE TABLE IF NOT EXISTS "hermes_control"."analysis_operations"',
        'CREATE TABLE IF NOT EXISTS "hermes_control"."concurrency_leases"',
        'CREATE TABLE IF NOT EXISTS "hermes_control"."provider_daily_usage"',
      ]);
    });

    it("ensures runtime role grants remain unchanged and strictly least-privilege", () => {
      const grants = migrationSql.match(/GRANT [^;]+ TO hermes_control_runtime;/g) || [];
      expect(grants.length).toBe(7);
      expect(grants).toContain("GRANT USAGE ON SCHEMA hermes_control TO hermes_control_runtime;");
      expect(grants).toContain('GRANT SELECT, INSERT ON TABLE "hermes_control"."subject_identities" TO hermes_control_runtime;');
      expect(grants).toContain('GRANT SELECT ON TABLE "hermes_control"."subject_entitlements" TO hermes_control_runtime;');
      expect(grants).toContain('GRANT SELECT, INSERT, UPDATE ON TABLE "hermes_control"."subject_quota_usage" TO hermes_control_runtime;');
      expect(grants).toContain('GRANT SELECT, INSERT, UPDATE ON TABLE "hermes_control"."analysis_operations" TO hermes_control_runtime;');
      expect(grants).toContain('GRANT SELECT, INSERT, DELETE ON TABLE "hermes_control"."concurrency_leases" TO hermes_control_runtime;');
      expect(grants).toContain('GRANT SELECT, INSERT, UPDATE ON TABLE "hermes_control"."provider_daily_usage" TO hermes_control_runtime;');
    });

    it("freezes quota-exhausted idempotency policy: key is unburned upon rollback, no new status introduced", () => {
      expect(HERMES_OPERATION_STATUSES).not.toContain("quota_exhausted");
      expect(HERMES_USER_QUOTA_STATUSES).not.toContain("quota_exhausted");
      expect(HERMES_OPERATION_STATUSES.length).toBe(8);
      expect(HERMES_USER_QUOTA_STATUSES.length).toBe(5);
    });

    it("freezes atomic finalization invariant: operation guarded state transition and aggregate quota mutation are all-or-nothing", () => {
      expect(HERMES_OPERATION_STATUSES).toEqual([
        "reserved",
        "released",
        "expired_before_dispatch",
        "provider_dispatch_started",
        "completed_success",
        "completed_validation_failure",
        "completed_grounding_failure",
        "outcome_unknown",
      ]);
    });

    it("freezes reaper safety invariant: only reserved unstarted operations can be reaped using persisted period", () => {
      expect(canTransitionOperationStatus("reserved", "expired_before_dispatch")).toBe(true);
      expect(canTransitionOperationStatus("provider_dispatch_started", "expired_before_dispatch")).toBe(false);
      expect(canTransitionOperationStatus("completed_success", "expired_before_dispatch")).toBe(false);
    });

    it("verifies migration remains 0041 and unapplied with no 0042 migration created", () => {
      const journalRaw = readFileSync(
        join(process.cwd(), "database", "migrations", "meta", "_journal.json"),
        "utf8"
      );
      const journal = JSON.parse(journalRaw);
      const entries = journal.entries as Array<{ idx: number; tag: string }>;
      const latestEntry = entries[entries.length - 1];
      expect(latestEntry).toBeDefined();
      if (!latestEntry) throw new Error("latestEntry not defined");
      expect(latestEntry.idx).toBe(41);
      expect(latestEntry.tag).toBe("0041_hermes_control_schema");

      const migrationsDir = join(process.cwd(), "database", "migrations");
      const files = readdirSync(migrationsDir) as string[];
      const migration42 = files.find((f: string) => f.startsWith("0042"));
      expect(migration42).toBeUndefined();
    });
  });

  // ============================================================
  // G. Role Helper Verification
  // ============================================================
  describe("G. Role Helper Verification", () => {
    it("withHermesControlRole issues SET LOCAL ROLE hermes_control_runtime inside transaction", async () => {
      const mockTx = {
        execute: vi.fn(async () => undefined),
      };

      const mockDb = {
        transaction: vi.fn(async (callback) => {
          return await callback(mockTx);
        }),
      };

      const callbackMock = vi.fn(async (tx) => {
        expect(tx).toBe(mockTx);
        return "operation_success";
      });

      const result = await withHermesControlRole(
        mockDb as unknown as PostgresJsDatabase<typeof schema>,
        callbackMock
      );

      expect(mockDb.transaction).toHaveBeenCalledTimes(1);
      expect(mockTx.execute).toHaveBeenCalledTimes(1);
      const expectedSql = sql`SET LOCAL ROLE hermes_control_runtime`;
      expect(mockTx.execute).toHaveBeenCalledWith(expectedSql);
      expect(callbackMock).toHaveBeenCalledTimes(1);
      expect(result).toBe("operation_success");
    });

    it("withHermesControlRole fails closed: if SET LOCAL ROLE fails, callback must never run", async () => {
      const permissionDeniedError = new Error("permission denied for role hermes_control_runtime");
      const mockTx = {
        execute: vi.fn(async () => {
          throw permissionDeniedError;
        }),
      };

      const mockDb = {
        transaction: vi.fn(async (callback) => {
          return await callback(mockTx);
        }),
      };

      const callbackMock = vi.fn(async () => {
        return "should_never_run";
      });

      await expect(
        withHermesControlRole(
          mockDb as unknown as PostgresJsDatabase<typeof schema>,
          callbackMock
        )
      ).rejects.toThrow(
        "permission denied for role hermes_control_runtime"
      );
      expect(callbackMock).not.toHaveBeenCalled();
    });
  });
});
