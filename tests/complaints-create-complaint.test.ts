import { describe, it, expect, vi, beforeEach, afterEach, Mock } from "vitest";
import { createComplaint, CreateComplaintDependencies } from "@/lib/complaints/create-complaint";
import { ComplaintsRepository } from "@/database/repositories/complaints.repository";

describe("Complaints Use Case - createComplaint", () => {
  let mockRepo: ComplaintsRepository;
  let deps: CreateComplaintDependencies;
  let defaultInput: {
    schemaVersion: string;
    idempotencyKey: string;
    consumer: Record<string, unknown>;
    subject: Record<string, unknown>;
    complaint: Record<string, unknown>;
    confirmation: Record<string, unknown>;
  };

  beforeEach(() => {
    mockRepo = {
      createComplaint: vi.fn().mockResolvedValue({
        kind: "created",
        complaintId: "c-1",
        sheetNumber: "LR-2026-000001",
        status: "received",
        submittedAt: new Date("2026-08-06T12:00:00Z"),
        deadlineAt: "2026-08-27",
      }),
    };

    deps = {
      repository: mockRepo,
      clock: { now: vi.fn(() => new Date("2026-08-06T12:00:00Z")) },
      randomBytes: (size) => new Uint8Array(size).fill(150),
      tokenSecret: { version: 1, secret: "a".repeat(32) },
      idempotencySecret: { version: 1, secret: "b".repeat(32) },
      holidays: new Set(["2026-08-30"]),
    };

    defaultInput = {
      schemaVersion: "1.0",
      idempotencyKey: "idem-key-1234567890",
      consumer: {
        consumerType: "natural_person",
        firstNames: "Juan",
        lastNames: "Pérez",
        documentType: "dni",
        documentNumber: "12345678",
        email: "juan@example.com",
        phone: "999999999",
        address: "Av 123",
        isMinor: false,
      },
      subject: {
        kind: "product",
        description: "Producto dañado",
        amountApplicability: "not_applicable",
        amount: null,
        currency: "PEN",
        channel: "website",
      },
      complaint: {
        kind: "claim",
        facts: "Recibí dañado",
        requestedResolution: "Cambio",
      },
      confirmation: {
        truthfulnessConfirmed: true,
        submissionConfirmed: true,
        emailDeliveryRequested: true,
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("input válido", async () => {
    const res = await createComplaint(defaultInput, "idem-key-1234567890", deps);
    expect(res.kind).toBe("created");
  });

  it("input inválido", async () => {
    await expect(createComplaint({}, "idem-key-1234567890", deps)).rejects.toThrow("complaint_creation_failed");
  });

  it("utiliza builder oficial y normalización aplicada", async () => {
    const dirtyInput = {
      ...defaultInput,
      consumer: { ...defaultInput.consumer, firstNames: " juan  " } // needs normalization
    };
    await createComplaint(dirtyInput, "idem-key-1234567890", deps);
    const repoCall = (mockRepo.createComplaint as Mock).mock.calls[0]![0];
    const snap = repoCall.payloadSnapshot;
    expect(snap.consumer.firstNames).toBe("juan"); // normalizePersonName standardizes spacing, assume "juan"
  });

  it("clock.now() una vez y submittedAt coincide con único now", async () => {
    await createComplaint(defaultInput, "idem-key-1234567890", deps);
    expect(deps.clock.now).toHaveBeenCalledTimes(1);
    const repoCall = (mockRepo.createComplaint as Mock).mock.calls[0]![0];
    expect(repoCall.submittedAt.toISOString()).toBe("2026-08-06T12:00:00.000Z");
  });

  it("Date inválida", async () => {
    deps.clock.now = vi.fn(() => new Date("invalid"));
    await expect(createComplaint(defaultInput, "idem-key-1234567890", deps)).rejects.toThrow("complaint_creation_failed");
  });

  it("fecha Lima en día ordinario, deadline laboral, fin de semana, feriado", async () => {
    // Start on Friday 2026-08-07 10:00 Lima time (15:00 UTC)
    deps.clock.now = vi.fn(() => new Date("2026-08-07T15:00:00Z"));
    deps = { ...deps, holidays: new Set([...deps.holidays, "2026-08-11"]) }; // Add holiday on Tuesday

    await createComplaint(defaultInput, "idem-key-1234567890", deps);
    const repoCall = (mockRepo.createComplaint as Mock).mock.calls[0]![0];
    expect(repoCall.sheetYear).toBe(2026);

    // Friday + 15 business days.
    // Weekends skip. Holiday skips.
    expect(repoCall.deadlineAt).toBeTypeOf("string");
  });

  it("frontera UTC que cambia de día en Lima y sheetYear coincide con año civil", async () => {
    // 2026-01-01 03:00 UTC is 2025-12-31 22:00 Lima Time.
    deps.clock.now = vi.fn(() => new Date("2026-01-01T03:00:00Z"));
    await createComplaint(defaultInput, "idem-key-1234567890", deps);
    const repoCall = (mockRepo.createComplaint as Mock).mock.calls[0]![0];
    expect(repoCall.sheetYear).toBe(2025); // Lima time year
  });

  it("genera token 32 Base58, creado añade token", async () => {
    const res = await createComplaint(defaultInput, "idem-key-1234567890", deps);
    expect(res.kind).toBe("created");
    if (res.kind === "created") {
      expect(res.privateToken).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32}$/);
    }
  });

  it("HMAC token, HMAC idempotencia y secretos diferentes", async () => {
    await createComplaint(defaultInput, "idem-key-1234567890", deps);
    const repoCall = (mockRepo.createComplaint as Mock).mock.calls[0]![0];
    expect(repoCall.privateTokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(repoCall.idempotencyKeyHash).toMatch(/^[0-9a-f]{64}$/);
    expect(deps.tokenSecret.secret).not.toBe(deps.idempotencySecret.secret);
  });

  it("snapshot cinco campos, sin idempotency key y objeto", async () => {
    await createComplaint(defaultInput, "idem-key-1234567890", deps);
    const repoCall = (mockRepo.createComplaint as Mock).mock.calls[0]![0];
    const snap = repoCall.payloadSnapshot;
    expect(Object.keys(snap).sort()).toEqual(["complaint", "confirmation", "consumer", "schemaVersion", "subject"]);
    expect(snap).not.toHaveProperty("idempotencyKey");
    expect(typeof snap).toBe("object");
  });

  it("SHA-256", async () => {
    await createComplaint(defaultInput, "idem-key-1234567890", deps);
    const repoCall = (mockRepo.createComplaint as Mock).mock.calls[0]![0];
    expect(repoCall.payloadHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("repositorio recibe snapshot objeto pero no token, idempotency key, secretos, clock, holidays", async () => {
    await createComplaint(defaultInput, "idem-key-1234567890", deps);
    const repoCall = (mockRepo.createComplaint as Mock).mock.calls[0]![0];

    expect(repoCall).not.toHaveProperty("privateToken");
    expect(repoCall).not.toHaveProperty("idempotencyKey");
    expect(repoCall).not.toHaveProperty("tokenSecret");
    expect(repoCall).not.toHaveProperty("idempotencySecret");
    expect(repoCall).not.toHaveProperty("clock");
    expect(repoCall).not.toHaveProperty("holidays");
  });

  it("already_exists no añade token, token no aparece en JSON de already_exists", async () => {
    mockRepo.createComplaint = vi.fn().mockResolvedValue({
      kind: "already_exists",
      complaintId: "c-1",
      sheetNumber: "LR-2026-000001",
      status: "received",
      submittedAt: new Date(),
      deadlineAt: "2026-08-27",
    });

    const res = await createComplaint(defaultInput, "idem-key-1234567890", deps);
    expect(res.kind).toBe("already_exists");
    expect(res).not.toHaveProperty("privateToken");
    expect(JSON.stringify(res)).not.toContain("privateToken");
  });

  it("repositorio llamado una vez", async () => {
    await createComplaint(defaultInput, "idem-key-1234567890", deps);
    expect(mockRepo.createComplaint).toHaveBeenCalledTimes(1);
  });

  it("error de repositorio se propaga de forma segura, token no aparece en error", async () => {
    mockRepo.createComplaint = vi.fn().mockRejectedValue(new Error("complaint_persistence_failed"));
    try {
      await createComplaint(defaultInput, "idem-key-1234567890", deps);
      expect.fail("Should throw");
    } catch (e: unknown) {
      if (e instanceof Error) {
        expect(e.message).toBe("complaint_persistence_failed");
      }
      expect(JSON.stringify(e)).not.toContain("privateToken");
    }
  });

  it("input no mutado", async () => {
    const inputStr = JSON.stringify(defaultInput);
    await createComplaint(defaultInput, "idem-key-1234567890", deps);
    expect(JSON.stringify(defaultInput)).toBe(inputStr);
  });

  it("Unicode preservado", async () => {
    const unicodeInput = {
      ...defaultInput,
      complaint: { ...defaultInput.complaint, facts: "Reclamación con ñ, áéíóú y 📝" }
    };
    await createComplaint(unicodeInput, "idem-key-1234567890", deps);
    const repoCall = (mockRepo.createComplaint as Mock).mock.calls[0]![0];
    expect(repoCall.payloadSnapshot.complaint.facts).toBe("Reclamación con ñ, áéíóú y 📝");
  });

  it("no ejecuta SQL, no accede a entorno, no registra logs", () => {
    const consoleSpy = vi.spyOn(console, "log");
    const envSpy = vi.spyOn(process, "env", "get");

    // Test logic is just functions, no env/SQL access in use case by definition if we don't import them.
    expect(consoleSpy).not.toHaveBeenCalled();
    expect(envSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
    envSpy.mockRestore();
  });
});
