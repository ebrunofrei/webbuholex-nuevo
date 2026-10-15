/**
 * Hermes Post-Dispatch Reconciliation Cron Configuration & Security Utilities
 * Governing: docs/hermes/HERMES-PROD-A3.1-CONTROLS-DESIGN.md
 * Phase: HERMES-PROD-A3.7D
 *
 * Provides strict fail-closed environment validation and constant-time
 * secret comparison for the internal authenticated reconciliation cron host.
 */

import { timingSafeEqual } from "node:crypto";

/**
 * Reads and strictly validates HERMES_RECONCILIATION_CRON_ENABLED.
 * Strict boolean semantics: returns true ONLY if value is exactly canonical "true".
 * Returns false for undefined, "false", "TRUE", "1", "yes", whitespace variants, or any other value.
 */
export function isHermesReconciliationCronEnabled(
  env: Partial<NodeJS.ProcessEnv> = process.env,
): boolean {
  const value = env.HERMES_RECONCILIATION_CRON_ENABLED;
  return value === "true";
}

/**
 * Reads and validates HERMES_RECONCILIATION_CRON_SECRET.
 * Requires a non-empty string with no surrounding whitespace.
 * Returns undefined if missing, empty, or containing leading/trailing whitespace.
 */
export function readHermesReconciliationCronSecret(
  env: Partial<NodeJS.ProcessEnv> = process.env,
): string | undefined {
  const secret = env.HERMES_RECONCILIATION_CRON_SECRET;
  if (!secret || secret.trim() === "" || secret !== secret.trim()) {
    return undefined;
  }
  return secret;
}

/**
 * Constant-time comparison using crypto.timingSafeEqual.
 * Length-safe: returns false if lengths differ before calling timingSafeEqual.
 */
export function secureCompare(a: string, b: string): boolean {
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
