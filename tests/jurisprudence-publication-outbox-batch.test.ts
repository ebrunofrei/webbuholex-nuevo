import { describe, it, expect, vi, beforeEach, MockInstance } from "vitest";
import { processBatch } from "../lib/jurisprudence/jurisprudence-publication-outbox-batch";
import { JurisprudencePublicationOutboxProcessor } from "../lib/jurisprudence/jurisprudence-publication-outbox-processor";
import { JurisprudencePublicationOutboxProcessorRepository } from "../types/jurisprudence-publication-outbox-processor";
import { JurisprudencePublicProjectionWriter } from "../types/jurisprudence-public-projection-writer";

describe("JurisprudencePublicationOutboxBatch", () => {
  let processor: JurisprudencePublicationOutboxProcessor;
  let mockProcessNext: MockInstance;

  beforeEach(() => {
    const repo = {} as JurisprudencePublicationOutboxProcessorRepository;
    const writer = {} as JurisprudencePublicProjectionWriter;
    processor = new JurisprudencePublicationOutboxProcessor(repo, writer);
    mockProcessNext = vi.spyOn(processor, "processNext");
  });

  it("stops immediately on NO_WORK", async () => {
    mockProcessNext.mockResolvedValueOnce("NO_WORK");

    const result = await processBatch(
      processor,
      { maxItems: 10, maxDurationMs: 1000 },
      () => 0
    );

    expect(result.stopReason).toBe("NO_WORK");
    expect(result.processed).toBe(0);
    expect(result.noWork).toBe(1);
    expect(mockProcessNext).toHaveBeenCalledTimes(1);
  });

  it("stops when maxItems is reached", async () => {
    mockProcessNext
      .mockResolvedValueOnce("SENT")
      .mockResolvedValueOnce("SENT")
      .mockResolvedValueOnce("SENT");

    const result = await processBatch(
      processor,
      { maxItems: 2, maxDurationMs: 1000 },
      () => 0
    );

    expect(result.stopReason).toBe("MAX_ITEMS");
    expect(result.processed).toBe(2);
    expect(result.sent).toBe(2);
    expect(mockProcessNext).toHaveBeenCalledTimes(2);
  });

  it("stops when maxDurationMs is reached before processing", async () => {
    mockProcessNext.mockResolvedValue("SENT");

    let time = 0;
    const result = await processBatch(
      processor,
      { maxItems: 10, maxDurationMs: 1000 },
      () => {
        const current = time;
        time += 1500; // Jump ahead by 1.5 seconds on each check
        return current;
      }
    );

    expect(result.stopReason).toBe("MAX_DURATION");
    expect(result.processed).toBe(0); // It checks duration before processing
    expect(mockProcessNext).toHaveBeenCalledTimes(0);
  });

  it("stops when maxDurationMs is reached after some processing", async () => {
    mockProcessNext
      .mockResolvedValueOnce("SENT")
      .mockResolvedValueOnce("SENT")
      .mockResolvedValueOnce("SENT");

    let time = 0;
    const result = await processBatch(
      processor,
      { maxItems: 10, maxDurationMs: 1000 },
      () => {
        const current = time;
        time += 600;
        return current;
      }
    );

    // Initial check: clock() -> 0
    // Loop 1 check: clock() -> 600 (diff 600) -> pass
    // Process 1 (sent)
    // Loop 2 check: clock() -> 1200 (diff 1200) -> fails, stops
    // Total processed: 1

    expect(result.stopReason).toBe("MAX_DURATION");
    expect(result.processed).toBe(1);
    expect(result.sent).toBe(1);
    expect(mockProcessNext).toHaveBeenCalledTimes(1);
  });

  it("accurately counts sent, failed, and dead_letter", async () => {
    mockProcessNext
      .mockResolvedValueOnce("SENT")
      .mockResolvedValueOnce("FAILED")
      .mockResolvedValueOnce("DEAD_LETTER")
      .mockResolvedValueOnce("SENT")
      .mockResolvedValueOnce("NO_WORK");

    const result = await processBatch(
      processor,
      { maxItems: 10, maxDurationMs: 10000 },
      () => 0
    );

    expect(result.stopReason).toBe("NO_WORK");
    expect(result.processed).toBe(4);
    expect(result.sent).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.deadLetter).toBe(1);
    expect(result.noWork).toBe(1);
    expect(mockProcessNext).toHaveBeenCalledTimes(5);
  });

  it("bubbles up unexpected processNext errors without swallowing", async () => {
    mockProcessNext
      .mockResolvedValueOnce("SENT")
      .mockRejectedValueOnce(new Error("Unexpected DB Disconnect"));

    await expect(
      processBatch(processor, { maxItems: 10, maxDurationMs: 1000 }, () => 0)
    ).rejects.toThrow("Unexpected DB Disconnect");

    expect(mockProcessNext).toHaveBeenCalledTimes(2);
  });

  describe("Validation", () => {
    it("rejects maxItems <= 0", async () => {
      await expect(processBatch(processor, { maxItems: 0, maxDurationMs: 1000 })).rejects.toThrow("INVALID_BATCH_MAX_ITEMS");
      await expect(processBatch(processor, { maxItems: -1, maxDurationMs: 1000 })).rejects.toThrow("INVALID_BATCH_MAX_ITEMS");
    });

    it("rejects non-integer maxItems", async () => {
      await expect(processBatch(processor, { maxItems: 1.5, maxDurationMs: 1000 })).rejects.toThrow("INVALID_BATCH_MAX_ITEMS");
      await expect(processBatch(processor, { maxItems: NaN, maxDurationMs: 1000 })).rejects.toThrow("INVALID_BATCH_MAX_ITEMS");
      await expect(processBatch(processor, { maxItems: Infinity, maxDurationMs: 1000 })).rejects.toThrow("INVALID_BATCH_MAX_ITEMS");
    });

    it("rejects maxDurationMs <= 0", async () => {
      await expect(processBatch(processor, { maxItems: 10, maxDurationMs: 0 })).rejects.toThrow("INVALID_BATCH_MAX_DURATION");
      await expect(processBatch(processor, { maxItems: 10, maxDurationMs: -100 })).rejects.toThrow("INVALID_BATCH_MAX_DURATION");
    });

    it("rejects non-finite maxDurationMs", async () => {
      await expect(processBatch(processor, { maxItems: 10, maxDurationMs: NaN })).rejects.toThrow("INVALID_BATCH_MAX_DURATION");
      await expect(processBatch(processor, { maxItems: 10, maxDurationMs: Infinity })).rejects.toThrow("INVALID_BATCH_MAX_DURATION");
    });
  });
});
