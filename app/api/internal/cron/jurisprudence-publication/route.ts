import { NextResponse } from "next/server";
import crypto from "crypto";
import { JurisprudencePublicationLogger } from "@/lib/jurisprudence/jurisprudence-publication-logger";
import { timingSafeEqual } from "node:crypto";
import { runJurisprudencePublicationOutboxHost } from "@/lib/jurisprudence/jurisprudence-publication-outbox-host";
import type { OutboxBatchStopReason } from "@/lib/jurisprudence/jurisprudence-publication-outbox-batch";
import {
  isJurisprudencePublicationCronEnabled,
  readJurisprudencePublicationCronSecret,
} from "@/lib/jurisprudence/jurisprudence-publication-cron-config";

function secureCompare(a: string, b: string): boolean {
  try {
    const aBuf = Buffer.from(a, "utf8");
    const bBuf = Buffer.from(b, "utf8");
    if (aBuf.length !== bBuf.length) {
      return false;
    }
    return timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const cronInvocationId = crypto.randomUUID();
  const logger = new JurisprudencePublicationLogger();

  try {
    logger.log({ event: "cron_request_received", cronInvocationId });

    const expectedSecret = readJurisprudencePublicationCronSecret();
    if (!expectedSecret || expectedSecret.trim() === "") {
      logger.log({ event: "cron_auth_failed", cronInvocationId, reason: "missing_env" });
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      logger.log({ event: "cron_auth_failed", cronInvocationId, reason: "missing_header" });
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!authHeader.startsWith("Bearer ")) {
      logger.log({ event: "cron_auth_failed", cronInvocationId, reason: "malformed_header" });
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const providedSecret = authHeader.substring(7);
    if (!secureCompare(expectedSecret, providedSecret)) {
      logger.log({ event: "cron_auth_failed", cronInvocationId, reason: "invalid_secret" });
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const isEnabled = isJurisprudencePublicationCronEnabled();
    if (!isEnabled) {
      logger.log({ event: "cron_disabled", cronInvocationId, feature: "jurisprudence_publication_cron", enabled: false });
      return NextResponse.json(
        { status: "DISABLED", message: "Cron is explicitly disabled." },
        { status: 200 }
      );
    }

    // Host logger bridge
    const hostLogger = {
      log(event: string, metadata: unknown) {
        if (event === "outbox_host_disabled") {
          // The host layer disabled execution via JURISPRUDENCE_PUBLICATION_OUTBOX_PROCESSOR_ENABLED.
          // This is distinct from the cron switch, but we don't have a specific mapped event for it yet,
          // and we do not emit a generic error for it. We intentionally drop this log to avoid schema creep,
          // relying on the host's returned status: "DISABLED".
          return;
        }

        if (event === "outbox_batch_started") {
          const m = metadata as { maxItems: number; maxDurationMs: number };
          logger.log({
            event: "outbox_batch_started",
            cronInvocationId,
            maxItems: m.maxItems,
            maxDurationMs: m.maxDurationMs,
          });
          return;
        }

        if (event === "outbox_batch_completed") {
          const m = metadata as {
            processed: number;
            sent: number;
            failed: number;
            deadLetter: number;
            noWork: number;
            stopReason: OutboxBatchStopReason;
            durationMs: number;
          };
          logger.log({
            event: "outbox_batch_completed",
            cronInvocationId,
            processed: m.processed,
            sent: m.sent,
            failed: m.failed,
            deadLetter: m.deadLetter,
            noWork: m.noWork,
            stopReason: m.stopReason,
            durationMs: m.durationMs,
          });
          return;
        }

        if (event === "outbox_batch_failed") {
          const m = metadata as { durationMs: number; errorCode: string };
          logger.log({
            event: "outbox_batch_failed",
            cronInvocationId,
            durationMs: m.durationMs,
            errorCode: m.errorCode,
          });
          return;
        }
      }
    };

    const result = await runJurisprudencePublicationOutboxHost({
      env: process.env,
      runIdFactory: () => cronInvocationId,
      logger: hostLogger
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    logger.log({
      event: "cron_unexpected_error",
      cronInvocationId,
      errorCategory: "UNKNOWN",
      message: error instanceof Error ? error.name : "UnknownError"
    });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
export async function PUT() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
export async function DELETE() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
