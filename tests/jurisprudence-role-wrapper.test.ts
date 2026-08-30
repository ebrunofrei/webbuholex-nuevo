import { describe, it, expect, vi } from "vitest";
import { withJurisprudenceAuthorizationRole } from "../database/roles";

describe("withJurisprudenceAuthorizationRole", () => {
  it("uses transaction-scoped SET LOCAL ROLE jurisprudence_authorization_runtime and executes callback only after successful assumption", async () => {
    const mockTx = {
      execute: vi.fn().mockResolvedValue(undefined),
    };
    const mockDb: Pick<Parameters<typeof withJurisprudenceAuthorizationRole>[0], "transaction"> = {
      transaction: vi.fn().mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        return await cb(mockTx);
      }),
    };

    const callback = vi.fn().mockResolvedValue("result");

    const result = await withJurisprudenceAuthorizationRole(mockDb as Parameters<typeof withJurisprudenceAuthorizationRole>[0], callback);

    expect(result).toBe("result");
    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
    expect(mockTx.execute).toHaveBeenCalledTimes(1);

    // Check that SET LOCAL ROLE was executed exactly
    const sqlCall = mockTx.execute.mock.calls[0]![0];
    // Compare the string values of the SQL object
    expect(sqlCall.queryChunks[0].value[0]).toBe("SET LOCAL ROLE jurisprudence_authorization_runtime");

    // Ensure execute happened before callback
    const executeOrder = mockTx.execute.mock.invocationCallOrder[0]!;
    const callbackOrder = callback.mock.invocationCallOrder[0]!;
    expect(executeOrder).toBeLessThan(callbackOrder);
  });
});
