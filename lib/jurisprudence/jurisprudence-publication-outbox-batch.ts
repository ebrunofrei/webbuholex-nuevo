import { JurisprudencePublicationOutboxProcessor } from "./jurisprudence-publication-outbox-processor";

export type OutboxBatchStopReason = "NO_WORK" | "MAX_ITEMS" | "MAX_DURATION";

export interface OutboxBatchResult {
  readonly processed: number;
  readonly sent: number;
  readonly failed: number;
  readonly deadLetter: number;
  readonly noWork: number;
  readonly durationMs: number;
  readonly stopReason: OutboxBatchStopReason;
}

export interface OutboxBatchOptions {
  readonly maxItems: number;
  readonly maxDurationMs: number;
}

export async function processBatch(
  processor: JurisprudencePublicationOutboxProcessor,
  options: OutboxBatchOptions,
  clock: () => number = Date.now
): Promise<OutboxBatchResult> {
  if (options.maxItems <= 0 || !Number.isInteger(options.maxItems) || !Number.isFinite(options.maxItems)) {
    throw new Error("INVALID_BATCH_MAX_ITEMS");
  }

  if (options.maxDurationMs <= 0 || !Number.isFinite(options.maxDurationMs) || Number.isNaN(options.maxDurationMs)) {
    throw new Error("INVALID_BATCH_MAX_DURATION");
  }

  const startTime = clock();
  let processed = 0;
  let sent = 0;
  let failed = 0;
  let deadLetter = 0;
  let noWork = 0;
  let stopReason: OutboxBatchStopReason | null = null;

  while (true) {
    if (processed >= options.maxItems) {
      stopReason = "MAX_ITEMS";
      break;
    }

    if (clock() - startTime >= options.maxDurationMs) {
      stopReason = "MAX_DURATION";
      break;
    }

    // We purposely do NOT wrap this in a catch block that swallows errors.
    // If processNext() throws an unexpected Error (e.g. database disconnect,
    // failure to update the bookkeeping record, etc), the batch aborts
    // and bubbles up the error so the host can log it and fail the execution.
    const result = await processor.processNext();

    if (result === "NO_WORK") {
      noWork++;
      stopReason = "NO_WORK";
      break;
    }

    processed++;

    if (result === "SENT") {
      sent++;
    } else if (result === "FAILED") {
      failed++;
    } else if (result === "DEAD_LETTER") {
      deadLetter++;
    }
  }

  return {
    processed,
    sent,
    failed,
    deadLetter,
    noWork,
    durationMs: clock() - startTime,
    stopReason: stopReason as OutboxBatchStopReason,
  };
}
