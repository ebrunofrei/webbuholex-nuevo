import { GET } from "@/app/api/internal/cron/jurisprudence-publication/route";
import { JurisprudencePublicationLogger } from "@/lib/jurisprudence/jurisprudence-publication-logger";
import { runJurisprudencePublicationOutboxHost } from "@/lib/jurisprudence/jurisprudence-publication-outbox-host";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/jurisprudence/jurisprudence-publication-outbox-host", () => {
  return {
    runJurisprudencePublicationOutboxHost: vi.fn(),
  };
});

vi.mock("@/lib/jurisprudence/jurisprudence-publication-cron-config", () => ({
  readJurisprudencePublicationCronSecret: vi.fn().mockReturnValue("test-secret"),
  isJurisprudencePublicationCronEnabled: vi.fn().mockReturnValue(true),
}));

import type { MockInstance } from "vitest";

describe("Cron Jurisprudence Publication - Safe Diagnostics", () => {
  let mockLog: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLog = vi.spyOn(JurisprudencePublicationLogger.prototype, 'log').mockImplementation(() => {});
  });

  it("TEST A: A Postgres-like error with native metadata produces safe diagnostic fields", async () => {
    const error = new Error("safe permission denied");
    Object.assign(error, {
      name: "PostgresError",
      code: "42501",
      severity: "ERROR",
      routine: "aclcheck_error",
    });

    vi.mocked(runJurisprudencePublicationOutboxHost).mockRejectedValue(error);

    const req = new Request("http://localhost", { headers: { authorization: "Bearer test-secret" } });
    const res = await GET(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toEqual({ error: "Internal Server Error" });

    expect(mockLog).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "cron_unexpected_error",
        message: "PostgresError",
        postgresCode: "42501",
        postgresSeverity: "ERROR",
        postgresRoutine: "aclcheck_error",
        postgresMessage: "safe permission denied",
      })
    );
  });

  it("TEST B: Surfacing native metadata from a nested cause when outer error is generic", async () => {
    const causeError = new Error("safe permission-denied text");
    Object.assign(causeError, {
      name: "PostgresError",
      code: "42501",
      severity: "ERROR",
      routine: "call_string_check_hook",
    });

    const outerError = new Error("k");
    outerError.name = "k";
    outerError.cause = causeError;

    vi.mocked(runJurisprudencePublicationOutboxHost).mockRejectedValue(outerError);

    const req = new Request("http://localhost", { headers: { authorization: "Bearer test-secret" } });
    const res = await GET(req);
    expect(res.status).toBe(500);

    expect(mockLog).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "cron_unexpected_error",
        message: "k",
        postgresCode: "42501",
        postgresSeverity: "ERROR",
        postgresRoutine: "call_string_check_hook",
        postgresMessage: "safe permission-denied text",
      })
    );
  });

  it("TEST C: Message containing SQL with ordinary spaces is NOT logged as postgresMessage", async () => {
    const error = new Error("SELECT * FROM secret_table");
    Object.assign(error, { name: "PostgresError", code: "42601", severity: "ERROR" });

    vi.mocked(runJurisprudencePublicationOutboxHost).mockRejectedValue(error);
    const res = await GET(new Request("http://localhost", { headers: { authorization: "Bearer test-secret" } }));
    expect(res.status).toBe(500);

    const callArg = mockLog.mock.calls[0]?.[0];
    expect(callArg?.postgresMessage).toBeUndefined();
  });

  it("TEST D: Message containing SQL split by newline/tab is also NOT logged", async () => {
    const error = new Error("SELECT\n*\nFROM secret_table");
    Object.assign(error, { name: "PostgresError", code: "42601", severity: "ERROR" });

    vi.mocked(runJurisprudencePublicationOutboxHost).mockRejectedValue(error);
    const res = await GET(new Request("http://localhost", { headers: { authorization: "Bearer test-secret" } }));
    expect(res.status).toBe(500);

    const callArg = mockLog.mock.calls[0]?.[0];
    expect(callArg?.postgresMessage).toBeUndefined();
  });

  it.each([
    ["postgres://"],
    ["postgresql://"]
  ])("TEST E: %s message is not logged", async (scheme) => {
    const error = new Error(`failed to connect to ${scheme}admin:secret123@host:5432/db`);
    Object.assign(error, { name: "PostgresError", code: "08006", severity: "FATAL" });

    vi.mocked(runJurisprudencePublicationOutboxHost).mockRejectedValue(error);
    const res = await GET(new Request("http://localhost", { headers: { authorization: "Bearer test-secret" } }));
    expect(res.status).toBe(500);

    const callArg = mockLog.mock.calls[0]?.[0];
    expect(callArg?.postgresMessage).toBeUndefined();
  });

  it("TEST F: Credential/token/secret-shaped message is not logged", async () => {
    const error = new Error("Invalid token provided in the payload");
    Object.assign(error, { name: "PostgresError", code: "28000", severity: "FATAL" });

    vi.mocked(runJurisprudencePublicationOutboxHost).mockRejectedValue(error);
    const res = await GET(new Request("http://localhost", { headers: { authorization: "Bearer test-secret" } }));
    expect(res.status).toBe(500);

    const callArg = mockLog.mock.calls[0]?.[0];
    expect(callArg?.postgresMessage).toBeUndefined();
  });

  it("TEST G: HTTP response remains exactly generic 500 without leaking metadata", async () => {
    const error = new Error("Deep internal database error");
    Object.assign(error, { name: "PostgresError", code: "XX000", severity: "PANIC" });

    vi.mocked(runJurisprudencePublicationOutboxHost).mockRejectedValue(error);
    const res = await GET(new Request("http://localhost", { headers: { authorization: "Bearer test-secret" } }));
    expect(res.status).toBe(500);
    const json = await res.json();

    expect(json).toEqual({ error: "Internal Server Error" });
    expect(json).not.toHaveProperty("postgresCode");
    expect(json).not.toHaveProperty("postgresSeverity");
    expect(json).not.toHaveProperty("postgresMessage");
  });

  it("TEST H: Bounded traversal does not walk indefinitely", async () => {
    const error1 = new Error("1");
    const error2 = new Error("2");
    const error3 = new Error("3");
    const error4 = new Error("4");
    const error5 = new Error("5");
    const error6 = new Error("6");
    const error7 = new Error("7");

    // Create a chain of causes
    Object.assign(error7, { code: "12345", name: "PostgresError" });
    Object.assign(error6, { cause: error7 });
    Object.assign(error5, { cause: error6 });
    Object.assign(error4, { cause: error5 });
    Object.assign(error3, { cause: error4 });
    Object.assign(error2, { cause: error3 });
    Object.assign(error1, { cause: error2 });

    vi.mocked(runJurisprudencePublicationOutboxHost).mockRejectedValue(error1);
    const res = await GET(new Request("http://localhost", { headers: { authorization: "Bearer test-secret" } }));
    expect(res.status).toBe(500);

    // Bounded at depth 5, so it shouldn't reach error7
    const callArg = mockLog.mock.calls[0]?.[0];
    expect(callArg?.postgresCode).toBeUndefined();
  });
});
