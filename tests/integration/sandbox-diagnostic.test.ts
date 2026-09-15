import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "../../app/api/admin/payments/sandbox/diagnostic/route";
import * as authRuntime from "../../lib/payments/payments-admin-http-runtime";
import * as dbClient from "../../database/client";

vi.mock("../../lib/payments/payments-admin-http-runtime", () => ({
  authorizeAdminPaymentsWrite: vi.fn(),
}));

vi.mock("../../database/client", () => ({
  getDatabase: vi.fn(),
}));

describe("Preview Database Runtime Identity Diagnostic", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns 404 if not preview or development", async () => {
    process.env.VERCEL_ENV = "production";
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: "production",
      configurable: true
    });
    const res = await GET();
    expect(res.status).toBe(404);
  });

  it("returns 403 if unauthorized", async () => {
    process.env.VERCEL_ENV = "preview";
    vi.mocked(authRuntime.authorizeAdminPaymentsWrite).mockResolvedValue({ kind: "unauthenticated", reason: "missing" } as any);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns 200 with role names only when authorized", async () => {
    process.env.VERCEL_ENV = "preview";
    vi.mocked(authRuntime.authorizeAdminPaymentsWrite).mockResolvedValue({ kind: "authorized", principal: { id: "op-1", role: "admin" } } as any);

    const mockDbExecute = vi.fn().mockResolvedValue([{ currentUser: "postgres", sessionUser: "postgres" }]);
    vi.mocked(dbClient.getDatabase).mockReturnValue({ execute: mockDbExecute } as any);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ currentUser: "postgres", sessionUser: "postgres" });

    // Ensure no secrets are leaked
    expect(data.DATABASE_URL).toBeUndefined();
    expect(data.host).toBeUndefined();
    expect(data.password).toBeUndefined();

    // Verify it was a read-only query
    const sqlArg = mockDbExecute.mock.calls[0]![0];
    const queryString = JSON.stringify(sqlArg).toLowerCase();
    expect(queryString).toContain("select");
    expect(queryString).not.toContain("insert");
    expect(queryString).not.toContain("update");
    expect(queryString).not.toContain("delete");
  });

  it("returns 500 and masks error on DB failure", async () => {
    process.env.VERCEL_ENV = "preview";
    vi.mocked(authRuntime.authorizeAdminPaymentsWrite).mockResolvedValue({ kind: "authorized", principal: { id: "op-1", role: "admin" } } as any);

    const mockDbExecute = vi.fn().mockRejectedValue({ code: "42501" });
    vi.mocked(dbClient.getDatabase).mockReturnValue({ execute: mockDbExecute } as any);

    const res = await GET();
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data).toEqual({ success: false, error: "Internal Error" });
  });
});
