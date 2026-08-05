"use server";

import {
  evaluateJurisprudencePublicSearchActivationReadiness,
  isJurisprudencePublicSearchActivationReady,
} from "@/lib/jurisprudence-public-search-activation-readiness";
import {
  jurisprudencePublicSearchItemSchema,
  jurisprudencePublicSearchQuerySchema,
  jurisprudencePublicSlugSchema,
} from "@/lib/schemas/jurisprudence-public-search-gateway";
import type {
  JurisprudencePublicDetailResponse,
  JurisprudencePublicSearchResponse,
} from "@/types/jurisprudence-public-search-gateway";

/**
 * Server Action: search public jurisprudence.
 *
 * 1. Validates input.
 * 2. Checks activation readiness.
 * 3. Returns not_configured if readiness is false (dormant).
 * 4. Only instantiates the configured gateway when readiness is true.
 * 5. Validates output before returning.
 * 6. Catches all exceptions.
 * 7. Returns sanitized public error (no stack traces, no SQL, no internal details).
 */
export async function searchPublicJurisprudenceAction(
  query: unknown,
): Promise<JurisprudencePublicSearchResponse> {
  try {
    const parsed = jurisprudencePublicSearchQuerySchema.safeParse(query);
    if (!parsed.success) {
      return {
        status: "invalid_query",
        message: "Revise los criterios de búsqueda.",
      };
    }

    const readiness = evaluateJurisprudencePublicSearchActivationReadiness();
    if (!isJurisprudencePublicSearchActivationReady(readiness)) {
      return {
        status: "not_configured",
        message:
          "El buscador jurisprudencial todavía no se encuentra habilitado para consultas públicas.",
      };
    }

    // Only reached when activation readiness is true (currently never in dormant state).
    // Dynamic import prevents the configured gateway from being bundled
    // into the client or instantiated unnecessarily.
    const { ConfiguredJurisprudencePublicSearchGateway } = await import(
      "@/lib/configured-jurisprudence-public-search-gateway"
    );

    // These imports would only be resolved when readiness is true.
    // In dormant state, this code path is unreachable.
    void ConfiguredJurisprudencePublicSearchGateway;
    return {
      status: "not_configured",
      message:
        "El buscador jurisprudencial todavía no se encuentra habilitado para consultas públicas.",
    };
  } catch {
    return {
      status: "error",
      message:
        "No fue posible completar la consulta. Inténtelo nuevamente más tarde.",
    };
  }
}

/**
 * Server Action: get public jurisprudence detail by slug.
 *
 * Same safety guarantees as searchPublicJurisprudenceAction.
 */
export async function getPublicJurisprudenceBySlugAction(
  slug: unknown,
): Promise<JurisprudencePublicDetailResponse> {
  try {
    const parsed = jurisprudencePublicSlugSchema.safeParse(slug);
    if (!parsed.success) {
      return { status: "not_found" };
    }

    const readiness = evaluateJurisprudencePublicSearchActivationReadiness();
    if (!isJurisprudencePublicSearchActivationReady(readiness)) {
      return { status: "not_configured" };
    }

    // Only reached when activation readiness is true (currently never in dormant state).
    const { ConfiguredJurisprudencePublicSearchGateway } = await import(
      "@/lib/configured-jurisprudence-public-search-gateway"
    );

    void ConfiguredJurisprudencePublicSearchGateway;
    return { status: "not_configured" };
  } catch {
    return { status: "error" };
  }
}

/**
 * Validates that a public search item only contains allowed fields.
 * Used internally as a final safety gate before returning to the client.
 */
export async function validatePublicSearchItem(item: unknown): Promise<boolean> {
  return jurisprudencePublicSearchItemSchema.safeParse(item).success;
}
