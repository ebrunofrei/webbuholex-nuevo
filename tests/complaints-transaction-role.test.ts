import { describe, it, expect, vi } from "vitest";
import { withComplaintsApiRole, withComplaintsWorkerRole, withComplaintsAdminRole } from "@/database/roles";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@/database/schema";

type DummyDb = PostgresJsDatabase<typeof schema>;

describe("Complaints Transaction Role Boundary", () => {
  it("API Role: enforces strict order BEGIN -> SET LOCAL ROLE -> callback -> COMMIT and preserves return value", async () => {
    const executedStatements: string[] = [];
    const mockTx = {
      execute: vi.fn(async (query) => {
        const str = typeof query === "string" ? query : query?.query?.sql || JSON.stringify(query);
        executedStatements.push("execute:" + str);
      }),
      select: vi.fn(async () => {
        executedStatements.push("business_query");
      }),
    };

    const mockDb = {
      transaction: vi.fn(async (cb) => {
        executedStatements.push("BEGIN");
        const res = await cb(mockTx);
        executedStatements.push("COMMIT");
        return res;
      })
    } as unknown as DummyDb;

    let callbackExecuted = false;
    const result = await withComplaintsApiRole(mockDb, async (tx) => {
      callbackExecuted = true;
      await tx.select();
      return "api_success";
    });

    expect(callbackExecuted).toBe(true);
    expect(result).toBe("api_success");
    expect(executedStatements).toHaveLength(4);
    expect(executedStatements[0]).toBe("BEGIN");
    expect(executedStatements[1]).toContain("SET LOCAL ROLE complaints_api_runtime");
    expect(executedStatements[2]).toBe("business_query");
    expect(executedStatements[3]).toBe("COMMIT");
  });

  it("API Role: FAIL CLOSED if SET LOCAL ROLE fails, business query is never called", async () => {
    const mockTx = {
      execute: vi.fn().mockRejectedValue(new Error("Permission Denied API")),
      select: vi.fn(),
    };

    const mockDb = {
      transaction: vi.fn(async (cb) => {
        return await cb(mockTx);
      })
    } as unknown as DummyDb;

    let callbackExecuted = false;
    await expect(withComplaintsApiRole(mockDb, async (tx) => {
      callbackExecuted = true;
      await tx.select();
    })).rejects.toThrow("Permission Denied API");

    expect(callbackExecuted).toBe(false);
    expect(mockTx.select).not.toHaveBeenCalled();
    expect(mockTx.execute).toHaveBeenCalledTimes(1);
  });

  it("Worker Role: enforces strict order BEGIN -> SET LOCAL ROLE -> callback -> COMMIT and preserves return value", async () => {
    const executedStatements: string[] = [];
    const mockTx = {
      execute: vi.fn(async (query) => {
        const str = typeof query === "string" ? query : query?.query?.sql || JSON.stringify(query);
        executedStatements.push("execute:" + str);
      }),
      select: vi.fn(async () => {
        executedStatements.push("business_query");
      }),
    };

    const mockDb = {
      transaction: vi.fn(async (cb) => {
        executedStatements.push("BEGIN");
        const res = await cb(mockTx);
        executedStatements.push("COMMIT");
        return res;
      })
    } as unknown as DummyDb;

    let callbackExecuted = false;
    const result = await withComplaintsWorkerRole(mockDb, async (tx) => {
      callbackExecuted = true;
      await tx.select();
      return "worker_success";
    });

    expect(callbackExecuted).toBe(true);
    expect(result).toBe("worker_success");
    expect(executedStatements).toHaveLength(4);
    expect(executedStatements[0]).toBe("BEGIN");
    expect(executedStatements[1]).toContain("SET LOCAL ROLE complaints_outbox_worker");
    expect(executedStatements[2]).toBe("business_query");
    expect(executedStatements[3]).toBe("COMMIT");
  });

  it("Worker Role: FAIL CLOSED if SET LOCAL ROLE fails, business query is never called", async () => {
    const mockTx = {
      execute: vi.fn().mockRejectedValue(new Error("Permission Denied Worker")),
      select: vi.fn(),
    };

    const mockDb = {
      transaction: vi.fn(async (cb) => {
        return await cb(mockTx);
      })
    } as unknown as DummyDb;

    let callbackExecuted = false;
    await expect(withComplaintsWorkerRole(mockDb, async (tx) => {
      callbackExecuted = true;
      await tx.select();
    })).rejects.toThrow("Permission Denied Worker");

    expect(callbackExecuted).toBe(false);
    expect(mockTx.select).not.toHaveBeenCalled();
    expect(mockTx.execute).toHaveBeenCalledTimes(1);
  });

  it("Admin Role: enforces strict order BEGIN -> SET LOCAL ROLE -> callback -> COMMIT and preserves return value", async () => {
    const executedStatements: string[] = [];
    const mockTx = {
      execute: vi.fn(async (query) => {
        const str = typeof query === "string" ? query : query?.query?.sql || JSON.stringify(query);
        executedStatements.push("execute:" + str);
      }),
      select: vi.fn(async () => {
        executedStatements.push("business_query");
      }),
    };

    const mockDb = {
      transaction: vi.fn(async (cb) => {
        executedStatements.push("BEGIN");
        const res = await cb(mockTx);
        executedStatements.push("COMMIT");
        return res;
      })
    } as unknown as DummyDb;

    let callbackExecuted = false;
    const result = await withComplaintsAdminRole(mockDb, async (tx) => {
      callbackExecuted = true;
      await tx.select();
      return "admin_success";
    });

    expect(callbackExecuted).toBe(true);
    expect(result).toBe("admin_success");
    expect(executedStatements).toHaveLength(4);
    expect(executedStatements[0]).toBe("BEGIN");
    expect(executedStatements[1]).toContain("SET LOCAL ROLE complaints_admin_runtime");
    expect(executedStatements[2]).toBe("business_query");
    expect(executedStatements[3]).toBe("COMMIT");
  });

  it("Admin Role: FAIL CLOSED if SET LOCAL ROLE fails, business query is never called", async () => {
    const mockTx = {
      execute: vi.fn().mockRejectedValue(new Error("Permission Denied Admin")),
      select: vi.fn(),
    };

    const mockDb = {
      transaction: vi.fn(async (cb) => {
        return await cb(mockTx);
      })
    } as unknown as DummyDb;

    let callbackExecuted = false;
    await expect(withComplaintsAdminRole(mockDb, async (tx) => {
      callbackExecuted = true;
      await tx.select();
    })).rejects.toThrow("Permission Denied Admin");

    expect(callbackExecuted).toBe(false);
    expect(mockTx.select).not.toHaveBeenCalled();
    expect(mockTx.execute).toHaveBeenCalledTimes(1);
  });
});
