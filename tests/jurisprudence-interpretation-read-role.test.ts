import { describe, it, expect, vi } from "vitest";
import { withJurisprudenceInterpretationReadRole } from "../database/roles";
import { sql } from "drizzle-orm";

describe("withJurisprudenceInterpretationReadRole Wrapper", () => {
  it("uses SET LOCAL ROLE jurisprudence_interpretation_read_runtime and passes same transaction object in read-only repeatable read mode", async () => {
    const tx = {
      execute: vi.fn(async () => undefined),
    };

    let capturedOptions: unknown;

    const db = {
      transaction: vi.fn(async (callback, options) => {
        capturedOptions = options;
        return await callback(tx);
      }),
    };

    const callbackMock = vi.fn(async (receivedTx) => {
      expect(receivedTx).toBe(tx);
      return "test_success";
    });

    const result = await withJurisprudenceInterpretationReadRole(db, callbackMock);

    expect(capturedOptions).toEqual({
      isolationLevel: "repeatable read",
      accessMode: "read only",
    });

    expect(tx.execute).toHaveBeenCalledTimes(1);
    const executedSql = sql`SET LOCAL ROLE jurisprudence_interpretation_read_runtime`;
    expect(tx.execute).toHaveBeenCalledWith(executedSql);

    expect(callbackMock).toHaveBeenCalledTimes(1);
    expect(result).toBe("test_success");
  });

  it("fails closed: if SET LOCAL ROLE fails, callback must never execute", async () => {
    const error = new Error("set_local_role_permission_denied");
    const tx = {
      execute: vi.fn(async () => {
        throw error;
      }),
    };

    const db = {
      transaction: vi.fn(async (callback) => {
        return await callback(tx);
      }),
    };

    const callbackMock = vi.fn(async () => "should_not_run");

    await expect(withJurisprudenceInterpretationReadRole(db, callbackMock)).rejects.toThrow("set_local_role_permission_denied");
    expect(callbackMock).not.toHaveBeenCalled();
  });
});
