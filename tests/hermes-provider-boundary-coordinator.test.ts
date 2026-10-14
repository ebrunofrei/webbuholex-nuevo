import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  PostgresHermesProviderBoundaryCoordinator,
  validateProviderBoundaryLimits,
  validateOperationId,
  parseConcurrencyCount,
  parseNullableDate,
  parseDailyUsageResult,
  HermesProviderBoundaryValidationError,
  MIN_HERMES_LEASE_TTL_SECONDS,
  MAX_HERMES_LEASE_TTL_SECONDS,
  DEFAULT_HERMES_LEASE_TTL_SECONDS,
  type HermesProviderBoundaryLimits,
} from "@/lib/hermes/control/hermes-provider-boundary-coordinator";
import {
  type HermesOperationStatus,
  type HermesUserQuotaStatus,
  type HermesPlatformCostStatus,
} from "@/lib/hermes/control/hermes-control-contracts";
import { HermesControlPersistenceError } from "@/lib/hermes/control/hermes-control-errors";
import type { HermesControlTransaction } from "@/database/roles";

interface StoredOperation {
  id: string;
  subjectId: string;
  status: HermesOperationStatus;
  platformCostStatus: HermesPlatformCostStatus;
  userQuotaStatus: HermesUserQuotaStatus;
  reservedExpiresAt: Date;
  dispatchStartedAt: Date | null;
  completedAt: Date | null;
  updatedAt: Date;
}

interface StoredLease {
  leaseId: string;
  operationId: string;
  subjectId: string;
  acquiredAt: Date;
  expiresAt: Date;
}

interface StoredDailyUsage {
  dayUtc: string;
  feature: string;
  callCount: number;
  updatedAt: Date;
}

function cloneOperations(map: Map<string, StoredOperation>): Map<string, StoredOperation> {
  const next = new Map<string, StoredOperation>();
  for (const [k, v] of map.entries()) {
    next.set(k, { ...v });
  }
  return next;
}

function cloneLeases(map: Map<string, StoredLease>): Map<string, StoredLease> {
  const next = new Map<string, StoredLease>();
  for (const [k, v] of map.entries()) {
    next.set(k, { ...v });
  }
  return next;
}

function cloneDailyUsage(map: Map<string, StoredDailyUsage>): Map<string, StoredDailyUsage> {
  const next = new Map<string, StoredDailyUsage>();
  for (const [k, v] of map.entries()) {
    next.set(k, { ...v });
  }
  return next;
}

interface StatefulBoundaryStore {
  readonly operations: Map<string, StoredOperation>;
  readonly leases: Map<string, StoredLease>;
  readonly dailyUsage: Map<string, StoredDailyUsage>;
  readonly roleRunner: <T>(callback: (tx: HermesControlTransaction) => Promise<T>) => Promise<T>;
  failNextLeaseInsert: boolean;
  failNextDailyUpsert: boolean;
  failNextOperationUpdate: boolean;
  failWithPostgresError: boolean;
  simulateSubjectUniqueConflict: boolean;
  simulateOperationUniqueConflict: boolean;
  overrideSubjectCountResult?: unknown;
  overrideGlobalCountResult?: unknown;
  overrideReleaseResult?: unknown;
  overrideDailyResult?: unknown | undefined;
  overrideLockedOperation?: unknown | undefined;
  overrideRequeriedOperation?: unknown | undefined;
  operationUniqueConflictWinnerOperation?: StoredOperation | undefined;
  advisoryLockCalled: boolean;
  dbCurrentTime: Date;
  leaseIdCounter: number;
}

function extractSqlValues(sqlObj: unknown): unknown[] {
  const vals: unknown[] = [];
  function walk(node: unknown): void {
    if (node === null || node === undefined) return;
    if (typeof node === "string" || typeof node === "number" || typeof node === "boolean" || node instanceof Date) {
      vals.push(node);
      return;
    }
    if (typeof node === "object") {
      if ("queryChunks" in node && Array.isArray((node as { queryChunks: unknown[] }).queryChunks)) {
        for (const chunk of (node as { queryChunks: unknown[] }).queryChunks) {
          // If chunk is a StringChunk from Drizzle, its 'value' is a string[] containing SQL keywords. Skip it.
          if (chunk && typeof chunk === "object" && "value" in chunk && Array.isArray((chunk as { value: unknown }).value)) {
            continue;
          }
          walk(chunk);
        }
        return;
      }
      if ("value" in node) {
        const v = (node as { value: unknown }).value;
        if (typeof v !== "object" || v instanceof Date) {
          vals.push(v);
        }
      }
    }
  }
  walk(sqlObj);
  return vals;
}

function sqlToString(sqlObj: unknown): string {
  if (!sqlObj || typeof sqlObj !== "object") return String(sqlObj ?? "");
  const obj = sqlObj as { queryChunks?: unknown[] };
  if (Array.isArray(obj.queryChunks)) {
    return obj.queryChunks
      .map((c) => {
        if (typeof c === "string") return c;
        if (c && typeof c === "object" && "value" in c) return String((c as { value: unknown }).value);
        return sqlToString(c);
      })
      .join(" ");
  }
  return "";
}

/**
 * Isolated Test Adapter Boundary:
 * Drizzle PgTransaction has an expansive internal structural type with dozens of private/driver-specific
 * properties (session, dialect, schema, relations, etc.). In tests, we build a structural duck-type
 * covering only the query builder APIs invoked by PostgresHermesProviderBoundaryCoordinator (select, update, execute).
 * This isolated adapter boundary bridges the test fake transaction to the HermesControlTransaction interface.
 */
function adaptFakeTxToHermesControlTransaction(fakeTx: unknown): HermesControlTransaction {
  return fakeTx as unknown as HermesControlTransaction;
}

function createFakeTx(
  store: StatefulQuotaStoreBoundary,
  snapshotOps?: Map<string, StoredOperation>
): HermesControlTransaction {
  const fakeTx = {
    select: () => ({
      from: () => ({
        where: (condition: unknown) => {
          const vals = extractSqlValues(condition);
          const opId = vals[0] as string;

          return {
            for: () => {
              if (store.overrideLockedOperation !== undefined) {
                const op = store.overrideLockedOperation;
                return Promise.resolve(op ? [op] : []);
              }
              const op = store.operations.get(opId);
              return Promise.resolve(op ? [op] : []);
            },
            limit: (n: number) => {
              if (store.overrideRequeriedOperation !== undefined) {
                const op = store.overrideRequeriedOperation;
                return Promise.resolve(op ? [op].slice(0, n) : []);
              }
              const op = store.operations.get(opId);
              return Promise.resolve(op ? [op].slice(0, n) : []);
            },
          };
        },
      }),
    }),

    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: (condition: unknown) => {
          if (store.failNextOperationUpdate) {
            store.failNextOperationUpdate = false;
            return {
              returning: () => Promise.resolve([]),
            };
          }

          const vals = extractSqlValues(condition);
          const opId = vals[0] as string;
          const op = store.operations.get(opId);

          if (!op) {
            return {
              returning: () => Promise.resolve([]),
            };
          }

          // Check guards: status === 'reserved', userQuotaStatus === 'reserved', platformCostStatus === 'none'
          if (
            op.status !== "reserved" ||
            op.userQuotaStatus !== "reserved" ||
            op.platformCostStatus !== "none" ||
            op.dispatchStartedAt !== null ||
            op.completedAt !== null
          ) {
            return {
              returning: () => Promise.resolve([]),
            };
          }

          if (values["status"]) op.status = values["status"] as HermesOperationStatus;
          if (values["platformCostStatus"]) op.platformCostStatus = values["platformCostStatus"] as HermesPlatformCostStatus;
          if (values["dispatchStartedAt"]) op.dispatchStartedAt = values["dispatchStartedAt"] as Date;
          if (values["updatedAt"]) op.updatedAt = values["updatedAt"] as Date;

          return {
            returning: () => Promise.resolve([{ id: op.id }]),
          };
        },
      }),
    }),

    execute: (queryObj: unknown) => {
      const qStr = sqlToString(queryObj);
      const vals = extractSqlValues(queryObj);

      // 1. Advisory Lock
      if (qStr.includes("pg_advisory_xact_lock")) {
        store.advisoryLockCalled = true;
        return Promise.resolve([]);
      }

      // 2. Expired Lease Cleanup
      if (qStr.includes("DELETE FROM") && qStr.includes("concurrency_leases") && qStr.includes("expires_at")) {
        const nowMs = store.dbCurrentTime.getTime();
        for (const [id, lease] of store.leases.entries()) {
          if (lease.expiresAt.getTime() <= nowMs) {
            store.leases.delete(id);
          }
        }
        return Promise.resolve([]);
      }

      // 3. Subject Concurrency Count
      if (qStr.includes("SELECT count(*)") && qStr.includes("subject_id")) {
        if (store.overrideSubjectCountResult !== undefined) {
          return Promise.resolve(store.overrideSubjectCountResult);
        }
        const subId = vals[0] as string;
        const nowMs = store.dbCurrentTime.getTime();
        let count = 0;
        for (const lease of store.leases.values()) {
          if (lease.subjectId === subId && lease.expiresAt.getTime() > nowMs) {
            count++;
          }
        }
        return Promise.resolve([{ count }]);
      }

      // 4. Global Concurrency Count
      if (qStr.includes("SELECT count(*)") && !qStr.includes("subject_id")) {
        if (store.overrideGlobalCountResult !== undefined) {
          return Promise.resolve(store.overrideGlobalCountResult);
        }
        const nowMs = store.dbCurrentTime.getTime();
        let count = 0;
        for (const lease of store.leases.values()) {
          if (lease.expiresAt.getTime() > nowMs) {
            count++;
          }
        }
        return Promise.resolve([{ count }]);
      }

      // 5. Insert Concurrency Lease
      if (qStr.includes("INSERT INTO") && qStr.includes("concurrency_leases")) {
        if (store.failNextLeaseInsert) {
          store.failNextLeaseInsert = false;
          throw new Error("simulated lease insert failure");
        }
        if (store.simulateSubjectUniqueConflict) {
          store.simulateSubjectUniqueConflict = false;
          throw { code: "23505", constraint_name: "concurrency_leases_subject_id_uniq" };
        }
        if (store.simulateOperationUniqueConflict) {
          store.simulateOperationUniqueConflict = false;
          const opId = vals[0] as string;
          if (store.operationUniqueConflictWinnerOperation) {
            store.operations.set(opId, { ...store.operationUniqueConflictWinnerOperation });
            if (snapshotOps) {
              snapshotOps.set(opId, { ...store.operationUniqueConflictWinnerOperation });
            }
          }
          throw { code: "23505", constraint_name: "concurrency_leases_operation_id_uniq" };
        }

        const opId = vals[0] as string;
        const subId = vals[1] as string;
        const ttlSec = (vals[2] as number) ?? 75;

        // DB level unique checks
        for (const lease of store.leases.values()) {
          if (lease.subjectId === subId) {
            throw { code: "23505", constraint_name: "concurrency_leases_subject_id_uniq" };
          }
          if (lease.operationId === opId) {
            throw { code: "23505", constraint_name: "concurrency_leases_operation_id_uniq" };
          }
        }

        const leaseId = `lease-${store.leaseIdCounter++}`;
        const acquiredAt = new Date(store.dbCurrentTime.getTime());
        const expiresAt = new Date(store.dbCurrentTime.getTime() + ttlSec * 1000);

        store.leases.set(leaseId, {
          leaseId,
          operationId: opId,
          subjectId: subId,
          acquiredAt,
          expiresAt,
        });

        return Promise.resolve([
          {
            lease_id: leaseId,
            acquired_at: acquiredAt,
            expires_at: expiresAt,
          },
        ]);
      }

      // 6. Provider Daily Usage Atomic UPSERT
      if (qStr.includes("INSERT INTO") && qStr.includes("provider_daily_usage")) {
        if (store.overrideDailyResult !== undefined) {
          return Promise.resolve(store.overrideDailyResult);
        }
        if (store.failNextDailyUpsert) {
          store.failNextDailyUpsert = false;
          throw new Error("simulated daily upsert failure");
        }

        const limitVal = vals[0] as number;
        if (limitVal < 1) {
          return Promise.resolve([]);
        }

        // Derive day_utc strictly from the DB current time (representing (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date)
        const dayUtc = store.dbCurrentTime.toISOString().slice(0, 10);
        const feature = "jurisprudence_interpretation";
        const key = `${dayUtc}::${feature}`;

        const existing = store.dailyUsage.get(key);
        if (!existing) {
          const newRow = {
            dayUtc,
            feature,
            callCount: 1,
            updatedAt: new Date(store.dbCurrentTime.getTime()),
          };
          store.dailyUsage.set(key, newRow);
          return Promise.resolve([{ day_utc: dayUtc, call_count: 1 }]);
        }

        if (existing.callCount >= limitVal) {
          return Promise.resolve([]);
        }

        existing.callCount += 1;
        existing.updatedAt = new Date(store.dbCurrentTime.getTime());
        return Promise.resolve([{ day_utc: dayUtc, call_count: existing.callCount }]);
      }

      // 7. Delete Concurrency Lease by Operation ID (releaseConcurrencyLease)
      if (qStr.includes("DELETE FROM") && qStr.includes("concurrency_leases") && qStr.includes("operation_id")) {
        if (store.overrideReleaseResult !== undefined) {
          return Promise.resolve(store.overrideReleaseResult);
        }
        const opId = vals[0] as string;
        for (const [id, lease] of store.leases.entries()) {
          if (lease.operationId === opId) {
            store.leases.delete(id);
            return Promise.resolve([{ lease_id: lease.leaseId }]);
          }
        }
        return Promise.resolve([]);
      }

      return Promise.resolve([]);
    },
  };

  return adaptFakeTxToHermesControlTransaction(fakeTx);
}

