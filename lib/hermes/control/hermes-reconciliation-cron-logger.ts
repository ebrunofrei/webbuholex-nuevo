/**
 * Hermes Post-Dispatch Reconciliation Cron Observability Logger
 * Governing: docs/hermes/HERMES-PROD-A3.1-CONTROLS-DESIGN.md
 * Phase: HERMES-PROD-A3.7D
 *
 * Emits strictly sanitized structured JSON logs.
 * Never leaks credentials, authorization tokens, operation IDs, lease IDs,
 * subject IDs, idempotency keys, or raw exception strings.
 */

export type HermesReconciliationCronAuthFailureReason =
  | "missing_header"
  | "malformed_header"
  | "invalid_secret"
  | "missing_env";

export type HermesReconciliationCronLogEvent =
  | {
      readonly event: "cron_request_received";
      readonly cronInvocationId: string;
    }
  | {
      readonly event: "cron_auth_failed";
      readonly cronInvocationId: string;
      readonly reason: HermesReconciliationCronAuthFailureReason;
    }
  | {
      readonly event: "cron_disabled";
      readonly cronInvocationId: string;
      readonly feature: "hermes_reconciliation_cron";
      readonly enabled: false;
    }
  | {
      readonly event: "cron_batch_completed";
      readonly cronInvocationId: string;
      readonly status: "completed";
      readonly scanned: number;
      readonly reconciled: number;
      readonly alreadyFinalized: number;
      readonly leaseStillActive: number;
      readonly invalidState: number;
      readonly notFound: number;
    }
  | {
      readonly event: "cron_batch_control_unavailable";
      readonly cronInvocationId: string;
      readonly status: "control_unavailable";
      readonly reason: string;
      readonly scanned: number;
      readonly reconciled: number;
      readonly alreadyFinalized: number;
      readonly leaseStillActive: number;
      readonly invalidState: number;
      readonly notFound: number;
      readonly controlUnavailable: number;
    }
  | {
      readonly event: "cron_unexpected_error";
      readonly cronInvocationId: string;
      readonly errorCategory: "UNKNOWN";
      readonly message: string;
    };

export class HermesReconciliationCronLogger {
  log(payload: HermesReconciliationCronLogEvent): void {
    console.log(JSON.stringify(payload));
  }
}
