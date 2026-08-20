/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GET } from "../app/api/internal/cron/jurisprudence-publication/route";
import * as config from "../lib/jurisprudence/jurisprudence-publication-cron-config";
import * as host from "../lib/jurisprudence/jurisprudence-publication-outbox-host";
import crypto from "crypto";

// Mocking dependencies
vi.mock("../lib/jurisprudence/jurisprudence-publication-cron-config", () => ({
  readJurisprudencePublicationCronSecret: vi.fn(),
  isJurisprudencePublicationCronEnabled: vi.fn(),
}));

vi.mock("../lib/jurisprudence/jurisprudence-publication-outbox-host", () => ({
  runJurisprudencePublicationOutboxHost: vi.fn(),
}));

describe("J1-G.7 Observability", () => {
  let consoleLogSpy: any;
  const SUPER_SECRET_DO_NOT_LOG = "SUPER_SECRET_DO_NOT_LOG";
  const PRIVATE_JURISPRUDENCE_PAYLOAD_CANARY = "PRIVATE_JURISPRUDENCE_PAYLOAD_CANARY";
  const DB_URL_CANARY = "postgres://user:SUPER_SECRET@localhost:5432/db";

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(crypto, "randomUUID").mockReturnValue("test-invocation-id-123" as any);
    process.env.DATABASE_URL = DB_URL_CANARY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.DATABASE_URL;
  });

  const getLogs = () =>
    consoleLogSpy.mock.calls.map((call: any) => JSON.parse(call[0]));

  const verifyNoSecrets = () => {
    const output = consoleLogSpy.mock.calls.map((c: any) => c[0]).join(" ");
    expect(output).not.toContain(SUPER_SECRET_DO_NOT_LOG);
    expect(output).not.toContain(PRIVATE_JURISPRUDENCE_PAYLOAD_CANARY);
    expect(output).not.toContain(DB_URL_CANARY);
    expect(output).not.toContain("Authorization");
    expect(output).not.toContain("Bearer");
  };

  it("auth failure emits safe event missing_env and does not leak secret", async () => {
    (config.readJurisprudencePublicationCronSecret as any).mockReturnValue("");

    const request = new Request("http://localhost/api/internal/cron/jurisprudence-publication");

    const res = await GET(request);
    expect(res.status).toBe(401);

    const logs = getLogs();
    expect(logs).toContainEqual({
      event: "cron_request_received",
      cronInvocationId: "test-invocation-id-123"
    });
    expect(logs).toContainEqual({
      event: "cron_auth_failed",
      cronInvocationId: "test-invocation-id-123",
      reason: "missing_env"
    });

    verifyNoSecrets();
  });

  it("auth failure emits safe event missing_header and does not leak", async () => {
    (config.readJurisprudencePublicationCronSecret as any).mockReturnValue(SUPER_SECRET_DO_NOT_LOG);

    const request = new Request("http://localhost/api/internal/cron/jurisprudence-publication");

    const res = await GET(request);
    expect(res.status).toBe(401);

    const logs = getLogs();
    expect(logs).toContainEqual({
      event: "cron_auth_failed",
      cronInvocationId: "test-invocation-id-123",
      reason: "missing_header"
    });

    verifyNoSecrets();
  });

  it("auth failure emits safe event invalid_secret and does not leak provided secret", async () => {
    (config.readJurisprudencePublicationCronSecret as any).mockReturnValue(SUPER_SECRET_DO_NOT_LOG);

    const request = new Request("http://localhost/api/internal/cron/jurisprudence-publication", {
      headers: { authorization: `Bearer BAD_${SUPER_SECRET_DO_NOT_LOG}` }
    });

    const res = await GET(request);
    expect(res.status).toBe(401);

    const logs = getLogs();
    expect(logs).toContainEqual({
      event: "cron_auth_failed",
      cronInvocationId: "test-invocation-id-123",
      reason: "invalid_secret"
    });

    verifyNoSecrets();
  });

  it("feature disabled emits event and correlates with request", async () => {
    (config.readJurisprudencePublicationCronSecret as any).mockReturnValue(SUPER_SECRET_DO_NOT_LOG);
    (config.isJurisprudencePublicationCronEnabled as any).mockReturnValue(false);

    const request = new Request("http://localhost/api/internal/cron/jurisprudence-publication", {
      headers: { authorization: `Bearer ${SUPER_SECRET_DO_NOT_LOG}` }
    });

    const res = await GET(request);
    expect(res.status).toBe(200);

    const logs = getLogs();
    expect(logs).toContainEqual({
      event: "cron_disabled",
      cronInvocationId: "test-invocation-id-123",
      feature: "jurisprudence_publication_cron",
      enabled: false
    });

    verifyNoSecrets();
  });

  it("batch start, complete, and fail emit events using host logger bridge", async () => {
    (config.readJurisprudencePublicationCronSecret as any).mockReturnValue(SUPER_SECRET_DO_NOT_LOG);
    (config.isJurisprudencePublicationCronEnabled as any).mockReturnValue(true);

    (host.runJurisprudencePublicationOutboxHost as any).mockImplementation(async ({ logger, runIdFactory }: any) => {
      // Simulate host logger calls
      runIdFactory();
      logger.log("outbox_batch_started", { maxItems: 10, maxDurationMs: 5000 });
      logger.log("outbox_batch_completed", { processed: 5, sent: 3, failed: 1, deadLetter: 1, noWork: 0, stopReason: "NO_WORK", durationMs: 123 });
      logger.log("outbox_batch_failed", { durationMs: 456, errorCode: "UNEXPECTED" });
      return { status: "COMPLETED" };
    });

    const request = new Request("http://localhost/api/internal/cron/jurisprudence-publication", {
      headers: { authorization: `Bearer ${SUPER_SECRET_DO_NOT_LOG}` }
    });

    const res = await GET(request);
    expect(res.status).toBe(200);

    const logs = getLogs();

    // Check batch events
    expect(logs).toContainEqual({
      event: "outbox_batch_started",
      cronInvocationId: "test-invocation-id-123",
      maxItems: 10,
      maxDurationMs: 5000
    });

    expect(logs).toContainEqual({
      event: "outbox_batch_completed",
      cronInvocationId: "test-invocation-id-123",
      processed: 5,
      sent: 3,
      failed: 1,
      deadLetter: 1,
      noWork: 0,
      stopReason: "NO_WORK",
      durationMs: 123
    });

    expect(logs).toContainEqual({
      event: "outbox_batch_failed",
      cronInvocationId: "test-invocation-id-123",
      durationMs: 456,
      errorCode: "UNEXPECTED"
    });

    verifyNoSecrets();
  });

  it("unexpected error emits safe category and hides internal details", async () => {
    (config.readJurisprudencePublicationCronSecret as any).mockReturnValue(SUPER_SECRET_DO_NOT_LOG);
    (config.isJurisprudencePublicationCronEnabled as any).mockReturnValue(true);

    (host.runJurisprudencePublicationOutboxHost as any).mockImplementation(async () => {
      throw new Error("SECRET_CONNECTION_STRING_FAILED");
    });

    const request = new Request("http://localhost/api/internal/cron/jurisprudence-publication", {
      headers: { authorization: `Bearer ${SUPER_SECRET_DO_NOT_LOG}` }
    });

    const res = await GET(request);
    expect(res.status).toBe(500);

    const logs = getLogs();

    expect(logs).toContainEqual({
      event: "cron_unexpected_error",
      cronInvocationId: "test-invocation-id-123",
      errorCategory: "UNKNOWN",
      message: "Error" // safe error name
    });

    const output = consoleLogSpy.mock.calls.map((c: any) => c[0]).join(" ");
    expect(output).not.toContain("SECRET_CONNECTION_STRING_FAILED");

    verifyNoSecrets();
  });
  it("does not leak arbitrary metadata through logger bridge", async () => {
    (config.readJurisprudencePublicationCronSecret as any).mockReturnValue(SUPER_SECRET_DO_NOT_LOG);
    (config.isJurisprudencePublicationCronEnabled as any).mockReturnValue(true);

    (host.runJurisprudencePublicationOutboxHost as any).mockImplementation(async ({ logger }: any) => {
      // Pass unexpected metadata
      logger.log("outbox_batch_started", {
        maxItems: 10,
        maxDurationMs: 5000,
        secret: "CANARY_SECRET",
        payload: "CANARY_PAYLOAD"
      });
      return { status: "COMPLETED" };
    });

    const request = new Request("http://localhost/api/internal/cron/jurisprudence-publication", {
      headers: { authorization: `Bearer ${SUPER_SECRET_DO_NOT_LOG}` }
    });

    const res = await GET(request);
    expect(res.status).toBe(200);

    const output = consoleLogSpy.mock.calls.map((c: any) => c[0]).join(" ");
    expect(output).not.toContain("CANARY_SECRET");
    expect(output).not.toContain("CANARY_PAYLOAD");
    expect(output).toContain("maxItems"); // Safe fields are still there
  });
});