type StatefulQuotaStoreBoundary = StatefulBoundaryStore;

function createStatefulBoundaryStore(): StatefulBoundaryStore {
  const operations = new Map<string, StoredOperation>();
  const leases = new Map<string, StoredLease>();
  const dailyUsage = new Map<string, StoredDailyUsage>();

  const store: StatefulBoundaryStore = {
    operations,
    leases,
    dailyUsage,
    failNextLeaseInsert: false,
    failNextDailyUpsert: false,
    failNextOperationUpdate: false,
    failWithPostgresError: false,
    simulateSubjectUniqueConflict: false,
    simulateOperationUniqueConflict: false,
    overrideSubjectCountResult: undefined,
    overrideGlobalCountResult: undefined,
    overrideReleaseResult: undefined,
    overrideDailyResult: undefined,
    overrideLockedOperation: undefined,
    overrideRequeriedOperation: undefined,
    operationUniqueConflictWinnerOperation: undefined,
    advisoryLockCalled: false,
    dbCurrentTime: new Date("2026-05-01T12:00:00.000Z"),
    leaseIdCounter: 1,

    roleRunner: async <T>(callback: (tx: HermesControlTransaction) => Promise<T>): Promise<T> => {
      if (store.failWithPostgresError) {
        store.failWithPostgresError = false;
        throw new Error("fatal postgres error simulated");
      }

      // Snapshot stores for atomic rollback simulation
      const snapshotOps = cloneOperations(store.operations);
      const snapshotLeases = cloneLeases(store.leases);
      const snapshotDaily = cloneDailyUsage(store.dailyUsage);

      try {
        const fakeTx = createFakeTx(store, snapshotOps);
        const result = await callback(fakeTx);
        return result;
      } catch (err) {
        // Rollback on any failure
        store.operations.clear();
        for (const [k, v] of snapshotOps.entries()) {
          store.operations.set(k, v);
        }
        store.leases.clear();
        for (const [k, v] of snapshotLeases.entries()) {
          store.leases.set(k, v);
        }
        store.dailyUsage.clear();
        for (const [k, v] of snapshotDaily.entries()) {
          store.dailyUsage.set(k, v);
        }
        throw err;
      }
    },
  };

  return store;
}

