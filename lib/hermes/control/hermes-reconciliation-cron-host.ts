/**
 * Hermes Post-Dispatch Reconciliation Cron Host Runtime Factory
 * Governing: docs/hermes/HERMES-PROD-A3.1-CONTROLS-DESIGN.md
 * Phase: HERMES-PROD-A3.7D
 *
 * Minimal server-only composition of HermesPostDispatchReconciler and
 * PostgresHermesQuotaCoordinator under the hermes_control_runtime role.
 * Zero remote provider dependencies.
 */

import { getDatabase } from "@/database/client";
import { PostgresHermesQuotaCoordinator } from "./hermes-quota-coordinator";
import { HermesPostDispatchReconciler } from "./hermes-post-dispatch-reconciler";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "@/database/schema";

export interface HermesReconciliationHostDependencies {
  readonly db?: PostgresJsDatabase<typeof schema>;
  readonly defaultLimit?: number;
}

/**
 * Creates a HermesPostDispatchReconciler wired to the database using hermes_control_runtime.
 */
export function createHermesPostDispatchReconciler(
  dependencies?: HermesReconciliationHostDependencies
): HermesPostDispatchReconciler {
  const db = dependencies?.db ?? getDatabase();
  const quotaCoordinator = new PostgresHermesQuotaCoordinator({ db });
  return new HermesPostDispatchReconciler({
    quotaCoordinator,
    ...(dependencies?.defaultLimit !== undefined
      ? { defaultLimit: dependencies.defaultLimit }
      : {}),
  });
}
