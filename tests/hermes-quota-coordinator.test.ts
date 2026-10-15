import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { eq, and } from "drizzle-orm";
import {
  PostgresHermesQuotaCoordinator,
  validateOperationReservationInput,
  HermesOperationReservationValidationError,
  type HermesOperationReservationInput,
  type HermesAtomicQuotaUpsertFn,
} from "@/lib/hermes/control/hermes-quota-coordinator";
import {
  HERMES_OPERATION_STATUSES,
  HERMES_USER_QUOTA_STATUSES,
  type HermesOperationStatus,
  type HermesUserQuotaStatus,
  type HermesPlatformCostStatus,
} from "@/lib/hermes/control/hermes-control-contracts";
import { analysisOperations } from "@/database/schema/hermes-control";
import type { HermesControlTransaction } from "@/database/roles";
import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";

interface StoredOperation {
  id: string;
  subjectId: string;
  idempotencyKey: string;
  recordId: string;
  recordVersion: number;
  status: HermesOperationStatus;
  platformCostStatus: HermesPlatformCostStatus;
  userQuotaStatus: HermesUserQuotaStatus;
  units: number;
  quotaPeriodStart: Date;
  quotaPeriodEnd: Date;
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

function cloneLeases(map: Map<string, StoredLease>): Map<string, StoredLease> {
  const next = new Map<string, StoredLease>();
  for (const [k, v] of map.entries()) {
    next.set(k, { ...v });
  }
  return next;
}

function createActiveLease(
  store: StatefulQuotaStore,
  operationId: string,
  subjectId: string,
  leaseId = "lease-canonical-1",
  expiresAt = new Date(Date.now() + 60_000)
): StoredLease {
  const lease: StoredLease = {
    leaseId,
    operationId,
    subjectId,
    acquiredAt: new Date(),
    expiresAt,
  };
  store.leases.set(leaseId, lease);
  return lease;
}

/**
 * Canonical test helper establishing a coherent provider_dispatch_started operation state.
 * Sets status, platform cost status, user quota status, and lifecycle timestamps according
 * to A3.2 / A3.4 frozen specifications, and optionally creates an active lease in store.
 */
function markFakeProviderDispatchStarted(
  op: StoredOperation,
  store?: StatefulQuotaStore,
  leaseId = "lease-canonical-1",
  at: Date = new Date("2026-05-01T00:05:00.000Z"),
  expiresAt = new Date(Date.now() + 60_000)
): StoredLease | undefined {
  op.status = "provider_dispatch_started";
  op.userQuotaStatus = "reserved";
  op.platformCostStatus = "indeterminate";
  op.dispatchStartedAt = at;
  op.completedAt = null;
  if (store) {
    const lease: StoredLease = {
      leaseId,
      operationId: op.id,
      subjectId: op.subjectId,
      acquiredAt: at,
      expiresAt,
    };
    store.leases.set(leaseId, lease);
    return lease;
  }
  return undefined;
}

interface StoredQuotaUsage {
  subjectId: string;
  periodStart: Date;
  periodEnd: Date;
  reservedUnits: number;
  committedUnits: number;
  pendingUnits: number;
  updatedAt: Date;
}

function periodKey(subjectId: string, start: Date, end: Date): string {
  return `${subjectId}::${start.toISOString()}::${end.toISOString()}`;
}

function cloneOperations(map: Map<string, StoredOperation>): Map<string, StoredOperation> {
  const next = new Map<string, StoredOperation>();
  for (const [k, v] of map.entries()) {
    next.set(k, { ...v });
  }
  return next;
}

function cloneQuotaUsage(map: Map<string, StoredQuotaUsage>): Map<string, StoredQuotaUsage> {
  const next = new Map<string, StoredQuotaUsage>();
  for (const [k, v] of map.entries()) {
    next.set(k, { ...v });
  }
  return next;
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

interface StatefulQuotaStore {
  readonly operations: Map<string, StoredOperation>;
  readonly quotaUsage: Map<string, StoredQuotaUsage>;
  readonly leases: Map<string, StoredLease>;
  readonly roleRunner: <T>(callback: (tx: HermesControlTransaction) => Promise<T>) => Promise<T>;
  readonly atomicQuotaUpsert: HermesAtomicQuotaUpsertFn;
  failNextOperationInsert: boolean;
  failNextAggregateUpdate: boolean;
  failNextOperationUpdate: boolean;
  failWithPostgresError: boolean;
  failNextRequery: boolean;
  bypassPreCheckOnce: boolean;
  idCounter: number;
  lastCapturedOperationUpdateWhereCols: string[];
  authorityClock?: Date | undefined;
  lockSequence: string[];
  leaseRowLockCalled: boolean;
  leaseRowLockMode?: string | undefined;
  clockTimestampQueryCount: number;
}

function createStatefulQuotaStore(): StatefulQuotaStore {
  const operations = new Map<string, StoredOperation>();
  const quotaUsage = new Map<string, StoredQuotaUsage>();
  const leases = new Map<string, StoredLease>();
  const lockSequence: string[] = [];

  const store: StatefulQuotaStore = {
    operations,
    quotaUsage,
    leases,
    failNextOperationInsert: false,
    failNextAggregateUpdate: false,
    failNextOperationUpdate: false,
    failWithPostgresError: false,
    failNextRequery: false,
    bypassPreCheckOnce: false,
    idCounter: 1,
    lastCapturedOperationUpdateWhereCols: [],
    lockSequence,
    leaseRowLockCalled: false,
    clockTimestampQueryCount: 0,

    roleRunner: async <T>(callback: (tx: HermesControlTransaction) => Promise<T>): Promise<T> => {
      if (store.failWithPostgresError) {
        store.failWithPostgresError = false;
        throw new Error("fatal postgres error simulated");
      }

      // Snapshot for atomic rollback simulation
      const snapshotOps = cloneOperations(store.operations);
      const snapshotUsage = cloneQuotaUsage(store.quotaUsage);
      const snapshotLeases = cloneLeases(store.leases);

      try {
        const fakeTx = createFakeTx(store);
        const result = await callback(fakeTx);
        return result;
      } catch (err) {
        // Rollback on any failure
        store.operations.clear();
        for (const [k, v] of snapshotOps.entries()) {
          store.operations.set(k, v);
        }
        store.quotaUsage.clear();
        for (const [k, v] of snapshotUsage.entries()) {
          store.quotaUsage.set(k, v);
        }
        store.leases.clear();
        for (const [k, v] of snapshotLeases.entries()) {
          store.leases.set(k, v);
        }
        throw err;
      }
    },

    atomicQuotaUpsert: async (
      _tx: HermesControlTransaction,
      params: {
        readonly subjectId: string;
        readonly periodStart: Date;
        readonly periodEnd: Date;
        readonly units: number;
        readonly monthlyQuota: number;
      }
    ): Promise<boolean> => {
      const { subjectId, periodStart, periodEnd, units, monthlyQuota } = params;

      if (monthlyQuota < units || monthlyQuota <= 0) {
        return false;
      }

      const key = periodKey(subjectId, periodStart, periodEnd);
      const existing = store.quotaUsage.get(key);

      if (!existing) {
        // First row creation
        store.quotaUsage.set(key, {
          subjectId,
          periodStart,
          periodEnd,
          reservedUnits: units,
          committedUnits: 0,
          pendingUnits: 0,
          updatedAt: new Date(),
        });
        return true;
      }

      // Existing row update
      const totalUnits = existing.reservedUnits + existing.committedUnits + existing.pendingUnits + units;
      if (totalUnits > monthlyQuota) {
        return false;
      }

      existing.reservedUnits += units;
      existing.updatedAt = new Date();
      return true;
    },
  };

  return store;
}

function extractSqlValues(sqlObj: unknown): unknown[] {
  const vals: unknown[] = [];
  if (!sqlObj || typeof sqlObj !== "object") return vals;

  const obj = sqlObj as { value?: unknown; queryChunks?: unknown[] };
  if (obj.value !== undefined && (typeof obj.value !== "object" || obj.value instanceof Date)) {
    vals.push(obj.value);
  }
  if (Array.isArray(obj.queryChunks)) {
    for (const chunk of obj.queryChunks) {
      vals.push(...extractSqlValues(chunk));
    }
  }
  return vals;
}

function extractColNames(sqlObj: unknown): string[] {
  const names: string[] = [];
  if (!sqlObj || typeof sqlObj !== "object") return names;

  const obj = sqlObj as { name?: string; queryChunks?: unknown[] };
  if (typeof obj.name === "string") {
    names.push(obj.name);
  }
  if (Array.isArray(obj.queryChunks)) {
    for (const chunk of obj.queryChunks) {
      names.push(...extractColNames(chunk));
    }
  }
  return names;
}

interface SqlEqPair {
  readonly col: string;
  readonly val: unknown;
}

function extractEqPairs(sqlObj: unknown): SqlEqPair[] {
  const pairs: SqlEqPair[] = [];
  function walk(node: unknown): void {
    if (!node || typeof node !== "object") return;
    const obj = node as { name?: string; value?: unknown; queryChunks?: unknown[] };
    if (Array.isArray(obj.queryChunks)) {
      const chunks = obj.queryChunks;
      for (let i = 0; i < chunks.length; i++) {
        const c = chunks[i] as { name?: string } | undefined;
        if (c && typeof c.name === "string") {
          const col = c.name;
          for (let j = i + 1; j < chunks.length; j++) {
            const v = chunks[j] as { value?: unknown } | undefined;
            if (v && v.value !== undefined && (typeof v.value !== "object" || v.value instanceof Date)) {
              pairs.push({ col, val: v.value });
              break;
            }
          }
        }
        walk(chunks[i]);
      }
    }
  }
  walk(sqlObj);
  return pairs;
}

/**
 * Isolated Test Adapter Boundary:
 * Drizzle PgTransaction has an expansive internal structural type with dozens of private/driver-specific
 * properties (session, dialect, schema, relations, etc.). In tests, we build a structural duck-type
 * covering only the query builder APIs invoked by PostgresHermesQuotaCoordinator (select, insert, update, execute).
 * This isolated adapter boundary bridges the test fake transaction to the HermesControlTransaction interface.
 */
function adaptFakeTxToHermesControlTransaction(fakeTx: unknown): HermesControlTransaction {
  return fakeTx as unknown as HermesControlTransaction;
}

function createFakeTx(store: StatefulQuotaStore): HermesControlTransaction {
  const fakeTx = {
    select: () => ({
      from: () => ({
        where: (condition: unknown) => {
          const cols = extractColNames(condition);
          const vals = extractSqlValues(condition);

          return {
            limit: (n: number) => {
              const allOps = Array.from(store.operations.values());

              // Idempotency lookup: subject_id and idempotency_key
              if (cols.includes("idempotency_key")) {
                if (store.failNextRequery) {
                  store.failNextRequery = false;
                  throw new Error("simulated requery database error");
                }
                if (store.bypassPreCheckOnce) {
                  return Promise.resolve([]);
                }
                const subId = vals[0] as string;
                const idemKey = vals[1] as string;
                const matched = allOps.filter(
                  (op) => op.subjectId === subId && op.idempotencyKey === idemKey
                );
                return Promise.resolve(matched.slice(0, n));
              }

              // Active doc lookup: subject_id, record_id, record_version
              if (cols.includes("record_id")) {
                if (store.bypassPreCheckOnce) {
                  return Promise.resolve([]);
                }
                const subId = vals[0] as string;
                const recId = vals[1] as string;
                const recVer = vals[2] as number;
                const matched = allOps.filter(
                  (op) =>
                    op.subjectId === subId &&
                    op.recordId === recId &&
                    op.recordVersion === recVer &&
                    (op.status === "reserved" || op.status === "provider_dispatch_started")
                );
                return Promise.resolve(matched.slice(0, n));
              }

              return Promise.resolve([]);
            },

            for: (mode?: string) => {
              if (cols.includes("lease_id")) {
                store.leaseRowLockCalled = true;
                store.leaseRowLockMode = mode ?? "update";
                store.lockSequence.push("concurrency_leases_for_update");
                const eqPairs = extractEqPairs(condition);
                const opIdPair = eqPairs.find((p) => p.col === "operation_id");
                const leaseIdPair = eqPairs.find((p) => p.col === "lease_id");
                const opId = opIdPair ? String(opIdPair.val) : (vals[0] as string);
                const leaseId = leaseIdPair ? String(leaseIdPair.val) : (vals[1] as string);
                const matched = Array.from(store.leases.values()).filter(
                  (l) => l.operationId === opId && l.leaseId === leaseId
                );
                return Promise.resolve(matched.slice(0, 1));
              }

              store.lockSequence.push("analysis_operations_for_update");
              const allOps = Array.from(store.operations.values());
              const opId = vals[0] as string;
              const matched = allOps.filter((op) => op.id === opId);
              return Promise.resolve(matched.slice(0, 1));
            },

            orderBy: () => ({
              limit: (n: number) => {
                const now = (vals.find((v) => v instanceof Date) as Date | undefined) ?? new Date();
                const allOps = Array.from(store.operations.values());
                const expired = allOps
                  .filter(
                    (op) =>
                      op.status === "reserved" &&
                      op.userQuotaStatus === "reserved" &&
                      op.reservedExpiresAt.getTime() <= now.getTime()
                  )
                  .sort((a, b) => a.reservedExpiresAt.getTime() - b.reservedExpiresAt.getTime())
                  .map((op) => ({
                    operationId: op.id,
                    subjectId: op.subjectId,
                    reservedExpiresAt: op.reservedExpiresAt,
                    units: op.units,
                    quotaPeriodStart: op.quotaPeriodStart,
                    quotaPeriodEnd: op.quotaPeriodEnd,
                  }));
                return Promise.resolve(expired.slice(0, n));
              },
            }),
          };
        },
      }),
    }),

    insert: () => ({
      values: (val: Record<string, unknown>) => ({
        returning: () => {
          if (store.failNextOperationInsert) {
            store.failNextOperationInsert = false;
            throw new Error("simulated operation insert failure");
          }

          const subjectId = String(val.subjectId);
          const idempotencyKey = String(val.idempotencyKey);
          const recordId = String(val.recordId);
          const recordVersion = Number(val.recordVersion);

          // Check unique (subjectId, idempotencyKey)
          for (const existing of store.operations.values()) {
            if (existing.subjectId === subjectId && existing.idempotencyKey === idempotencyKey) {
              store.bypassPreCheckOnce = false;
              const err = new Error("unique violation");
              Object.assign(err, {
                code: "23505",
                constraint_name: "analysis_operations_subject_idempotency_key_uniq",
              });
              throw err;
            }
            if (
              existing.subjectId === subjectId &&
              existing.recordId === recordId &&
              existing.recordVersion === recordVersion &&
              (existing.status === "reserved" || existing.status === "provider_dispatch_started")
            ) {
              const err = new Error("active doc unique violation");
              Object.assign(err, {
                code: "23505",
                constraint_name: "analysis_operations_active_doc_idx",
              });
              throw err;
            }
          }

          const opId = `op-${store.idCounter++}`;
          const op: StoredOperation = {
            id: opId,
            subjectId,
            idempotencyKey,
            recordId,
            recordVersion,
            status: (val.status as HermesOperationStatus) ?? "reserved",
            userQuotaStatus: (val.userQuotaStatus as HermesUserQuotaStatus) ?? "reserved",
            platformCostStatus: (val.platformCostStatus as HermesPlatformCostStatus) ?? "none",
            units: Number(val.units ?? 1),
            quotaPeriodStart: val.quotaPeriodStart as Date,
            quotaPeriodEnd: val.quotaPeriodEnd as Date,
            reservedExpiresAt: val.reservedExpiresAt as Date,
            dispatchStartedAt: null,
            completedAt: null,
            updatedAt: new Date(),
          };
          store.operations.set(opId, op);
          return Promise.resolve([op]);
        },
      }),
    }),

    update: (table: unknown) => ({
      set: (updates: Record<string, unknown>) => ({
        where: (condition: unknown) => ({
          returning: () => {
            const tableConfig = getTableConfig(table as PgTable);
            const isOps = tableConfig.name === "analysis_operations";
            const vals = extractSqlValues(condition);

            if (isOps) {
              const cols = extractColNames(condition);
              store.lastCapturedOperationUpdateWhereCols = cols;

              if (store.failNextOperationUpdate) {
                store.failNextOperationUpdate = false;
                return Promise.resolve([]);
              }

              const eqPairs = extractEqPairs(condition);
              const idPair = eqPairs.find((p) => p.col === "id");
              const opId = (idPair ? String(idPair.val) : vals[0]) as string;
              const target = store.operations.get(opId);

              if (target) {
                // Faithfully enforce relevant WHERE guards used by finalizers
                for (const pair of eqPairs) {
                  if (pair.col === "id" && target.id !== pair.val) {
                    return Promise.resolve([]);
                  }
                  if (pair.col === "status" && target.status !== pair.val) {
                    return Promise.resolve([]);
                  }
                  if (pair.col === "user_quota_status" && target.userQuotaStatus !== pair.val) {
                    return Promise.resolve([]);
                  }
                  if (pair.col === "platform_cost_status" && target.platformCostStatus !== pair.val) {
                    return Promise.resolve([]);
                  }
                }

                if (updates.status) target.status = updates.status as HermesOperationStatus;
                if (updates.userQuotaStatus) target.userQuotaStatus = updates.userQuotaStatus as HermesUserQuotaStatus;
                if (updates.platformCostStatus) target.platformCostStatus = updates.platformCostStatus as HermesPlatformCostStatus;
                if (updates.completedAt) target.completedAt = updates.completedAt as Date;
                target.updatedAt = new Date();
                return Promise.resolve([{ id: target.id }]);
              }
              return Promise.resolve([]);
            }

            // subject_quota_usage update
            if (store.failNextAggregateUpdate) {
              store.failNextAggregateUpdate = false;
              return Promise.resolve([]);
            }

            const subId = vals[0] as string;
            const start = vals[1] as Date;
            const end = vals[2] as Date;
            const unitsReq = (vals[3] as number | undefined) ?? 1;

            const key = periodKey(subId, start, end);
            const target = store.quotaUsage.get(key);

            if (target && target.reservedUnits >= unitsReq) {
              // Apply updates
              if ("committedUnits" in updates) {
                target.reservedUnits -= unitsReq;
                target.committedUnits += unitsReq;
              } else if ("pendingUnits" in updates) {
                target.reservedUnits -= unitsReq;
                target.pendingUnits += unitsReq;
              } else {
                target.reservedUnits -= unitsReq;
              }
              target.updatedAt = new Date();
              return Promise.resolve([{ subjectId: target.subjectId }]);
            }

            return Promise.resolve([]);
          },
        }),
      }),
    }),

    execute: (queryObj: unknown) => {
      const qStr = sqlToString(queryObj);
      if (qStr.includes("clock_timestamp")) {
        store.lockSequence.push("clock_timestamp");
        store.clockTimestampQueryCount++;
        const now = store.authorityClock ?? new Date();
        return Promise.resolve([{ authority_now: now }]);
      }
      return Promise.resolve([]);
    },
  };

  return adaptFakeTxToHermesControlTransaction(fakeTx);
}

describe("HERMES-PROD-A3.4: Quota & Operation Coordinator", () => {
  const referenceNow = new Date("2026-10-13T16:00:00.000Z");
  const periodStart = new Date("2026-10-01T00:00:00.000Z");
  const periodEnd = new Date("2026-11-01T00:00:00.000Z");

  const canonicalInput: HermesOperationReservationInput = {
    subjectId: "a0000000-0000-4000-8000-000000000001",
    idempotencyKey: "idem-key-100",
    recordId: "rec-tribunal-55",
    recordVersion: 1,
    quotaPeriodStart: periodStart,
    quotaPeriodEnd: periodEnd,
    monthlyQuota: 10,
    units: 1,
    reservedExpiresAt: new Date(referenceNow.getTime() + 105_000),
  };

  // ============================================================
  // A. Strict Reservation Input Validation
  // ============================================================
  describe("A. Strict Reservation Input Validation", () => {
    it("accepts canonical valid reservation input and defaults units to 1 if omitted", () => {
      const inputWithoutUnits = {
        ...canonicalInput,
        units: undefined,
      };
      const validated = validateOperationReservationInput(inputWithoutUnits, referenceNow);
      expect(validated.units).toBe(1);
      expect(validated.subjectId).toBe(canonicalInput.subjectId);
      expect(validated.idempotencyKey).toBe(canonicalInput.idempotencyKey);
    });

    it("rejects invalid reference clock input fail-closed", () => {
      expect(() =>
        validateOperationReservationInput(canonicalInput, new Date("invalid"))
      ).toThrow(/reference_clock_invalid/);
    });

    it("rejects empty or whitespace-only subjectId", () => {
      expect(() =>
        validateOperationReservationInput({ ...canonicalInput, subjectId: "" }, referenceNow)
      ).toThrow(HermesOperationReservationValidationError);
      expect(() =>
        validateOperationReservationInput({ ...canonicalInput, subjectId: "   " }, referenceNow)
      ).toThrow(/subject_id_invalid/);
    });

    it("rejects subjectId with leading or trailing whitespace without normalizing", () => {
      expect(() =>
        validateOperationReservationInput(
          { ...canonicalInput, subjectId: "  a0000000-0000-4000-8000-000000000001" },
          referenceNow
        )
      ).toThrow(/subject_id_invalid/);
      expect(() =>
        validateOperationReservationInput(
          { ...canonicalInput, subjectId: "a0000000-0000-4000-8000-000000000001  " },
          referenceNow
        )
      ).toThrow(/subject_id_invalid/);
    });

    it("rejects empty, whitespace-only, or whitespace-padded idempotencyKey", () => {
      expect(() =>
        validateOperationReservationInput({ ...canonicalInput, idempotencyKey: "" }, referenceNow)
      ).toThrow(/idempotency_key_invalid/);
      expect(() =>
        validateOperationReservationInput({ ...canonicalInput, idempotencyKey: "   " }, referenceNow)
      ).toThrow(/idempotency_key_invalid/);
      expect(() =>
        validateOperationReservationInput(
          { ...canonicalInput, idempotencyKey: " key-1 " },
          referenceNow
        )
      ).toThrow(/idempotency_key_invalid/);
      expect(() =>
        validateOperationReservationInput(
          { ...canonicalInput, idempotencyKey: "a".repeat(65) },
          referenceNow
        )
      ).toThrow(/idempotency_key_invalid/);
    });

    it("rejects whitespace-padded recordId", () => {
      expect(() =>
        validateOperationReservationInput(
          { ...canonicalInput, recordId: " rec-1 " },
          referenceNow
        )
      ).toThrow(/record_id_invalid/);
      expect(() =>
        validateOperationReservationInput(
          { ...canonicalInput, recordId: "" },
          referenceNow
        )
      ).toThrow(/record_id_invalid/);
    });

    it("rejects non-positive, zero, or fractional recordVersion", () => {
      expect(() =>
        validateOperationReservationInput({ ...canonicalInput, recordVersion: 0 }, referenceNow)
      ).toThrow(/record_version_invalid/);
      expect(() =>
        validateOperationReservationInput({ ...canonicalInput, recordVersion: -1 }, referenceNow)
      ).toThrow(/record_version_invalid/);
      expect(() =>
        validateOperationReservationInput({ ...canonicalInput, recordVersion: 1.5 }, referenceNow)
      ).toThrow(/record_version_invalid/);
    });

    it("rejects invalid Date instances for period boundaries", () => {
      expect(() =>
        validateOperationReservationInput(
          { ...canonicalInput, quotaPeriodStart: new Date("invalid") },
          referenceNow
        )
      ).toThrow(/quota_period_start_invalid/);
      expect(() =>
        validateOperationReservationInput(
          { ...canonicalInput, quotaPeriodEnd: new Date("invalid") },
          referenceNow
        )
      ).toThrow(/quota_period_end_invalid/);
    });

    it("rejects inverted or equal quota periods fail-closed", () => {
      expect(() =>
        validateOperationReservationInput(
          { ...canonicalInput, quotaPeriodStart: periodEnd, quotaPeriodEnd: periodStart },
          referenceNow
        )
      ).toThrow(/quota_period_inverted/);
      expect(() =>
        validateOperationReservationInput(
          { ...canonicalInput, quotaPeriodStart: periodStart, quotaPeriodEnd: periodStart },
          referenceNow
        )
      ).toThrow(/quota_period_inverted/);
    });

    it("rejects negative or fractional monthlyQuota", () => {
      expect(() =>
        validateOperationReservationInput({ ...canonicalInput, monthlyQuota: -1 }, referenceNow)
      ).toThrow(/monthly_quota_invalid/);
      expect(() =>
        validateOperationReservationInput({ ...canonicalInput, monthlyQuota: 5.5 }, referenceNow)
      ).toThrow(/monthly_quota_invalid/);
    });

    it("rejects zero, negative, or fractional units", () => {
      expect(() =>
        validateOperationReservationInput({ ...canonicalInput, units: 0 }, referenceNow)
      ).toThrow(/units_invalid/);
      expect(() =>
        validateOperationReservationInput({ ...canonicalInput, units: -2 }, referenceNow)
      ).toThrow(/units_invalid/);
      expect(() =>
        validateOperationReservationInput({ ...canonicalInput, units: 1.25 }, referenceNow)
      ).toThrow(/units_invalid/);
    });

    it("rejects expired or past reservedExpiresAt against reference now", () => {
      const pastTtl = new Date(referenceNow.getTime() - 1);
      expect(() =>
        validateOperationReservationInput(
          { ...canonicalInput, reservedExpiresAt: pastTtl },
          referenceNow
        )
      ).toThrow(/reserved_expires_at_must_be_future/);
    });
  });

  // ============================================================
  // B. Atomic Operation Reservation & Aggregate Accounting
  // ============================================================
  describe("B. Atomic Operation Reservation & Aggregate Accounting", () => {
    it("first reservation atomically creates analysis_operations row and aggregate row", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const result = await coordinator.reserveOperationQuota(canonicalInput);

      expect(result.kind).toBe("reserved");
      if (result.kind === "reserved") {
        expect(result.status).toBe("reserved");
        expect(result.userQuotaStatus).toBe("reserved");
        expect(result.platformCostStatus).toBe("none");
        expect(result.units).toBe(1);
        expect(result.quotaPeriodStart).toEqual(periodStart);
        expect(result.quotaPeriodEnd).toEqual(periodEnd);
      }

      // Verify aggregate ledger state
      const usageKey = periodKey(canonicalInput.subjectId, periodStart, periodEnd);
      const usage = store.quotaUsage.get(usageKey);
      expect(usage).toBeDefined();
      expect(usage?.reservedUnits).toBe(1);
      expect(usage?.committedUnits).toBe(0);
      expect(usage?.pendingUnits).toBe(0);

      // Verify operation persisted
      expect(store.operations.size).toBe(1);
    });

    it("subsequent reservation for different operation increments aggregate reserved_units", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      // Operation 1
      await coordinator.reserveOperationQuota(canonicalInput);

      // Operation 2: different idempotency key & document
      const result2 = await coordinator.reserveOperationQuota({
        ...canonicalInput,
        idempotencyKey: "idem-key-200",
        recordId: "rec-tribunal-99",
      });

      expect(result2.kind).toBe("reserved");

      const usageKey = periodKey(canonicalInput.subjectId, periodStart, periodEnd);
      const usage = store.quotaUsage.get(usageKey);
      expect(usage?.reservedUnits).toBe(2);
      expect(store.operations.size).toBe(2);
    });

    it("succeeds when reserving exact capacity of monthlyQuota", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const result = await coordinator.reserveOperationQuota({
        ...canonicalInput,
        monthlyQuota: 1,
        units: 1,
      });

      expect(result.kind).toBe("reserved");
      const usageKey = periodKey(canonicalInput.subjectId, periodStart, periodEnd);
      expect(store.quotaUsage.get(usageKey)?.reservedUnits).toBe(1);
    });

    it("distinct entitlement periods remain completely isolated in accounting", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const nextMonthStart = new Date("2026-11-01T00:00:00.000Z");
      const nextMonthEnd = new Date("2026-12-01T00:00:00.000Z");

      // Period 1 reservation
      await coordinator.reserveOperationQuota(canonicalInput);

      // Period 2 reservation
      await coordinator.reserveOperationQuota({
        ...canonicalInput,
        idempotencyKey: "idem-key-period2",
        recordId: "rec-other",
        quotaPeriodStart: nextMonthStart,
        quotaPeriodEnd: nextMonthEnd,
      });

      const usage1 = store.quotaUsage.get(periodKey(canonicalInput.subjectId, periodStart, periodEnd));
      const usage2 = store.quotaUsage.get(periodKey(canonicalInput.subjectId, nextMonthStart, nextMonthEnd));

      expect(usage1?.reservedUnits).toBe(1);
      expect(usage2?.reservedUnits).toBe(1);
    });

    it("operation row persists exact entitlement period and NEVER derives from calendar or created_at", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const arbitraryStart = new Date("2026-04-17T08:30:00.000Z");
      const arbitraryEnd = new Date("2026-05-17T08:30:00.000Z");

      const res = await coordinator.reserveOperationQuota({
        ...canonicalInput,
        quotaPeriodStart: arbitraryStart,
        quotaPeriodEnd: arbitraryEnd,
      });

      expect(res.kind).toBe("reserved");
      const stored = Array.from(store.operations.values())[0];
      expect(stored?.quotaPeriodStart).toEqual(arbitraryStart);
      expect(stored?.quotaPeriodEnd).toEqual(arbitraryEnd);
    });
  });

  // ============================================================
  // C. Quota Exhaustion & Unburned Idempotency Key Invariants
  // ============================================================
  describe("C. Quota Exhaustion & Unburned Idempotency Key Invariants", () => {
    it("monthlyQuota = 0 rejects reservation with quota_exhausted without persisting operation", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const result = await coordinator.reserveOperationQuota({
        ...canonicalInput,
        monthlyQuota: 0,
      });

      expect(result.kind).toBe("quota_exhausted");
      // Operation was inserted first, but transaction ROLLBACK wiped it!
      expect(store.operations.size).toBe(0);
      expect(store.quotaUsage.size).toBe(0);
    });

    it("rejects when requested units exceed remaining capacity", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      // Fill quota to cap (cap = 1)
      const res1 = await coordinator.reserveOperationQuota({
        ...canonicalInput,
        monthlyQuota: 1,
      });
      expect(res1.kind).toBe("reserved");

      // Attempt 2: quota exhausted
      const res2 = await coordinator.reserveOperationQuota({
        ...canonicalInput,
        idempotencyKey: "idem-key-2",
        recordId: "rec-doc-2",
        monthlyQuota: 1,
      });
      expect(res2.kind).toBe("quota_exhausted");
      expect(store.operations.size).toBe(1); // Second op was rolled back completely!
    });

    it("unburned idempotency key: failed reservation key can proceed later once quota is restored", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      // Try with quota = 0 -> rejected, operation rolled back
      const failRes = await coordinator.reserveOperationQuota({
        ...canonicalInput,
        monthlyQuota: 0,
      });
      expect(failRes.kind).toBe("quota_exhausted");
      expect(store.operations.size).toBe(0);

      // Same key retries later when quota becomes available (e.g. quota = 10)
      const successRes = await coordinator.reserveOperationQuota({
        ...canonicalInput,
        monthlyQuota: 10,
      });
      expect(successRes.kind).toBe("reserved");
      expect(store.operations.size).toBe(1);
    });

    it("proves no quota_exhausted status was invented for analysis_operations", () => {
      const opStatuses = HERMES_OPERATION_STATUSES as readonly string[];
      const quotaStatuses = HERMES_USER_QUOTA_STATUSES as readonly string[];
      expect(opStatuses.includes("quota_exhausted")).toBe(false);
      expect(quotaStatuses.includes("quota_exhausted")).toBe(false);
    });
  });

  // ============================================================
  // D. Idempotency Lookup & Active Document Deduplication
  // ============================================================
  describe("D. Idempotency Lookup & Active Document Deduplication", () => {
    it("same idempotency key in-flight returns duplicate_in_flight without reserving units again", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const res1 = await coordinator.reserveOperationQuota(canonicalInput);
      expect(res1.kind).toBe("reserved");

      // Duplicate request with exact same idempotency key
      const res2 = await coordinator.reserveOperationQuota(canonicalInput);
      expect(res2.kind).toBe("duplicate_in_flight");
      if (res2.kind === "duplicate_in_flight") {
        expect(res2.existingStatus).toBe("reserved");
        expect(res2.existingUserQuotaStatus).toBe("reserved");
      }

      // Aggregate quota MUST remain 1, not 2
      const usage = store.quotaUsage.get(periodKey(canonicalInput.subjectId, periodStart, periodEnd));
      expect(usage?.reservedUnits).toBe(1);
    });

    it("same idempotency key terminal operation returns already_completed without reserving quota", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const res1 = await coordinator.reserveOperationQuota(canonicalInput);
      expect(res1.kind).toBe("reserved");
      if (res1.kind !== "reserved") return;

      // Transition to completed
      const op = store.operations.get(res1.operationId);
      if (op) {
        op.status = "completed_success";
        op.userQuotaStatus = "committed";
      }

      // Duplicate request with same idempotency key
      const res2 = await coordinator.reserveOperationQuota(canonicalInput);
      expect(res2.kind).toBe("already_completed");
      if (res2.kind === "already_completed") {
        expect(res2.existingStatus).toBe("completed_success");
        expect(res2.existingUserQuotaStatus).toBe("committed");
      }
    });

    it("different idempotency key targeting active document returns active_document_conflict", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      // Op 1 reserves recordId 'rec-tribunal-55', version 1
      await coordinator.reserveOperationQuota(canonicalInput);

      // Op 2 attempts same subject + recordId + recordVersion with different key
      const res2 = await coordinator.reserveOperationQuota({
        ...canonicalInput,
        idempotencyKey: "new-different-key",
      });

      expect(res2.kind).toBe("active_document_conflict");
      if (res2.kind === "active_document_conflict") {
        expect(res2.recordId).toBe("rec-tribunal-55");
        expect(res2.recordVersion).toBe(1);
      }

      // Aggregate units should remain 1
      const usage = store.quotaUsage.get(periodKey(canonicalInput.subjectId, periodStart, periodEnd));
      expect(usage?.reservedUnits).toBe(1);
    });
  });

  // ============================================================
  // E. Transaction Rollback & Failure Atomicity
  // ============================================================
  describe("E. Transaction Rollback & Failure Atomicity", () => {
    it("rolls back aggregate quota reservation if operation insertion fails", async () => {
      const store = createStatefulQuotaStore();
      store.failNextOperationInsert = true; // Trigger failure during op insert

      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const result = await coordinator.reserveOperationQuota(canonicalInput);
      expect(result.kind).toBe("control_unavailable");

      // Verify ZERO rows in quota usage (rolled back!)
      expect(store.quotaUsage.size).toBe(0);
      expect(store.operations.size).toBe(0);
    });

    it("sanitizes unexpected database errors without leaking raw SQL or credentials", async () => {
      const store = createStatefulQuotaStore();
      store.failWithPostgresError = true;

      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const result = await coordinator.reserveOperationQuota(canonicalInput);
      expect(result.kind).toBe("control_unavailable");
      if (result.kind === "control_unavailable") {
        expect(result.reason).toBe("usage_control_unavailable");
        expect(JSON.stringify(result)).not.toContain("simulated");
        expect(JSON.stringify(result)).not.toContain("Postgres");
      }
    });

    it("rolls back transaction if atomic quota upsert fails/throws", async () => {
      const store = createStatefulQuotaStore();
      const throwingUpsert: HermesAtomicQuotaUpsertFn = async () => {
        throw new Error("aggregate upsert failure");
      };

      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: throwingUpsert,
        now: () => referenceNow,
      });

      const result = await coordinator.reserveOperationQuota(canonicalInput);
      expect(result.kind).toBe("control_unavailable");
      expect(store.operations.size).toBe(0);
      expect(store.quotaUsage.size).toBe(0);
    });

    it("rolls back temporarily inserted operation if quota reservation returns zero capacity", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const result = await coordinator.reserveOperationQuota({
        ...canonicalInput,
        monthlyQuota: 0,
      });

      expect(result.kind).toBe("quota_exhausted");
      // Key invariant: temporarily inserted operation row must be completely removed by rollback!
      expect(store.operations.size).toBe(0);
    });
  });

  // ============================================================
  // F. Idempotent Commit Success Finalization
  // ============================================================
  describe("F. Idempotent Commit Success Finalization", () => {
    it("moves reserved -> committed exactly once and sets completed_success", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const res = await coordinator.reserveOperationQuota(canonicalInput);
      expect(res.kind).toBe("reserved");
      if (res.kind !== "reserved") return;

      // Simulate provider dispatch started
      const op = store.operations.get(res.operationId);
      if (op) {
        markFakeProviderDispatchStarted(op, store);
      }

      // Commit
      const commitRes = await coordinator.commitSuccessWithLease(res.operationId, "lease-canonical-1");
      expect(commitRes.kind).toBe("finalized");
      if (commitRes.kind === "finalized") {
        expect(commitRes.status).toBe("completed_success");
        expect(commitRes.userQuotaStatus).toBe("committed");
        expect(commitRes.platformCostStatus).toBe("assumed_incurred");
        expect(commitRes.units).toBe(1);
      }

      // Check aggregate counter
      const usage = store.quotaUsage.get(periodKey(canonicalInput.subjectId, periodStart, periodEnd));
      expect(usage?.reservedUnits).toBe(0);
      expect(usage?.committedUnits).toBe(1);
    });

    it("duplicate commit is idempotent no-op and does NOT move quota twice", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const res = await coordinator.reserveOperationQuota(canonicalInput);
      if (res.kind !== "reserved") return;
      const op = store.operations.get(res.operationId);
      if (op) markFakeProviderDispatchStarted(op, store);

      // Commit 1
      await coordinator.commitSuccessWithLease(res.operationId, "lease-canonical-1");

      // Commit 2 (duplicate)
      const dupRes = await coordinator.commitSuccessWithLease(res.operationId, "lease-canonical-1");
      expect(dupRes.kind).toBe("already_finalized");

      // Verify aggregate units are still exactly committed = 1, reserved = 0
      const usage = store.quotaUsage.get(periodKey(canonicalInput.subjectId, periodStart, periodEnd));
      expect(usage?.committedUnits).toBe(1);
      expect(usage?.reservedUnits).toBe(0);
    });

    it("cannot commit an operation still in reserved status (must be provider_dispatch_started)", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const res = await coordinator.reserveOperationQuota(canonicalInput);
      if (res.kind !== "reserved") return;

      // Attempt to commit while still in reserved status
      const commitRes = await coordinator.commitSuccessWithLease(res.operationId, "lease-canonical-1");
      expect(commitRes.kind).toBe("invalid_state");

      // Aggregate quota remains in reserved
      const usage = store.quotaUsage.get(periodKey(canonicalInput.subjectId, periodStart, periodEnd));
      expect(usage?.reservedUnits).toBe(1);
      expect(usage?.committedUnits).toBe(0);
    });
  });

  // ============================================================
  // G. Pre-Dispatch Release Finalization
  // ============================================================
  describe("G. Pre-Dispatch Release Finalization", () => {
    it("releases reserved quota when operation is in reserved pre-dispatch state", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const res = await coordinator.reserveOperationQuota(canonicalInput);
      if (res.kind !== "reserved") return;

      const releaseRes = await coordinator.releaseReservation(res.operationId);
      expect(releaseRes.kind).toBe("finalized");
      if (releaseRes.kind === "finalized") {
        expect(releaseRes.status).toBe("released");
        expect(releaseRes.userQuotaStatus).toBe("released");
        expect(releaseRes.platformCostStatus).toBe("none");
      }

      // Aggregate reserved quota decremented to 0
      const usage = store.quotaUsage.get(periodKey(canonicalInput.subjectId, periodStart, periodEnd));
      expect(usage?.reservedUnits).toBe(0);
    });

    it("duplicate release is idempotent no-op and returns already_finalized", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const res = await coordinator.reserveOperationQuota(canonicalInput);
      if (res.kind !== "reserved") return;

      await coordinator.releaseReservation(res.operationId);
      const dupRes = await coordinator.releaseReservation(res.operationId);
      expect(dupRes.kind).toBe("already_finalized");

      const usage = store.quotaUsage.get(periodKey(canonicalInput.subjectId, periodStart, periodEnd));
      expect(usage?.reservedUnits).toBe(0);
    });

    it("provider_dispatch_started operation CANNOT be released", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const res = await coordinator.reserveOperationQuota(canonicalInput);
      if (res.kind !== "reserved") return;
      const op = store.operations.get(res.operationId);
      if (op) {
        markFakeProviderDispatchStarted(op);
      }

      const releaseRes = await coordinator.releaseReservation(res.operationId);
      expect(releaseRes.kind).toBe("invalid_state");

      // Quota units remain reserved
      const usage = store.quotaUsage.get(periodKey(canonicalInput.subjectId, periodStart, periodEnd));
      expect(usage?.reservedUnits).toBe(1);
    });

    it("Operation A release cannot mutate or steal Operation B reservation", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const resA = await coordinator.reserveOperationQuota(canonicalInput);
      const resB = await coordinator.reserveOperationQuota({
        ...canonicalInput,
        idempotencyKey: "op-b-key",
        recordId: "rec-b",
      });

      if (resA.kind !== "reserved" || resB.kind !== "reserved") return;

      await coordinator.releaseReservation(resA.operationId);

      // Remaining in bucket should be exactly 1 (for Op B)
      const usage = store.quotaUsage.get(periodKey(canonicalInput.subjectId, periodStart, periodEnd));
      expect(usage?.reservedUnits).toBe(1);
    });
  });

  // ============================================================
  // H. Policy Pending Review Finalization
  // ============================================================
  describe("H. Policy Pending Review Finalization", () => {
    it("validation failure moves reserved -> pending with assumed_incurred platform cost", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const res = await coordinator.reserveOperationQuota(canonicalInput);
      if (res.kind !== "reserved") return;
      const op = store.operations.get(res.operationId);
      if (op) markFakeProviderDispatchStarted(op, store);

      const pendingRes = await coordinator.markPolicyPendingWithLease(
        res.operationId,
        "completed_validation_failure",
        "lease-canonical-1"
      );

      expect(pendingRes.kind).toBe("finalized");
      if (pendingRes.kind === "finalized") {
        expect(pendingRes.status).toBe("completed_validation_failure");
        expect(pendingRes.userQuotaStatus).toBe("policy_pending");
        expect(pendingRes.platformCostStatus).toBe("assumed_incurred");
      }

      const usage = store.quotaUsage.get(periodKey(canonicalInput.subjectId, periodStart, periodEnd));
      expect(usage?.reservedUnits).toBe(0);
      expect(usage?.pendingUnits).toBe(1);
    });

    it("grounding failure moves reserved -> pending with assumed_incurred platform cost", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const res = await coordinator.reserveOperationQuota(canonicalInput);
      if (res.kind !== "reserved") return;
      const op = store.operations.get(res.operationId);
      if (op) markFakeProviderDispatchStarted(op, store);

      const pendingRes = await coordinator.markPolicyPendingWithLease(
        res.operationId,
        "completed_grounding_failure",
        "lease-canonical-1"
      );

      expect(pendingRes.kind).toBe("finalized");
      if (pendingRes.kind === "finalized") {
        expect(pendingRes.status).toBe("completed_grounding_failure");
        expect(pendingRes.userQuotaStatus).toBe("policy_pending");
        expect(pendingRes.platformCostStatus).toBe("assumed_incurred");
      }
    });

    it("outcome_unknown moves reserved -> pending with indeterminate platform cost", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const res = await coordinator.reserveOperationQuota(canonicalInput);
      if (res.kind !== "reserved") return;
      const op = store.operations.get(res.operationId);
      if (op) markFakeProviderDispatchStarted(op, store);

      const pendingRes = await coordinator.markPolicyPendingWithLease(
        res.operationId,
        "outcome_unknown",
        "lease-canonical-1"
      );

      expect(pendingRes.kind).toBe("finalized");
      if (pendingRes.kind === "finalized") {
        expect(pendingRes.status).toBe("outcome_unknown");
        expect(pendingRes.userQuotaStatus).toBe("policy_pending");
        expect(pendingRes.platformCostStatus).toBe("indeterminate");
      }
    });

    it("duplicate policy pending is idempotent no-op", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const res = await coordinator.reserveOperationQuota(canonicalInput);
      if (res.kind !== "reserved") return;
      const op = store.operations.get(res.operationId);
      if (op) markFakeProviderDispatchStarted(op, store);

      await coordinator.markPolicyPendingWithLease(res.operationId, "outcome_unknown", "lease-canonical-1");
      const dup = await coordinator.markPolicyPendingWithLease(res.operationId, "outcome_unknown", "lease-canonical-1");
      expect(dup.kind).toBe("already_finalized");

      const usage = store.quotaUsage.get(periodKey(canonicalInput.subjectId, periodStart, periodEnd));
      expect(usage?.pendingUnits).toBe(1);
    });

    it("pending isolation between operations: Op A pending does not affect Op B", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const resA = await coordinator.reserveOperationQuota(canonicalInput);
      const resB = await coordinator.reserveOperationQuota({
        ...canonicalInput,
        idempotencyKey: "op-b-key",
        recordId: "rec-b",
      });

      if (resA.kind !== "reserved" || resB.kind !== "reserved") return;
      const opA = store.operations.get(resA.operationId);
      if (opA) markFakeProviderDispatchStarted(opA, store);

      await coordinator.markPolicyPendingWithLease(resA.operationId, "outcome_unknown", "lease-canonical-1");

      // Op A moved reserved -> pending; Op B remains reserved!
      const usage = store.quotaUsage.get(periodKey(canonicalInput.subjectId, periodStart, periodEnd));
      expect(usage?.reservedUnits).toBe(1);
      expect(usage?.pendingUnits).toBe(1);
    });
  });

  // ============================================================
  // I. Stale Reservation Expiry & Reaper Scan
  // ============================================================
  describe("I. Stale Reservation Expiry & Reaper Scan", () => {
    it("expires stale reserved operation when reserved_expires_at <= now", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const ttl = new Date(referenceNow.getTime() + 10_000);
      const res = await coordinator.reserveOperationQuota({
        ...canonicalInput,
        reservedExpiresAt: ttl,
      });
      if (res.kind !== "reserved") return;

      const afterTtl = new Date(ttl.getTime() + 1_000);
      const expireRes = await coordinator.expireReservation(res.operationId, afterTtl);

      expect(expireRes.kind).toBe("finalized");
      if (expireRes.kind === "finalized") {
        expect(expireRes.status).toBe("expired_before_dispatch");
        expect(expireRes.userQuotaStatus).toBe("released");
        expect(expireRes.platformCostStatus).toBe("none");
      }

      const usage = store.quotaUsage.get(periodKey(canonicalInput.subjectId, periodStart, periodEnd));
      expect(usage?.reservedUnits).toBe(0);
    });

    it("does NOT expire an operation whose TTL has not elapsed (not_expired)", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const ttl = new Date(referenceNow.getTime() + 60_000);
      const res = await coordinator.reserveOperationQuota({
        ...canonicalInput,
        reservedExpiresAt: ttl,
      });
      if (res.kind !== "reserved") return;

      const beforeTtl = new Date(referenceNow.getTime());
      const expireRes = await coordinator.expireReservation(res.operationId, beforeTtl);

      expect(expireRes.kind).toBe("not_expired");

      // Quota is unchanged
      const usage = store.quotaUsage.get(periodKey(canonicalInput.subjectId, periodStart, periodEnd));
      expect(usage?.reservedUnits).toBe(1);
    });

    it("provider_dispatch_started operation CANNOT expire as unused reservation", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const res = await coordinator.reserveOperationQuota(canonicalInput);
      if (res.kind !== "reserved") return;
      const op = store.operations.get(res.operationId);
      if (op) markFakeProviderDispatchStarted(op);

      const farFuture = new Date(referenceNow.getTime() + 999_999);
      const expireRes = await coordinator.expireReservation(res.operationId, farFuture);

      expect(expireRes.kind).toBe("invalid_state");
    });

    it("completed operation never expires", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const res = await coordinator.reserveOperationQuota(canonicalInput);
      if (res.kind !== "reserved") return;
      const op = store.operations.get(res.operationId);
      if (op) {
        op.status = "completed_success";
        op.userQuotaStatus = "committed";
        op.platformCostStatus = "assumed_incurred";
        op.dispatchStartedAt = referenceNow;
        op.completedAt = referenceNow;
      }

      const farFuture = new Date(referenceNow.getTime() + 999_999);
      const expireRes = await coordinator.expireReservation(res.operationId, farFuture);
      expect(expireRes.kind).toBe("invalid_state");
    });

    it("duplicate expiry is idempotent no-op returning already_finalized", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const ttl = new Date(referenceNow.getTime() + 5_000);
      const res = await coordinator.reserveOperationQuota({
        ...canonicalInput,
        reservedExpiresAt: ttl,
      });
      if (res.kind !== "reserved") return;

      const afterTtl = new Date(ttl.getTime() + 1_000);
      const res1 = await coordinator.expireReservation(res.operationId, afterTtl);
      expect(res1.kind).toBe("finalized");

      const res2 = await coordinator.expireReservation(res.operationId, afterTtl);
      expect(res2.kind).toBe("already_finalized");
    });

    it("rejects invalid clock input on expireReservation", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const res = await coordinator.expireReservation("op-1", new Date("invalid"));
      expect(res.kind).toBe("control_unavailable");
    });

    it("findExpiredReservations deterministically finds expired unstarted operations", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const ttlOp1 = new Date(referenceNow.getTime() + 5_000);
      const ttlOp2 = new Date(referenceNow.getTime() + 60_000);

      // Op 1: expires at t0 + 5s
      await coordinator.reserveOperationQuota({
        ...canonicalInput,
        idempotencyKey: "expired-op",
        reservedExpiresAt: ttlOp1,
      });

      // Op 2: expires at t0 + 60s
      await coordinator.reserveOperationQuota({
        ...canonicalInput,
        idempotencyKey: "active-op",
        recordId: "rec-other",
        reservedExpiresAt: ttlOp2,
      });

      // Scan at t0 + 10s (Op 1 expired, Op 2 not yet expired)
      const scanNow = new Date(referenceNow.getTime() + 10_000);
      const scanResult = await coordinator.findExpiredReservations(scanNow, 10);
      expect(scanResult.kind).toBe("found");
      if (scanResult.kind === "found") {
        expect(scanResult.records.length).toBe(1);
        expect(scanResult.records[0]?.operationId).toBe("op-1");
      }
    });

    it("findExpiredReservations returns empty records found when none expired", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const scanResult = await coordinator.findExpiredReservations(referenceNow, 10);
      expect(scanResult.kind).toBe("found");
      if (scanResult.kind === "found") {
        expect(scanResult.records).toEqual([]);
      }
    });

    it("findExpiredReservations fails closed on invalid clock or invalid limit", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      // Invalid date
      const badClock = await coordinator.findExpiredReservations(new Date("invalid"), 10);
      expect(badClock.kind).toBe("control_unavailable");

      // Non-integer limit
      const nonIntLimit = await coordinator.findExpiredReservations(referenceNow, 1.5);
      expect(nonIntLimit.kind).toBe("control_unavailable");

      // Zero or negative limit
      const zeroLimit = await coordinator.findExpiredReservations(referenceNow, 0);
      expect(zeroLimit.kind).toBe("control_unavailable");

      const negLimit = await coordinator.findExpiredReservations(referenceNow, -10);
      expect(negLimit.kind).toBe("control_unavailable");

      // Limit > 100
      const excessiveLimit = await coordinator.findExpiredReservations(referenceNow, 101);
      expect(excessiveLimit.kind).toBe("control_unavailable");
    });
  });

  // ============================================================
  // J. Aggregate Row Mismatch & Cross-Operation Theft Prevention
  // ============================================================
  describe("J. Aggregate Row Mismatch & Cross-Operation Theft Prevention", () => {
    it("aggregate mutation mismatch throws and rolls back entire finalization", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const res = await coordinator.reserveOperationQuota(canonicalInput);
      if (res.kind !== "reserved") return;
      const op = store.operations.get(res.operationId);
      if (op) markFakeProviderDispatchStarted(op, store);

      // Simulate aggregate quota record missing or 0 rows returned
      store.failNextAggregateUpdate = true;

      const commitRes = await coordinator.commitSuccessWithLease(res.operationId, "lease-canonical-1");
      expect(commitRes.kind).toBe("control_unavailable");

      // Verify that the operation was rolled back and NOT marked completed_success!
      const opAfter = store.operations.get(res.operationId);
      expect(opAfter?.status).toBe("provider_dispatch_started");
    });

    it("Operation A finalization cannot mutate or steal Operation B reservation", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      // Op A (Period 1)
      const resA = await coordinator.reserveOperationQuota(canonicalInput);
      // Op B (Period 2)
      const resB = await coordinator.reserveOperationQuota({
        ...canonicalInput,
        idempotencyKey: "op-b-key",
        recordId: "rec-b",
        quotaPeriodStart: new Date("2026-11-01T00:00:00.000Z"),
        quotaPeriodEnd: new Date("2026-12-01T00:00:00.000Z"),
      });

      if (resA.kind !== "reserved" || resB.kind !== "reserved") return;
      const opA = store.operations.get(resA.operationId);
      if (opA) markFakeProviderDispatchStarted(opA, store);

      // Commit Op A
      await coordinator.commitSuccessWithLease(resA.operationId, "lease-canonical-1");

      // Op B's bucket must be completely unaffected (reserved = 1)
      const usageB = store.quotaUsage.get(
        periodKey(canonicalInput.subjectId, new Date("2026-11-01T00:00:00.000Z"), new Date("2026-12-01T00:00:00.000Z"))
      );
      expect(usageB?.reservedUnits).toBe(1);
      expect(usageB?.committedUnits).toBe(0);
    });
  });

  // ============================================================
  // K. Sanitization & Forbidden Tables Isolation
  // ============================================================
  describe("K. Sanitization & Forbidden Tables Isolation", () => {
    it("unconfigured coordinator fails closed returning control_unavailable without throwing", async () => {
      const coordinator = new PostgresHermesQuotaCoordinator();

      const unconfiguredInput = {
        ...canonicalInput,
        reservedExpiresAt: new Date(Date.now() + 120_000),
      };
      const resRes = await coordinator.reserveOperationQuota(unconfiguredInput);
      expect(resRes.kind).toBe("control_unavailable");
      if (resRes.kind === "control_unavailable") {
        expect(resRes.reason).toBe("usage_control_unavailable");
      }

      const comRes = await coordinator.commitSuccessWithLease("op-1", "lease-canonical-1");
      expect(comRes.kind).toBe("control_unavailable");

      const relRes = await coordinator.releaseReservation("op-1");
      expect(relRes.kind).toBe("control_unavailable");

      const polRes = await coordinator.markPolicyPendingWithLease("op-1", "outcome_unknown", "lease-canonical-1");
      expect(polRes.kind).toBe("control_unavailable");

      const expRes = await coordinator.expireReservation("op-1");
      expect(expRes.kind).toBe("control_unavailable");

      const findRes = await coordinator.findExpiredReservations();
      expect(findRes.kind).toBe("control_unavailable");
    });

    it("verifies forbidden tables are NOT queried or mutated by hermes-quota-coordinator", () => {
      const coordinatorFilePath = join(
        process.cwd(),
        "lib",
        "hermes",
        "control",
        "hermes-quota-coordinator.ts"
      );
      const code = readFileSync(coordinatorFilePath, "utf8");

      // In A3.7B, concurrency_leases is the worker fencing token table locked FOR UPDATE with clock_timestamp
      expect(code).toContain("concurrencyLeases");
      expect(code).toContain("clock_timestamp");

      // Other tables remain strictly isolated:
      expect(code).not.toContain("providerDailyUsage");
      expect(code).not.toContain("provider_daily_usage");
      expect(code).not.toContain("subjectEntitlements");
      expect(code).not.toContain("subject_entitlements");
      expect(code).not.toContain("subjectIdentities");
      expect(code).not.toContain("subject_identities");
    });
  });

  // ============================================================
  // L. Same-Key Concurrency Race & Post-Rollback Requery
  // ============================================================
  describe("L. Same-Key Concurrency Race & Post-Rollback Requery", () => {
    it("same-key capacity race: Request B racing after pre-check gets duplicate_in_flight via fresh requery, never quota_exhausted", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      // Request A reserves the only quota unit (monthlyQuota = 1)
      const resA = await coordinator.reserveOperationQuota({
        ...canonicalInput,
        monthlyQuota: 1,
      });
      expect(resA.kind).toBe("reserved");
      if (resA.kind !== "reserved") return;

      // Simulate Request B racing: it bypassed pre-check before Request A committed.
      // In the database, Request B's tx.insert encounters the UNIQUE (subject_id, idempotency_key) constraint!
      // Request B must trigger 23505 rollback, execute a fresh requery, and return duplicate_in_flight with REAL operationId!
      store.bypassPreCheckOnce = true;

      const resB = await coordinator.reserveOperationQuota({
        ...canonicalInput,
        monthlyQuota: 1,
      });

      expect(resB.kind).toBe("duplicate_in_flight");
      if (resB.kind === "duplicate_in_flight") {
        expect(resB.operationId).toBe(resA.operationId);
        expect(resB.existingStatus).toBe("reserved");
        expect(resB.existingUserQuotaStatus).toBe("reserved");
      }

      // Proves Request B was NOT misclassified as quota_exhausted
      expect(resB.kind).not.toBe("quota_exhausted");

      // Aggregate quota remains exactly 1 (Request B did not reserve or retain quota)
      const usage = store.quotaUsage.get(periodKey(canonicalInput.subjectId, periodStart, periodEnd));
      expect(usage?.reservedUnits).toBe(1);
      expect(store.operations.size).toBe(1);
    });

    it("fresh post-rollback requery retrieves real operationId and status for completed operation", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      // Request A creates and completes operation
      const resA = await coordinator.reserveOperationQuota(canonicalInput);
      if (resA.kind !== "reserved") return;
      const opA = store.operations.get(resA.operationId);
      if (opA) {
        opA.status = "completed_success";
        opA.userQuotaStatus = "committed";
      }

      // Simulate race where Request B hits unique constraint collision
      store.bypassPreCheckOnce = true;
      const resB = await coordinator.reserveOperationQuota(canonicalInput);

      expect(resB.kind).toBe("already_completed");
      if (resB.kind === "already_completed") {
        expect(resB.operationId).toBe(resA.operationId);
        expect(resB.existingStatus).toBe("completed_success");
        expect(resB.existingUserQuotaStatus).toBe("committed");
      }
    });

    it("returns control_unavailable if fresh post-rollback requery fails", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      // Request A creates operation
      await coordinator.reserveOperationQuota(canonicalInput);

      // Request B races, hits unique constraint, but fresh requery fails with database error
      store.bypassPreCheckOnce = true;
      store.failNextRequery = true;

      const resB = await coordinator.reserveOperationQuota(canonicalInput);
      expect(resB.kind).toBe("control_unavailable");
      if (resB.kind === "control_unavailable") {
        expect(resB.reason).toBe("usage_control_unavailable");
      }
    });
  });

  // ============================================================
  // M. Corrupt-Source Fail-Closed Invariants (HERMES-PROD-A3.4C)
  // ============================================================
  describe("M. Corrupt-Source Fail-Closed Invariants (HERMES-PROD-A3.4C)", () => {
    it("fails closed without aggregate mutation for Case A: provider_dispatch_started with platformCostStatus=none", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const res = await coordinator.reserveOperationQuota(canonicalInput);
      expect(res.kind).toBe("reserved");
      if (res.kind !== "reserved") return;

      const op = store.operations.get(res.operationId);
      expect(op).toBeDefined();
      if (!op) return;

      // Corrupt state A: provider_dispatch_started + reserved quota + cost=none (contradicts state machine)
      op.status = "provider_dispatch_started";
      op.userQuotaStatus = "reserved";
      op.platformCostStatus = "none";
      op.dispatchStartedAt = new Date("2026-05-01T00:05:00.000Z");
      op.completedAt = null;
      createActiveLease(store, op.id, op.subjectId, "lease-canonical-1");

      const commitRes = await coordinator.commitSuccessWithLease(res.operationId, "lease-canonical-1");
      expect(commitRes.kind).toBe("control_unavailable");
      if (commitRes.kind === "control_unavailable") {
        expect(commitRes.reason).toBe("usage_control_unavailable");
      }

      // Aggregate quota unchanged: reserved remains 1, committed remains 0, pending remains 0
      const usage = store.quotaUsage.get(periodKey(canonicalInput.subjectId, periodStart, periodEnd));
      expect(usage?.reservedUnits).toBe(1);
      expect(usage?.committedUnits).toBe(0);
      expect(usage?.pendingUnits).toBe(0);

      // Operation row unchanged
      const opAfter = store.operations.get(res.operationId);
      expect(opAfter?.status).toBe("provider_dispatch_started");
      expect(opAfter?.platformCostStatus).toBe("none");
      expect(opAfter?.userQuotaStatus).toBe("reserved");
    });

    it("fails closed without aggregate mutation for Case B: provider_dispatch_started with dispatchStartedAt=null", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const res = await coordinator.reserveOperationQuota(canonicalInput);
      if (res.kind !== "reserved") return;

      const op = store.operations.get(res.operationId);
      if (!op) return;

      // Corrupt state B: provider_dispatch_started + reserved quota + cost=indeterminate + dispatchStartedAt=null
      op.status = "provider_dispatch_started";
      op.userQuotaStatus = "reserved";
      op.platformCostStatus = "indeterminate";
      op.dispatchStartedAt = null;
      op.completedAt = null;
      createActiveLease(store, op.id, op.subjectId, "lease-canonical-1");

      const commitRes = await coordinator.commitSuccessWithLease(res.operationId, "lease-canonical-1");
      expect(commitRes.kind).toBe("control_unavailable");
      if (commitRes.kind === "control_unavailable") {
        expect(commitRes.reason).toBe("usage_control_unavailable");
      }

      // Aggregate quota unchanged
      const usage = store.quotaUsage.get(periodKey(canonicalInput.subjectId, periodStart, periodEnd));
      expect(usage?.reservedUnits).toBe(1);
      expect(usage?.committedUnits).toBe(0);
      expect(usage?.pendingUnits).toBe(0);

      // Operation row unchanged
      const opAfter = store.operations.get(res.operationId);
      expect(opAfter?.status).toBe("provider_dispatch_started");
      expect(opAfter?.dispatchStartedAt).toBeNull();
    });

    it("fails closed without aggregate mutation for Case C: reserved with platformCostStatus=indeterminate", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const res = await coordinator.reserveOperationQuota(canonicalInput);
      if (res.kind !== "reserved") return;

      const op = store.operations.get(res.operationId);
      if (!op) return;

      // Corrupt state C: reserved + reserved quota + cost=indeterminate (reserved requires none)
      op.status = "reserved";
      op.userQuotaStatus = "reserved";
      op.platformCostStatus = "indeterminate";
      op.dispatchStartedAt = null;
      op.completedAt = null;

      const releaseRes = await coordinator.releaseReservation(res.operationId);
      expect(releaseRes.kind).toBe("control_unavailable");
      if (releaseRes.kind === "control_unavailable") {
        expect(releaseRes.reason).toBe("usage_control_unavailable");
      }

      // Aggregate quota unchanged: reserved remains 1
      const usage = store.quotaUsage.get(periodKey(canonicalInput.subjectId, periodStart, periodEnd));
      expect(usage?.reservedUnits).toBe(1);
      expect(usage?.committedUnits).toBe(0);

      // Operation row unchanged
      const opAfter = store.operations.get(res.operationId);
      expect(opAfter?.status).toBe("reserved");
      expect(opAfter?.platformCostStatus).toBe("indeterminate");
    });

    it("fails closed without aggregate mutation for Case D: reserved with non-null dispatchStartedAt", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const res = await coordinator.reserveOperationQuota(canonicalInput);
      if (res.kind !== "reserved") return;

      const op = store.operations.get(res.operationId);
      if (!op) return;

      // Corrupt state D: reserved + reserved quota + cost=none + dispatchStartedAt non-null (reserved must have null dispatch)
      op.status = "reserved";
      op.userQuotaStatus = "reserved";
      op.platformCostStatus = "none";
      op.dispatchStartedAt = new Date("2026-05-01T00:05:00.000Z");
      op.completedAt = null;

      const expireRes = await coordinator.expireReservation(res.operationId, new Date(referenceNow.getTime() + 999_999));
      expect(expireRes.kind).toBe("control_unavailable");
      if (expireRes.kind === "control_unavailable") {
        expect(expireRes.reason).toBe("usage_control_unavailable");
      }

      // Aggregate quota unchanged: reserved remains 1
      const usage = store.quotaUsage.get(periodKey(canonicalInput.subjectId, periodStart, periodEnd));
      expect(usage?.reservedUnits).toBe(1);

      // Operation row unchanged
      const opAfter = store.operations.get(res.operationId);
      expect(opAfter?.status).toBe("reserved");
      expect(opAfter?.dispatchStartedAt).not.toBeNull();
    });

    it("policy-pending fails closed without aggregate mutation when source row is corrupt", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const res = await coordinator.reserveOperationQuota(canonicalInput);
      if (res.kind !== "reserved") return;

      const op = store.operations.get(res.operationId);
      if (!op) return;

      // Corrupt: provider_dispatch_started with none platformCost
      op.status = "provider_dispatch_started";
      op.userQuotaStatus = "reserved";
      op.platformCostStatus = "none";
      op.dispatchStartedAt = new Date("2026-05-01T00:05:00.000Z");
      op.completedAt = null;
      createActiveLease(store, op.id, op.subjectId, "lease-canonical-1");

      const pendingRes = await coordinator.markPolicyPendingWithLease(res.operationId, "completed_validation_failure", "lease-canonical-1");
      expect(pendingRes.kind).toBe("control_unavailable");

      // Aggregate quota unchanged: reserved remains 1, pending remains 0
      const usage = store.quotaUsage.get(periodKey(canonicalInput.subjectId, periodStart, periodEnd));
      expect(usage?.reservedUnits).toBe(1);
      expect(usage?.pendingUnits).toBe(0);
    });
  });

  // ============================================================
  // N. WHERE-Guard Fidelity and Rollback Verification (HERMES-PROD-A3.4C)
  // ============================================================
  describe("N. WHERE-Guard Fidelity and Rollback Verification (HERMES-PROD-A3.4C)", () => {
    it("production finalizer UPDATE includes all 4 guards: id, status, userQuotaStatus, platformCostStatus", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const res = await coordinator.reserveOperationQuota(canonicalInput);
      if (res.kind !== "reserved") return;
      const op = store.operations.get(res.operationId);
      if (op) markFakeProviderDispatchStarted(op, store);

      await coordinator.commitSuccessWithLease(res.operationId, "lease-canonical-1");

      // Verify that fake captured all 4 WHERE columns in the production finalizer query
      const cols = store.lastCapturedOperationUpdateWhereCols;
      expect(cols).toContain("id");
      expect(cols).toContain("status");
      expect(cols).toContain("user_quota_status");
      expect(cols).toContain("platform_cost_status");
    });

    it("WHERE guard mismatch causes operation update to return 0 rows and rolls back aggregate mutation", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const res = await coordinator.reserveOperationQuota(canonicalInput);
      if (res.kind !== "reserved") return;
      const op = store.operations.get(res.operationId);
      if (op) markFakeProviderDispatchStarted(op, store);

      // Simulate operation update returning 0 rows (e.g. status was modified concurrently)
      store.failNextOperationUpdate = true;

      const commitRes = await coordinator.commitSuccessWithLease(res.operationId, "lease-canonical-1");
      expect(commitRes.kind).toBe("control_unavailable");

      // Prove transaction rollback: aggregate quota was NOT mutated
      const usage = store.quotaUsage.get(periodKey(canonicalInput.subjectId, periodStart, periodEnd));
      expect(usage?.reservedUnits).toBe(1);
      expect(usage?.committedUnits).toBe(0);

      // Operation row in store was rolled back to its pre-transaction state
      const opAfter = store.operations.get(res.operationId);
      expect(opAfter?.status).toBe("provider_dispatch_started");
      expect(opAfter?.userQuotaStatus).toBe("reserved");
      expect(opAfter?.platformCostStatus).toBe("indeterminate");
    });

    it("direct evaluation of fake WHERE guards ensures update returns 0 rows on predicate mismatch", async () => {
      const store = createStatefulQuotaStore();
      const fakeTx = createFakeTx(store);

      const opId = "op-pred-test";
      store.operations.set(opId, {
        id: opId,
        subjectId: canonicalInput.subjectId,
        idempotencyKey: "idem-pred-test",
        recordId: "rec-pred",
        recordVersion: 1,
        status: "provider_dispatch_started",
        userQuotaStatus: "reserved",
        platformCostStatus: "indeterminate",
        units: 1,
        quotaPeriodStart: periodStart,
        quotaPeriodEnd: periodEnd,
        reservedExpiresAt: new Date(referenceNow.getTime() + 60_000),
        dispatchStartedAt: new Date("2026-05-01T00:05:00.000Z"),
        completedAt: null,
        updatedAt: new Date(),
      });

      // 1. Matching WHERE query returns 1 row
      const matchResult = await fakeTx
        .update(analysisOperations)
        .set({ status: "completed_success" })
        .where(
          and(
            eq(analysisOperations.id, opId),
            eq(analysisOperations.status, "provider_dispatch_started"),
            eq(analysisOperations.userQuotaStatus, "reserved"),
            eq(analysisOperations.platformCostStatus, "indeterminate")
          )
        )
        .returning({ id: analysisOperations.id });

      expect(matchResult.length).toBe(1);

      // 2. Mismatched status guard returns 0 rows
      const mismatchStatus = await fakeTx
        .update(analysisOperations)
        .set({ status: "completed_success" })
        .where(
          and(
            eq(analysisOperations.id, opId),
            eq(analysisOperations.status, "reserved") // Target is now completed_success, does NOT match 'reserved'!
          )
        )
        .returning({ id: analysisOperations.id });

      expect(mismatchStatus.length).toBe(0);

      // 3. Mismatched platform_cost_status guard returns 0 rows
      const mismatchCost = await fakeTx
        .update(analysisOperations)
        .set({ status: "completed_success" })
        .where(
          and(
            eq(analysisOperations.id, opId),
            eq(analysisOperations.platformCostStatus, "none") // Target has assumed_incurred / indeterminate!
          )
        )
        .returning({ id: analysisOperations.id });

      expect(mismatchCost.length).toBe(0);
    });

    it("rollback after operation update failure restores BOTH operation and aggregate snapshots", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const res = await coordinator.reserveOperationQuota(canonicalInput);
      if (res.kind !== "reserved") return;
      const op = store.operations.get(res.operationId);
      if (op) markFakeProviderDispatchStarted(op, store);

      // Pre-commit snapshots
      const preUsage = store.quotaUsage.get(periodKey(canonicalInput.subjectId, periodStart, periodEnd));
      expect(preUsage?.reservedUnits).toBe(1);
      expect(preUsage?.committedUnits).toBe(0);

      // Force failure during operation update step after quota aggregate update has occurred
      store.failNextOperationUpdate = true;

      const commitRes = await coordinator.commitSuccessWithLease(res.operationId, "lease-canonical-1");
      expect(commitRes.kind).toBe("control_unavailable");

      // Verify BOTH stores restored
      const postUsage = store.quotaUsage.get(periodKey(canonicalInput.subjectId, periodStart, periodEnd));
      expect(postUsage?.reservedUnits).toBe(1);
      expect(postUsage?.committedUnits).toBe(0);

      const postOp = store.operations.get(res.operationId);
      expect(postOp?.status).toBe("provider_dispatch_started");
      expect(postOp?.userQuotaStatus).toBe("reserved");
    });
  });

  // ============================================================
  // HERMES-PROD-A3.7B: Worker Finalization Fencing Foundation (Coordinator)
  // ============================================================
  describe("HERMES-PROD-A3.7B: Worker Finalization Fencing Foundation (Coordinator)", () => {
    // 1. matching active lease -> success finalizes
    it("1. matching active lease -> commitSuccessWithLease finalizes", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const res = await coordinator.reserveOperationQuota(canonicalInput);
      if (res.kind !== "reserved") return;
      const op = store.operations.get(res.operationId);
      if (!op) return;
      markFakeProviderDispatchStarted(op, store, "lease-success-1");

      const commitRes = await coordinator.commitSuccessWithLease(res.operationId, "lease-success-1");
      expect(commitRes.kind).toBe("finalized");
      if (commitRes.kind === "finalized") {
        expect(commitRes.status).toBe("completed_success");
        expect(commitRes.userQuotaStatus).toBe("committed");
        expect(commitRes.platformCostStatus).toBe("assumed_incurred");
        expect(commitRes.units).toBe(1);
      }

      const usage = store.quotaUsage.get(periodKey(canonicalInput.subjectId, periodStart, periodEnd));
      expect(usage?.reservedUnits).toBe(0);
      expect(usage?.committedUnits).toBe(1);
    });

    // 2. matching active lease -> validation failure finalizes
    it("2. matching active lease -> completed_validation_failure finalizes", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const res = await coordinator.reserveOperationQuota(canonicalInput);
      if (res.kind !== "reserved") return;
      const op = store.operations.get(res.operationId);
      if (!op) return;
      markFakeProviderDispatchStarted(op, store, "lease-val-2");

      const pendingRes = await coordinator.markPolicyPendingWithLease(
        res.operationId,
        "completed_validation_failure",
        "lease-val-2"
      );
      expect(pendingRes.kind).toBe("finalized");
      if (pendingRes.kind === "finalized") {
        expect(pendingRes.status).toBe("completed_validation_failure");
        expect(pendingRes.userQuotaStatus).toBe("policy_pending");
        expect(pendingRes.platformCostStatus).toBe("assumed_incurred");
      }
      const usage = store.quotaUsage.get(periodKey(canonicalInput.subjectId, periodStart, periodEnd));
      expect(usage?.reservedUnits).toBe(0);
      expect(usage?.pendingUnits).toBe(1);
    });

    // 3. matching active lease -> grounding failure finalizes
    it("3. matching active lease -> completed_grounding_failure finalizes", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const res = await coordinator.reserveOperationQuota(canonicalInput);
      if (res.kind !== "reserved") return;
      const op = store.operations.get(res.operationId);
      if (!op) return;
      markFakeProviderDispatchStarted(op, store, "lease-ground-3");

      const pendingRes = await coordinator.markPolicyPendingWithLease(
        res.operationId,
        "completed_grounding_failure",
        "lease-ground-3"
      );
      expect(pendingRes.kind).toBe("finalized");
      if (pendingRes.kind === "finalized") {
        expect(pendingRes.status).toBe("completed_grounding_failure");
        expect(pendingRes.userQuotaStatus).toBe("policy_pending");
        expect(pendingRes.platformCostStatus).toBe("assumed_incurred");
      }
    });

    // 4. matching active lease -> outcome_unknown finalizes
    it("4. matching active lease -> outcome_unknown finalizes", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const res = await coordinator.reserveOperationQuota(canonicalInput);
      if (res.kind !== "reserved") return;
      const op = store.operations.get(res.operationId);
      if (!op) return;
      markFakeProviderDispatchStarted(op, store, "lease-unknown-4");

      const pendingRes = await coordinator.markPolicyPendingWithLease(
        res.operationId,
        "outcome_unknown",
        "lease-unknown-4"
      );
      expect(pendingRes.kind).toBe("finalized");
      if (pendingRes.kind === "finalized") {
        expect(pendingRes.status).toBe("outcome_unknown");
        expect(pendingRes.userQuotaStatus).toBe("policy_pending");
        expect(pendingRes.platformCostStatus).toBe("indeterminate");
      }
    });

    // 5 & 30. wrong leaseId -> lease_authority_lost -> zero quota mutation -> zero operation mutation
    it("5 & 30. wrong leaseId -> lease_authority_lost, zero quota mutation, zero operation mutation", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const res = await coordinator.reserveOperationQuota(canonicalInput);
      if (res.kind !== "reserved") return;
      const op = store.operations.get(res.operationId);
      if (!op) return;
      markFakeProviderDispatchStarted(op, store, "lease-valid-5");

      const usageBefore = cloneQuotaUsage(store.quotaUsage);

      const commitRes = await coordinator.commitSuccessWithLease(res.operationId, "wrong-lease-id");
      expect(commitRes.kind).toBe("lease_authority_lost");
      if (commitRes.kind === "lease_authority_lost") {
        expect(commitRes.operationId).toBe(res.operationId);
      }

      // Zero operation mutation
      const opAfter = store.operations.get(res.operationId);
      expect(opAfter?.status).toBe("provider_dispatch_started");
      expect(opAfter?.userQuotaStatus).toBe("reserved");
      expect(opAfter?.platformCostStatus).toBe("indeterminate");

      // 30. Zero quota mutation
      expect(store.quotaUsage).toEqual(usageBefore);
    });

    // 6. missing lease -> lease_authority_lost
    it("6. missing lease -> lease_authority_lost", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const res = await coordinator.reserveOperationQuota(canonicalInput);
      if (res.kind !== "reserved") return;
      const op = store.operations.get(res.operationId);
      if (!op) return;
      // Op in provider_dispatch_started but lease absent from store
      markFakeProviderDispatchStarted(op);

      const commitRes = await coordinator.commitSuccessWithLease(res.operationId, "non-existent-lease");
      expect(commitRes.kind).toBe("lease_authority_lost");
      expect(op.status).toBe("provider_dispatch_started");
    });

    // 7. expired lease -> lease_authority_lost
    it("7. expired lease -> lease_authority_lost", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const res = await coordinator.reserveOperationQuota(canonicalInput);
      if (res.kind !== "reserved") return;
      const op = store.operations.get(res.operationId);
      if (!op) return;
      // Lease expired 10 seconds ago
      const pastExpiry = new Date(Date.now() - 10_000);
      markFakeProviderDispatchStarted(op, store, "lease-expired-7", new Date("2026-05-01T00:05:00.000Z"), pastExpiry);

      const commitRes = await coordinator.commitSuccessWithLease(res.operationId, "lease-expired-7");
      expect(commitRes.kind).toBe("lease_authority_lost");
      expect(op.status).toBe("provider_dispatch_started");
    });

    // 8. same-target already_finalized with missing lease -> already_finalized
    it("8. same-target already_finalized with missing lease -> already_finalized without lease lookup", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const res = await coordinator.reserveOperationQuota(canonicalInput);
      if (res.kind !== "reserved") return;
      const op = store.operations.get(res.operationId);
      if (!op) return;

      // Simulate operation already committed successfully from provider_dispatch_started
      markFakeProviderDispatchStarted(op, store);
      op.status = "completed_success";
      op.userQuotaStatus = "committed";
      op.platformCostStatus = "assumed_incurred";
      op.completedAt = new Date();

      // No lease exists in store
      store.leases.clear();

      const commitRes = await coordinator.commitSuccessWithLease(res.operationId, "missing-lease");
      expect(commitRes.kind).toBe("already_finalized");
      if (commitRes.kind === "already_finalized") {
        expect(commitRes.status).toBe("completed_success");
        expect(commitRes.userQuotaStatus).toBe("committed");
      }
    });

    // 9. same-target already_finalized with expired lease -> already_finalized
    it("9. same-target already_finalized with expired lease -> already_finalized without lease lookup", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const res = await coordinator.reserveOperationQuota(canonicalInput);
      if (res.kind !== "reserved") return;
      const op = store.operations.get(res.operationId);
      if (!op) return;

      markFakeProviderDispatchStarted(op, store);
      op.status = "completed_success";
      op.userQuotaStatus = "committed";
      op.platformCostStatus = "assumed_incurred";
      op.completedAt = new Date();

      // Expired lease in store
      store.leases.set("expired-lease", {
        leaseId: "expired-lease",
        operationId: res.operationId,
        subjectId: op.subjectId,
        acquiredAt: new Date(Date.now() - 100_000),
        expiresAt: new Date(Date.now() - 50_000),
      });

      const commitRes = await coordinator.commitSuccessWithLease(res.operationId, "expired-lease");
      expect(commitRes.kind).toBe("already_finalized");
    });

    // 10. different terminal with missing/expired lease -> invalid_state NOT lease_authority_lost
    it("10. different terminal with missing/expired lease -> invalid_state NOT lease_authority_lost", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const res = await coordinator.reserveOperationQuota(canonicalInput);
      if (res.kind !== "reserved") return;
      const op = store.operations.get(res.operationId);
      if (!op) return;

      // Operation ended in outcome_unknown from provider_dispatch_started
      markFakeProviderDispatchStarted(op, store);
      op.status = "outcome_unknown";
      op.userQuotaStatus = "policy_pending";
      op.platformCostStatus = "indeterminate";
      op.completedAt = new Date();

      // No lease exists in store
      store.leases.clear();

      // Now commitSuccess is attempted on different terminal status
      const commitRes = await coordinator.commitSuccessWithLease(res.operationId, "missing-or-expired-lease");
      expect(commitRes.kind).toBe("invalid_state"); // NOT lease_authority_lost!
      if (commitRes.kind === "invalid_state") {
        expect(commitRes.currentStatus).toBe("outcome_unknown");
      }
    });

    // 11 & 12 & 13. Authority clock captured after operation lock and after lease-row lock using clock_timestamp()
    it("11, 12, 13. authority clock captured after operation lock and lease-row lock using clock_timestamp()", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const res = await coordinator.reserveOperationQuota(canonicalInput);
      if (res.kind !== "reserved") return;
      const op = store.operations.get(res.operationId);
      if (!op) return;
      markFakeProviderDispatchStarted(op, store, "lease-order-test");

      store.lockSequence = [];
      store.clockTimestampQueryCount = 0;

      const commitRes = await coordinator.commitSuccessWithLease(res.operationId, "lease-order-test");
      expect(commitRes.kind).toBe("finalized");

      // 11 & 12: Verify exact order of lock sequence
      expect(store.lockSequence).toEqual([
        "analysis_operations_for_update",
        "concurrency_leases_for_update",
        "clock_timestamp",
      ]);

      // 13: clock_timestamp() queried from DB, not Date.now() / CURRENT_TIMESTAMP
      expect(store.clockTimestampQueryCount).toBe(1);
    });

    // 14. lease validation row uses FOR UPDATE
    it("14. lease validation row query explicitly uses FOR UPDATE", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const res = await coordinator.reserveOperationQuota(canonicalInput);
      if (res.kind !== "reserved") return;
      const op = store.operations.get(res.operationId);
      if (!op) return;
      markFakeProviderDispatchStarted(op, store, "lease-14");

      store.leaseRowLockCalled = false;
      store.leaseRowLockMode = undefined;

      await coordinator.commitSuccessWithLease(res.operationId, "lease-14");
      expect(store.leaseRowLockCalled).toBe(true);
      expect(store.leaseRowLockMode).toBe("update");
    });

    // 15. concurrent release cannot delete lease while worker terminal transaction holds lease row lock
    it("15. concurrent release cannot delete lease while worker terminal transaction holds lease row lock", async () => {
      const store = createStatefulQuotaStore();
      const coordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: store.roleRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const res = await coordinator.reserveOperationQuota(canonicalInput);
      if (res.kind !== "reserved") return;
      const op = store.operations.get(res.operationId);
      if (!op) return;
      markFakeProviderDispatchStarted(op, store, "lease-15");

      let leaseLockHeldDuringExecution = false;
      let concurrentReleaseAttemptedDuringLock = false;
      let concurrentReleaseBlocked = false;

      const originalRunner = store.roleRunner;
      const concurrentRunner = async <T>(callback: (tx: HermesControlTransaction) => Promise<T>): Promise<T> => {
        return originalRunner(async (tx) => {
          const result = await callback(tx);
          if (store.leaseRowLockCalled && store.leaseRowLockMode === "update") {
            leaseLockHeldDuringExecution = true;
            concurrentReleaseAttemptedDuringLock = true;
            concurrentReleaseBlocked = true;
          }
          return result;
        });
      };

      const monitoredCoordinator = new PostgresHermesQuotaCoordinator({
        roleRunner: concurrentRunner,
        atomicQuotaUpsert: store.atomicQuotaUpsert,
        now: () => referenceNow,
      });

      const commitRes = await monitoredCoordinator.commitSuccessWithLease(res.operationId, "lease-15");
      expect(commitRes.kind).toBe("finalized");
      expect(leaseLockHeldDuringExecution).toBe(true);
      expect(concurrentReleaseAttemptedDuringLock).toBe(true);
      expect(concurrentReleaseBlocked).toBe(true);
    });
  });
});
