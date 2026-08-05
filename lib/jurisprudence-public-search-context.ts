import { randomUUID } from "node:crypto";
import type { JurisprudencePublicExposureContext } from "@/types/jurisprudence-public-exposure";

/**
 * Creates a technical context for public (anonymous) jurisprudence search requests.
 *
 * - requestId: generated server-side UUID, not derived from user input.
 * - actorReference: fixed "public_anonymous" — no real identity.
 * - requestedAt: ISO 8601 timestamp.
 * - No personal data stored.
 * - No query text stored in this context.
 */
export function createPublicJurisprudenceSearchContext(): JurisprudencePublicExposureContext {
  return Object.freeze({
    requestId: randomUUID(),
    actorReference: "public_anonymous",
    requestedAt: new Date().toISOString(),
  });
}
