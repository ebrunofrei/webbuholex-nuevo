import { expect, test, describe, vi } from "vitest";
import { isJurisprudencePublicationOutboxProcessorEnabled } from "@/lib/jurisprudence/jurisprudence-publication-outbox-host-config";
import { runJurisprudencePublicationOutboxHost } from "@/lib/jurisprudence/jurisprudence-publication-outbox-host";
import type { JurisprudencePublicationOutboxProcessor } from "@/lib/jurisprudence/jurisprudence-publication-outbox-processor";
import type { OutboxBatchResult } from "@/lib/jurisprudence/jurisprudence-publication-outbox-batch";
import * as batchModule from "@/lib/jurisprudence/jurisprudence-publication-outbox-batch";

describe("JurisprudencePublicationOutboxHostConfig", () => {
  test("undefined -> false", () => {
    expect(isJurisprudencePublicationOutboxProcessorEnabled({})).toBe(false);
  });

  test("'false' -> false", () => {
    expect(
      isJurisprudencePublicationOutboxProcessorEnabled({
        JURISPRUDENCE_OUTBOX_PROCESSOR_ENABLED: "false",
      }),
    ).toBe(false);
  });

  test("'true' -> true", () => {
    expect(
      isJurisprudencePublicationOutboxProcessorEnabled({
        JURISPRUDENCE_OUTBOX_PROCESSOR_ENABLED: "true",
      }),
    ).toBe(true);
  });

  test("invalid value -> stable error", () => {
    expect(() =>
      isJurisprudencePublicationOutboxProcessorEnabled({
        JURISPRUDENCE_OUTBOX_PROCESSOR_ENABLED: "1",
      }),
    ).toThrowError(/STABLE_CONFIG_ERROR/);
    expect(() =>
      isJurisprudencePublicationOutboxProcessorEnabled({
        JURISPRUDENCE_OUTBOX_PROCESSOR_ENABLED: "yes",
      }),
    ).toThrowError(/STABLE_CONFIG_ERROR/);
  });
});

describe("runJurisprudencePublicationOutboxHost", () => {
  const createMockLogger = () => ({
    log: vi.fn(),
  });

  const createMockProcessorFactory = () => {
    return vi.fn(() => ({} as JurisprudencePublicationOutboxProcessor));
  };

  test("disabled -> returns DISABLED without invoking factory", async () => {
    const logger = createMockLogger();
    const processorFactory = createMockProcessorFactory();

    const result = await runJurisprudencePublicationOutboxHost({
      env: {},
      logger,
      processorFactory,
      runIdFactory: () => "test-run-id",
    });

    expect(result.status).toBe("DISABLED");
    expect(result.runId).toBe("test-run-id");
    expect(processorFactory).not.toHaveBeenCalled();
    expect(logger.log).toHaveBeenCalledWith("outbox_host_disabled", {
      runId: "test-run-id",
    });
  });

  test("enabled -> invokes factory and processBatch once", async () => {
    const logger = createMockLogger();
    const processor = {} as JurisprudencePublicationOutboxProcessor;
    const processorFactory = vi.fn(() => processor);
    const runIdFactory = () => "test-run-id";

    const mockBatchResult: OutboxBatchResult = {
      processed: 5,
      sent: 3,
      failed: 1,
      deadLetter: 1,
      noWork: 0,
      durationMs: 100,
      stopReason: "MAX_ITEMS",
    };

    const processBatchSpy = vi
      .spyOn(batchModule, "processBatch")
      .mockResolvedValue(mockBatchResult);

    const result = await runJurisprudencePublicationOutboxHost({
      env: { JURISPRUDENCE_OUTBOX_PROCESSOR_ENABLED: "true" },
      logger,
      processorFactory,
      runIdFactory,
      maxItems: 10,
      maxDurationMs: 5000,
    });

    expect(result.status).toBe("COMPLETED");
    if (result.status === "COMPLETED") {
      expect(result.processed).toBe(5);
      expect(result.stopReason).toBe("MAX_ITEMS");
    }

    expect(processorFactory).toHaveBeenCalledOnce();
    expect(processBatchSpy).toHaveBeenCalledWith(
      processor,
      { maxItems: 10, maxDurationMs: 5000 },
      expect.any(Function),
    );

    expect(logger.log).toHaveBeenCalledWith("outbox_batch_started", {
      runId: "test-run-id",
      maxItems: 10,
      maxDurationMs: 5000,
    });
    expect(logger.log).toHaveBeenCalledWith(
      "outbox_batch_completed",
      expect.objectContaining({
        runId: "test-run-id",
        processed: 5,
        sent: 3,
        failed: 1,
      }),
    );

    processBatchSpy.mockRestore();
  });

  test("unexpected error -> logs safe metadata and rethrows", async () => {
    const logger = createMockLogger();
    const processorFactory = vi.fn(
      () => ({} as JurisprudencePublicationOutboxProcessor),
    );

    const processBatchSpy = vi
      .spyOn(batchModule, "processBatch")
      .mockRejectedValue(new Error("Database disconnected"));

    await expect(
      runJurisprudencePublicationOutboxHost({
        env: { JURISPRUDENCE_OUTBOX_PROCESSOR_ENABLED: "true" },
        logger,
        processorFactory,
        runIdFactory: () => "error-run-id",
      }),
    ).rejects.toThrow("Database disconnected");

    expect(logger.log).toHaveBeenCalledWith(
      "outbox_batch_failed",
      expect.objectContaining({
        runId: "error-run-id",
        errorCode: "UNEXPECTED_HOST_ERROR",
      }),
    );

    const logs = logger.log.mock.calls;
    const failedLogs = logs.filter(
      (call) => call[0] === "outbox_batch_failed",
    );
    expect(failedLogs.length).toBeGreaterThan(0);
    expect(failedLogs[0]![1]).not.toHaveProperty("error");
    expect(failedLogs[0]![1]).not.toHaveProperty("message");

    processBatchSpy.mockRestore();
  });

  test("generates runId if not provided", async () => {
    const result = await runJurisprudencePublicationOutboxHost({
      env: {}, // disabled
    });
    expect(result.runId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });
});
