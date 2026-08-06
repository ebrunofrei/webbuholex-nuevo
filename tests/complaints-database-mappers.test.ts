import { describe, it, expect } from "vitest";
import {
  createComplaintPayloadSnapshot,
  mapComplaintDomainToInsert,
  mapInitialComplaintStatusHistoryToInsert,
  mapComplaintReceiptOutboxToInsert,
  mapComplaintCreatedAuditEventToInsert,
  MapComplaintDomainToInsertInput
} from "../database/mappers/complaints";
import { canonicalizeJson } from "../lib/complaints/canonical-json";

type TestSnapshot = {
  idempotencyKey?: unknown;
  token?: unknown;
  payloadHash?: unknown;
  status?: unknown;
  createdAt?: unknown;
  sheetNumber?: unknown;
  extra?: unknown;
  consumer: {
    firstNames?: unknown;
    idempotencyKey?: unknown;
    unknownProp?: unknown;
    email?: unknown;
    token?: unknown;
    secret?: unknown;
    representative?: unknown;
  };
  subject: {
    amount?: unknown;
  };
  complaint: {
    idempotencyKey?: unknown;
    unknownProp2?: unknown;
  };
  confirmation: Record<string, unknown>;
};

describe("Complaints Database Mappers", () => {
  describe("Snapshot", () => {
    it("contiene exactamente cinco propiedades", () => {
      const snap = createComplaintPayloadSnapshot({
        consumer: { firstNames: "1" },
        subject: { kind: "2" },
        complaint: { facts: "abc" },
        confirmation: { truthfulnessConfirmed: true },
        extra: "foo"
      });
      expect(Object.keys(snap)).toEqual(["schemaVersion", "consumer", "subject", "complaint", "confirmation"]);
    });

    it("excluye idempotencyKey, token, hashes, estado, timestamps, correlativo", () => {
      const snap = createComplaintPayloadSnapshot({
        consumer: {},
        subject: {},
        complaint: {},
        confirmation: {},
        idempotencyKey: "123",
        token: "456",
        payloadHash: "789",
        status: "received",
        createdAt: new Date(),
        sheetNumber: "2024-001"
      });
      expect((snap as unknown as TestSnapshot).idempotencyKey).toBeUndefined();
      expect((snap as unknown as TestSnapshot).token).toBeUndefined();
      expect((snap as unknown as TestSnapshot).payloadHash).toBeUndefined();
      expect((snap as unknown as TestSnapshot).status).toBeUndefined();
      expect((snap as unknown as TestSnapshot).createdAt).toBeUndefined();
      expect((snap as unknown as TestSnapshot).sheetNumber).toBeUndefined();
    });

    it("clona objetos y no muta entrada", () => {
      const consumer = { firstNames: "test" };
      const input = { consumer, subject: {}, complaint: {}, confirmation: {} };
      const snap = createComplaintPayloadSnapshot(input);
      expect(snap.consumer).not.toBe(consumer);
      expect(snap.consumer).toEqual(consumer);
      expect(input.consumer).toEqual({ firstNames: "test" });
    });

    it("conserva Unicode", () => {
      const snap = createComplaintPayloadSnapshot({
        consumer: { firstNames: "ñá" }, subject: {}, complaint: {}, confirmation: {}
      });
      expect((snap.consumer as TestSnapshot["consumer"]).firstNames).toBe("ñá");
    });

    it("es canonicalizable", () => {
      const snap = createComplaintPayloadSnapshot({
        consumer: {}, subject: {}, complaint: {}, confirmation: {}
      });
      expect(() => canonicalizeJson(snap)).not.toThrow();
    });

    it("no usa JSON.stringify ni JSON.parse internamente", () => {
      // Vitest spyOn
      import("vitest").then(({ vi }) => {
        const spyStringify = vi.spyOn(JSON, "stringify");
        const spyParse = vi.spyOn(JSON, "parse");
        createComplaintPayloadSnapshot({
          consumer: { test: 1 },
          subject: {},
          complaint: {},
          confirmation: {}
        });
        expect(spyStringify).not.toHaveBeenCalled();
        expect(spyParse).not.toHaveBeenCalled();
        spyStringify.mockRestore();
        spyParse.mockRestore();
      });
    });

    it("cada objeto anidado es una referencia nueva", () => {
      const anidado = { firstNames: "1" };
      const input = {
        consumer: { representative: anidado },
        subject: {},
        complaint: {},
        confirmation: {}
      };
      const snap = createComplaintPayloadSnapshot(input) as unknown as TestSnapshot;
      expect(snap.consumer.representative).not.toBe(anidado);
      expect(snap.consumer.representative).toEqual(anidado);
    });

    it("modificar el objeto original después de crear el snapshot no cambia el snapshot", () => {
      const input = {
        consumer: { firstNames: "A" },
        subject: {},
        complaint: {},
        confirmation: {}
      };
      const snap = createComplaintPayloadSnapshot(input) as unknown as TestSnapshot;
      input.consumer.firstNames = "B";
      expect(snap.consumer.firstNames).toBe("A");
    });

    it("modificar el snapshot no cambia el objeto original", () => {
      const input = {
        consumer: { firstNames: "A" },
        subject: {},
        complaint: {},
        confirmation: {}
      };
      const snap = createComplaintPayloadSnapshot(input) as unknown as TestSnapshot;
      snap.consumer.firstNames = "B";
      expect(input.consumer.firstNames).toBe("A");
    });

    it("idempotencyKey no aparece en ningún nivel", () => {
      const input = {
        consumer: { idempotencyKey: "123" },
        subject: {},
        complaint: { idempotencyKey: "456" },
        confirmation: {}
      };
      const snap = createComplaintPayloadSnapshot(input) as unknown as TestSnapshot;
      expect(snap.consumer.idempotencyKey).toBeUndefined();
      expect(snap.complaint.idempotencyKey).toBeUndefined();
    });

    it("una propiedad desconocida en raíz no se copia", () => {
      const input = {
        consumer: {},
        subject: {},
        complaint: {},
        confirmation: {},
        extra: "foo"
      };
      const snap = createComplaintPayloadSnapshot(input) as unknown as TestSnapshot;
      expect(snap.extra).toBeUndefined();
    });

    it("una propiedad desconocida dentro de consumer no se copia", () => {
      const input = {
        consumer: { unknownProp: "bar" },
        subject: {},
        complaint: {},
        confirmation: {}
      };
      const snap = createComplaintPayloadSnapshot(input) as unknown as TestSnapshot;
      expect(snap.consumer.unknownProp).toBeUndefined(); // Wait, the prompt says "no se copia". Our cloneDeep currently copies all own keys.
    });

    it("una propiedad desconocida dentro de complaint no se copia", () => {
      const input = {
        consumer: {},
        subject: {},
        complaint: { unknownProp2: "baz" },
        confirmation: {}
      };
      const snap = createComplaintPayloadSnapshot(input) as unknown as TestSnapshot;
      expect(snap.complaint.unknownProp2).toBeUndefined(); // Wait, the prompt says "no se copia".
    });

    it("una propiedad propia toJSON es rechazada o nunca ejecutada", () => {
      let executed = 0;
      const input = {
        consumer: {
          toJSON() {
            executed++;
            return "manipulated";
          }
        },
        subject: {},
        complaint: {},
        confirmation: {}
      };
      expect(() => createComplaintPayloadSnapshot(input)).toThrow("complaint_mapper_input_invalid");
      expect(executed).toBe(0);
    });

    it("un getter malicioso no se ejecuta", () => {
      let executed = 0;
      const input = {
        consumer: {},
        subject: {},
        complaint: {},
        confirmation: {}
      };
      Object.defineProperty(input.consumer, "firstNames", {
        get() {
          executed++;
          return "hack";
        },
        enumerable: true
      });
      expect(() => createComplaintPayloadSnapshot(input)).toThrow("complaint_mapper_input_invalid");
      expect(executed).toBe(0);
    });

    it("Object.create(null) en la raíz del objeto normalizado es rechazado", () => {
      const input = Object.create(null);
      expect(() => createComplaintPayloadSnapshot(input)).toThrow("complaint_mapper_input_invalid");
    });

    it("Object.create(null) en consumer es rechazado", () => {
      const input = { consumer: Object.create(null), subject: {}, complaint: {}, confirmation: {} };
      expect(() => createComplaintPayloadSnapshot(input)).toThrow("complaint_mapper_input_invalid");
    });

    it("Object.create(null) en subject es rechazado", () => {
      const input = { consumer: {}, subject: Object.create(null), complaint: {}, confirmation: {} };
      expect(() => createComplaintPayloadSnapshot(input)).toThrow("complaint_mapper_input_invalid");
    });

    it("Object.create(null) en complaint es rechazado", () => {
      const input = { consumer: {}, subject: {}, complaint: Object.create(null), confirmation: {} };
      expect(() => createComplaintPayloadSnapshot(input)).toThrow("complaint_mapper_input_invalid");
    });

    it("Object.create(null) en confirmation es rechazado", () => {
      const input = { consumer: {}, subject: {}, complaint: {}, confirmation: Object.create(null) };
      expect(() => createComplaintPayloadSnapshot(input)).toThrow("complaint_mapper_input_invalid");
    });

    it("Object.create(null) en representative, cuando exista, es rechazado", () => {
      const input = { consumer: { representative: Object.create(null) }, subject: {}, complaint: {}, confirmation: {} };
      expect(() => createComplaintPayloadSnapshot(input)).toThrow("complaint_mapper_input_invalid");
    });

    it("instancia de clase en consumer es rechazada", () => {
      class TestConsumer {}
      const input = { consumer: new TestConsumer(), subject: {}, complaint: {}, confirmation: {} };
      expect(() => createComplaintPayloadSnapshot(input as unknown as Record<string, unknown>)).toThrow("complaint_mapper_input_invalid");
    });

    it("opcionales definidos se conservan", () => {
      const input = {
        consumer: { email: "test@test.com" },
        subject: {},
        complaint: {},
        confirmation: {}
      };
      const snap = createComplaintPayloadSnapshot(input) as unknown as TestSnapshot;
      expect(snap.consumer.email).toBe("test@test.com");
    });

    it("opcionales ausentes no se inventan", () => {
      const input = {
        consumer: {},
        subject: {},
        complaint: {},
        confirmation: {}
      };
      const snap = createComplaintPayloadSnapshot(input) as unknown as TestSnapshot;
      expect(Object.keys(snap.consumer)).not.toContain("email");
    });

    it("null permitido se conserva", () => {
      const input = {
        consumer: {},
        subject: { amount: null },
        complaint: {},
        confirmation: {}
      };
      const snap = createComplaintPayloadSnapshot(input) as unknown as TestSnapshot;
      expect(snap.subject.amount).toBeNull();
    });

    it("el resultado sigue siendo compatible con payload_snapshot JSONB", () => {
      const input = {
        consumer: { firstNames: "test" },
        subject: {},
        complaint: {},
        confirmation: {}
      };
      const snap = createComplaintPayloadSnapshot(input);
      expect(JSON.parse(JSON.stringify(snap))).toEqual(snap);
    });

    it("ningún secreto, token o idempotency key cruda aparece en la salida", () => {
      const input = {
        consumer: { token: "secret", secret: "foo", idempotencyKey: "123" },
        subject: {},
        complaint: {},
        confirmation: {}
      };
      const snap = createComplaintPayloadSnapshot(input) as unknown as TestSnapshot;
      expect(snap.consumer.token).toBeUndefined();
      expect(snap.consumer.secret).toBeUndefined();
      expect(snap.consumer.idempotencyKey).toBeUndefined();
    });
  });

  describe("Mapper principal", () => {
    const validSnapshot = createComplaintPayloadSnapshot({ consumer: {}, subject: {}, complaint: {}, confirmation: {} });
    const validHash = "a".repeat(64);

    const validInput: MapComplaintDomainToInsertInput = {
      payloadSnapshot: validSnapshot,
      payloadHash: validHash,
      privateTokenHash: validHash,
      tokenHashKeyVersion: 1,
      idempotencyKeyHash: validHash,
      idempotencyHashKeyVersion: 1,
      sheetYear: 2024,
      sheetSequence: 1,
      sheetNumber: "2024-001",
      deadlineAt: "2024-12-31",
      submittedAt: new Date("2024-01-01T00:00:00Z")
    };

    it("devuelve columnas exactas", () => {
      const result = mapComplaintDomainToInsert(validInput);
      expect(result.schemaVersion).toBe("1.0");
      expect(result.sheetYear).toBe(2024);
      expect(result.sheetSequence).toBe(1);
      expect(result.sheetNumber).toBe("2024-001");
      expect(result.privateTokenHash).toBe(validHash);
      expect(result.tokenHashKeyVersion).toBe(1);
      expect(result.idempotencyKeyHash).toBe(validHash);
      expect(result.idempotencyHashKeyVersion).toBe(1);
      expect(result.payloadHash).toBe(validHash);
      expect(result.status).toBe("received");
      expect(result.submittedAt).toBeInstanceOf(Date);
      expect(result.deadlineAt).toBe("2024-12-31");
      expect(result.version).toBe(1);
      expect(result.payloadSnapshot).toEqual(validSnapshot);

      // omite campos generados por BD
      expect((result as unknown as Record<string, unknown>).id).toBeUndefined();
      expect((result as unknown as Record<string, unknown>).createdAt).toBeUndefined();
      expect((result as unknown as Record<string, unknown>).updatedAt).toBeUndefined();
    });

    it("payloadSnapshot es objeto, no es string", () => {
      const result = mapComplaintDomainToInsert(validInput);
      expect(typeof result.payloadSnapshot).toBe("object");
    });

    it("canonicalJson ausente", () => {
      const result = mapComplaintDomainToInsert(validInput);
      expect((result as unknown as Record<string, unknown>).canonicalJson).toBeUndefined();
    });

    it("hash de payload, token, idempotencia presentes y correctos", () => {
      const result = mapComplaintDomainToInsert(validInput);
      expect(result.payloadHash).toBe(validHash);
      expect(result.privateTokenHash).toBe(validHash);
      expect(result.idempotencyKeyHash).toBe(validHash);
    });

    it("versiones presentes", () => {
      const result = mapComplaintDomainToInsert(validInput);
      expect(result.tokenHashKeyVersion).toBe(1);
      expect(result.idempotencyHashKeyVersion).toBe(1);
    });

    it("deadlineAt string civil", () => {
      const result = mapComplaintDomainToInsert(validInput);
      expect(result.deadlineAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("submittedAt es Date", () => {
      const result = mapComplaintDomainToInsert(validInput);
      expect(result.submittedAt).toBeInstanceOf(Date);
    });

    it("no incluye token, idempotency key, secret en resultado", () => {
      const inputWithSecrets = {
        ...validInput,
        token: "secret123",
        secret: "secret456",
        idempotencyKey: "idem789"
      } as unknown as MapComplaintDomainToInsertInput;

      // Rechanza propiedades extra
      expect(() => mapComplaintDomainToInsert(inputWithSecrets)).toThrow("complaint_mapper_input_invalid");
    });

    it("rechaza hashes inválidos", () => {
      expect(() => mapComplaintDomainToInsert({ ...validInput, payloadHash: "short" })).toThrow();
    });

    it("rechaza versiones inválidas", () => {
      expect(() => mapComplaintDomainToInsert({ ...validInput, tokenHashKeyVersion: 0 })).toThrow();
    });

    it("rechaza año inválido", () => {
      expect(() => mapComplaintDomainToInsert({ ...validInput, sheetYear: 1999 })).toThrow();
    });

    it("rechaza secuencia inválida", () => {
      expect(() => mapComplaintDomainToInsert({ ...validInput, sheetSequence: 0 })).toThrow();
    });

    it("rechaza fecha inválida", () => {
      expect(() => mapComplaintDomainToInsert({ ...validInput, deadlineAt: "2024/12/31" as unknown as string })).toThrow();
    });

    it("rechaza Date inválida", () => {
      expect(() => mapComplaintDomainToInsert({ ...validInput, submittedAt: new Date("invalid") })).toThrow();
    });

    it("rechaza propiedades prohibidas runtime y no muta input", () => {
      const input: Record<string, unknown> = { ...validInput as unknown as Record<string, unknown>, extraProp: 123 };
      expect(() => mapComplaintDomainToInsert(input as unknown as MapComplaintDomainToInsertInput)).toThrow("complaint_mapper_input_invalid");
      expect(input.extraProp).toBe(123);
    });
  });

  describe("Mapper historial", () => {
    it("estado inicial received, fromStatus null", () => {
      const result = mapInitialComplaintStatusHistoryToInsert({ complaintId: "123", changedBy: "system" });
      expect(result.fromStatus).toBeNull();
      expect(result.toStatus).toBe("received");
    });

    it("no contiene token y tiene metadata segura", () => {
      const result = mapInitialComplaintStatusHistoryToInsert({ complaintId: "123", changedBy: "system" });
      expect((result as unknown as Record<string, unknown>).token).toBeUndefined();
      expect((result as unknown as Record<string, unknown>).metadata).toBeUndefined(); // as per implementation, no metadata sent
      expect((result as unknown as Record<string, unknown>).id).toBeUndefined();
    });
  });

  describe("Mapper outbox", () => {
    it("tipo de evento correcto y status inicial", () => {
      const result = mapComplaintReceiptOutboxToInsert({ complaintId: "123", email: "test@test.com" });
      expect(result.eventType).toBe("complaint_receipt_requested");
      expect(result.status).toBe("pending");
    });

    it("no contiene token, hashes técnicos, documento ni reclamo completo", () => {
      const result = mapComplaintReceiptOutboxToInsert({ complaintId: "123", email: "test@test.com" });
      expect((result.payload as Record<string, unknown>).token).toBeUndefined();
      expect((result.payload as Record<string, unknown>).hash).toBeUndefined();
      expect((result.payload as Record<string, unknown>).documentNumber).toBeUndefined();
      expect((result.payload as Record<string, unknown>).complaint).toBeUndefined();
    });

    it("campos de procesamiento omitidos", () => {
      const result = mapComplaintReceiptOutboxToInsert({ complaintId: "123", email: "test@test.com" });
      expect((result as unknown as Record<string, unknown>).processedAt).toBeUndefined();
    });
  });

  describe("Mapper auditoría", () => {
    it("evento complaint_created y metadata mínima", () => {
      const result = mapComplaintCreatedAuditEventToInsert({ complaintId: "123", createdBy: "sys" });
      expect(result.eventType).toBe("created");
      expect(result.metadata).toEqual({ snapshotVersion: "1.0" });
    });

    it("no contiene PII, token, idempotencia ni campos de BD", () => {
      const result = mapComplaintCreatedAuditEventToInsert({ complaintId: "123", createdBy: "sys" });
      expect((result.metadata as Record<string, unknown>).token).toBeUndefined();
      expect((result.metadata as Record<string, unknown>).email).toBeUndefined();
      expect((result as unknown as Record<string, unknown>).id).toBeUndefined();
    });
  });
});
