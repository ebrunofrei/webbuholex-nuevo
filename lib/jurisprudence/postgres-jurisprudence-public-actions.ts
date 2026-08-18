"use server";

import {
  jurisprudencePublicSearchQuerySchema,
  jurisprudencePublicSlugSchema,
} from "@/lib/schemas/jurisprudence-public-search-gateway";
import type {
  JurisprudencePublicDetailResponse,
  JurisprudencePublicSearchResponse,
} from "@/types/jurisprudence-public-search-gateway";
import { PostgresJurisprudencePublicReadRepository } from "@/lib/jurisprudence/postgres-jurisprudence-public-read-repository";

export async function searchJurisprudencePublicAction(
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

    const repository = new PostgresJurisprudencePublicReadRepository();
    const page = await repository.search(parsed.data);

    if (page.total === 0) {
      return { status: "empty", page };
    }

    return { status: "success", page };
  } catch (error) {
    console.error("searchJurisprudencePublicAction error:", error);
    return {
      status: "error",
      message: "No fue posible completar la consulta. Inténtelo nuevamente más tarde.",
    };
  }
}

export async function getJurisprudencePublicBySlugAction(
  slug: unknown,
): Promise<JurisprudencePublicDetailResponse> {
  try {
    const parsed = jurisprudencePublicSlugSchema.safeParse(slug);
    if (!parsed.success) {
      return { status: "not_found" };
    }

    const repository = new PostgresJurisprudencePublicReadRepository();
    const item = await repository.getBySlug(parsed.data);

    if (!item) {
      return { status: "not_found" };
    }

    return { status: "success", item };
  } catch (error) {
    console.error("getJurisprudencePublicBySlugAction error:", error);
    return { status: "error" };
  }
}
