import crypto from "crypto";
import {
  processBatch,
  type OutboxBatchStopReason,
} from "./jurisprudence-publication-outbox-batch";
import type { JurisprudencePublicationOutboxProcessor } from "./jurisprudence-publication-outbox-processor";
import { isJurisprudencePublicationOutboxProcessorEnabled } from "./jurisprudence-publication-outbox-host-config";

export interface JurisprudencePublicationOutboxHostLogger {
  log(event: "outbox_host_disabled", metadata: { runId: string }): void;
  log(
    event: "outbox_batch_started",
    metadata: { runId: string; maxItems: number; maxDurationMs: number },
  ): void;
  log(
    event: "outbox_batch_completed",
    metadata: {
      runId: string;
      processed: number;
      sent: number;
      failed: number;
      deadLetter: number;
      noWork: number;
      stopReason: OutboxBatchStopReason;
      durationMs: number;
    },
  ): void;
  log(
    event: "outbox_batch_failed",
    metadata: { runId: string; durationMs: number; errorCode: string },
  ): void;
}

export type JurisprudencePublicationOutboxHostResult =
  | {
      status: "DISABLED";
      runId: string;
      durationMs: number;
    }
  | {
      status: "COMPLETED";
      runId: string;
      processed: number;
      sent: number;
      failed: number;
      deadLetter: number;
      noWork: number;
      stopReason: OutboxBatchStopReason;
      durationMs: number;
    };

export interface JurisprudencePublicationOutboxHostDependencies {
  processorFactory?: () =>
    | Promise<JurisprudencePublicationOutboxProcessor>
    | JurisprudencePublicationOutboxProcessor;
  clock?: () => number;
  runIdFactory?: () => string;
  logger?: JurisprudencePublicationOutboxHostLogger;
  maxItems?: number;
  maxDurationMs?: number;
  env?: Partial<NodeJS.ProcessEnv>;
}

const DEFAULT_MAX_ITEMS = 25;
const DEFAULT_MAX_DURATION_MS = 20_000;

class NoopLogger implements JurisprudencePublicationOutboxHostLogger {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  log(event: unknown, metadata: unknown) {}
}

export async function runJurisprudencePublicationOutboxHost(
  deps: JurisprudencePublicationOutboxHostDependencies = {},
): Promise<JurisprudencePublicationOutboxHostResult> {
  const clock = deps.clock ?? Date.now;
  const startTime = clock();
  const runId = deps.runIdFactory ? deps.runIdFactory() : crypto.randomUUID();
  const logger = deps.logger ?? new NoopLogger();
  const env = deps.env ?? process.env;

  const isEnabled = isJurisprudencePublicationOutboxProcessorEnabled(env);

  if (!isEnabled) {
    logger.log("outbox_host_disabled", { runId });
    return {
      status: "DISABLED",
      runId,
      durationMs: clock() - startTime,
    };
  }

  const maxItems = deps.maxItems ?? DEFAULT_MAX_ITEMS;
  const maxDurationMs = deps.maxDurationMs ?? DEFAULT_MAX_DURATION_MS;

  logger.log("outbox_batch_started", { runId, maxItems, maxDurationMs });

  const factory =
    deps.processorFactory ??
    (async () => {
      const { createJurisprudencePublicationOutboxProcessor } = await import(
        "./jurisprudence-publication-outbox-composition"
      );
      return createJurisprudencePublicationOutboxProcessor();
    });

  try {
    const processor = await factory();
    const batchResult = await processBatch(
      processor,
      { maxItems, maxDurationMs },
      clock,
    );

    logger.log("outbox_batch_completed", {
      runId,
      processed: batchResult.processed,
      sent: batchResult.sent,
      failed: batchResult.failed,
      deadLetter: batchResult.deadLetter,
      noWork: batchResult.noWork,
      stopReason: batchResult.stopReason,
      durationMs: batchResult.durationMs,
    });

    return {
      status: "COMPLETED",
      runId,
      processed: batchResult.processed,
      sent: batchResult.sent,
      failed: batchResult.failed,
      deadLetter: batchResult.deadLetter,
      noWork: batchResult.noWork,
      stopReason: batchResult.stopReason,
      durationMs: batchResult.durationMs,
    };
  } catch (error) {
    logger.log("outbox_batch_failed", {
      runId,
      durationMs: clock() - startTime,
      errorCode: "UNEXPECTED_HOST_ERROR",
    });
    throw error;
  }
}
