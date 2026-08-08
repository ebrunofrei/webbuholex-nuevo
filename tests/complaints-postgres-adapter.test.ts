import { describe, it, expect, vi } from "vitest";
import { createComplaintsApiPersistenceAdapter, createComplaintsWorkerPersistenceAdapter } from "@/database/adapters/complaints-postgres.adapter";
import { SanitizedDatabaseConstraintError, ComplaintPersistenceError } from "@/database/repositories/complaints.errors";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@/database/schema";

type DummyDb = PostgresJsDatabase<typeof schema>;

describe("Complaints Postgres Adapter", () => {
  it("imports without environment variables", () => {
    expect(createComplaintsApiPersistenceAdapter).toBeDefined();
  });

  it("factory accepts db correctly and validates it", () => {
    const mockDb = { transaction: vi.fn(async (cb) => cb({ select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })) })) })), execute: vi.fn() })), select: vi.fn() } as unknown as DummyDb;
    const adapter = createComplaintsApiPersistenceAdapter(mockDb);
    expect(adapter).toBeDefined();

    expect(() => createComplaintsApiPersistenceAdapter({} as unknown as DummyDb)).toThrow();
  });

  describe("findByIdempotencyDigest", () => {
    it("búsqueda selecciona solo cinco columnas, limit(1), condiciones", async () => {
      const mockLimit = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn(() => ({ limit: mockLimit }));
      const mockFrom = vi.fn(() => ({ where: mockWhere }));
      const mockSelect = vi.fn(() => ({ from: mockFrom }));

      const mockDb = { transaction: vi.fn(async (cb) => cb({ select: mockSelect, execute: vi.fn() })), select: mockSelect } as unknown as DummyDb;
      const adapter = createComplaintsApiPersistenceAdapter(mockDb);

      const res = await adapter.findByIdempotencyDigest("digest-test", 1);
      expect(res).toBeNull();

      expect(mockSelect).toHaveBeenCalledTimes(1);

      const callArgs = mockSelect.mock.calls[0] as unknown[];
      const selectArgs = callArgs[0] as Record<string, unknown>;
      const selectedKeys = Object.keys(selectArgs);
      expect(selectedKeys).toEqual(["id", "sheetNumber", "status", "submittedAt", "deadlineAt"]);
      expect(selectedKeys).toHaveLength(5);

      expect(mockFrom).toHaveBeenCalledTimes(1);
      expect(mockWhere).toHaveBeenCalledTimes(1);
      expect(mockLimit).toHaveBeenCalledWith(1);
    });

    it("resultado inexistente devuelve null", async () => {
      const mockSelect = vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })) })) }));
      const mockDb = {
        transaction: vi.fn(async (cb) => cb({ select: mockSelect, execute: vi.fn() })),
        select: mockSelect
      } as unknown as DummyDb;
      const adapter = createComplaintsApiPersistenceAdapter(mockDb);
      const res = await adapter.findByIdempotencyDigest("digest", 1);
      expect(res).toBeNull();
    });

    it("resultado existente se mapea correctamente", async () => {
      const mockDate = new Date();
      const mockRow = {
        id: "c-123",
        sheetNumber: "LR-2026-001",
        status: "received",
        submittedAt: mockDate,
        deadlineAt: "2026-08-06"
      };
      const mockSelect = vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([mockRow]) })) })) }));
      const mockDb = {
        transaction: vi.fn(async (cb) => cb({ select: mockSelect, execute: vi.fn() })),
        select: mockSelect
      } as unknown as DummyDb;

      const adapter = createComplaintsApiPersistenceAdapter(mockDb);
      const res = await adapter.findByIdempotencyDigest("digest", 1);
      expect(res).toEqual(mockRow);
    });
  });

  describe("transaction", () => {
    it("transacción delegada exactamente una vez", async () => {
      const mockDb = {
        transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => {
          return await cb({ insert: vi.fn(), execute: vi.fn() });
        }),
        select: vi.fn()
      } as unknown as DummyDb;
      const adapter = createComplaintsApiPersistenceAdapter(mockDb);

      let called = false;
      await adapter.transaction(async () => {
        called = true;
        return "ok";
      });

      expect(called).toBe(true);
      expect(mockDb.transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe("executor methods", () => {
    function createMockTx(mockResolved: unknown[]) {
      const mockReturning = vi.fn().mockResolvedValue(mockResolved);
      const mockOnConflictDoUpdate = vi.fn(() => ({ returning: mockReturning }));
      const mockValues = vi.fn(() => {
        const res = Promise.resolve(mockResolved) as unknown as Record<string, unknown>;
        res.onConflictDoUpdate = mockOnConflictDoUpdate;
        res.returning = mockReturning;
        return res;
      });
      const mockInsert = vi.fn(() => ({ values: mockValues }));

      return {
        tx: { insert: mockInsert } as unknown as DummyDb,
        mockInsert,
        mockValues,
        mockOnConflictDoUpdate,
        mockReturning
      };
    }

    it("secuencia realiza insert, returning, conflicto", async () => {
      const { tx, mockValues, mockOnConflictDoUpdate, mockReturning } = createMockTx([{ lastValue: 2 }]);
      const mockDb = { transaction: vi.fn(async (cb) => cb({ ...tx, execute: vi.fn() })), select: vi.fn() } as unknown as DummyDb;
      const adapter = createComplaintsApiPersistenceAdapter(mockDb);

      await adapter.transaction(async (executor) => {
        const seq = await executor.reserveAnnualSequence(2026);
        expect(seq).toBe(2);
      });

      expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({
        year: 2026,
        lastValue: 1
      }));
      expect(mockOnConflictDoUpdate).toHaveBeenCalledTimes(1);
      expect(mockReturning).toHaveBeenCalledTimes(1);
    });

    it("ausencia de fila de secuencia falla de forma opaca", async () => {
      const { tx } = createMockTx([]);
      const mockDb = { transaction: vi.fn(async (cb) => cb({ ...tx, execute: vi.fn() })), select: vi.fn() } as unknown as DummyDb;
      const adapter = createComplaintsApiPersistenceAdapter(mockDb);

      await expect(
        adapter.transaction(async (executor) => executor.reserveAnnualSequence(2026))
      ).rejects.toThrow(ComplaintPersistenceError);
    });

    it("fila inválida de secuencia falla", async () => {
      const { tx } = createMockTx([{ lastValue: "invalid" }]);
      const mockDb = { transaction: vi.fn(async (cb) => cb({ ...tx, execute: vi.fn() })), select: vi.fn() } as unknown as DummyDb;
      const adapter = createComplaintsApiPersistenceAdapter(mockDb);

      await expect(
        adapter.transaction(async (executor) => executor.reserveAnnualSequence(2026))
      ).rejects.toThrow(ComplaintPersistenceError);
    });

    it("insert complaint usa input exacto y returning solo id y sheetNumber", async () => {
      const { tx, mockValues, mockReturning } = createMockTx([{ id: "c-123", sheetNumber: "LR-1" }]);
      const mockDb = { transaction: vi.fn(async (cb) => cb({ ...tx, execute: vi.fn() })), select: vi.fn() } as unknown as DummyDb;
      const adapter = createComplaintsApiPersistenceAdapter(mockDb);

      const input = { sheetYear: 2026 } as unknown as import("@/database/repositories/complaints.types").ComplaintInsertInput;

      await adapter.transaction(async (executor) => {
        const res = await executor.insertComplaint(input);
        expect(res).toEqual({ id: "c-123", sheetNumber: "LR-1" });
      });

      expect(mockValues).toHaveBeenCalledWith(input);
      expect(mockReturning).toHaveBeenCalledTimes(1);
    });

    it("ausencia de fila complaint falla", async () => {
      const { tx } = createMockTx([]);
      const mockDb = { transaction: vi.fn(async (cb) => cb({ ...tx, execute: vi.fn() })), select: vi.fn() } as unknown as DummyDb;
      const adapter = createComplaintsApiPersistenceAdapter(mockDb);

      await expect(
        adapter.transaction(async (executor) => executor.insertComplaint({} as unknown as import("@/database/repositories/complaints.types").ComplaintInsertInput))
      ).rejects.toThrow(ComplaintPersistenceError);
    });

    it("insert history sin returning", async () => {
      const { tx, mockReturning } = createMockTx([]);
      const mockDb = { transaction: vi.fn(async (cb) => cb({ ...tx, execute: vi.fn() })), select: vi.fn() } as unknown as DummyDb;
      const adapter = createComplaintsApiPersistenceAdapter(mockDb);

      await adapter.transaction(async (executor) => executor.insertInitialStatusHistory({} as unknown as import("@/database/repositories/complaints.types").ComplaintStatusHistoryInsertInput));
      expect(mockReturning).not.toHaveBeenCalled();
    });

    it("insert audit sin returning", async () => {
      const { tx, mockReturning } = createMockTx([]);
      const mockDb = { transaction: vi.fn(async (cb) => cb({ ...tx, execute: vi.fn() })), select: vi.fn() } as unknown as DummyDb;
      const adapter = createComplaintsApiPersistenceAdapter(mockDb);

      await adapter.transaction(async (executor) => executor.insertCreatedAuditEvent({} as unknown as import("@/database/repositories/complaints.types").ComplaintAuditInsertInput));
      expect(mockReturning).not.toHaveBeenCalled();
    });

    it("insert outbox sin returning", async () => {
      const { tx, mockReturning } = createMockTx([]);
      const mockDb = { transaction: vi.fn(async (cb) => cb({ ...tx, execute: vi.fn() })), select: vi.fn() } as unknown as DummyDb;
      const adapter = createComplaintsApiPersistenceAdapter(mockDb);

      await adapter.transaction(async (executor) => executor.insertReceiptOutbox({} as unknown as import("@/database/repositories/complaints.types").ComplaintOutboxInsertInput));
      expect(mockReturning).not.toHaveBeenCalled();
    });
  });

  describe("Error mapping", () => {
    it("error 23505 es sanitizado con constraint_name, descarta query, parameters, detail, table, column", async () => {
      const mockDb = {
        transaction: vi.fn(async (cb) => { await cb({ execute: vi.fn() }); }).mockRejectedValue({
          code: "23505",
          constraint_name: "complaints_idempotency_key_hash_unique",
          detail: "Key (idempotency_key_hash)=(hash) already exists.",
          table_name: "complaints",
          schema_name: "public",
          query: "INSERT INTO complaints ...",
          parameters: ["hash"],
          column_name: "idempotency_key_hash"
        }),
        select: vi.fn()
      } as unknown as DummyDb;

      const adapter = createComplaintsApiPersistenceAdapter(mockDb);

      try {
        await adapter.transaction(async () => {});
        expect.fail();
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(SanitizedDatabaseConstraintError);
        const err = e as SanitizedDatabaseConstraintError;
        expect(err.code).toBe("23505");
        expect(err.constraint).toBe("complaints_idempotency_key_hash_unique");

        const raw = e as Record<string, unknown>;
        expect(raw.detail).toBeUndefined();
        expect(raw.query).toBeUndefined();
        expect(raw.parameters).toBeUndefined();
        expect(raw.table_name).toBeUndefined();
        expect(raw.column_name).toBeUndefined();
        expect(raw.cause).toBeUndefined();
      }
    });

    it("error no Postgre SQL no se falsea como constraint", async () => {
      const standardError = new Error("General error");
      const mockDb = {
        transaction: vi.fn(async (cb) => { await cb({ execute: vi.fn() }); }).mockRejectedValue(standardError),
        select: vi.fn()
      } as unknown as DummyDb;

      const adapter = createComplaintsApiPersistenceAdapter(mockDb);

      await expect(adapter.transaction(async () => {})).rejects.toThrow(standardError);
    });

    it("error 23505 sin constraint_name", async () => {
      const mockDb = {
        transaction: vi.fn(async (cb) => { await cb({ execute: vi.fn() }); }).mockRejectedValue({
          code: "23505"
        }),
        select: vi.fn()
      } as unknown as DummyDb;

      const adapter = createComplaintsApiPersistenceAdapter(mockDb);

      try {
        await adapter.transaction(async () => {});
        expect.fail();
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(SanitizedDatabaseConstraintError);
        const err = e as SanitizedDatabaseConstraintError;
        expect(err.code).toBe("23505");
        expect(err.constraint).toBeNull();
      }
    });
  });

  describe("Worker Adapter Interface Segregation", () => {
    it("factory accepts db correctly and validates it", () => {
      const mockDb = { transaction: vi.fn(), select: vi.fn() } as unknown as DummyDb;
      const adapter = createComplaintsWorkerPersistenceAdapter(mockDb);
      expect(adapter).toBeDefined();

      expect(() => createComplaintsWorkerPersistenceAdapter({} as unknown as DummyDb)).toThrow();
    });

    it("worker adapter does not expose API methods", () => {
      const mockDb = { transaction: vi.fn(), select: vi.fn() } as unknown as DummyDb;
      const workerAdapter = createComplaintsWorkerPersistenceAdapter(mockDb);

      // Verify that TypeScript blocks access to API methods (compile-time boundary)
      // @ts-expect-error - Worker adapter should not have findByIdempotencyDigest
      expect(workerAdapter.findByIdempotencyDigest).toBeUndefined();

      // @ts-expect-error - Worker adapter should not have transaction
      expect(workerAdapter.transaction).toBeUndefined();

      // @ts-expect-error - Worker adapter should not have reserveAnnualSequence
      expect(workerAdapter.reserveAnnualSequence).toBeUndefined();

      // @ts-expect-error - Worker adapter should not have insertComplaint
      expect(workerAdapter.insertComplaint).toBeUndefined();

      // @ts-expect-error - Worker adapter should not have insertInitialStatusHistory
      expect(workerAdapter.insertInitialStatusHistory).toBeUndefined();

      // @ts-expect-error - Worker adapter should not have insertCreatedAuditEvent
      expect(workerAdapter.insertCreatedAuditEvent).toBeUndefined();

      // @ts-expect-error - Worker adapter should not have insertReceiptOutbox
      expect(workerAdapter.insertReceiptOutbox).toBeUndefined();
    });
  });
});
