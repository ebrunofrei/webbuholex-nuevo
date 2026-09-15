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

  it("returns 500 and logs client_init when getDatabase throws", async () => {
    process.env.VERCEL_ENV = "preview";
    vi.mocked(authRuntime.authorizeAdminPaymentsWrite).mockResolvedValue({ kind: "authorized", principal: { id: "op-1", role: "admin" } } as any);

    vi.mocked(dbClient.getDatabase).mockImplementation(() => {
      throw new Error("database_runtime_configuration_missing");
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await GET();
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data).toEqual({ success: false, error: "Internal Error" });

    expect(consoleSpy).toHaveBeenCalledWith("DATABASE DIAGNOSTIC FAILED: client_init / unknown");
    consoleSpy.mockRestore();
  });

  it("returns 500 and logs identity_query / unknown on db.execute throw without SQLSTATE", async () => {
    process.env.VERCEL_ENV = "preview";
    vi.mocked(authRuntime.authorizeAdminPaymentsWrite).mockResolvedValue({ kind: "authorized", principal: { id: "op-1", role: "admin" } } as any);

    const mockDbExecute = vi.fn().mockRejectedValue(new Error("weird error"));
    vi.mocked(dbClient.getDatabase).mockReturnValue({ execute: mockDbExecute } as any);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await GET();
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data).toEqual({ success: false, error: "Internal Error" });

    expect(consoleSpy).toHaveBeenCalledWith("DATABASE DIAGNOSTIC FAILED: identity_query / unknown");
    consoleSpy.mockRestore();
  });

  it("returns 500 and logs identity_query / connection_exception on db.execute throw with SQLSTATE 080xx", async () => {
    process.env.VERCEL_ENV = "preview";
    vi.mocked(authRuntime.authorizeAdminPaymentsWrite).mockResolvedValue({ kind: "authorized", principal: { id: "op-1", role: "admin" } } as any);

    const mockDbExecute = vi.fn().mockRejectedValue({ code: "08001" });
    vi.mocked(dbClient.getDatabase).mockReturnValue({ execute: mockDbExecute } as any);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await GET();
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data).toEqual({ success: false, error: "Internal Error" });

    expect(consoleSpy).toHaveBeenCalledWith("DATABASE DIAGNOSTIC FAILED: identity_query / connection_exception");
    consoleSpy.mockRestore();
  });

  describe("exact code classification mapping", () => {
    const cases = [
      { code: "28P01", expected: "invalid_authorization" },
      { code: "28000", expected: "invalid_authorization" },
      { code: "28ABC", expected: "invalid_authorization" },
      { code: "ENOTFOUND", expected: "dns_failure" },
      { code: "EAI_AGAIN", expected: "dns_failure" },
      { code: "ECONNREFUSED", expected: "connection_refused" },
      { code: "ECONNRESET", expected: "connection_reset" },
      { code: "ETIMEDOUT", expected: "connection_timeout" },
      { code: "57P03", expected: "cannot_connect_now" },
      { code: "3D000", expected: "invalid_database" },
      { code: "42501", expected: "insufficient_privilege" },
      { code: "XX000", expected: "internal_database_error" },
      { code: "XX123", expected: "internal_database_error" },
      { code: "XYZ123", expected: "unknown" },
    ];

    for (const { code, expected } of cases) {
      it(`maps code ${code} to identity_query / ${expected}`, async () => {
        process.env.VERCEL_ENV = "preview";
        vi.mocked(authRuntime.authorizeAdminPaymentsWrite).mockResolvedValue({ kind: "authorized", principal: { id: "op-1", role: "admin" } } as any);

        const mockDbExecute = vi.fn().mockRejectedValue({ code });
        vi.mocked(dbClient.getDatabase).mockReturnValue({ execute: mockDbExecute } as any);

        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        const res = await GET();
        expect(res.status).toBe(500);
        const data = await res.json();
        expect(data).toEqual({ success: false, error: "Internal Error" });

        expect(consoleSpy).toHaveBeenCalledWith(`DATABASE DIAGNOSTIC FAILED: identity_query / ${expected}`);
        consoleSpy.mockRestore();
      });
    }
  });
});