describe("HERMES-PROD-A3.5: Concurrency Lease & Daily Provider Boundary Coordinator", () => {
  const referenceNow = new Date("2026-05-01T12:00:00.000Z");
  const futureExpiresAt = new Date("2026-05-01T12:02:00.000Z");
  const canonicalLimits: HermesProviderBoundaryLimits = {
    concurrencyLimit: 5,
    dailyProviderCallLimit: 100,
    leaseTtlSeconds: DEFAULT_HERMES_LEASE_TTL_SECONDS,
  };

  function seedOperation(
    store: StatefulBoundaryStore,
    overrides?: Partial<StoredOperation>
  ): StoredOperation {
    const op: StoredOperation = {
      id: "10000000-0000-4000-8000-000000000001",
      subjectId: "20000000-0000-4000-8000-000000000001",
      status: "reserved",
      platformCostStatus: "none",
      userQuotaStatus: "reserved",
      reservedExpiresAt: futureExpiresAt,
      dispatchStartedAt: null,
      completedAt: null,
      updatedAt: referenceNow,
      ...overrides,
    };
    store.operations.set(op.id, op);
    return op;
  }

  // ============================================================
  // 1. Operation Classification & Source Coherence
  // ============================================================
  describe("1. Operation Classification & Source Coherence", () => {
    it("returns not_found when operation does not exist", async () => {
      const store = createStatefulBoundaryStore();
      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000099", canonicalLimits);
      expect(res.kind).toBe("not_found");
      if (res.kind === "not_found") {
        expect(res.operationId).toBe("10000000-0000-4000-8000-000000000099");
      }
    });

    it("returns started for coherent reserved operation", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store);
      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res.kind).toBe("started");
      if (res.kind === "started") {
        expect(res.operationId).toBe("10000000-0000-4000-8000-000000000001");
        expect(res.status).toBe("provider_dispatch_started");
        expect(res.platformCostStatus).toBe("indeterminate");
        expect(res.userQuotaStatus).toBe("reserved");
        expect(res.dispatchStartedAt).toEqual(referenceNow);
        expect(typeof res.leaseId).toBe("string");
      }

      // Verify DB mutations
      const op = store.operations.get("10000000-0000-4000-8000-000000000001");
      expect(op?.status).toBe("provider_dispatch_started");
      expect(op?.platformCostStatus).toBe("indeterminate");
      expect(op?.dispatchStartedAt).toEqual(referenceNow);

      expect(store.leases.size).toBe(1);
      expect(store.dailyUsage.size).toBe(1);
    });

    it("returns already_started when operation is already provider_dispatch_started", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store, {
        status: "provider_dispatch_started",
        platformCostStatus: "indeterminate",
        userQuotaStatus: "reserved",
        dispatchStartedAt: referenceNow,
      });
      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res.kind).toBe("already_started");
      if (res.kind === "already_started") {
        expect(res.operationId).toBe("10000000-0000-4000-8000-000000000001");
      }

      // Consumes zero new leases and zero daily slots
      expect(store.leases.size).toBe(0);
      expect(store.dailyUsage.size).toBe(0);
    });

    it("returns already_finalized for completed_success operation", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store, {
        status: "completed_success",
        platformCostStatus: "assumed_incurred",
        userQuotaStatus: "committed",
        dispatchStartedAt: referenceNow,
        completedAt: referenceNow,
      });
      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res.kind).toBe("already_finalized");
      if (res.kind === "already_finalized") {
        expect(res.operationId).toBe("10000000-0000-4000-8000-000000000001");
        expect(res.existingStatus).toBe("completed_success");
      }
    });

    it("returns already_finalized for terminal failure states (validation, grounding, outcome_unknown)", async () => {
      const terminalCases: Array<[HermesOperationStatus, HermesPlatformCostStatus, HermesUserQuotaStatus]> = [
        ["completed_validation_failure", "assumed_incurred", "policy_pending"],
        ["completed_grounding_failure", "assumed_incurred", "policy_pending"],
        ["outcome_unknown", "indeterminate", "policy_pending"],
        ["released", "none", "released"],
        ["expired_before_dispatch", "none", "released"],
      ];

      for (const [status, platformCostStatus, userQuotaStatus] of terminalCases) {
        const store = createStatefulBoundaryStore();
        seedOperation(store, {
          status,
          platformCostStatus,
          userQuotaStatus,
          dispatchStartedAt: status.startsWith("completed_") || status === "outcome_unknown" ? referenceNow : null,
          completedAt: status.startsWith("completed_") || status === "released" || status === "expired_before_dispatch" ? referenceNow : null,
        });
        const coordinator = new PostgresHermesProviderBoundaryCoordinator({
          roleRunner: store.roleRunner,
          now: () => referenceNow,
        });

        const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
        expect(res.kind).toBe("already_finalized");
        if (res.kind === "already_finalized") {
          expect(res.existingStatus).toBe(status);
        }
      }
    });

    it("fails closed as control_unavailable if persisted combination is incoherent", async () => {
      const store = createStatefulBoundaryStore();
      // Incoherent: reserved status with assumed_incurred platform cost
      seedOperation(store, {
        status: "reserved",
        platformCostStatus: "assumed_incurred",
        userQuotaStatus: "reserved",
      });
      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res.kind).toBe("control_unavailable");
      if (res.kind === "control_unavailable") {
        expect(res.reason).toBe("usage_control_unavailable");
      }
    });

    it("fails closed if reserved operation has non-null dispatchStartedAt", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store, {
        status: "reserved",
        platformCostStatus: "none",
        userQuotaStatus: "reserved",
        dispatchStartedAt: referenceNow, // Incoherent for reserved!
      });
      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res.kind).toBe("control_unavailable");
    });
  });

  // ============================================================
  // 2. Zero-Limit Idempotency Order
  // ============================================================
  describe("2. Zero-Limit Idempotency Order", () => {
    it("already provider_dispatch_started returns already_started even when concurrencyLimit = 0", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store, {
        status: "provider_dispatch_started",
        platformCostStatus: "indeterminate",
        userQuotaStatus: "reserved",
        dispatchStartedAt: referenceNow,
      });
      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", {
        concurrencyLimit: 0,
        dailyProviderCallLimit: 100,
        leaseTtlSeconds: 75,
      });
      expect(res.kind).toBe("already_started");
    });

    it("terminal operation returns already_finalized even when dailyProviderCallLimit = 0", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store, {
        status: "completed_success",
        platformCostStatus: "assumed_incurred",
        userQuotaStatus: "committed",
        dispatchStartedAt: referenceNow,
        completedAt: referenceNow,
      });
      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", {
        concurrencyLimit: 5,
        dailyProviderCallLimit: 0,
        leaseTtlSeconds: 75,
      });
      expect(res.kind).toBe("already_finalized");
    });

    it("eligible reserved operation returns concurrency_capacity_exceeded when concurrencyLimit = 0", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store);
      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", {
        concurrencyLimit: 0,
        dailyProviderCallLimit: 100,
        leaseTtlSeconds: 75,
      });
      expect(res.kind).toBe("concurrency_capacity_exceeded");

      // Verify operation remains reserved and zero leases created
      const op = store.operations.get("10000000-0000-4000-8000-000000000001");
      expect(op?.status).toBe("reserved");
      expect(store.leases.size).toBe(0);
      expect(store.dailyUsage.size).toBe(0);
    });

    it("eligible reserved operation returns daily_limit_exhausted when dailyProviderCallLimit = 0", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store);
      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", {
        concurrencyLimit: 5,
        dailyProviderCallLimit: 0,
        leaseTtlSeconds: 75,
      });
      expect(res.kind).toBe("daily_limit_exhausted");

      const op = store.operations.get("10000000-0000-4000-8000-000000000001");
      expect(op?.status).toBe("reserved");
      expect(store.leases.size).toBe(0);
      expect(store.dailyUsage.size).toBe(0);
    });
  });

  // ============================================================
  // 3. Reservation Expiry at Boundary
  // ============================================================
  describe("3. Reservation Expiry at Boundary", () => {
    it("blocks dispatch if reservedExpiresAt <= boundary clock", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store, {
        reservedExpiresAt: new Date("2026-05-01T11:59:59.000Z"), // Expired!
      });
      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow, // 12:00:00 > 11:59:59
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res.kind).toBe("reservation_expired");
      if (res.kind === "reservation_expired") {
        expect(res.operationId).toBe("10000000-0000-4000-8000-000000000001");
        expect(res.reservedExpiresAt).toEqual(new Date("2026-05-01T11:59:59.000Z"));
      }

      // No lease, no daily counter, operation remains reserved (A3.4 reaper owns release)
      const op = store.operations.get("10000000-0000-4000-8000-000000000001");
      expect(op?.status).toBe("reserved");
      expect(store.leases.size).toBe(0);
      expect(store.dailyUsage.size).toBe(0);
    });

    it("blocks dispatch if reservedExpiresAt exactly equals boundary clock", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store, {
        reservedExpiresAt: referenceNow,
      });
      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res.kind).toBe("reservation_expired");
    });
  });

  // ============================================================
  // 4. Concurrency Acquisition & Capacity
  // ============================================================
  describe("4. Concurrency Acquisition & Capacity", () => {
    it("denies capacity when same subject already has an active lease", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store, { id: "10000000-0000-4000-8000-000000000001", subjectId: "20000000-0000-4000-8000-000000000001" });
      seedOperation(store, { id: "10000000-0000-4000-8000-000000000002", subjectId: "20000000-0000-4000-8000-000000000001" });

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      // op-1 starts and gets lease
      const res1 = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res1.kind).toBe("started");

      // op-2 from same subject attempts to start
      const res2 = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000002", canonicalLimits);
      expect(res2.kind).toBe("subject_concurrency_conflict");

      // op-2 remains reserved
      const op2 = store.operations.get("10000000-0000-4000-8000-000000000002");
      expect(op2?.status).toBe("reserved");
    });

    it("denies capacity when global lease count equals concurrencyLimit", async () => {
      const store = createStatefulBoundaryStore();
      const limits: HermesProviderBoundaryLimits = {
        concurrencyLimit: 2,
        dailyProviderCallLimit: 100,
        leaseTtlSeconds: 75,
      };

      seedOperation(store, { id: "10000000-0000-4000-8000-000000000001", subjectId: "20000000-0000-4000-8000-000000000001" });
      seedOperation(store, { id: "10000000-0000-4000-8000-000000000002", subjectId: "20000000-0000-4000-8000-000000000002" });
      seedOperation(store, { id: "10000000-0000-4000-8000-000000000003", subjectId: "20000000-0000-4000-8000-000000000003" });

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      expect((await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", limits)).kind).toBe("started");
      expect((await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000002", limits)).kind).toBe("started");

      // 3rd attempt exceeds global capacity
      const res3 = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000003", limits);
      expect(res3.kind).toBe("concurrency_capacity_exceeded");

      const op3 = store.operations.get("10000000-0000-4000-8000-000000000003");
      expect(op3?.status).toBe("reserved");
      expect(store.leases.size).toBe(2);
    });

    it("reclaims expired leases under advisory lock to free capacity", async () => {
      const store = createStatefulBoundaryStore();
      const limits: HermesProviderBoundaryLimits = {
        concurrencyLimit: 1,
        dailyProviderCallLimit: 100,
        leaseTtlSeconds: 75,
      };

      seedOperation(store, { id: "10000000-0000-4000-8000-000000000001", subjectId: "20000000-0000-4000-8000-000000000001" });
      seedOperation(store, { id: "10000000-0000-4000-8000-000000000002", subjectId: "20000000-0000-4000-8000-000000000002" });

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      // op-1 starts
      expect((await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", limits)).kind).toBe("started");
      expect(store.leases.size).toBe(1);

      // Advance clock past op-1's lease TTL (75s)
      store.dbCurrentTime = new Date(referenceNow.getTime() + 80 * 1000);
      const coordinatorT2 = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => store.dbCurrentTime,
      });

      // op-2 starts; op-1's lease is purged under advisory lock, slot freed
      const res2 = await coordinatorT2.beginProviderDispatch("10000000-0000-4000-8000-000000000002", limits);
      expect(res2.kind).toBe("started");
      expect(store.leases.size).toBe(1);

      // Verify op-1 in analysis_operations was NOT modified or redispatched by lease purge
      const op1 = store.operations.get("10000000-0000-4000-8000-000000000001");
      expect(op1?.status).toBe("provider_dispatch_started");
    });

    it("retains non-expired leases during cleanup", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store, { id: "10000000-0000-4000-8000-000000000001", subjectId: "20000000-0000-4000-8000-000000000001" });
      seedOperation(store, { id: "10000000-0000-4000-8000-000000000002", subjectId: "20000000-0000-4000-8000-000000000002" });

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      expect((await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits)).kind).toBe("started");

      // Advance clock by only 10s (lease expires in 75s)
      store.dbCurrentTime = new Date(referenceNow.getTime() + 10 * 1000);
      const coordinatorT2 = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => store.dbCurrentTime,
      });

      expect((await coordinatorT2.beginProviderDispatch("10000000-0000-4000-8000-000000000002", canonicalLimits)).kind).toBe("started");
      expect(store.leases.size).toBe(2);
    });

    it("safely maps subject unique constraint violation (SQLSTATE 23505) outside transaction", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store, { id: "10000000-0000-4000-8000-000000000001", subjectId: "20000000-0000-4000-8000-000000000001" });
      store.simulateSubjectUniqueConflict = true;

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res.kind).toBe("subject_concurrency_conflict");
    });

    it("safely maps operation unique constraint violation (SQLSTATE 23505) via post-rollback classification for coherent started state", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store, {
        id: "10000000-0000-4000-8000-000000000001",
        subjectId: "20000000-0000-4000-8000-000000000001",
        status: "reserved",
        platformCostStatus: "none",
        userQuotaStatus: "reserved",
      });
      store.simulateOperationUniqueConflict = true;
      store.operationUniqueConflictWinnerOperation = {
        id: "10000000-0000-4000-8000-000000000001",
        subjectId: "20000000-0000-4000-8000-000000000001",
        status: "provider_dispatch_started",
        platformCostStatus: "indeterminate",
        userQuotaStatus: "reserved",
        reservedExpiresAt: futureExpiresAt,
        dispatchStartedAt: referenceNow,
        completedAt: null,
        updatedAt: referenceNow,
      };

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res.kind).toBe("already_started");
      expect(store.leases.size).toBe(0);
      expect(store.dailyUsage.size).toBe(0);
    });

    it("safely maps operation unique constraint violation (SQLSTATE 23505) via post-rollback classification for coherent finalized state", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store, {
        id: "10000000-0000-4000-8000-000000000001",
        subjectId: "20000000-0000-4000-8000-000000000001",
        status: "reserved",
        platformCostStatus: "none",
        userQuotaStatus: "reserved",
      });
      store.simulateOperationUniqueConflict = true;
      store.operationUniqueConflictWinnerOperation = {
        id: "10000000-0000-4000-8000-000000000001",
        subjectId: "20000000-0000-4000-8000-000000000001",
        status: "completed_success",
        platformCostStatus: "assumed_incurred",
        userQuotaStatus: "committed",
        reservedExpiresAt: futureExpiresAt,
        dispatchStartedAt: referenceNow,
        completedAt: referenceNow,
        updatedAt: referenceNow,
      };

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res.kind).toBe("already_finalized");
      if (res.kind === "already_finalized") {
        expect(res.existingStatus).toBe("completed_success");
      }
      expect(store.leases.size).toBe(0);
      expect(store.dailyUsage.size).toBe(0);
    });

    it("fails closed (control_unavailable) on post-rollback 23505 when winner has corrupt status combination (started + cost none)", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store, {
        id: "10000000-0000-4000-8000-000000000001",
        subjectId: "20000000-0000-4000-8000-000000000001",
        status: "reserved",
        platformCostStatus: "none",
        userQuotaStatus: "reserved",
      });
      store.simulateOperationUniqueConflict = true;
      // Winner has corrupt state: provider_dispatch_started with platformCostStatus: "none"
      store.operationUniqueConflictWinnerOperation = {
        id: "10000000-0000-4000-8000-000000000001",
        subjectId: "20000000-0000-4000-8000-000000000001",
        status: "provider_dispatch_started",
        platformCostStatus: "none",
        userQuotaStatus: "reserved",
        reservedExpiresAt: futureExpiresAt,
        dispatchStartedAt: referenceNow,
        completedAt: null,
        updatedAt: referenceNow,
      };

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res.kind).toBe("control_unavailable");
      expect(store.leases.size).toBe(0);
      expect(store.dailyUsage.size).toBe(0);
    });

    it("fails closed (control_unavailable) on post-rollback 23505 when winner has corrupt lifecycle timestamps (started + dispatchStartedAt null)", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store, {
        id: "10000000-0000-4000-8000-000000000001",
        subjectId: "20000000-0000-4000-8000-000000000001",
        status: "reserved",
        platformCostStatus: "none",
        userQuotaStatus: "reserved",
      });
      store.simulateOperationUniqueConflict = true;
      // Winner has corrupt state: provider_dispatch_started with dispatchStartedAt: null
      store.operationUniqueConflictWinnerOperation = {
        id: "10000000-0000-4000-8000-000000000001",
        subjectId: "20000000-0000-4000-8000-000000000001",
        status: "provider_dispatch_started",
        platformCostStatus: "indeterminate",
        userQuotaStatus: "reserved",
        reservedExpiresAt: futureExpiresAt,
        dispatchStartedAt: null,
        completedAt: null,
        updatedAt: referenceNow,
      };

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res.kind).toBe("control_unavailable");
      expect(store.leases.size).toBe(0);
      expect(store.dailyUsage.size).toBe(0);
    });

    it("fails closed (control_unavailable) on post-rollback 23505 when winner has incompatible terminal status combination", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store, {
        id: "10000000-0000-4000-8000-000000000001",
        subjectId: "20000000-0000-4000-8000-000000000001",
        status: "reserved",
        platformCostStatus: "none",
        userQuotaStatus: "reserved",
      });
      store.simulateOperationUniqueConflict = true;
      // Winner has corrupt terminal state: completed_success with userQuotaStatus unreserved
      store.operationUniqueConflictWinnerOperation = {
        id: "10000000-0000-4000-8000-000000000001",
        subjectId: "20000000-0000-4000-8000-000000000001",
        status: "completed_success",
        platformCostStatus: "none",
        userQuotaStatus: "unreserved",
        reservedExpiresAt: futureExpiresAt,
        dispatchStartedAt: referenceNow,
        completedAt: referenceNow,
        updatedAt: referenceNow,
      };

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res.kind).toBe("control_unavailable");
      expect(store.leases.size).toBe(0);
      expect(store.dailyUsage.size).toBe(0);
    });

    it("fails closed (control_unavailable) on post-rollback 23505 when winner remains reserved (cannot claim already_started)", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store, {
        id: "10000000-0000-4000-8000-000000000001",
        subjectId: "20000000-0000-4000-8000-000000000001",
        status: "reserved",
        platformCostStatus: "none",
        userQuotaStatus: "reserved",
      });
      store.simulateOperationUniqueConflict = true;
      // Winner row is still reserved
      store.operationUniqueConflictWinnerOperation = {
        id: "10000000-0000-4000-8000-000000000001",
        subjectId: "20000000-0000-4000-8000-000000000001",
        status: "reserved",
        platformCostStatus: "none",
        userQuotaStatus: "reserved",
        reservedExpiresAt: futureExpiresAt,
        dispatchStartedAt: null,
        completedAt: null,
        updatedAt: referenceNow,
      };

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res.kind).toBe("control_unavailable");
      expect(store.leases.size).toBe(0);
      expect(store.dailyUsage.size).toBe(0);
    });
  });

  // ============================================================
  // 5. Daily Provider Counter & Rollover
  // ============================================================
  describe("5. Daily Provider Counter & Rollover", () => {
    it("increments daily counter from 0 to 1 on first call", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store);
      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      expect((await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits)).kind).toBe("started");

      const usage = store.dailyUsage.get("2026-05-01::jurisprudence_interpretation");
      expect(usage).toBeDefined();
      expect(usage?.callCount).toBe(1);
    });

    it("succeeds on exact final daily slot and denies subsequent calls", async () => {
      const store = createStatefulBoundaryStore();
      const limits: HermesProviderBoundaryLimits = {
        concurrencyLimit: 10,
        dailyProviderCallLimit: 2,
        leaseTtlSeconds: 75,
      };

      seedOperation(store, { id: "10000000-0000-4000-8000-000000000001", subjectId: "20000000-0000-4000-8000-000000000001" });
      seedOperation(store, { id: "10000000-0000-4000-8000-000000000002", subjectId: "20000000-0000-4000-8000-000000000002" });
      seedOperation(store, { id: "10000000-0000-4000-8000-000000000003", subjectId: "20000000-0000-4000-8000-000000000003" });

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      // Call 1: callCount = 1
      expect((await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", limits)).kind).toBe("started");
      // Call 2: callCount = 2 (final slot)
      expect((await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000002", limits)).kind).toBe("started");

      const usage = store.dailyUsage.get("2026-05-01::jurisprudence_interpretation");
      expect(usage?.callCount).toBe(2);

      // Call 3: Daily limit exhausted
      const res3 = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000003", limits);
      expect(res3.kind).toBe("daily_limit_exhausted");

      // Verify op-3 remains reserved and no lease created
      const op3 = store.operations.get("10000000-0000-4000-8000-000000000003");
      expect(op3?.status).toBe("reserved");
      expect(store.leases.has("lease-3")).toBe(false);
    });

    it("automatically rolls over counter at UTC midnight", async () => {
      const store = createStatefulBoundaryStore();
      const limits: HermesProviderBoundaryLimits = {
        concurrencyLimit: 10,
        dailyProviderCallLimit: 1, // Only 1 per day
        leaseTtlSeconds: 75,
      };

      seedOperation(store, { id: "10000000-0000-4000-8000-000000000001", subjectId: "20000000-0000-4000-8000-000000000001" });
      seedOperation(store, {
        id: "10000000-0000-4000-8000-000000000002",
        subjectId: "20000000-0000-4000-8000-000000000002",
        reservedExpiresAt: new Date("2026-05-02T00:05:00.000Z"),
      });

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      // Day 1 (2026-05-01)
      expect((await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", limits)).kind).toBe("started");
      expect(store.dailyUsage.get("2026-05-01::jurisprudence_interpretation")?.callCount).toBe(1);

      // Advance clock to Day 2 (2026-05-02T00:00:01.000Z)
      store.dbCurrentTime = new Date("2026-05-02T00:00:01.000Z");
      const coordinatorDay2 = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => store.dbCurrentTime,
      });

      // Day 2 call succeeds with a new counter row
      const res2 = await coordinatorDay2.beginProviderDispatch("10000000-0000-4000-8000-000000000002", limits);
      expect(res2.kind).toBe("started");
      expect(store.dailyUsage.get("2026-05-02::jurisprudence_interpretation")?.callCount).toBe(1);
      expect(store.dailyUsage.size).toBe(2);
    });

    it("verifies daily SQL query contains CURRENT_TIMESTAMP AT TIME ZONE 'UTC'", () => {
      const source = readFileSync(
        join(process.cwd(), "lib", "hermes", "control", "hermes-provider-boundary-coordinator.ts"),
        "utf8"
      );
      expect(source).toContain("(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date");
    });
  });

  // ============================================================
  // 6. Transaction Atomicity & Rollback
  // ============================================================
  describe("6. Transaction Atomicity & Rollback", () => {
    it("rolls back entire transaction if lease insertion fails", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store);
      store.failNextLeaseInsert = true;

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res.kind).toBe("control_unavailable");

      // Verify rollback: operation reserved, no lease, no daily counter
      const op = store.operations.get("10000000-0000-4000-8000-000000000001");
      expect(op?.status).toBe("reserved");
      expect(store.leases.size).toBe(0);
      expect(store.dailyUsage.size).toBe(0);
    });

    it("rolls back lease insertion if daily counter upsert fails", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store);
      store.failNextDailyUpsert = true;

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res.kind).toBe("control_unavailable");

      // Lease was rolled back!
      expect(store.leases.size).toBe(0);
      const op = store.operations.get("10000000-0000-4000-8000-000000000001");
      expect(op?.status).toBe("reserved");
    });

    it("rolls back lease and daily counter if operation status update returns 0 rows", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store);
      store.failNextOperationUpdate = true;

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res.kind).toBe("control_unavailable");

      // Both lease and daily counter were undone
      expect(store.leases.size).toBe(0);
      expect(store.dailyUsage.size).toBe(0);
      const op = store.operations.get("10000000-0000-4000-8000-000000000001");
      expect(op?.status).toBe("reserved");
    });

    it("rolls back expired lease cleanup when dispatch is denied by subject concurrency limit", async () => {
      const store = createStatefulBoundaryStore();
      const testOpId = "10000000-0000-4000-8000-000000000001";
      const testSubId = "20000000-0000-4000-8000-000000000001";
      const otherOpId = "10000000-0000-4000-8000-000000000002";
      const otherSubId = "20000000-0000-4000-8000-000000000002";

      // Target operation to dispatch
      seedOperation(store, {
        id: testOpId,
        subjectId: testSubId,
      });

      // Lease A: expired lease for subject 2 (must be deleted by Step 7 cleanup)
      const pastTime = new Date(store.dbCurrentTime.getTime() - 10_000);
      store.leases.set("lease-expired-A", {
        leaseId: "lease-expired-A",
        operationId: otherOpId,
        subjectId: otherSubId,
        acquiredAt: new Date(pastTime.getTime() - 75_000),
        expiresAt: pastTime,
      });

      // Lease B: active lease for subject 1 (will trigger subject conflict denial in Step 8)
      const futureTime = new Date(store.dbCurrentTime.getTime() + 60_000);
      store.leases.set("lease-active-B", {
        leaseId: "lease-active-B",
        operationId: "10000000-0000-4000-8000-000000000003",
        subjectId: testSubId,
        acquiredAt: store.dbCurrentTime,
        expiresAt: futureTime,
      });

      expect(store.leases.has("lease-expired-A")).toBe(true);
      expect(store.leases.has("lease-active-B")).toBe(true);

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      // Concurrency limit is 5 (> 0), so Step 5 zero-limit check passes
      const res = await coordinator.beginProviderDispatch(testOpId, canonicalLimits);
      expect(res.kind).toBe("subject_concurrency_conflict");

      // Verify that transaction rollback restored the deleted expired lease
      expect(store.leases.has("lease-expired-A")).toBe(true);
      expect(store.leases.has("lease-active-B")).toBe(true);
      expect(store.leases.size).toBe(2);

      // Verify operation remains reserved, daily counter unchanged, and no new lease committed
      const op = store.operations.get(testOpId);
      expect(op?.status).toBe("reserved");
      expect(op?.dispatchStartedAt).toBeNull();
      expect(store.dailyUsage.size).toBe(0);
    });

    it("verifies zero-limit concurrency check exits BEFORE advisory lock, cleanup, and lease insert", async () => {
      const store = createStatefulBoundaryStore();
      const testOpId = "10000000-0000-4000-8000-000000000001";
      const otherOpId = "10000000-0000-4000-8000-000000000002";
      const otherSubId = "20000000-0000-4000-8000-000000000002";

      seedOperation(store, { id: testOpId });

      // Expired lease in store
      const pastTime = new Date(store.dbCurrentTime.getTime() - 10_000);
      store.leases.set("lease-expired-A", {
        leaseId: "lease-expired-A",
        operationId: otherOpId,
        subjectId: otherSubId,
        acquiredAt: new Date(pastTime.getTime() - 75_000),
        expiresAt: pastTime,
      });

      const limits: HermesProviderBoundaryLimits = {
        concurrencyLimit: 0,
        dailyProviderCallLimit: 100,
        leaseTtlSeconds: 75,
      };

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.beginProviderDispatch(testOpId, limits);
      expect(res.kind).toBe("concurrency_capacity_exceeded");

      // Advisory lock was never called
      expect(store.advisoryLockCalled).toBe(false);

      // Expired lease was NEVER deleted because Step 5 returned before Step 7
      expect(store.leases.has("lease-expired-A")).toBe(true);
      expect(store.leases.size).toBe(1);

      // Operation remains reserved and daily counter is untouched
      expect(store.operations.get(testOpId)?.status).toBe("reserved");
      expect(store.dailyUsage.size).toBe(0);
    });
  });

  // ============================================================
  // 7. Crash Boundary State & Idempotent Second Call
  // ============================================================
  describe("7. Crash Boundary State & Idempotent Second Call", () => {
    it("calling beginProviderDispatch twice for same operation does not consume second lease or counter", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store);
      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      // Call 1
      const res1 = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res1.kind).toBe("started");
      expect(store.leases.size).toBe(1);
      expect(store.dailyUsage.get("2026-05-01::jurisprudence_interpretation")?.callCount).toBe(1);

      // Call 2
      const res2 = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res2.kind).toBe("already_started");

      // Exactly 1 lease and 1 daily count remain
      expect(store.leases.size).toBe(1);
      expect(store.dailyUsage.get("2026-05-01::jurisprudence_interpretation")?.callCount).toBe(1);
    });

    it("verifies operation state after start: indeterminate cost and non-null dispatchStartedAt", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store);
      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      const op = store.operations.get("10000000-0000-4000-8000-000000000001");

      expect(op?.status).toBe("provider_dispatch_started");
      expect(op?.platformCostStatus).toBe("indeterminate");
      expect(op?.userQuotaStatus).toBe("reserved");
      expect(op?.dispatchStartedAt).toEqual(referenceNow);
      expect(op?.completedAt).toBeNull();
    });
  });

  // ============================================================
  // 8. Lease Release Primitive
  // ============================================================
  describe("8. Lease Release Primitive", () => {
    it("successfully releases an active lease by operationId", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store);
      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const startRes = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(startRes.kind).toBe("started");
      expect(store.leases.size).toBe(1);

      const releaseRes = await coordinator.releaseConcurrencyLease("10000000-0000-4000-8000-000000000001");
      expect(releaseRes.kind).toBe("released");
      if (releaseRes.kind === "released") {
        expect(releaseRes.operationId).toBe("10000000-0000-4000-8000-000000000001");
        expect(typeof releaseRes.leaseId).toBe("string");
      }

      expect(store.leases.size).toBe(0);
    });

    it("returns already_absent when calling releaseConcurrencyLease a second time", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store);
      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      await coordinator.releaseConcurrencyLease("10000000-0000-4000-8000-000000000001");

      const release2 = await coordinator.releaseConcurrencyLease("10000000-0000-4000-8000-000000000001");
      expect(release2.kind).toBe("already_absent");
      if (release2.kind === "already_absent") {
        expect(release2.operationId).toBe("10000000-0000-4000-8000-000000000001");
      }
    });

    it("returns already_absent for unknown operation", async () => {
      const store = createStatefulBoundaryStore();
      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.releaseConcurrencyLease("10000000-0000-4000-8000-000000000099");
      expect(res.kind).toBe("already_absent");
    });

    it("lease release does NOT mutate operation status or daily counter", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store);
      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      await coordinator.releaseConcurrencyLease("10000000-0000-4000-8000-000000000001");

      const op = store.operations.get("10000000-0000-4000-8000-000000000001");
      expect(op?.status).toBe("provider_dispatch_started");
      expect(op?.platformCostStatus).toBe("indeterminate");
      expect(store.dailyUsage.get("2026-05-01::jurisprudence_interpretation")?.callCount).toBe(1);
    });

    it("returns control_unavailable on database failure", async () => {
      const store = createStatefulBoundaryStore();
      store.failWithPostgresError = true;
      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.releaseConcurrencyLease("10000000-0000-4000-8000-000000000001");
      expect(res.kind).toBe("control_unavailable");
    });

    it("returns already_absent when DELETE returns zero rows", async () => {
      const store = createStatefulBoundaryStore();
      store.overrideReleaseResult = [];
      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.releaseConcurrencyLease("10000000-0000-4000-8000-000000000001");
      expect(res.kind).toBe("already_absent");
      if (res.kind === "already_absent") {
        expect(res.operationId).toBe("10000000-0000-4000-8000-000000000001");
      }
    });

    it("returns released when DELETE returns exactly one valid row", async () => {
      const store = createStatefulBoundaryStore();
      store.overrideReleaseResult = [{ lease_id: "lease-12345" }];
      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.releaseConcurrencyLease("10000000-0000-4000-8000-000000000001");
      expect(res.kind).toBe("released");
      if (res.kind === "released") {
        expect(res.operationId).toBe("10000000-0000-4000-8000-000000000001");
        expect(res.leaseId).toBe("lease-12345");
      }
    });

    it("fails closed as control_unavailable when DELETE returns non-array", async () => {
      const store = createStatefulBoundaryStore();
      store.overrideReleaseResult = "not-an-array";
      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.releaseConcurrencyLease("10000000-0000-4000-8000-000000000001");
      expect(res.kind).toBe("control_unavailable");
    });

    it("fails closed as control_unavailable when DELETE returns multiple rows", async () => {
      const store = createStatefulBoundaryStore();
      store.overrideReleaseResult = [{ lease_id: "l-1" }, { lease_id: "l-2" }];
      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.releaseConcurrencyLease("10000000-0000-4000-8000-000000000001");
      expect(res.kind).toBe("control_unavailable");
    });

    it("fails closed as control_unavailable when DELETE returns row without lease_id or malformed lease_id", async () => {
      const store = createStatefulBoundaryStore();
      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      // Missing lease_id
      store.overrideReleaseResult = [{ notLeaseId: 123 }];
      expect((await coordinator.releaseConcurrencyLease("10000000-0000-4000-8000-000000000001")).kind).toBe(
        "control_unavailable"
      );

      // Wrong type (number)
      store.overrideReleaseResult = [{ lease_id: 123 }];
      expect((await coordinator.releaseConcurrencyLease("10000000-0000-4000-8000-000000000001")).kind).toBe(
        "control_unavailable"
      );

      // Empty string
      store.overrideReleaseResult = [{ lease_id: "" }];
      expect((await coordinator.releaseConcurrencyLease("10000000-0000-4000-8000-000000000001")).kind).toBe(
        "control_unavailable"
      );
    });

    it("fails closed as control_unavailable when releaseConcurrencyLease receives malformed operationId", async () => {
      let runnerCalled = false;
      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: async () => {
          runnerCalled = true;
          throw new Error("Should not be called");
        },
      });

      const res = await coordinator.releaseConcurrencyLease("op-invalid");
      expect(res.kind).toBe("control_unavailable");
      expect(runnerCalled).toBe(false);
    });
  });

  // ============================================================
  // 9. Input & Clock Validation
  // ============================================================
  describe("9. Input & Clock Validation", () => {
    it("validates limits and rejects non-integer or negative limits", () => {
      expect(() =>
        validateProviderBoundaryLimits({
          concurrencyLimit: -1,
          dailyProviderCallLimit: 10,
          leaseTtlSeconds: 75,
        })
      ).toThrow(HermesProviderBoundaryValidationError);

      expect(() =>
        validateProviderBoundaryLimits({
          concurrencyLimit: 5,
          dailyProviderCallLimit: -5,
          leaseTtlSeconds: 75,
        })
      ).toThrow(HermesProviderBoundaryValidationError);

      expect(() =>
        validateProviderBoundaryLimits({
          concurrencyLimit: 5.5,
          dailyProviderCallLimit: 10,
          leaseTtlSeconds: 75,
        })
      ).toThrow(HermesProviderBoundaryValidationError);
    });

    it("validates lease TTL is within calibrated range [60, 90]", () => {
      expect(MIN_HERMES_LEASE_TTL_SECONDS).toBe(60);
      expect(MAX_HERMES_LEASE_TTL_SECONDS).toBe(90);

      expect(
        validateProviderBoundaryLimits({
          concurrencyLimit: 5,
          dailyProviderCallLimit: 10,
          leaseTtlSeconds: 60,
        }).leaseTtlSeconds
      ).toBe(60);

      expect(
        validateProviderBoundaryLimits({
          concurrencyLimit: 5,
          dailyProviderCallLimit: 10,
          leaseTtlSeconds: 90,
        }).leaseTtlSeconds
      ).toBe(90);

      expect(() =>
        validateProviderBoundaryLimits({
          concurrencyLimit: 5,
          dailyProviderCallLimit: 10,
          leaseTtlSeconds: 59,
        })
      ).toThrow(HermesProviderBoundaryValidationError);

      expect(() =>
        validateProviderBoundaryLimits({
          concurrencyLimit: 5,
          dailyProviderCallLimit: 10,
          leaseTtlSeconds: 91,
        })
      ).toThrow(HermesProviderBoundaryValidationError);
    });

    it("validates operationId strictly as a canonical UUID", () => {
      const validUuid = "10000000-0000-4000-8000-000000000001";
      const validUppercaseUuid = "10000000-0000-4000-8000-00000000000A";

      // Valid UUIDs accepted and preserved exactly without normalization
      expect(validateOperationId(validUuid)).toBe(validUuid);
      expect(validateOperationId(validUppercaseUuid)).toBe(validUppercaseUuid);

      // Malformed operation IDs rejected
      expect(() => validateOperationId("op-1")).toThrow(
        HermesProviderBoundaryValidationError
      );
      expect(() => validateOperationId("op-valid")).toThrow(
        HermesProviderBoundaryValidationError
      );
      expect(() => validateOperationId("abc")).toThrow(
        HermesProviderBoundaryValidationError
      );
      expect(() => validateOperationId("")).toThrow(
        HermesProviderBoundaryValidationError
      );
      expect(() => validateOperationId("   ")).toThrow(
        HermesProviderBoundaryValidationError
      );
      expect(() => validateOperationId(` ${validUuid}`)).toThrow(
        HermesProviderBoundaryValidationError
      );
      expect(() => validateOperationId(`${validUuid} `)).toThrow(
        HermesProviderBoundaryValidationError
      );
      expect(() => validateOperationId(null)).toThrow(
        HermesProviderBoundaryValidationError
      );
      expect(() => validateOperationId(undefined)).toThrow(
        HermesProviderBoundaryValidationError
      );
      expect(() => validateOperationId(123)).toThrow(
        HermesProviderBoundaryValidationError
      );
      expect(() => validateOperationId({})).toThrow(
        HermesProviderBoundaryValidationError
      );
    });

    it("rejects malformed operationId BEFORE transaction runner without touching database", async () => {
      let runnerCalled = false;
      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: async () => {
          runnerCalled = true;
          throw new Error("Should not be called");
        },
      });

      await expect(
        coordinator.beginProviderDispatch("op-1", canonicalLimits)
      ).rejects.toThrow(HermesProviderBoundaryValidationError);

      expect(runnerCalled).toBe(false);
    });
  });

  // ============================================================
  // 10. Static Isolation & Architectural Protections
  // ============================================================
  describe("10. Static Isolation & Architectural Protections", () => {
    it("verifies production coordinator source has zero forbidden imports or calls", () => {
      const coordinatorPath = join(
        process.cwd(),
        "lib",
        "hermes",
        "control",
        "hermes-provider-boundary-coordinator.ts"
      );
      const code = readFileSync(coordinatorPath, "utf8");

      expect(code).not.toContain("fetch(");
      expect(code).not.toContain("OpenAI");
      expect(code).not.toContain("openai");
      expect(code).not.toContain("subjectEntitlements");
      expect(code).not.toContain("subject_entitlements");
      expect(code).not.toContain("subjectQuotaUsage");
      expect(code).not.toContain("subject_quota_usage");
      expect(code).not.toContain("as any");
      expect(code).not.toContain("as unknown as");
      expect(code).not.toContain("@ts-ignore");
      expect(code).not.toContain("@ts-expect-error");
    });

    it("verifies pg_advisory_xact_lock(1048576, 1) was invoked", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store);
      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(store.advisoryLockCalled).toBe(true);
    });
  });

  // ============================================================
  // 11. Fail-Closed Concurrency Count & Boundary Protection (A3.5C)
  // ============================================================
  describe("11. Fail-Closed Concurrency Count & Boundary Protection", () => {
    describe("Unit: parseConcurrencyCount", () => {
      it("accepts valid non-negative integer numbers", () => {
        expect(parseConcurrencyCount([{ count: 0 }])).toBe(0);
        expect(parseConcurrencyCount([{ count: 1 }])).toBe(1);
        expect(parseConcurrencyCount([{ count: 5 }])).toBe(5);
        expect(parseConcurrencyCount([{ count: 100 }])).toBe(100);
      });

      it("accepts valid canonical non-negative integer strings from Postgres", () => {
        expect(parseConcurrencyCount([{ count: "0" }])).toBe(0);
        expect(parseConcurrencyCount([{ count: "1" }])).toBe(1);
        expect(parseConcurrencyCount([{ count: "5" }])).toBe(5);
        expect(parseConcurrencyCount([{ count: "42" }])).toBe(42);
        expect(parseConcurrencyCount([{ count: "100" }])).toBe(100);
      });

      it("rejects non-arrays and empty/multi-row arrays fail-closed", () => {
        expect(() => parseConcurrencyCount(null)).toThrow();
        expect(() => parseConcurrencyCount(undefined)).toThrow();
        expect(() => parseConcurrencyCount("not an array")).toThrow();
        expect(() => parseConcurrencyCount(123)).toThrow();
        expect(() => parseConcurrencyCount({})).toThrow();
        expect(() => parseConcurrencyCount([])).toThrow();
        expect(() => parseConcurrencyCount([{ count: 1 }, { count: 2 }])).toThrow();
      });

      it("rejects records without valid count field", () => {
        expect(() => parseConcurrencyCount([{}])).toThrow();
        expect(() => parseConcurrencyCount([{ otherField: 1 }])).toThrow();
        expect(() => parseConcurrencyCount([{ count: null }])).toThrow();
        expect(() => parseConcurrencyCount([{ count: undefined }])).toThrow();
      });

      it("rejects negative, fractional, NaN, Infinity, and malformed counts fail-closed", () => {
        expect(() => parseConcurrencyCount([{ count: -1 }])).toThrow();
        expect(() => parseConcurrencyCount([{ count: "-1" }])).toThrow();
        expect(() => parseConcurrencyCount([{ count: 1.5 }])).toThrow();
        expect(() => parseConcurrencyCount([{ count: "1.5" }])).toThrow();
        expect(() => parseConcurrencyCount([{ count: NaN }])).toThrow();
        expect(() => parseConcurrencyCount([{ count: Infinity }])).toThrow();
        expect(() => parseConcurrencyCount([{ count: -Infinity }])).toThrow();
        expect(() => parseConcurrencyCount([{ count: "" }])).toThrow();
        expect(() => parseConcurrencyCount([{ count: "   " }])).toThrow();
        expect(() => parseConcurrencyCount([{ count: " 100 " }])).toThrow();
        expect(() => parseConcurrencyCount([{ count: " 0" }])).toThrow();
        expect(() => parseConcurrencyCount([{ count: "0 " }])).toThrow();
        expect(() => parseConcurrencyCount([{ count: "abc" }])).toThrow();
        expect(() => parseConcurrencyCount([{ count: "12abc" }])).toThrow();
        expect(() => parseConcurrencyCount([{ count: [1] }])).toThrow();
        expect(() => parseConcurrencyCount([{ count: { a: 1 } }])).toThrow();
      });
    });

    describe("Integration: Subject Concurrency Count Fail-Closed", () => {
      const malformedCases: Array<{ label: string; value: unknown }> = [
        { label: "empty array []", value: [] },
        { label: "non-array null", value: null },
        { label: "non-array string", value: "malformed" },
        { label: "empty record [{}]", value: [{}] },
        { label: "count missing [{ notCount: 1 }]", value: [{ notCount: 1 }] },
        { label: 'count = "abc"', value: [{ count: "abc" }] },
        { label: "count = -1", value: [{ count: -1 }] },
        { label: "count = 1.5", value: [{ count: 1.5 }] },
        { label: "count = NaN", value: [{ count: NaN }] },
        { label: "multiple rows", value: [{ count: 0 }, { count: 0 }] },
      ];

      for (const { label, value } of malformedCases) {
        it(`fails closed for malformed subject count: ${label}`, async () => {
          const store = createStatefulBoundaryStore();
          seedOperation(store);
          store.overrideSubjectCountResult = value;

          const coordinator = new PostgresHermesProviderBoundaryCoordinator({
            roleRunner: store.roleRunner,
            now: () => referenceNow,
          });

          const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
          expect(res.kind).toBe("control_unavailable");
          expect(store.leases.size).toBe(0);
          expect(store.dailyUsage.size).toBe(0);
          const op = store.operations.get("10000000-0000-4000-8000-000000000001");
          expect(op?.status).toBe("reserved");
          expect(op?.dispatchStartedAt).toBeNull();
        });
      }
    });

    describe("Integration: Global Concurrency Count Fail-Closed", () => {
      const malformedCases: Array<{ label: string; value: unknown }> = [
        { label: "empty array []", value: [] },
        { label: "non-array null", value: null },
        { label: "empty record [{}]", value: [{}] },
        { label: "count missing", value: [{ dummy: 1 }] },
        { label: 'count = "abc"', value: [{ count: "abc" }] },
        { label: "count = -1", value: [{ count: -1 }] },
        { label: "count = 1.5", value: [{ count: 1.5 }] },
        { label: "count = NaN", value: [{ count: NaN }] },
        { label: "multiple rows", value: [{ count: 0 }, { count: 0 }] },
      ];

      for (const { label, value } of malformedCases) {
        it(`fails closed for malformed global count (never assumes available capacity): ${label}`, async () => {
          const store = createStatefulBoundaryStore();
          seedOperation(store);
          store.overrideGlobalCountResult = value;

          const coordinator = new PostgresHermesProviderBoundaryCoordinator({
            roleRunner: store.roleRunner,
            now: () => referenceNow,
          });

          const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
          expect(res.kind).toBe("control_unavailable");
          expect(store.leases.size).toBe(0);
          expect(store.dailyUsage.size).toBe(0);
          const op = store.operations.get("10000000-0000-4000-8000-000000000001");
          expect(op?.status).toBe("reserved");
          expect(op?.dispatchStartedAt).toBeNull();
        });
      }
    });

    describe("Integration: Explicit Zero Concurrency Count Allowed", () => {
      it("allows dispatch when subject count = 0 and global count = 0 as numbers", async () => {
        const store = createStatefulBoundaryStore();
        seedOperation(store);
        store.overrideSubjectCountResult = [{ count: 0 }];
        store.overrideGlobalCountResult = [{ count: 0 }];

        const coordinator = new PostgresHermesProviderBoundaryCoordinator({
          roleRunner: store.roleRunner,
          now: () => referenceNow,
        });

        const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
        expect(res.kind).toBe("started");
        expect(store.leases.size).toBe(1);
        expect(store.dailyUsage.get("2026-05-01::jurisprudence_interpretation")?.callCount).toBe(1);
        expect(store.operations.get("10000000-0000-4000-8000-000000000001")?.status).toBe("provider_dispatch_started");
      });

      it("allows dispatch when subject count = 0 and global count = 0 as Postgres string integers", async () => {
        const store = createStatefulBoundaryStore();
        seedOperation(store);
        store.overrideSubjectCountResult = [{ count: "0" }];
        store.overrideGlobalCountResult = [{ count: "0" }];

        const coordinator = new PostgresHermesProviderBoundaryCoordinator({
          roleRunner: store.roleRunner,
          now: () => referenceNow,
        });

        const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
        expect(res.kind).toBe("started");
        expect(store.leases.size).toBe(1);
        expect(store.dailyUsage.get("2026-05-01::jurisprudence_interpretation")?.callCount).toBe(1);
        expect(store.operations.get("10000000-0000-4000-8000-000000000001")?.status).toBe("provider_dispatch_started");
      });
    });
  });

  // ============================================================
  // HERMES-PROD-A3.5E: STRICT NULLABLE DATE PARSER & LIFECYCLE FIELDS
  // ============================================================

  describe("HERMES-PROD-A3.5E: parseNullableDate Unit Tests", () => {
    it("accepts null as legitimate SQL NULL state", () => {
      const result = parseNullableDate(null);
      expect(result).toBeNull();
    });

    it("accepts valid Date instances", () => {
      const date = new Date("2026-05-01T12:00:00.000Z");
      const result = parseNullableDate(date);
      expect(result).toBe(date);
    });

    it("throws persistence_inconsistency on undefined (fail-closed missing field)", () => {
      expect(() => parseNullableDate(undefined)).toThrow(HermesControlPersistenceError);
      try {
        parseNullableDate(undefined);
      } catch (err) {
        expect((err as HermesControlPersistenceError).message).toBe("persistence_inconsistency");
      }
    });

    it("throws persistence_inconsistency on invalid Date instances", () => {
      const invalidDate = new Date("invalid-date-string");
      expect(() => parseNullableDate(invalidDate)).toThrow(HermesControlPersistenceError);
    });

    it("throws persistence_inconsistency on date strings instead of Date objects", () => {
      expect(() => parseNullableDate("2026-05-01T12:00:00.000Z")).toThrow(HermesControlPersistenceError);
      expect(() => parseNullableDate("2026-05-01")).toThrow(HermesControlPersistenceError);
    });

    it("throws persistence_inconsistency on numbers, booleans, and non-date objects", () => {
      expect(() => parseNullableDate(1714564800000)).toThrow(HermesControlPersistenceError);
      expect(() => parseNullableDate(true)).toThrow(HermesControlPersistenceError);
      expect(() => parseNullableDate({})).toThrow(HermesControlPersistenceError);
      expect(() => parseNullableDate([])).toThrow(HermesControlPersistenceError);
    });
  });

  describe("HERMES-PROD-A3.5E: Missing DB-Read Lifecycle Fields Fail-Closed (Section 3)", () => {
    it("fails closed when locked reserved operation has dispatchStartedAt = undefined", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store);
      const baseOp = store.operations.get("10000000-0000-4000-8000-000000000001")!;
      store.overrideLockedOperation = { ...baseOp, dispatchStartedAt: undefined };

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res.kind).toBe("control_unavailable");
      if (res.kind === "control_unavailable") {
        expect(res.reason).toBe("usage_control_unavailable");
      }
      expect(store.leases.size).toBe(0);
      expect(store.dailyUsage.size).toBe(0);
      expect(store.operations.get("10000000-0000-4000-8000-000000000001")?.status).toBe("reserved");
    });

    it("fails closed when locked reserved operation has completedAt = undefined", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store);
      const baseOp = store.operations.get("10000000-0000-4000-8000-000000000001")!;
      store.overrideLockedOperation = { ...baseOp, completedAt: undefined };

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res.kind).toBe("control_unavailable");
      if (res.kind === "control_unavailable") {
        expect(res.reason).toBe("usage_control_unavailable");
      }
      expect(store.leases.size).toBe(0);
      expect(store.dailyUsage.size).toBe(0);
      expect(store.operations.get("10000000-0000-4000-8000-000000000001")?.status).toBe("reserved");
    });

    it("fails closed when post-rollback requery finds provider_dispatch_started winner with dispatchStartedAt = undefined", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store);
      store.simulateOperationUniqueConflict = true;
      store.overrideRequeriedOperation = {
        id: "10000000-0000-4000-8000-000000000001",
        subjectId: "20000000-0000-4000-8000-000000000001",
        status: "provider_dispatch_started",
        platformCostStatus: "indeterminate",
        userQuotaStatus: "reserved",
        reservedExpiresAt: new Date(referenceNow.getTime() + 60000),
        dispatchStartedAt: undefined,
        completedAt: null,
        updatedAt: referenceNow,
      };

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res.kind).toBe("control_unavailable");
      if (res.kind === "control_unavailable") {
        expect(res.reason).toBe("usage_control_unavailable");
      }
      expect(store.leases.size).toBe(0);
      expect(store.dailyUsage.size).toBe(0);
      expect(store.operations.get("10000000-0000-4000-8000-000000000001")?.status).toBe("reserved");
    });

    it("fails closed when post-rollback requery finds terminal winner with completedAt = undefined", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store);
      store.simulateOperationUniqueConflict = true;
      store.overrideRequeriedOperation = {
        id: "10000000-0000-4000-8000-000000000001",
        subjectId: "20000000-0000-4000-8000-000000000001",
        status: "completed_success",
        platformCostStatus: "assumed_incurred",
        userQuotaStatus: "committed",
        reservedExpiresAt: new Date(referenceNow.getTime() + 60000),
        dispatchStartedAt: new Date(referenceNow.getTime() - 10000),
        completedAt: undefined,
        updatedAt: referenceNow,
      };

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res.kind).toBe("control_unavailable");
      if (res.kind === "control_unavailable") {
        expect(res.reason).toBe("usage_control_unavailable");
      }
      expect(store.leases.size).toBe(0);
      expect(store.dailyUsage.size).toBe(0);
      expect(store.operations.get("10000000-0000-4000-8000-000000000001")?.status).toBe("reserved");
    });
  });

  // ============================================================
  // HERMES-PROD-A3.5E: STRICT DAILY UPSERT RESULT PARSER & INTEGRITY
  // ============================================================

  describe("HERMES-PROD-A3.5E: parseDailyUsageResult Unit Tests", () => {
    it("accepts canonical string date format YYYY-MM-DD and positive integer call_count", () => {
      const result = parseDailyUsageResult([{ day_utc: "2026-05-01", call_count: 1 }], 100);
      expect(result.dayUtc).toBe("2026-05-01");
      expect(result.callCount).toBe(1);
    });

    it("accepts valid Date object and positive integer call_count", () => {
      const d = new Date("2026-05-01T00:00:00.000Z");
      const result = parseDailyUsageResult([{ day_utc: d, call_count: 5 }], 100);
      expect(result.dayUtc).toBe(d);
      expect(result.callCount).toBe(5);
    });

    it("accepts canonical string integer call_count without surrounding whitespace", () => {
      const result = parseDailyUsageResult([{ day_utc: "2026-05-01", call_count: "42" }], 100);
      expect(result.dayUtc).toBe("2026-05-01");
      expect(result.callCount).toBe(42);
    });

    it("accepts call_count equal to dailyProviderCallLimit boundary", () => {
      const result = parseDailyUsageResult([{ day_utc: "2026-05-01", call_count: 100 }], 100);
      expect(result.callCount).toBe(100);
    });

    it("throws persistence_inconsistency on empty array (exhaustion handled separately)", () => {
      expect(() => parseDailyUsageResult([], 100)).toThrow(HermesControlPersistenceError);
    });

    it("throws persistence_inconsistency on non-array input", () => {
      expect(() => parseDailyUsageResult(null, 100)).toThrow(HermesControlPersistenceError);
      expect(() => parseDailyUsageResult(undefined, 100)).toThrow(HermesControlPersistenceError);
      expect(() => parseDailyUsageResult("not-an-array", 100)).toThrow(HermesControlPersistenceError);
      expect(() => parseDailyUsageResult({ day_utc: "2026-05-01", call_count: 1 }, 100)).toThrow(HermesControlPersistenceError);
    });

    it("throws persistence_inconsistency on multi-row array", () => {
      expect(() =>
        parseDailyUsageResult(
          [
            { day_utc: "2026-05-01", call_count: 1 },
            { day_utc: "2026-05-01", call_count: 2 },
          ],
          100
        )
      ).toThrow(HermesControlPersistenceError);
    });

    it("throws persistence_inconsistency on non-record row element", () => {
      expect(() => parseDailyUsageResult([null], 100)).toThrow(HermesControlPersistenceError);
      expect(() => parseDailyUsageResult(["string-row"], 100)).toThrow(HermesControlPersistenceError);
      expect(() => parseDailyUsageResult([123], 100)).toThrow(HermesControlPersistenceError);
    });

    it("throws persistence_inconsistency on empty row record [{}]", () => {
      expect(() => parseDailyUsageResult([{}], 100)).toThrow(HermesControlPersistenceError);
    });

    it("throws persistence_inconsistency on missing day_utc", () => {
      expect(() => parseDailyUsageResult([{ call_count: 1 }], 100)).toThrow(HermesControlPersistenceError);
    });

    it("throws persistence_inconsistency on missing call_count", () => {
      expect(() => parseDailyUsageResult([{ day_utc: "2026-05-01" }], 100)).toThrow(HermesControlPersistenceError);
    });

    it("throws persistence_inconsistency on malformed day_utc representations", () => {
      expect(() => parseDailyUsageResult([{ day_utc: "invalid-date", call_count: 1 }], 100)).toThrow(HermesControlPersistenceError);
      expect(() => parseDailyUsageResult([{ day_utc: "2026/05/01", call_count: 1 }], 100)).toThrow(HermesControlPersistenceError);
      expect(() => parseDailyUsageResult([{ day_utc: " 2026-05-01 ", call_count: 1 }], 100)).toThrow(HermesControlPersistenceError);
      expect(() => parseDailyUsageResult([{ day_utc: new Date("invalid"), call_count: 1 }], 100)).toThrow(HermesControlPersistenceError);
      expect(() => parseDailyUsageResult([{ day_utc: 1714564800000, call_count: 1 }], 100)).toThrow(HermesControlPersistenceError);
      expect(() => parseDailyUsageResult([{ day_utc: null, call_count: 1 }], 100)).toThrow(HermesControlPersistenceError);
    });

    it("throws persistence_inconsistency on whitespace-padded call_count string", () => {
      expect(() => parseDailyUsageResult([{ day_utc: "2026-05-01", call_count: " 100 " }], 100)).toThrow(HermesControlPersistenceError);
      expect(() => parseDailyUsageResult([{ day_utc: "2026-05-01", call_count: " 1" }], 100)).toThrow(HermesControlPersistenceError);
      expect(() => parseDailyUsageResult([{ day_utc: "2026-05-01", call_count: "1 " }], 100)).toThrow(HermesControlPersistenceError);
    });

    it("throws persistence_inconsistency on non-numeric call_count string", () => {
      expect(() => parseDailyUsageResult([{ day_utc: "2026-05-01", call_count: "abc" }], 100)).toThrow(HermesControlPersistenceError);
      expect(() => parseDailyUsageResult([{ day_utc: "2026-05-01", call_count: "1.5" }], 100)).toThrow(HermesControlPersistenceError);
      expect(() => parseDailyUsageResult([{ day_utc: "2026-05-01", call_count: "-5" }], 100)).toThrow(HermesControlPersistenceError);
    });

    it("throws persistence_inconsistency on negative, fractional, or zero call_count numbers", () => {
      expect(() => parseDailyUsageResult([{ day_utc: "2026-05-01", call_count: 0 }], 100)).toThrow(HermesControlPersistenceError);
      expect(() => parseDailyUsageResult([{ day_utc: "2026-05-01", call_count: -1 }], 100)).toThrow(HermesControlPersistenceError);
      expect(() => parseDailyUsageResult([{ day_utc: "2026-05-01", call_count: 1.5 }], 100)).toThrow(HermesControlPersistenceError);
    });

    it("throws persistence_inconsistency on call_count exceeding dailyProviderCallLimit", () => {
      expect(() => parseDailyUsageResult([{ day_utc: "2026-05-01", call_count: 101 }], 100)).toThrow(HermesControlPersistenceError);
      expect(() => parseDailyUsageResult([{ day_utc: "2026-05-01", call_count: "101" }], 100)).toThrow(HermesControlPersistenceError);
    });
  });

  describe("HERMES-PROD-A3.5E: Daily Upsert Result Integration & Fail-Closed (Section 6)", () => {
    it("maps empty array result [] to daily_limit_exhausted, rolls back lease, operation remains reserved", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store);
      store.overrideDailyResult = [];

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res.kind).toBe("daily_limit_exhausted");
      expect(store.leases.size).toBe(0);
      expect(store.dailyUsage.size).toBe(0);
      const op = store.operations.get("10000000-0000-4000-8000-000000000001");
      expect(op?.status).toBe("reserved");
      expect(op?.dispatchStartedAt).toBeNull();
    });

    it("succeeds when daily upsert returns exactly one valid row", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store);
      store.overrideDailyResult = [{ day_utc: "2026-05-01", call_count: 1 }];

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res.kind).toBe("started");
      expect(store.leases.size).toBe(1);
      const op = store.operations.get("10000000-0000-4000-8000-000000000001");
      expect(op?.status).toBe("provider_dispatch_started");
      expect(op?.dispatchStartedAt).not.toBeNull();
    });

    it("fails closed to control_unavailable on non-array daily upsert result, rolls back lease", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store);
      store.overrideDailyResult = "not-an-array";

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res.kind).toBe("control_unavailable");
      if (res.kind === "control_unavailable") {
        expect(res.reason).toBe("usage_control_unavailable");
      }
      expect(store.leases.size).toBe(0);
      expect(store.operations.get("10000000-0000-4000-8000-000000000001")?.status).toBe("reserved");
    });

    it("fails closed to control_unavailable on two-row daily upsert result, rolls back lease", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store);
      store.overrideDailyResult = [
        { day_utc: "2026-05-01", call_count: 1 },
        { day_utc: "2026-05-01", call_count: 2 },
      ];

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res.kind).toBe("control_unavailable");
      if (res.kind === "control_unavailable") {
        expect(res.reason).toBe("usage_control_unavailable");
      }
      expect(store.leases.size).toBe(0);
      expect(store.operations.get("10000000-0000-4000-8000-000000000001")?.status).toBe("reserved");
    });

    it("fails closed to control_unavailable on [{}] empty row, rolls back lease", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store);
      store.overrideDailyResult = [{}];

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res.kind).toBe("control_unavailable");
      if (res.kind === "control_unavailable") {
        expect(res.reason).toBe("usage_control_unavailable");
      }
      expect(store.leases.size).toBe(0);
      expect(store.operations.get("10000000-0000-4000-8000-000000000001")?.status).toBe("reserved");
    });

    it("fails closed to control_unavailable on missing day_utc, rolls back lease", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store);
      store.overrideDailyResult = [{ call_count: 1 }];

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res.kind).toBe("control_unavailable");
      if (res.kind === "control_unavailable") {
        expect(res.reason).toBe("usage_control_unavailable");
      }
      expect(store.leases.size).toBe(0);
      expect(store.operations.get("10000000-0000-4000-8000-000000000001")?.status).toBe("reserved");
    });

    it("fails closed to control_unavailable on missing call_count, rolls back lease", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store);
      store.overrideDailyResult = [{ day_utc: "2026-05-01" }];

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res.kind).toBe("control_unavailable");
      if (res.kind === "control_unavailable") {
        expect(res.reason).toBe("usage_control_unavailable");
      }
      expect(store.leases.size).toBe(0);
      expect(store.operations.get("10000000-0000-4000-8000-000000000001")?.status).toBe("reserved");
    });

    it("fails closed to control_unavailable on invalid call_count string, rolls back lease", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store);
      store.overrideDailyResult = [{ day_utc: "2026-05-01", call_count: "abc" }];

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res.kind).toBe("control_unavailable");
      if (res.kind === "control_unavailable") {
        expect(res.reason).toBe("usage_control_unavailable");
      }
      expect(store.leases.size).toBe(0);
      expect(store.operations.get("10000000-0000-4000-8000-000000000001")?.status).toBe("reserved");
    });

    it("fails closed to control_unavailable on whitespace-padded call_count string, rolls back lease", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store);
      store.overrideDailyResult = [{ day_utc: "2026-05-01", call_count: " 1 " }];

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res.kind).toBe("control_unavailable");
      if (res.kind === "control_unavailable") {
        expect(res.reason).toBe("usage_control_unavailable");
      }
      expect(store.leases.size).toBe(0);
      expect(store.operations.get("10000000-0000-4000-8000-000000000001")?.status).toBe("reserved");
    });

    it("fails closed to control_unavailable on zero call_count, rolls back lease", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store);
      store.overrideDailyResult = [{ day_utc: "2026-05-01", call_count: 0 }];

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res.kind).toBe("control_unavailable");
      if (res.kind === "control_unavailable") {
        expect(res.reason).toBe("usage_control_unavailable");
      }
      expect(store.leases.size).toBe(0);
      expect(store.operations.get("10000000-0000-4000-8000-000000000001")?.status).toBe("reserved");
    });

    it("fails closed to control_unavailable on negative call_count, rolls back lease", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store);
      store.overrideDailyResult = [{ day_utc: "2026-05-01", call_count: -1 }];

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res.kind).toBe("control_unavailable");
      if (res.kind === "control_unavailable") {
        expect(res.reason).toBe("usage_control_unavailable");
      }
      expect(store.leases.size).toBe(0);
      expect(store.operations.get("10000000-0000-4000-8000-000000000001")?.status).toBe("reserved");
    });

    it("fails closed to control_unavailable on fractional call_count, rolls back lease", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store);
      store.overrideDailyResult = [{ day_utc: "2026-05-01", call_count: 1.5 }];

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res.kind).toBe("control_unavailable");
      if (res.kind === "control_unavailable") {
        expect(res.reason).toBe("usage_control_unavailable");
      }
      expect(store.leases.size).toBe(0);
      expect(store.operations.get("10000000-0000-4000-8000-000000000001")?.status).toBe("reserved");
    });

    it("fails closed to control_unavailable on call_count exceeding limit, rolls back lease", async () => {
      const store = createStatefulBoundaryStore();
      seedOperation(store);
      // canonicalLimits.dailyProviderCallLimit is 100; inject 101
      store.overrideDailyResult = [{ day_utc: "2026-05-01", call_count: 101 }];

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => referenceNow,
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res.kind).toBe("control_unavailable");
      if (res.kind === "control_unavailable") {
        expect(res.reason).toBe("usage_control_unavailable");
      }
      expect(store.leases.size).toBe(0);
      expect(store.operations.get("10000000-0000-4000-8000-000000000001")?.status).toBe("reserved");
    });
  });

  // ============================================================
  // HERMES-PROD-A3.5F: FRESH EXPIRY CHECK AT COMMIT BOUNDARY
  // ============================================================

  describe("HERMES-PROD-A3.5F: Temporal-Race Hardening & Fresh Pre-Commit Expiry", () => {
    it("preserves early expiry check before advisory lock and capacity work", async () => {
      const T = new Date("2026-05-01T12:00:00.000Z");
      const expiredAt = new Date("2026-05-01T11:59:00.000Z");

      const store = createStatefulBoundaryStore();
      seedOperation(store, { reservedExpiresAt: expiredAt });

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => T,
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res.kind).toBe("reservation_expired");
      if (res.kind === "reservation_expired") {
        expect(res.operationId).toBe("10000000-0000-4000-8000-000000000001");
        expect(res.reservedExpiresAt).toEqual(expiredAt);
      }
      expect(store.advisoryLockCalled).toBe(false);
      expect(store.leases.size).toBe(0);
      expect(store.dailyUsage.size).toBe(0);
    });

    it("wait-race: rolls back all economic mutations when reservation expires during lock wait before final transition", async () => {
      let callCount = 0;
      const T = new Date("2026-05-01T12:00:00.000Z");
      const T_plus_5 = new Date("2026-05-01T12:00:05.000Z");
      const T_plus_10 = new Date("2026-05-01T12:00:10.000Z");

      const store = createStatefulBoundaryStore();
      seedOperation(store, { reservedExpiresAt: T_plus_5 });

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => {
          callCount += 1;
          // Call 1: earlyNow = T (eligible, expires at T+5s)
          if (callCount === 1) {
            return T;
          }
          // Call 2: fresh transitionAt = T+10s (expired!)
          return T_plus_10;
        },
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res.kind).toBe("reservation_expired");
      if (res.kind === "reservation_expired") {
        expect(res.operationId).toBe("10000000-0000-4000-8000-000000000001");
        expect(res.reservedExpiresAt).toEqual(T_plus_5);
      }

      // Assert complete rollback: no lease, no daily usage, operation remains reserved
      expect(store.leases.size).toBe(0);
      expect(store.dailyUsage.size).toBe(0);
      const op = store.operations.get("10000000-0000-4000-8000-000000000001");
      expect(op?.status).toBe("reserved");
      expect(op?.dispatchStartedAt).toBeNull();
    });

    it("successful fresh clock: uses fresh boundary transition timestamp for persisted and returned lifecycle timestamps", async () => {
      let callCount = 0;
      const T = new Date("2026-05-01T12:00:00.000Z");
      const T_plus_2 = new Date("2026-05-01T12:00:02.000Z");
      const T_plus_30 = new Date("2026-05-01T12:00:30.000Z");

      const store = createStatefulBoundaryStore();
      seedOperation(store, { reservedExpiresAt: T_plus_30 });

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => {
          callCount += 1;
          if (callCount === 1) {
            return T;
          }
          return T_plus_2;
        },
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res.kind).toBe("started");
      if (res.kind === "started") {
        expect(res.dispatchStartedAt).toEqual(T_plus_2);
        expect(res.dispatchStartedAt).not.toEqual(T);
      }

      const op = store.operations.get("10000000-0000-4000-8000-000000000001");
      expect(op?.status).toBe("provider_dispatch_started");
      expect(op?.dispatchStartedAt).toEqual(T_plus_2);
      expect(op?.dispatchStartedAt).not.toEqual(T);
      expect(store.leases.size).toBe(1);
      expect(store.dailyUsage.get("2026-05-01::jurisprudence_interpretation")?.callCount).toBe(1);
    });

    it("clock failure after economic mutations: returns control_unavailable and rolls back lease and daily counter when clock returns invalid Date", async () => {
      let callCount = 0;
      const T = new Date("2026-05-01T12:00:00.000Z");
      const T_plus_30 = new Date("2026-05-01T12:00:30.000Z");

      const store = createStatefulBoundaryStore();
      seedOperation(store, { reservedExpiresAt: T_plus_30 });

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => {
          callCount += 1;
          if (callCount === 1) {
            return T;
          }
          return new Date("invalid-date");
        },
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res.kind).toBe("control_unavailable");
      if (res.kind === "control_unavailable") {
        expect(res.reason).toBe("usage_control_unavailable");
      }

      expect(store.leases.size).toBe(0);
      expect(store.dailyUsage.size).toBe(0);
      const op = store.operations.get("10000000-0000-4000-8000-000000000001");
      expect(op?.status).toBe("reserved");
      expect(op?.dispatchStartedAt).toBeNull();
    });

    it("clock failure after economic mutations: returns control_unavailable and rolls back lease and daily counter when clock throws", async () => {
      let callCount = 0;
      const T = new Date("2026-05-01T12:00:00.000Z");
      const T_plus_30 = new Date("2026-05-01T12:00:30.000Z");

      const store = createStatefulBoundaryStore();
      seedOperation(store, { reservedExpiresAt: T_plus_30 });

      const coordinator = new PostgresHermesProviderBoundaryCoordinator({
        roleRunner: store.roleRunner,
        now: () => {
          callCount += 1;
          if (callCount === 1) {
            return T;
          }
          throw new Error("injected clock failure at final transition");
        },
      });

      const res = await coordinator.beginProviderDispatch("10000000-0000-4000-8000-000000000001", canonicalLimits);
      expect(res.kind).toBe("control_unavailable");
      if (res.kind === "control_unavailable") {
        expect(res.reason).toBe("usage_control_unavailable");
      }

      expect(store.leases.size).toBe(0);
      expect(store.dailyUsage.size).toBe(0);
      const op = store.operations.get("10000000-0000-4000-8000-000000000001");
      expect(op?.status).toBe("reserved");
      expect(op?.dispatchStartedAt).toBeNull();
    });
  });
});
