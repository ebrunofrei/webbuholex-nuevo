import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/internal/cron/jurisprudence-publication/route";
import * as outboxHost from "@/lib/jurisprudence/jurisprudence-publication-outbox-host";

vi.mock("@/lib/jurisprudence/jurisprudence-publication-outbox-host", () => ({
  runJurisprudencePublicationOutboxHost: vi.fn(),
}));

describe("Jurisprudence Publication Cron Route", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
  });

  const createRequest = (authHeader: string | null) => {
    const headers = new Headers();
    if (authHeader !== null) {
      headers.set("Authorization", authHeader);
    }
    return new Request("http://localhost/api/internal/cron/jurisprudence-publication", {
      method: "GET",
      headers,
    });
  };

  it("fails if secret is missing in environment", async () => {
    delete process.env.CRON_SECRET;
    const req = createRequest("Bearer valid-secret");

    const res = await GET(req);
    expect(res.status).toBe(401);
    expect(outboxHost.runJurisprudencePublicationOutboxHost).not.toHaveBeenCalled();
  });

  it("fails if Authorization header is missing", async () => {
    process.env.CRON_SECRET = "valid-secret";
    const req = createRequest(null);

    const res = await GET(req);
    expect(res.status).toBe(401);
    expect(outboxHost.runJurisprudencePublicationOutboxHost).not.toHaveBeenCalled();
  });

  it("fails if wrong secret is provided", async () => {
    process.env.CRON_SECRET = "valid-secret";
    const req = createRequest("Bearer wrong-secret");

    const res = await GET(req);
    expect(res.status).toBe(401);
    expect(outboxHost.runJurisprudencePublicationOutboxHost).not.toHaveBeenCalled();
  });

  it("fails if malformed Bearer header is provided", async () => {
    process.env.CRON_SECRET = "valid-secret";
    const req = createRequest("Basic valid-secret");

    const res = await GET(req);
    expect(res.status).toBe(401);
    expect(outboxHost.runJurisprudencePublicationOutboxHost).not.toHaveBeenCalled();
  });

  it("secret is never exposed in response", async () => {
    process.env.CRON_SECRET = "valid-secret";
    const req = createRequest("Bearer wrong-secret");

    const res = await GET(req);
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain("valid-secret");
  });

  it("does not run batch if valid auth + feature OFF", async () => {
    process.env.CRON_SECRET = "valid-secret";
    process.env.JURISPRUDENCE_PUBLICATION_CRON_ENABLED = "false";
    const req = createRequest("Bearer valid-secret");

    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("DISABLED");
    expect(outboxHost.runJurisprudencePublicationOutboxHost).not.toHaveBeenCalled();
  });

  it("does not run batch if valid auth + unset feature", async () => {
    process.env.CRON_SECRET = "valid-secret";
    delete process.env.JURISPRUDENCE_PUBLICATION_CRON_ENABLED;
    const req = createRequest("Bearer valid-secret");

    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("DISABLED");
    expect(outboxHost.runJurisprudencePublicationOutboxHost).not.toHaveBeenCalled();
  });

  it("does not run batch if valid auth + malformed feature value", async () => {
    process.env.CRON_SECRET = "valid-secret";
    process.env.JURISPRUDENCE_PUBLICATION_CRON_ENABLED = "anything-else";
    const req = createRequest("Bearer valid-secret");

    const res = await GET(req);
    expect(res.status).toBe(500);
    expect(outboxHost.runJurisprudencePublicationOutboxHost).not.toHaveBeenCalled();
  });

  it("executes exactly one processBatch invocation if valid auth + feature ON", async () => {
    process.env.CRON_SECRET = "valid-secret";
    process.env.JURISPRUDENCE_PUBLICATION_CRON_ENABLED = "true";

    vi.mocked(outboxHost.runJurisprudencePublicationOutboxHost).mockResolvedValueOnce({
      status: "COMPLETED",
      runId: "run-id",
      processed: 1,
      sent: 1,
      failed: 0,
      deadLetter: 0,
      noWork: 0,
      stopReason: "MAX_ITEMS",
      durationMs: 100,
    });

    const req = createRequest("Bearer valid-secret");

    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(outboxHost.runJurisprudencePublicationOutboxHost).toHaveBeenCalledTimes(1);

    // Bounds are provided by default in runJurisprudencePublicationOutboxHost internally
    expect(outboxHost.runJurisprudencePublicationOutboxHost).toHaveBeenCalledWith(
      expect.objectContaining({
        env: process.env,
        logger: expect.anything(),
        runIdFactory: expect.any(Function),
      })
    );
  });

  it("safe HTTP failure on unexpected infrastructure error", async () => {
    process.env.CRON_SECRET = "valid-secret";
    process.env.JURISPRUDENCE_PUBLICATION_CRON_ENABLED = "true";

    vi.mocked(outboxHost.runJurisprudencePublicationOutboxHost).mockRejectedValueOnce(
      new Error("Database connection failed completely")
    );

    const req = createRequest("Bearer valid-secret");

    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = await res.json();

    expect(body).toEqual({ error: "Internal Server Error" });
    // Verify secret is not exposed and stack trace is not exposed
    expect(JSON.stringify(body)).not.toContain("valid-secret");
    expect(JSON.stringify(body)).not.toContain("Database connection failed completely");
    expect(outboxHost.runJurisprudencePublicationOutboxHost).toHaveBeenCalledTimes(1);
  });
});
