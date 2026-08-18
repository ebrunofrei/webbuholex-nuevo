import { describe, it, expect, vi } from "vitest";
import { withJurisprudenceInternalWriteRole, JurisprudenceTransaction } from "../database/roles";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";

describe("Jurisprudence Internal Write Role Wrapper", () => {
  it("uses SET LOCAL ROLE jurisprudence_internal_write_runtime and passes same transaction object", async () => {
    // Mock the transaction object
    const txMock = {
      execute: vi.fn().mockResolvedValue(undefined),
    } as unknown as JurisprudenceTransaction;

    // Mock the database client
    const dbMock = {
      transaction: vi.fn().mockImplementation(async (callback) => {
        return await callback(txMock);
      }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as unknown as PostgresJsDatabase<any>;

    // Callback that receives the transaction
    const callbackMock = vi.fn().mockResolvedValue("success");

    // Execute the wrapper
    const result = await withJurisprudenceInternalWriteRole(dbMock, callbackMock);

    // Verify SET LOCAL ROLE was executed exactly once
    expect(txMock.execute).toHaveBeenCalledTimes(1);

    // Verify it used the correct role name
    // To check sql tagged template literal correctly in mock:
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sqlArg = vi.mocked(txMock.execute).mock.calls[0]![0] as any;
    expect(sqlArg.queryChunks[0].valueOf()).toEqual(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sql`SET LOCAL ROLE jurisprudence_internal_write_runtime` as any).queryChunks[0].valueOf()
    );

    // Verify callback was called exactly once with the same transaction object
    expect(callbackMock).toHaveBeenCalledTimes(1);
    expect(callbackMock).toHaveBeenCalledWith(txMock);

    // Verify the return value
    expect(result).toBe("success");
  });
});
