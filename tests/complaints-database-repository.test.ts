import { describe, it, expect, vi, beforeEach } from "vitest";
import { createComplaintsRepository } from "@/database/repositories/complaints.repository";
import { ComplaintsPersistenceAdapter, ComplaintTransactionExecutor, CreateComplaintRepositoryInput } from "@/database/repositories/complaints.types";
import { ComplaintPersistenceError, SanitizedDatabaseConstraintError } from "@/database/repositories/complaints.errors";

describe("Complaints Database Repository", () => {
  let mockAdapter: ComplaintsPersistenceAdapter;
  let mockTx: ComplaintTransactionExecutor;
  let defaultInput: CreateComplaintRepositoryInput;
  let orderOfOperations: string[];

  beforeEach(() => {
    orderOfOperations = [];

    mockTx = {
      reserveAnnualSequence: vi.fn(async () => {
        orderOfOperations.push("sequence");
        return 1;
      }),
      insertComplaint: vi.fn(async (input) => {
        orderOfOperations.push("complaint");
        return { id: "c-123", sheetNumber: input.sheetNumber };
      }),
      insertInitialStatusHistory: vi.fn(async () => {
        orderOfOperations.push("history");
      }),
      insertCreatedAuditEvent: vi.fn(async () => {
        orderOfOperations.push("audit");
      }),
      insertReceiptOutbox: vi.fn(async () => {
        orderOfOperations.push("outbox");
      }),
    };

    mockAdapter = {
      findByIdempotencyDigest: vi.fn(async () => null),
      transaction: vi.fn(async (operation) => {
        orderOfOperations.push("tx-start");
        const res = await operation(mockTx);
        orderOfOperations.push("tx-end");
        return res;
      }),
    };

    defaultInput = {
      payloadSnapshot: {
        schemaVersion: "1.0",
        consumer: { email: "test@example.com" },
        subject: {},
        complaint: {},
        confirmation: {}
      },
      payloadHash: "a".repeat(64),
      privateTokenHash: "b".repeat(64),
      tokenHashKeyVersion: 1,
      idempotencyKeyHash: "c".repeat(64),
      idempotencyHashKeyVersion: 1,
      sheetYear: 2026,
      submittedAt: new Date("2026-08-06T12:00:00Z"),
      deadlineAt: "2026-08-27",
    };
  });

  it("búsqueda preliminar encuentra registro y retorna already_exists, no abre transacción ni reserva secuencia", async () => {
    mockAdapter.findByIdempotencyDigest = vi.fn(async () => ({
      id: "c-old",
      sheetNumber: "LR-2026-000001",
      status: "received" as const,
      submittedAt: new Date(),
      deadlineAt: "2026-08-27"
    }));

    const repo = createComplaintsRepository(mockAdapter);
    const result = await repo.createComplaint(defaultInput);

    expect(result.kind).toBe("already_exists");
    expect(mockAdapter.transaction).not.toHaveBeenCalled();
    expect(mockTx.reserveAnnualSequence).not.toHaveBeenCalled();
  });

  it("operación nueva abre una transacción con orden estricto de inserción", async () => {
    const repo = createComplaintsRepository(mockAdapter);
    await repo.createComplaint(defaultInput);

    expect(orderOfOperations).toEqual([
      "tx-start",
      "sequence",
      "complaint",
      "history",
      "audit",
      "outbox",
      "tx-end"
    ]);
  });

  it("una sola transacción es invocada", async () => {
    const repo = createComplaintsRepository(mockAdapter);
    await repo.createComplaint(defaultInput);
    expect(mockAdapter.transaction).toHaveBeenCalledTimes(1);
  });

  describe("validación de correlativo (secuencia)", () => {
    const cases = [
      { seq: 1, valid: true },
      { seq: 2, valid: true },
      { seq: 999999, valid: true },
      { seq: 0, valid: false },
      { seq: -1, valid: false },
      { seq: 1.5, valid: false },
      { seq: NaN, valid: false },
      { seq: Infinity, valid: false },
      { seq: 1000000, valid: false },
    ];

    cases.forEach(({ seq, valid }) => {
      it(`correlativo ${seq} es ${valid ? 'válido' : 'inválido'}`, async () => {
        mockTx.reserveAnnualSequence = vi.fn(async () => seq);
        const repo = createComplaintsRepository(mockAdapter);
        if (valid) {
          const res = await repo.createComplaint(defaultInput);
          expect(res.kind).toBe("created");
        } else {
          await expect(repo.createComplaint(defaultInput))
            .rejects.toThrowError("complaint_sequence_exhausted");
        }
      });
    });
  });

  it("formato de sheetNumber es correcto", async () => {
    const repo = createComplaintsRepository(mockAdapter);
    const res = await repo.createComplaint(defaultInput);
    if (res.kind === "created") {
      expect(res.sheetNumber).toBe("LR-2026-000001");
    }
  });

  it("fallo complaint provoca rechazo", async () => {
    mockTx.insertComplaint = vi.fn().mockRejectedValue(new Error("DB error"));
    const repo = createComplaintsRepository(mockAdapter);
    await expect(repo.createComplaint(defaultInput)).rejects.toThrowError("complaint_transaction_failed");
  });

  it("fallo history provoca rechazo", async () => {
    mockTx.insertInitialStatusHistory = vi.fn().mockRejectedValue(new Error("DB error"));
    const repo = createComplaintsRepository(mockAdapter);
    await expect(repo.createComplaint(defaultInput)).rejects.toThrowError("complaint_transaction_failed");
  });

  it("fallo audit provoca rechazo", async () => {
    mockTx.insertCreatedAuditEvent = vi.fn().mockRejectedValue(new Error("DB error"));
    const repo = createComplaintsRepository(mockAdapter);
    await expect(repo.createComplaint(defaultInput)).rejects.toThrowError("complaint_transaction_failed");
  });

  it("fallo outbox provoca rechazo y no devuelve resultado parcial", async () => {
    mockTx.insertReceiptOutbox = vi.fn().mockRejectedValue(new Error("DB error"));
    const repo = createComplaintsRepository(mockAdapter);
    await expect(repo.createComplaint(defaultInput)).rejects.toThrowError("complaint_transaction_failed");
  });

  describe("conflicto 23505 y recuperación idempotente", () => {
    it("conflicto 23505 exacto y constraint exacta activa recuperación fuera de transacción", async () => {
      mockTx.insertComplaint = vi.fn().mockRejectedValue(
        new SanitizedDatabaseConstraintError("23505", "complaints_idempotency_key_hash_unique")
      );
      mockAdapter.findByIdempotencyDigest = vi.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: "c-rec",
          sheetNumber: "LR-2026-000001",
          status: "received",
          submittedAt: new Date(),
          deadlineAt: "2026-08-27"
        });

      const repo = createComplaintsRepository(mockAdapter);
      const res = await repo.createComplaint(defaultInput);

      expect(res.kind).toBe("already_exists");
      expect(mockAdapter.findByIdempotencyDigest).toHaveBeenCalledTimes(2);
    });

    it("recuperación ausente produce complaint_existing_record_incomplete", async () => {
      mockTx.insertComplaint = vi.fn().mockRejectedValue(
        new SanitizedDatabaseConstraintError("23505", "complaints_idempotency_key_hash_unique")
      );
      mockAdapter.findByIdempotencyDigest = vi.fn().mockResolvedValue(null);

      const repo = createComplaintsRepository(mockAdapter);
      await expect(repo.createComplaint(defaultInput)).rejects.toThrowError("complaint_existing_record_incomplete");
    });

    it("otro 23505 no se recupera", async () => {
      mockTx.insertComplaint = vi.fn().mockRejectedValue(
        new SanitizedDatabaseConstraintError("23505", "other_unique")
      );
      const repo = createComplaintsRepository(mockAdapter);
      await expect(repo.createComplaint(defaultInput)).rejects.toThrowError("complaint_transaction_failed");
    });

    it("foreign key no se recupera", async () => {
      mockTx.insertComplaint = vi.fn().mockRejectedValue(new SanitizedDatabaseConstraintError("23503", null));
      const repo = createComplaintsRepository(mockAdapter);
      await expect(repo.createComplaint(defaultInput)).rejects.toThrowError("complaint_transaction_failed");
    });

    it("check violation no se recupera", async () => {
      mockTx.insertComplaint = vi.fn().mockRejectedValue(new SanitizedDatabaseConstraintError("23514", null));
      const repo = createComplaintsRepository(mockAdapter);
      await expect(repo.createComplaint(defaultInput)).rejects.toThrowError("complaint_transaction_failed");
    });
  });

  it("error ordinario no se expone (error final opaco)", async () => {
    mockTx.reserveAnnualSequence = vi.fn().mockRejectedValue(new Error("Sensitive DB details"));
    const repo = createComplaintsRepository(mockAdapter);
    try {
      await repo.createComplaint(defaultInput);
      expect.fail("Should throw");
    } catch (e: unknown) {
      expect(e).toBeInstanceOf(ComplaintPersistenceError);
      if (e instanceof Error) {
        expect(e.message).toBe("complaint_transaction_failed");
        expect(e.message).not.toContain("Sensitive");
      }
    }
  });

  it("no se recibe token, idempotency key ni secretos en entrada (se prueba estructuralmente por los tipos pero verificamos que no estén en input mutado)", async () => {
    const repo = createComplaintsRepository(mockAdapter);
    const inputStr = JSON.stringify(defaultInput);
    await repo.createComplaint(defaultInput);
    expect(JSON.stringify(defaultInput)).toBe(inputStr); // entrada no mutada
  });

  it("resultado created sin token", async () => {
    const repo = createComplaintsRepository(mockAdapter);
    const res = await repo.createComplaint(defaultInput);
    expect(res).not.toHaveProperty("privateToken");
  });

  it("mapper principal invocado con datos esperados y cuatro inserts comparten complaintId", async () => {
    const repo = createComplaintsRepository(mockAdapter);
    await repo.createComplaint(defaultInput);

    expect(mockTx.insertComplaint).toHaveBeenCalledWith(
      expect.objectContaining({
        payloadHash: defaultInput.payloadHash,
        privateTokenHash: defaultInput.privateTokenHash,
      })
    );

    const complaintId = "c-123";
    expect(mockTx.insertInitialStatusHistory).toHaveBeenCalledWith(expect.objectContaining({ complaintId }));
    expect(mockTx.insertCreatedAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ complaintId }));
    expect(mockTx.insertReceiptOutbox).toHaveBeenCalledWith(expect.objectContaining({ complaintId }));
  });
});
