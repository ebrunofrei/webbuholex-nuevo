import type { JurisprudencePublicSearchActivationReadiness } from "@/types/jurisprudence-public-search-gateway";

/**
 * Evaluates whether the public jurisprudence search gateway may be activated.
 *
 * This evaluation is explicitly dormant (default-deny):
 * - adapterCodeImplemented is true because the code exists.
 * - All other flags remain false until real production authorization is granted.
 * - The mere existence of adapter code does NOT authorize activation.
 */
export function evaluateJurisprudencePublicSearchActivationReadiness(): JurisprudencePublicSearchActivationReadiness {
  return Object.freeze({
    adapterCodeImplemented: true,
    activationAuthorized: false,
    realPublicExposurePresent: false,
    realSearchIndexPresent: false,
    realPublicSearchGatewayConfigured: false,
    publicSearchConnectedToRealData: false,
    searchEndpointMounted: false,
    published: false,
    deployed: false,
  });
}

/**
 * Returns true only when the gateway may be safely instantiated with real data.
 * Currently always returns false (dormant).
 */
export function isJurisprudencePublicSearchActivationReady(
  readiness: JurisprudencePublicSearchActivationReadiness,
): boolean {
  return (
    readiness.activationAuthorized &&
    readiness.realPublicExposurePresent &&
    readiness.realSearchIndexPresent &&
    readiness.realPublicSearchGatewayConfigured
  );
}
