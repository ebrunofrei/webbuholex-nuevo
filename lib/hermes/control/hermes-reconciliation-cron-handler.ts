/**
 * Hermes Post-Dispatch Orphan Reconciliation Cron Handler
 * Governing: docs/hermes/HERMES-PROD-A3.1-CONTROLS-DESIGN.md
 * Phase: HERMES-PROD-A3.7D / HERMES-PROD-A3.7D-R2
 *
 * Server-side orchestrator for automated periodic orphan reconciliation.
 * Encapsulates authentication, feature gating, execution, error handling, and structured logging.
 * Decoupled from Next.js Route export requirements for clean unit testability.
 */

import { NextResponse } from "next/server";
import crypto from "node:crypto";
import {
  isHermesReconciliationCronEnabled,
  readHermesReconciliationCronSecret,
  secureCompare,
} from "./hermes-reconciliation-cron-config";
import {
  HermesReconciliationCronLogger,
} from "./hermes-reconciliation-cron-logger";
import {
  createHermesPostDispatchReconciler,
} from "./hermes-reconciliation-cron-host";
import type { HermesPostDispatchReconciler } from "./hermes-post-dispatch-reconciler";

export interface HermesReconciliationCronRouteDependencies {
  readonly reconcilerFactory?: () => HermesPostDispatchReconciler;
  readonly logger?: HermesReconciliationCronLogger;
  readonly env?: Partial<NodeJS.ProcessEnv>;
}

export async function handleHermesReconciliationCronGet(
  request: Request,
  deps?: HermesReconciliationCronRouteDependencies
): Promise<Response> {
  const cronInvocationId = crypto.randomUUID();
  const logger = deps?.logger ?? new HermesReconciliationCronLogger();
  const env = deps?.env ?? process.env;

  try {
    logger.log({ event: "cron_request_received", cronInvocationId });

    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      logger.log({ event: "cron_auth_failed", cronInvocationId, reason: "missing_header" });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!authHeader.startsWith("Bearer ")) {
      logger.log({ event: "cron_auth_failed", cronInvocationId, reason: "malformed_header" });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const expectedSecret = readHermesReconciliationCronSecret(env);
    if (!expectedSecret) {
      logger.log({ event: "cron_auth_failed", cronInvocationId, reason: "missing_env" });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const providedSecret = authHeader.substring(7);
    if (!secureCompare(expectedSecret, providedSecret)) {
      logger.log({ event: "cron_auth_failed", cronInvocationId, reason: "invalid_secret" });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isEnabled = isHermesReconciliationCronEnabled(env);
    if (!isEnabled) {
      logger.log({
        event: "cron_disabled",
        cronInvocationId,
        feature: "hermes_reconciliation_cron",
        enabled: false,
      });
      return NextResponse.json(
        { status: "DISABLED", message: "Hermes reconciliation cron is explicitly disabled." },
        { status: 200 }
      );
    }

    const factory = deps?.reconcilerFactory ?? createHermesPostDispatchReconciler;
    const reconciler = factory();
    const result = await reconciler.reconcilePostDispatchOrphans();

    if (result.kind === "completed") {
      logger.log({
        event: "cron_batch_completed",
        cronInvocationId,
        status: "completed",
        scanned: result.scanned,
        reconciled: result.reconciled,
        alreadyFinalized: result.alreadyFinalized,
        leaseStillActive: result.leaseStillActive,
        invalidState: result.invalidState,
        notFound: result.notFound,
      });

      return NextResponse.json(
        {
          status: "COMPLETED",
          scanned: result.scanned,
          reconciled: result.reconciled,
          alreadyFinalized: result.alreadyFinalized,
          leaseStillActive: result.leaseStillActive,
          invalidState: result.invalidState,
          notFound: result.notFound,
        },
        { status: 200 }
      );
    }

    // result.kind === "control_unavailable"
    logger.log({
      event: "cron_batch_control_unavailable",
      cronInvocationId,
      status: "control_unavailable",
      reason: result.reason,
      scanned: result.scanned,
      reconciled: result.reconciled,
      alreadyFinalized: result.alreadyFinalized,
      leaseStillActive: result.leaseStillActive,
      invalidState: result.invalidState,
      notFound: result.notFound,
      controlUnavailable: result.controlUnavailable,
    });

    return NextResponse.json(
      {
        error: "Service Unavailable",
        reason: "usage_control_unavailable",
        scanned: result.scanned,
        reconciled: result.reconciled,
        alreadyFinalized: result.alreadyFinalized,
        leaseStillActive: result.leaseStillActive,
        invalidState: result.invalidState,
        notFound: result.notFound,
        controlUnavailable: result.controlUnavailable,
      },
      { status: 503 }
    );
  } catch (error) {
    logger.log({
      event: "cron_unexpected_error",
      cronInvocationId,
      errorCategory: "UNKNOWN",
      message: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
