import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
vi.mock("server-only", () => ({}));
import { submitComplaintRuntime } from "@/lib/complaints/complaints-runtime";

vi.mock("@/database/client", () => ({
  getComplaintsApiDatabase: vi.fn(() => ({
    transaction: vi.fn(),
    select: vi.fn()
  })),
}));
vi.mock("@/database/adapters/complaints-postgres.adapter", () => ({
  createComplaintsApiPersistenceAdapter: vi.fn(() => ({})),
}));
vi.mock("@/database/repositories/complaints.repository", () => ({
  createComplaintsRepository: vi.fn(() => ({})),
}));
vi.mock("@/lib/complaints/create-complaint", () => ({
  createComplaint: vi.fn(),
}));

describe("Complaints Runtime Configuration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("COMPLAINTS_TOKEN_SECRET_V1", "");
    vi.stubEnv("COMPLAINTS_IDEMPOTENCY_SECRET_V1", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("falla si no hay token secret en producción y NO invoca base de datos", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("COMPLAINTS_IDEMPOTENCY_SECRET_V1", "12345678901234567890123456789012");

    await expect(submitComplaintRuntime({}, "key")).rejects.toThrow("missing_complaints_token_secret");

    const dbClient = await import("@/database/client");
    expect(dbClient.getComplaintsApiDatabase).not.toHaveBeenCalled();
  });

  it("falla si no hay idempotency secret en producción y NO invoca base de datos", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("COMPLAINTS_TOKEN_SECRET_V1", "12345678901234567890123456789012");

    await expect(submitComplaintRuntime({}, "key")).rejects.toThrow("missing_complaints_idempotency_secret");

    const dbClient = await import("@/database/client");
    expect(dbClient.getComplaintsApiDatabase).not.toHaveBeenCalled();
  });

  it("permite secrets inyectados en producción sin fallback", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("COMPLAINTS_TOKEN_SECRET_V1", "12345678901234567890123456789012");
    vi.stubEnv("COMPLAINTS_IDEMPOTENCY_SECRET_V1", "09876543210987654321098765432109");

    await expect(submitComplaintRuntime({}, "key")).resolves.toBeUndefined();
  });
});
