"use server";

import {
  jurisprudencePublicSearchQuerySchema,
  jurisprudencePublicSlugSchema,
} from "@/lib/schemas/jurisprudence-public-search-gateway";
import type {
  JurisprudencePublicDetailResponse,
  JurisprudencePublicSearchResponse,
} from "@/types/jurisprudence-public-search-gateway";
import { localVerifiedJurisprudenceGateway } from "@/lib/jurisprudence/local-verified-jurisprudence-gateway";

export async function searchLocalVerifiedJurisprudenceAction(
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

    return await localVerifiedJurisprudenceGateway.search(parsed.data);
  } catch {
    return {
      status: "error",
      message:
        "No fue posible completar la consulta. Inténtelo nuevamente más tarde.",
    };
  }
}

export async function getLocalVerifiedJurisprudenceBySlugAction(
  slug: unknown,
): Promise<JurisprudencePublicDetailResponse> {
  try {
    const parsed = jurisprudencePublicSlugSchema.safeParse(slug);
    if (!parsed.success) {
      return { status: "not_found" };
    }

    return await localVerifiedJurisprudenceGateway.getBySlug(parsed.data);
  } catch {
    return { status: "error" };
  }
}
