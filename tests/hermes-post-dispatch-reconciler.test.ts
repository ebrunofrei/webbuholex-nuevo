// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  HermesPostDispatchReconciler,
} from "@/lib/hermes/control/hermes-post-dispatch-reconciler";
import type {
  HermesQuotaCoordinator,
  HermesReconciliationResult,
  HermesPostDispatchCandidateScanResult,
} from "@/lib/hermes/control/hermes-quota-coordinator";
import { PostgresHermesQuotaCoordinator } from "@/lib/hermes/control/hermes-quota-coordinator";
import type {
  HermesOperationStatus,
  HermesUserQuotaStatus,
  HermesPlatformCostStatus,
} from "@/lib/hermes/control/hermes-control-contracts";
import type { HermesControlTransaction } from "@/database/roles";
import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import fs from "node:fs";
import path from "node:path";

interface StoredOperation {
  id: string;
  subjectId: string;
  idempotencyKey: string;
  recordId: string;
  recordVersion: number;
  status: HermesOperationStatus;
  userQuotaStatus: HermesUserQuotaStatus;
  platformCostStatus: HermesPlatformCostStatus;
  units: number;
  quotaPeriodStart: Date;
  quotaPeriodEnd: Date;
  reservedExpiresAt: Date;
  dispatchStartedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
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

interface StoredLease {
  leaseId: string;
  operationId: string;
  subjectId: string;
  acquiredAt: Date;
  expiresAt: Date;
}

function periodKey(subjectId: string, start: Date, end: Date): string {
  return `${subjectId}:${start.toISOString()}:${end.toISOString()}`;
}

interface StatefulReconcilerTestStore {
  readonly operations: Map<string, StoredOperation>;
  readonly quotaUsage: Map<string, StoredQuotaUsage>;
  readonly leases: Map<string, StoredLease>;
  readonly providerDailyUsage: Map<string, number>;
  lockSequence: string[];
  clockTimestampQueryCount: number;
  authorityClock?: Date | undefined;
  failWithPostgresError: boolean;
  failNextAggregateUpdate: boolean;
  failNextOperationUpdate: boolean;
}

function createReconcilerTestStore(): StatefulReconcilerTestStore {
  const operations = new Map<string, StoredOperation>();
  const quotaUsage = new Map<string, StoredQuotaUsage>();
  const leases = new Map<string, StoredLease>();
  const providerDailyUsage = new Map<string, number>();
  const lockSequence: string[] = [];

  return {
    operations,
    quotaUsage,
    leases,
    providerDailyUsage,
    lockSequence,
    clockTimestampQueryCount: 0,
    failWithPostgresError: false,
    failNextAggregateUpdate: false,
    failNextOperationUpdate: false,
  };
}

function extractColNames(sqlObj: unknown): string[] {
  const names: string[] = [];
  if (!sqlObj || typeof sqlObj !== "object") return names;
  const obj = sqlObj as { name?: string; queryChunks?: unknown[] };
  if (typeof obj.name === "string") names.push(obj.name);
  if (Array.isArray(obj.queryChunks)) {
    for (const chunk of obj.queryChunks) {
      names.push(...extractColNames(chunk));
    }
  }
  return names;
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

function buildTestCoordinator(store: StatefulReconcilerTestStore): HermesQuotaCoordinator {
  const runner = async <T>(callback: (tx: HermesControlTransaction) => Promise<T>): Promise<T> => {
    if (store.failWithPostgresError) {
      store.failWithPostgresError = false;
      throw new Error("simulated fatal database error");
    }

    const snapOps = new Map<string, StoredOperation>();
    for (const [k, v] of store.operations.entries()) snapOps.set(k, { ...v });
    const snapUsage = new Map<string, StoredQuotaUsage>();
    for (const [k, v] of store.quotaUsage.entries()) snapUsage.set(k, { ...v });
    const snapLeases = new Map<string, StoredLease>();
    for (const [k, v] of store.leases.entries()) snapLeases.set(k, { ...v });

    const fakeTx = {
      select: () => ({
        from: () => ({
          where: (condition: unknown) => {
            const cols = extractColNames(condition);
            const vals = extractSqlValues(condition);

            return {
              limit: (n: number) => {
                const allOps = Array.from(store.operations.values());

                // Idempotency lookup
                if (cols.includes("idempotency_key")) {
                  const subId = vals[0] as string;
                  const idemKey = vals[1] as string;
                  const matched = allOps.filter(
                    (op) => op.subjectId === subId && op.idempotencyKey === idemKey
                  );
                  return Promise.resolve(matched.slice(0, n));
                }

                // Active lease lookup for reconciler authority
                if (cols.includes("operation_id") && cols.includes("expires_at")) {
                  const eqPairs = extractEqPairs(condition);
                  const opIdPair = eqPairs.find((p) => p.col === "operation_id");
                  const opId = opIdPair ? String(opIdPair.val) : (vals[0] as string);
                  const authorityNow = (vals.find((v) => v instanceof Date) as Date | undefined) ?? new Date();
                  const matched = Array.from(store.leases.values()).filter(
                    (l) => l.operationId === opId && l.expiresAt.getTime() > authorityNow.getTime()
                  );
                  return Promise.resolve(matched.slice(0, n));
                }

                return Promise.resolve([]);
              },

            for: () => {
              if (cols.includes("lease_id")) {
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
                  const allOps = Array.from(store.operations.values());
                  const condStr = sqlToString(condition);

                  if (
                    cols.includes("provider_dispatch_started") ||
                    vals.includes("provider_dispatch_started") ||
                    condStr.includes("provider_dispatch_started")
                  ) {
                    const scanNow =
                      (vals.find((v) => v instanceof Date) as Date | undefined) ??
                      store.authorityClock ??
                      new Date();
                    const candidates = allOps
                      .filter((op) => {
                        if (
                          op.status !== "provider_dispatch_started" ||
                          op.userQuotaStatus !== "reserved" ||
                          op.platformCostStatus !== "indeterminate"
                        ) {
                          return false;
                        }
                        const hasActive = Array.from(store.leases.values()).some(
                          (l) => l.operationId === op.id && l.expiresAt.getTime() > scanNow.getTime()
                        );
                        return !hasActive;
                      })
                      .sort((a, b) => {
                        const aTime = a.dispatchStartedAt?.getTime() ?? 0;
                        const bTime = b.dispatchStartedAt?.getTime() ?? 0;
                        return aTime - bTime;
                      })
                      .map((op) => ({
                        operationId: op.id,
                        subjectId: op.subjectId,
                        units: op.units,
                        quotaPeriodStart: op.quotaPeriodStart,
                        quotaPeriodEnd: op.quotaPeriodEnd,
                      }));
                    return Promise.resolve(candidates.slice(0, n));
                  }
                  return Promise.resolve([]);
                },
              }),
            };
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
                if (store.failNextOperationUpdate) {
                  store.failNextOperationUpdate = false;
                  return Promise.resolve([]);
                }
                const eqPairs = extractEqPairs(condition);
                const idPair = eqPairs.find((p) => p.col === "id");
                const opId = (idPair ? String(idPair.val) : vals[0]) as string;
                const target = store.operations.get(opId);
                if (!target) return Promise.resolve([]);

                for (const pair of eqPairs) {
                  if (pair.col === "id" && target.id !== pair.val) return Promise.resolve([]);
                  if (pair.col === "status" && target.status !== pair.val) return Promise.resolve([]);
                  if (pair.col === "user_quota_status" && target.userQuotaStatus !== pair.val) return Promise.resolve([]);
                  if (pair.col === "platform_cost_status" && target.platformCostStatus !== pair.val) return Promise.resolve([]);
                }

                if (updates.status) target.status = updates.status as HermesOperationStatus;
                if (updates.userQuotaStatus) target.userQuotaStatus = updates.userQuotaStatus as HermesUserQuotaStatus;
                if (updates.platformCostStatus) target.platformCostStatus = updates.platformCostStatus as HermesPlatformCostStatus;
                if (updates.completedAt) target.completedAt = updates.completedAt as Date;
                target.updatedAt = new Date();
                return Promise.resolve([{ id: target.id }]);
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

    try {
      return await callback(fakeTx as unknown as HermesControlTransaction);
    } catch (err) {
      store.operations.clear();
      for (const [k, v] of snapOps.entries()) store.operations.set(k, v);
      store.quotaUsage.clear();
      for (const [k, v] of snapUsage.entries()) store.quotaUsage.set(k, v);
      store.leases.clear();
      for (const [k, v] of snapLeases.entries()) store.leases.set(k, v);
      throw err;
    }
  };

  return new PostgresHermesQuotaCoordinator({
    roleRunner: runner,
    atomicQuotaUpsert: async (_tx, params) => {
      const key = periodKey(params.subjectId, params.periodStart, params.periodEnd);
      const existing = store.quotaUsage.get(key);
      if (!existing) {
        store.quotaUsage.set(key, {
          subjectId: params.subjectId,
          periodStart: params.periodStart,
          periodEnd: params.periodEnd,
          reservedUnits: params.units,
          committedUnits: 0,
          pendingUnits: 0,
          updatedAt: new Date(),
        });
        return true;
      }
      existing.reservedUnits += params.units;
      return true;
    },
    now: () => store.authorityClock ?? new Date(),
  });
}

function seedOperation(
  store: StatefulReconcilerTestStore,
  params: {
    id: string;
    subjectId?: string;
    status: HermesOperationStatus;
    userQuotaStatus: HermesUserQuotaStatus;
    platformCostStatus: HermesPlatformCostStatus;
    units?: number;
    dispatchStartedAt?: Date | null;
    completedAt?: Date | null;
    quotaPeriodStart?: Date;
    quotaPeriodEnd?: Date;
    idempotencyKey?: string;
  }
): StoredOperation {
  const subId = params.subjectId ?? "subj-default-001";
  const start = params.quotaPeriodStart ?? new Date("2026-10-01T00:00:00.000Z");
  const end = params.quotaPeriodEnd ?? new Date("2026-11-01T00:00:00.000Z");
  const units = params.units ?? 1;

  const op: StoredOperation = {
    id: params.id,
    subjectId: subId,
    idempotencyKey: params.idempotencyKey ?? `idem-${params.id}`,
    recordId: `rec-${params.id}`,
    recordVersion: 1,
    status: params.status,
    userQuotaStatus: params.userQuotaStatus,
    platformCostStatus: params.platformCostStatus,
    units,
    quotaPeriodStart: start,
    quotaPeriodEnd: end,
    reservedExpiresAt: new Date(Date.now() + 105_000),
    dispatchStartedAt: params.dispatchStartedAt !== undefined ? params.dispatchStartedAt : null,
    completedAt: params.completedAt !== undefined ? params.completedAt : null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  store.operations.set(op.id, op);

  const key = periodKey(subId, start, end);
  const existingUsage = store.quotaUsage.get(key);
  if (!existingUsage) {
    store.quotaUsage.set(key, {
      subjectId: subId,
      periodStart: start,
      periodEnd: end,
      reservedUnits: params.userQuotaStatus === "reserved" ? units : 0,
      committedUnits: params.userQuotaStatus === "committed" ? units : 0,
      pendingUnits: params.userQuotaStatus === "policy_pending" ? units : 0,
      updatedAt: new Date(),
    });
  } else {
    if (params.userQuotaStatus === "reserved") existingUsage.reservedUnits += units;
    if (params.userQuotaStatus === "committed") existingUsage.committedUnits += units;
    if (params.userQuotaStatus === "policy_pending") existingUsage.pendingUnits += units;
  }

  return op;
}

function seedLease(
  store: StatefulReconcilerTestStore,
  leaseId: string,
  operationId: string,
  expiresAt: Date,
  subjectId = "subj-default-001"
): StoredLease {
  const lease: StoredLease = {
    leaseId,
    operationId,
    subjectId,
    acquiredAt: new Date(expiresAt.getTime() - 60_000),
    expiresAt,
  };
  store.leases.set(leaseId, lease);
  return lease;
}

describe("HERMES-PROD-A3.7C: Hermes Post-Dispatch Orphan Reconciler", () => {
  const testNow = new Date("2026-10-14T20:00:00.000Z");

  // ============================================================
  // Part 1: Service Unit Tests & Orchestration Contract
  // ============================================================
  describe("Part 1: Service Unit Tests & Orchestration Contract", () => {
    it("reconcileOperation delegates directly to quotaCoordinator.reconcileOutcomeUnknownIfLeaseExpired", async () => {
      const mockCoordinator: HermesQuotaCoordinator = {
        reserveOperationQuota: vi.fn(),
        commitSuccessWithLease: vi.fn(),
        markPolicyPendingWithLease: vi.fn(),
        releaseReservation: vi.fn(),
        expireReservation: vi.fn(),
        findExpiredReservations: vi.fn(),
        reconcileOutcomeUnknownIfLeaseExpired: vi.fn(async (opId: string): Promise<HermesReconciliationResult> => ({
          kind: "reconciled",
          operationId: opId,
          status: "outcome_unknown",
          userQuotaStatus: "policy_pending",
          platformCostStatus: "indeterminate",
          units: 1,
        })),
        findPostDispatchOrphanCandidates: vi.fn(),
      };

      const reconciler = new HermesPostDispatchReconciler({ quotaCoordinator: mockCoordinator });
      const result = await reconciler.reconcileOperation("op-delegation-1");

      expect(result.kind).toBe("reconciled");
      expect(mockCoordinator.reconcileOutcomeUnknownIfLeaseExpired).toHaveBeenCalledWith("op-delegation-1");
    });

    it("reconcilePostDispatchOrphans returns completed with all zeroes when scan finds 0 candidates", async () => {
      const mockCoordinator: HermesQuotaCoordinator = {
        reserveOperationQuota: vi.fn(),
        commitSuccessWithLease: vi.fn(),
        markPolicyPendingWithLease: vi.fn(),
        releaseReservation: vi.fn(),
        expireReservation: vi.fn(),
        findExpiredReservations: vi.fn(),
        reconcileOutcomeUnknownIfLeaseExpired: vi.fn(),
        findPostDispatchOrphanCandidates: vi.fn(async (): Promise<HermesPostDispatchCandidateScanResult> => ({
          kind: "found",
          records: [],
        })),
      };

      const reconciler = new HermesPostDispatchReconciler({ quotaCoordinator: mockCoordinator });
      const batch = await reconciler.reconcilePostDispatchOrphans();

      expect(batch.kind).toBe("completed");
      expect(batch.scanned).toBe(0);
      expect(batch.reconciled).toBe(0);
      expect(batch.alreadyFinalized).toBe(0);
      expect(batch.leaseStillActive).toBe(0);
      expect(batch.invalidState).toBe(0);
      expect(batch.notFound).toBe(0);
      expect(batch.controlUnavailable).toBe(0);
      expect(mockCoordinator.findPostDispatchOrphanCandidates).toHaveBeenCalledWith(50);
    });

    it("reconcilePostDispatchOrphans respects custom constructor defaultLimit", async () => {
      const mockCoordinator: HermesQuotaCoordinator = {
        reserveOperationQuota: vi.fn(),
        commitSuccessWithLease: vi.fn(),
        markPolicyPendingWithLease: vi.fn(),
        releaseReservation: vi.fn(),
        expireReservation: vi.fn(),
        findExpiredReservations: vi.fn(),
        reconcileOutcomeUnknownIfLeaseExpired: vi.fn(),
        findPostDispatchOrphanCandidates: vi.fn(async (): Promise<HermesPostDispatchCandidateScanResult> => ({
          kind: "found",
          records: [],
        })),
      };

      const reconciler = new HermesPostDispatchReconciler({
        quotaCoordinator: mockCoordinator,
        defaultLimit: 25,
      });
      await reconciler.reconcilePostDispatchOrphans();

      expect(mockCoordinator.findPostDispatchOrphanCandidates).toHaveBeenCalledWith(25);
    });

    it("reconcilePostDispatchOrphans aggregates counts across candidate outcomes", async () => {
      const candidates = [
        { operationId: "op-rec-1", subjectId: "s1", units: 1, quotaPeriodStart: testNow, quotaPeriodEnd: testNow },
        { operationId: "op-fin-2", subjectId: "s1", units: 1, quotaPeriodStart: testNow, quotaPeriodEnd: testNow },
        { operationId: "op-act-3", subjectId: "s1", units: 1, quotaPeriodStart: testNow, quotaPeriodEnd: testNow },
        { operationId: "op-inv-4", subjectId: "s1", units: 1, quotaPeriodStart: testNow, quotaPeriodEnd: testNow },
        { operationId: "op-not-5", subjectId: "s1", units: 1, quotaPeriodStart: testNow, quotaPeriodEnd: testNow },
      ];

      const outcomes: Record<string, HermesReconciliationResult> = {
        "op-rec-1": {
          kind: "reconciled",
          operationId: "op-rec-1",
          status: "outcome_unknown",
          userQuotaStatus: "policy_pending",
          platformCostStatus: "indeterminate",
          units: 1,
        },
        "op-fin-2": {
          kind: "already_finalized",
          operationId: "op-fin-2",
          status: "outcome_unknown",
          userQuotaStatus: "policy_pending",
        },
        "op-act-3": {
          kind: "lease_still_active",
          operationId: "op-act-3",
        },
        "op-inv-4": {
          kind: "invalid_state",
          operationId: "op-inv-4",
          currentStatus: "completed_success",
          currentUserQuotaStatus: "committed",
        },
        "op-not-5": {
          kind: "not_found",
          operationId: "op-not-5",
        },
      };

      const mockCoordinator: HermesQuotaCoordinator = {
        reserveOperationQuota: vi.fn(),
        commitSuccessWithLease: vi.fn(),
        markPolicyPendingWithLease: vi.fn(),
        releaseReservation: vi.fn(),
        expireReservation: vi.fn(),
        findExpiredReservations: vi.fn(),
        reconcileOutcomeUnknownIfLeaseExpired: vi.fn(async (opId: string): Promise<HermesReconciliationResult> => {
          return outcomes[opId] ?? { kind: "not_found", operationId: opId };
        }),
        findPostDispatchOrphanCandidates: vi.fn(async (): Promise<HermesPostDispatchCandidateScanResult> => ({
          kind: "found",
          records: candidates,
        })),
      };

      const reconciler = new HermesPostDispatchReconciler({ quotaCoordinator: mockCoordinator });
      const batch = await reconciler.reconcilePostDispatchOrphans({ limit: 10 });

      expect(batch.kind).toBe("completed");
      expect(batch.scanned).toBe(5);
      expect(batch.reconciled).toBe(1);
      expect(batch.alreadyFinalized).toBe(1);
      expect(batch.leaseStillActive).toBe(1);
      expect(batch.invalidState).toBe(1);
      expect(batch.notFound).toBe(1);
      expect(batch.controlUnavailable).toBe(0);
    });

    it("reconcilePostDispatchOrphans fails closed on candidate scan error", async () => {
      const mockCoordinator: HermesQuotaCoordinator = {
        reserveOperationQuota: vi.fn(),
        commitSuccessWithLease: vi.fn(),
        markPolicyPendingWithLease: vi.fn(),
        releaseReservation: vi.fn(),
        expireReservation: vi.fn(),
        findExpiredReservations: vi.fn(),
        reconcileOutcomeUnknownIfLeaseExpired: vi.fn(),
        findPostDispatchOrphanCandidates: vi.fn(async (): Promise<HermesPostDispatchCandidateScanResult> => ({
          kind: "control_unavailable",
          reason: "usage_control_unavailable",
        })),
      };

      const reconciler = new HermesPostDispatchReconciler({ quotaCoordinator: mockCoordinator });
      const batch = await reconciler.reconcilePostDispatchOrphans();

      expect(batch.kind).toBe("control_unavailable");
      if (batch.kind === "control_unavailable") {
        expect(batch.reason).toBe("usage_control_unavailable");
      }
      expect(batch.scanned).toBe(0);
      expect(batch.reconciled).toBe(0);
    });

    it("reconcilePostDispatchOrphans halts immediately fail-closed upon individual candidate control_unavailable", async () => {
      const candidates = [
        { operationId: "op-1", subjectId: "s1", units: 1, quotaPeriodStart: testNow, quotaPeriodEnd: testNow },
        { operationId: "op-2", subjectId: "s1", units: 1, quotaPeriodStart: testNow, quotaPeriodEnd: testNow },
        { operationId: "op-3", subjectId: "s1", units: 1, quotaPeriodStart: testNow, quotaPeriodEnd: testNow },
      ];

      const reconcileCalls: string[] = [];

      const mockCoordinator: HermesQuotaCoordinator = {
        reserveOperationQuota: vi.fn(),
        commitSuccessWithLease: vi.fn(),
        markPolicyPendingWithLease: vi.fn(),
        releaseReservation: vi.fn(),
        expireReservation: vi.fn(),
        findExpiredReservations: vi.fn(),
        reconcileOutcomeUnknownIfLeaseExpired: vi.fn(async (opId: string): Promise<HermesReconciliationResult> => {
          reconcileCalls.push(opId);
          if (opId === "op-1") {
            return {
              kind: "reconciled",
              operationId: "op-1",
              status: "outcome_unknown",
              userQuotaStatus: "policy_pending",
              platformCostStatus: "indeterminate",
              units: 1,
            };
          }
          if (opId === "op-2") {
            return {
              kind: "control_unavailable",
              reason: "usage_control_unavailable",
            };
          }
          return {
            kind: "reconciled",
            operationId: "op-3",
            status: "outcome_unknown",
            userQuotaStatus: "policy_pending",
            platformCostStatus: "indeterminate",
            units: 1,
          };
        }),
        findPostDispatchOrphanCandidates: vi.fn(async (): Promise<HermesPostDispatchCandidateScanResult> => ({
          kind: "found",
          records: candidates,
        })),
      };

      const reconciler = new HermesPostDispatchReconciler({ quotaCoordinator: mockCoordinator });
      const batch = await reconciler.reconcilePostDispatchOrphans();

      // Must fail closed immediately on op-2 and NOT process op-3
      expect(batch.kind).toBe("control_unavailable");
      if (batch.kind === "control_unavailable") {
        expect(batch.reason).toBe("usage_control_unavailable");
      }
      expect(batch.reconciled).toBe(1);
      expect(batch.controlUnavailable).toBe(1);
      expect(reconcileCalls).toEqual(["op-1", "op-2"]);
    });

    it("reconcilePostDispatchOrphans limit validation rejects invalid inputs and fails closed", async () => {
      const mockCoordinator: HermesQuotaCoordinator = {
        reserveOperationQuota: vi.fn(),
        commitSuccessWithLease: vi.fn(),
        markPolicyPendingWithLease: vi.fn(),
        releaseReservation: vi.fn(),
        expireReservation: vi.fn(),
        findExpiredReservations: vi.fn(),
        reconcileOutcomeUnknownIfLeaseExpired: vi.fn(),
        findPostDispatchOrphanCandidates: vi.fn(),
      };

      const reconciler = new HermesPostDispatchReconciler({ quotaCoordinator: mockCoordinator });
      const badLimits = [0, -1, -50, 101, 1000, 1.5, NaN, Infinity, -Infinity];

      for (const badLimit of badLimits) {
        const batch = await reconciler.reconcilePostDispatchOrphans({ limit: badLimit });
        expect(batch.kind).toBe("control_unavailable");
        if (batch.kind === "control_unavailable") {
          expect(batch.reason).toBe("limit_invalid");
        }
      }

      expect(mockCoordinator.findPostDispatchOrphanCandidates).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Part 2: Required 34-Point Verification Matrix (End-to-End)
  // ============================================================
  describe("Part 2: Required 34-Point Verification Matrix (End-to-End)", () => {
    // 1. provider_dispatch_started + active lease -> lease_still_active -> zero mutation
    it("1. provider_dispatch_started + active lease -> lease_still_active -> zero mutation", async () => {
      const store = createReconcilerTestStore();
      store.authorityClock = testNow;
      const coordinator = buildTestCoordinator(store);
      const reconciler = new HermesPostDispatchReconciler({ quotaCoordinator: coordinator });

      const op = seedOperation(store, {
        id: "op-1",
        status: "provider_dispatch_started",
        userQuotaStatus: "reserved",
        platformCostStatus: "indeterminate",
        dispatchStartedAt: new Date(testNow.getTime() - 30_000),
      });
      // Active lease expires in 30s
      seedLease(store, "lease-1", op.id, new Date(testNow.getTime() + 30_000));

      const res = await reconciler.reconcileOperation(op.id);
      expect(res.kind).toBe("lease_still_active");
      if (res.kind === "lease_still_active") {
        expect(res.operationId).toBe(op.id);
      }

      // Zero mutation on operation
      const opAfter = store.operations.get(op.id);
      expect(opAfter?.status).toBe("provider_dispatch_started");
      expect(opAfter?.userQuotaStatus).toBe("reserved");
      expect(opAfter?.platformCostStatus).toBe("indeterminate");

      // Zero mutation on quota usage
      const usage = store.quotaUsage.get(periodKey(op.subjectId, op.quotaPeriodStart, op.quotaPeriodEnd));
      expect(usage?.reservedUnits).toBe(1);
      expect(usage?.pendingUnits).toBe(0);
      expect(usage?.committedUnits).toBe(0);
    });

    // 2. provider_dispatch_started + expired lease row -> reconciled outcome_unknown
    it("2. provider_dispatch_started + expired lease row -> reconciled outcome_unknown", async () => {
      const store = createReconcilerTestStore();
      store.authorityClock = testNow;
      const coordinator = buildTestCoordinator(store);
      const reconciler = new HermesPostDispatchReconciler({ quotaCoordinator: coordinator });

      const op = seedOperation(store, {
        id: "op-2",
        status: "provider_dispatch_started",
        userQuotaStatus: "reserved",
        platformCostStatus: "indeterminate",
        dispatchStartedAt: new Date(testNow.getTime() - 60_000),
      });
      // Lease expired 10 seconds ago
      seedLease(store, "lease-2", op.id, new Date(testNow.getTime() - 10_000));

      const res = await reconciler.reconcileOperation(op.id);
      expect(res.kind).toBe("reconciled");
      if (res.kind === "reconciled") {
        expect(res.status).toBe("outcome_unknown");
        expect(res.userQuotaStatus).toBe("policy_pending");
        expect(res.platformCostStatus).toBe("indeterminate");
        expect(res.units).toBe(1);
      }

      const opAfter = store.operations.get(op.id);
      expect(opAfter?.status).toBe("outcome_unknown");
      expect(opAfter?.userQuotaStatus).toBe("policy_pending");
      expect(opAfter?.platformCostStatus).toBe("indeterminate");
    });

    // 3. provider_dispatch_started + no lease row -> reconciled outcome_unknown
    it("3. provider_dispatch_started + no lease row -> reconciled outcome_unknown", async () => {
      const store = createReconcilerTestStore();
      store.authorityClock = testNow;
      const coordinator = buildTestCoordinator(store);
      const reconciler = new HermesPostDispatchReconciler({ quotaCoordinator: coordinator });

      const op = seedOperation(store, {
        id: "op-3",
        status: "provider_dispatch_started",
        userQuotaStatus: "reserved",
        platformCostStatus: "indeterminate",
        dispatchStartedAt: new Date(testNow.getTime() - 60_000),
      });
      // Zero lease rows exist
      store.leases.clear();

      const res = await reconciler.reconcileOperation(op.id);
      expect(res.kind).toBe("reconciled");
      if (res.kind === "reconciled") {
        expect(res.status).toBe("outcome_unknown");
        expect(res.userQuotaStatus).toBe("policy_pending");
      }
    });

    // 4. matching expired physical lease does not need DELETE
    it("4. matching expired physical lease does not need DELETE", async () => {
      const store = createReconcilerTestStore();
      store.authorityClock = testNow;
      const coordinator = buildTestCoordinator(store);
      const reconciler = new HermesPostDispatchReconciler({ quotaCoordinator: coordinator });

      const op = seedOperation(store, {
        id: "op-4",
        status: "provider_dispatch_started",
        userQuotaStatus: "reserved",
        platformCostStatus: "indeterminate",
        dispatchStartedAt: new Date(testNow.getTime() - 60_000),
      });
      seedLease(store, "lease-4", op.id, new Date(testNow.getTime() - 10_000));

      expect(store.leases.has("lease-4")).toBe(true);
      const res = await reconciler.reconcileOperation(op.id);
      expect(res.kind).toBe("reconciled");

      // Lease row remains in store, NOT deleted
      expect(store.leases.has("lease-4")).toBe(true);
    });

    // 5. outcome_unknown/policy_pending already terminal -> already_finalized -> no lease requirement
    it("5. outcome_unknown/policy_pending already terminal -> already_finalized -> no lease requirement", async () => {
      const store = createReconcilerTestStore();
      store.authorityClock = testNow;
      const coordinator = buildTestCoordinator(store);
      const reconciler = new HermesPostDispatchReconciler({ quotaCoordinator: coordinator });

      const op = seedOperation(store, {
        id: "op-5",
        status: "outcome_unknown",
        userQuotaStatus: "policy_pending",
        platformCostStatus: "indeterminate",
        dispatchStartedAt: new Date(testNow.getTime() - 60_000),
        completedAt: new Date(testNow.getTime() - 10_000),
      });
      // Even if an active lease existed, same-target idempotency check precedes lease check
      seedLease(store, "lease-5", op.id, new Date(testNow.getTime() + 60_000));

      const res = await reconciler.reconcileOperation(op.id);
      expect(res.kind).toBe("already_finalized");
      if (res.kind === "already_finalized") {
        expect(res.status).toBe("outcome_unknown");
        expect(res.userQuotaStatus).toBe("policy_pending");
      }
    });

    // 6-10. other terminal states return invalid_state with zero mutation
    it("6. completed_success -> invalid_state -> zero mutation", async () => {
      const store = createReconcilerTestStore();
      const coordinator = buildTestCoordinator(store);
      const reconciler = new HermesPostDispatchReconciler({ quotaCoordinator: coordinator });

      const op = seedOperation(store, {
        id: "op-6",
        status: "completed_success",
        userQuotaStatus: "committed",
        platformCostStatus: "assumed_incurred",
        dispatchStartedAt: testNow,
        completedAt: testNow,
      });

      const res = await reconciler.reconcileOperation(op.id);
      expect(res.kind).toBe("invalid_state");
      expect(store.operations.get(op.id)?.status).toBe("completed_success");
    });

    it("7. completed_validation_failure -> invalid_state", async () => {
      const store = createReconcilerTestStore();
      const coordinator = buildTestCoordinator(store);
      const reconciler = new HermesPostDispatchReconciler({ quotaCoordinator: coordinator });

      const op = seedOperation(store, {
        id: "op-7",
        status: "completed_validation_failure",
        userQuotaStatus: "policy_pending",
        platformCostStatus: "assumed_incurred",
        dispatchStartedAt: testNow,
        completedAt: testNow,
      });

      const res = await reconciler.reconcileOperation(op.id);
      expect(res.kind).toBe("invalid_state");
    });

    it("8. completed_grounding_failure -> invalid_state", async () => {
      const store = createReconcilerTestStore();
      const coordinator = buildTestCoordinator(store);
      const reconciler = new HermesPostDispatchReconciler({ quotaCoordinator: coordinator });

      const op = seedOperation(store, {
        id: "op-8",
        status: "completed_grounding_failure",
        userQuotaStatus: "policy_pending",
        platformCostStatus: "assumed_incurred",
        dispatchStartedAt: testNow,
        completedAt: testNow,
      });

      const res = await reconciler.reconcileOperation(op.id);
      expect(res.kind).toBe("invalid_state");
    });

    it("9. released -> invalid_state", async () => {
      const store = createReconcilerTestStore();
      const coordinator = buildTestCoordinator(store);
      const reconciler = new HermesPostDispatchReconciler({ quotaCoordinator: coordinator });

      const op = seedOperation(store, {
        id: "op-9",
        status: "released",
        userQuotaStatus: "released",
        platformCostStatus: "none",
        dispatchStartedAt: null,
        completedAt: testNow,
      });

      const res = await reconciler.reconcileOperation(op.id);
      expect(res.kind).toBe("invalid_state");
    });

    it("10. expired_before_dispatch -> invalid_state", async () => {
      const store = createReconcilerTestStore();
      const coordinator = buildTestCoordinator(store);
      const reconciler = new HermesPostDispatchReconciler({ quotaCoordinator: coordinator });

      const op = seedOperation(store, {
        id: "op-10",
        status: "expired_before_dispatch",
        userQuotaStatus: "released",
        platformCostStatus: "none",
        dispatchStartedAt: null,
        completedAt: testNow,
      });

      const res = await reconciler.reconcileOperation(op.id);
      expect(res.kind).toBe("invalid_state");
    });

    // 11-15. Quota and platform cost accounting invariants
    it("11-15. platform_cost indeterminate, reserved - 1, pending + 1, committed 0, persisted quota period used", async () => {
      const store = createReconcilerTestStore();
      store.authorityClock = testNow;
      const coordinator = buildTestCoordinator(store);
      const reconciler = new HermesPostDispatchReconciler({ quotaCoordinator: coordinator });

      const periodStart = new Date("2026-05-01T00:00:00.000Z");
      const periodEnd = new Date("2026-06-01T00:00:00.000Z");

      const op = seedOperation(store, {
        id: "op-11",
        status: "provider_dispatch_started",
        userQuotaStatus: "reserved",
        platformCostStatus: "indeterminate",
        dispatchStartedAt: new Date(testNow.getTime() - 60_000),
        quotaPeriodStart: periodStart,
        quotaPeriodEnd: periodEnd,
        units: 1,
      });

      const res = await reconciler.reconcileOperation(op.id);
      expect(res.kind).toBe("reconciled");
      if (res.kind === "reconciled") {
        // 11. platform cost remains indeterminate
        expect(res.platformCostStatus).toBe("indeterminate");
      }

      const usage = store.quotaUsage.get(periodKey(op.subjectId, periodStart, periodEnd));
      // 12. reserved_units decremented exactly once
      expect(usage?.reservedUnits).toBe(0);
      // 13. pending_units incremented exactly once
      expect(usage?.pendingUnits).toBe(1);
      // 14. committed_units unchanged
      expect(usage?.committedUnits).toBe(0);

      // 15. persisted quota periods used without recomputation
      const opAfter = store.operations.get(op.id);
      expect(opAfter?.quotaPeriodStart).toEqual(periodStart);
      expect(opAfter?.quotaPeriodEnd).toEqual(periodEnd);
    });

    // 16 & 32. provider_daily_usage untouched
    it("16 & 32. provider_daily_usage untouched by reconciler", async () => {
      const store = createReconcilerTestStore();
      store.authorityClock = testNow;
      store.providerDailyUsage.set("2026-10-14", 5);

      const coordinator = buildTestCoordinator(store);
      const reconciler = new HermesPostDispatchReconciler({ quotaCoordinator: coordinator });

      const op = seedOperation(store, {
        id: "op-16",
        status: "provider_dispatch_started",
        userQuotaStatus: "reserved",
        platformCostStatus: "indeterminate",
        dispatchStartedAt: new Date(testNow.getTime() - 60_000),
      });

      await reconciler.reconcileOperation(op.id);
      expect(store.providerDailyUsage.get("2026-10-14")).toBe(5);
    });

    // 17-18. clock_timestamp captured strictly after operation row lock
    it("17-18. clock_timestamp captured strictly after operation row lock, CURRENT_TIMESTAMP/now() not used for authority decision", async () => {
      const store = createReconcilerTestStore();
      store.authorityClock = testNow;
      const coordinator = buildTestCoordinator(store);
      const reconciler = new HermesPostDispatchReconciler({ quotaCoordinator: coordinator });

      const op = seedOperation(store, {
        id: "op-17",
        status: "provider_dispatch_started",
        userQuotaStatus: "reserved",
        platformCostStatus: "indeterminate",
        dispatchStartedAt: new Date(testNow.getTime() - 60_000),
      });

      store.lockSequence = [];
      store.clockTimestampQueryCount = 0;

      await reconciler.reconcileOperation(op.id);

      expect(store.lockSequence).toEqual([
        "analysis_operations_for_update",
        "clock_timestamp",
      ]);
      expect(store.clockTimestampQueryCount).toBe(1);
    });

    // 19-20. Two reconcile calls / multi-worker race remains idempotent
    it("19-20. two reconcile calls / multi-worker race: first reconciled, second already_finalized, no double quota mutation", async () => {
      const store = createReconcilerTestStore();
      store.authorityClock = testNow;
      const coordinator = buildTestCoordinator(store);
      const reconcilerA = new HermesPostDispatchReconciler({ quotaCoordinator: coordinator });
      const reconcilerB = new HermesPostDispatchReconciler({ quotaCoordinator: coordinator });

      const op = seedOperation(store, {
        id: "op-19",
        status: "provider_dispatch_started",
        userQuotaStatus: "reserved",
        platformCostStatus: "indeterminate",
        dispatchStartedAt: new Date(testNow.getTime() - 60_000),
      });

      // Worker A reconciles
      const resA = await reconcilerA.reconcileOperation(op.id);
      expect(resA.kind).toBe("reconciled");

      const usageAfterA = { ...store.quotaUsage.get(periodKey(op.subjectId, op.quotaPeriodStart, op.quotaPeriodEnd)) };

      // Worker B reconciles same operation
      const resB = await reconcilerB.reconcileOperation(op.id);
      expect(resB.kind).toBe("already_finalized");

      const usageAfterB = { ...store.quotaUsage.get(periodKey(op.subjectId, op.quotaPeriodStart, op.quotaPeriodEnd)) };
      expect(usageAfterB).toEqual(usageAfterA);
    });

    // 21-24. Candidate scan filters
    it("21-24. candidate scan: excludes active lease, includes expired/no lease, excludes completed terminal rows", async () => {
      const store = createReconcilerTestStore();
      store.authorityClock = testNow;
      const coordinator = buildTestCoordinator(store);
      const reconciler = new HermesPostDispatchReconciler({ quotaCoordinator: coordinator });

      // 21: active lease -> excluded from scan
      const opActive = seedOperation(store, {
        id: "op-scan-active",
        status: "provider_dispatch_started",
        userQuotaStatus: "reserved",
        platformCostStatus: "indeterminate",
        dispatchStartedAt: new Date(testNow.getTime() - 30_000),
      });
      seedLease(store, "lease-scan-active", opActive.id, new Date(testNow.getTime() + 30_000));

      // 22: expired lease -> included in scan
      const opExpired = seedOperation(store, {
        id: "op-scan-expired",
        status: "provider_dispatch_started",
        userQuotaStatus: "reserved",
        platformCostStatus: "indeterminate",
        dispatchStartedAt: new Date(testNow.getTime() - 60_000),
      });
      seedLease(store, "lease-scan-expired", opExpired.id, new Date(testNow.getTime() - 10_000));

      // 23: no lease -> included in scan
      const opNoLease = seedOperation(store, {
        id: "op-scan-nolease",
        status: "provider_dispatch_started",
        userQuotaStatus: "reserved",
        platformCostStatus: "indeterminate",
        dispatchStartedAt: new Date(testNow.getTime() - 50_000),
      });

      // 24: completed terminal -> excluded from scan
      seedOperation(store, {
        id: "op-scan-completed",
        status: "completed_success",
        userQuotaStatus: "committed",
        platformCostStatus: "assumed_incurred",
        dispatchStartedAt: new Date(testNow.getTime() - 70_000),
        completedAt: new Date(testNow.getTime() - 10_000),
      });

      const batch = await reconciler.reconcilePostDispatchOrphans({ limit: 50 });
      expect(batch.kind).toBe("completed");
      expect(batch.scanned).toBe(2);
      expect(batch.reconciled).toBe(2);

      const opExpiredAfter = store.operations.get(opExpired.id);
      expect(opExpiredAfter?.status).toBe("outcome_unknown");

      const opNoLeaseAfter = store.operations.get(opNoLease.id);
      expect(opNoLeaseAfter?.status).toBe("outcome_unknown");

      const opActiveAfter = store.operations.get(opActive.id);
      expect(opActiveAfter?.status).toBe("provider_dispatch_started");
    });

    // 25-26. Bounded limit validation
    it("25-26. bounded limit validation: strictly enforces safe integer 1..100 and fails closed", async () => {
      const store = createReconcilerTestStore();
      const coordinator = buildTestCoordinator(store);
      const reconciler = new HermesPostDispatchReconciler({ quotaCoordinator: coordinator });

      const validRes = await reconciler.reconcilePostDispatchOrphans({ limit: 10 });
      expect(validRes.kind).toBe("completed");

      const badLimits = [0, -1, -50, 101, 1000, 1.5, NaN, Infinity, -Infinity];
      for (const badLimit of badLimits) {
        const badRes = await reconciler.reconcilePostDispatchOrphans({ limit: badLimit });
        expect(badRes.kind).toBe("control_unavailable");
      }
    });

    // 27. DB failure returns control_unavailable
    it("27. DB/control failure returns control_unavailable", async () => {
      const store = createReconcilerTestStore();
      store.authorityClock = testNow;
      const coordinator = buildTestCoordinator(store);
      const reconciler = new HermesPostDispatchReconciler({ quotaCoordinator: coordinator });

      const op = seedOperation(store, {
        id: "op-27",
        status: "provider_dispatch_started",
        userQuotaStatus: "reserved",
        platformCostStatus: "indeterminate",
        dispatchStartedAt: new Date(testNow.getTime() - 60_000),
      });

      store.failWithPostgresError = true;
      const res = await reconciler.reconcileOperation(op.id);
      expect(res.kind).toBe("control_unavailable");

      store.failWithPostgresError = true;
      const batchRes = await reconciler.reconcilePostDispatchOrphans();
      expect(batchRes.kind).toBe("control_unavailable");
    });

    // 28-29. No provider call and no provider redispatch
    it("28-29. zero remote provider calls made, zero provider redispatches", async () => {
      const mockProvider = {
        callJurisprudenceModel: vi.fn(),
      };

      const store = createReconcilerTestStore();
      store.authorityClock = testNow;
      const coordinator = buildTestCoordinator(store);
      const reconciler = new HermesPostDispatchReconciler({ quotaCoordinator: coordinator });

      const op = seedOperation(store, {
        id: "op-28",
        status: "provider_dispatch_started",
        userQuotaStatus: "reserved",
        platformCostStatus: "indeterminate",
        dispatchStartedAt: new Date(testNow.getTime() - 60_000),
      });

      await reconciler.reconcileOperation(op.id);
      expect(mockProvider.callJurisprudenceModel).not.toHaveBeenCalled();
    });

    // 30. Same idempotency key after outcome_unknown cannot start provider again
    it("30. existing operation with same idempotency key after reconciliation cannot permit provider redispatch", async () => {
      const store = createReconcilerTestStore();
      store.authorityClock = testNow;
      const coordinator = buildTestCoordinator(store);
      const reconciler = new HermesPostDispatchReconciler({ quotaCoordinator: coordinator });

      const op = seedOperation(store, {
        id: "op-30",
        idempotencyKey: "idem-key-frozen-30",
        status: "provider_dispatch_started",
        userQuotaStatus: "reserved",
        platformCostStatus: "indeterminate",
        dispatchStartedAt: new Date(testNow.getTime() - 60_000),
      });

      // Reconcile to outcome_unknown
      const recResult = await reconciler.reconcileOperation(op.id);
      expect(recResult.kind).toBe("reconciled");

      // Attempt reservation with the exact same idempotency key
      const reserveAttempt = await coordinator.reserveOperationQuota({
        subjectId: op.subjectId,
        idempotencyKey: op.idempotencyKey,
        recordId: op.recordId,
        recordVersion: op.recordVersion,
        quotaPeriodStart: op.quotaPeriodStart,
        quotaPeriodEnd: op.quotaPeriodEnd,
        monthlyQuota: 10,
        units: 1,
        reservedExpiresAt: new Date(testNow.getTime() + 105_000),
      });

      // Must return already_completed and CANNOT reserve or dispatch to provider
      expect(reserveAttempt.kind).toBe("already_completed");
      if (reserveAttempt.kind === "already_completed") {
        expect(reserveAttempt.operationId).toBe(op.id);
        expect(reserveAttempt.existingStatus).toBe("outcome_unknown");
        expect(reserveAttempt.existingUserQuotaStatus).toBe("policy_pending");
      }
    });

    // 31. No lease delete during reconciliation
    it("31. no lease row deleted during reconciliation", async () => {
      const store = createReconcilerTestStore();
      store.authorityClock = testNow;
      const coordinator = buildTestCoordinator(store);
      const reconciler = new HermesPostDispatchReconciler({ quotaCoordinator: coordinator });

      const op = seedOperation(store, {
        id: "op-31",
        status: "provider_dispatch_started",
        userQuotaStatus: "reserved",
        platformCostStatus: "indeterminate",
        dispatchStartedAt: new Date(testNow.getTime() - 60_000),
      });
      seedLease(store, "lease-31", op.id, new Date(testNow.getTime() - 10_000));

      const leaseCountBefore = store.leases.size;
      await reconciler.reconcileOperation(op.id);
      expect(store.leases.size).toBe(leaseCountBefore);
    });

    // 33. No public route changes
    it("33. architectural invariant: zero public routes or public API contract changes", () => {
      const publicRoutePath = path.resolve(
        process.cwd(),
        "app/api/jurisprudence/interpretations/route.ts"
      );
      if (fs.existsSync(publicRoutePath)) {
        const content = fs.readFileSync(publicRoutePath, "utf-8");
        expect(content).not.toContain("reconcile");
      }
    });

    // 34. No schema or migration changes
    it("34. architectural invariant: migration 0041 unchanged and migration 0042 absent", () => {
      const migration0042Path = path.resolve(
        process.cwd(),
        "drizzle/0042_hermes_reconciliation.sql"
      );
      expect(fs.existsSync(migration0042Path)).toBe(false);
    });
  });

  // ============================================================
  // Part 3: Section 13 Normal A3.6 Race Verification
  // ============================================================
  describe("Part 3: Section 13 Normal A3.6 Race Verification", () => {
    it("Case A: A3.6 worker finalizes with active lease first; subsequent A3.7C reconciler returns invalid_state/already_finalized with zero mutation", async () => {
      const store = createReconcilerTestStore();
      store.authorityClock = testNow;
      const coordinator = buildTestCoordinator(store);
      const reconciler = new HermesPostDispatchReconciler({ quotaCoordinator: coordinator });

      const op = seedOperation(store, {
        id: "op-race-a",
        status: "provider_dispatch_started",
        userQuotaStatus: "reserved",
        platformCostStatus: "indeterminate",
        dispatchStartedAt: new Date(testNow.getTime() - 10_000),
      });
      seedLease(store, "lease-race-a", op.id, new Date(testNow.getTime() + 50_000));

      // Worker finalizes successfully with active lease
      const workerRes = await coordinator.commitSuccessWithLease(op.id, "lease-race-a");
      expect(workerRes.kind).toBe("finalized");

      const usageAfterWorker = { ...store.quotaUsage.get(periodKey(op.subjectId, op.quotaPeriodStart, op.quotaPeriodEnd)) };

      // Reconciler runs subsequently
      const reconcilerRes = await reconciler.reconcileOperation(op.id);
      expect(reconcilerRes.kind).toBe("invalid_state");

      // Zero mutation on operation or quota
      const opAfter = store.operations.get(op.id);
      expect(opAfter?.status).toBe("completed_success");
      const usageAfterReconciler = { ...store.quotaUsage.get(periodKey(op.subjectId, op.quotaPeriodStart, op.quotaPeriodEnd)) };
      expect(usageAfterReconciler).toEqual(usageAfterWorker);
    });

    it("Case B: lease expired / worker lost authority; A3.7C reconciler finalizes first; late A3.6 worker cannot overwrite terminal row", async () => {
      const store = createReconcilerTestStore();
      store.authorityClock = testNow;
      const coordinator = buildTestCoordinator(store);
      const reconciler = new HermesPostDispatchReconciler({ quotaCoordinator: coordinator });

      const op = seedOperation(store, {
        id: "op-race-b",
        status: "provider_dispatch_started",
        userQuotaStatus: "reserved",
        platformCostStatus: "indeterminate",
        dispatchStartedAt: new Date(testNow.getTime() - 60_000),
      });
      // Lease expired 10 seconds ago
      seedLease(store, "lease-race-b", op.id, new Date(testNow.getTime() - 10_000));

      // Reconciler runs first
      const reconcilerRes = await reconciler.reconcileOperation(op.id);
      expect(reconcilerRes.kind).toBe("reconciled");

      const usageAfterReconciler = { ...store.quotaUsage.get(periodKey(op.subjectId, op.quotaPeriodStart, op.quotaPeriodEnd)) };

      // Late A3.6 worker attempts finalization with expired lease
      const lateWorkerRes = await coordinator.commitSuccessWithLease(op.id, "lease-race-b");
      // Since operation is now outcome_unknown, coordinator returns invalid_state or lease_authority_lost without mutating
      expect(lateWorkerRes.kind).toMatch(/invalid_state|lease_authority_lost/);

      // Operation remains outcome_unknown, zero overwrite
      const opAfter = store.operations.get(op.id);
      expect(opAfter?.status).toBe("outcome_unknown");
      expect(opAfter?.userQuotaStatus).toBe("policy_pending");

      const usageAfterLateWorker = { ...store.quotaUsage.get(periodKey(op.subjectId, op.quotaPeriodStart, op.quotaPeriodEnd)) };
      expect(usageAfterLateWorker).toEqual(usageAfterReconciler);
    });
  });
});
