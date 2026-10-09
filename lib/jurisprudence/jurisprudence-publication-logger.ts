import { OutboxBatchStopReason } from "./jurisprudence-publication-outbox-batch";

export type JurisprudencePublicationCronAuthFailureReason =
  | "missing_header"
  | "malformed_header"
  | "invalid_secret"
  | "missing_env";

export type JurisprudencePublicationLogEvent =
  | {
      event: "cron_request_received";
      cronInvocationId: string;
    }
  | {
      event: "cron_auth_failed";
      cronInvocationId: string;
      reason: JurisprudencePublicationCronAuthFailureReason;
    }
  | {
      event: "cron_disabled";
      cronInvocationId: string;
      feature: "jurisprudence_publication_cron";
      enabled: false;
    }
  | {
      event: "outbox_batch_started";
      cronInvocationId: string; // mapped from runId
      maxItems: number;
      maxDurationMs: number;
    }
  | {
      event: "outbox_batch_completed";
      cronInvocationId: string; // mapped from runId
      processed: number;
      sent: number;
      failed: number;
      deadLetter: number;
      noWork: number;
      stopReason: OutboxBatchStopReason;
      durationMs: number;
    }
  | {
      event: "outbox_batch_failed";
      cronInvocationId: string; // mapped from runId
      durationMs: number;
      errorCode: string;
    }
  | {
      event: "cron_unexpected_error";
      cronInvocationId: string;
      errorCategory: "UNKNOWN" | "DATABASE" | "CONFIG" | "AUTH";
      message?: string;
      postgresCode?: string;
      postgresSeverity?: string;
      postgresRoutine?: string;
      postgresConstraint?: string;
      postgresMessage?: string;
    };

export class JurisprudencePublicationLogger {
  log(payload: JurisprudencePublicationLogEvent): void {
    // In a real application, this would pipe to structured logging system like Pino or Datadog.
    // We strictly use console.log with JSON.stringify to ensure structured, safely parseable logs
    // without leaking properties that are not in the strict payload type.
    console.log(JSON.stringify(payload));
  }
}
