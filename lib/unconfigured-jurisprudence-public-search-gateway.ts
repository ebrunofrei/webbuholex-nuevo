import type {
  JurisprudencePublicDetailResponse,
  JurisprudencePublicSearchGateway,
  JurisprudencePublicSearchQuery,
  JurisprudencePublicSearchResponse,
} from "@/types/jurisprudence-public-search-gateway";

export class UnconfiguredJurisprudencePublicSearchGateway
  implements JurisprudencePublicSearchGateway
{
  readonly kind = "not_configured";

  async search(
    query: JurisprudencePublicSearchQuery,
  ): Promise<JurisprudencePublicSearchResponse> {
    void query;

    return {
      status: "not_configured",
      message:
        "El buscador jurisprudencial todavía no se encuentra habilitado para consultas públicas.",
    };
  }

  async getBySlug(
    slug: string,
  ): Promise<JurisprudencePublicDetailResponse> {
    void slug;

    return { status: "not_configured" };
  }
}

export const unconfiguredJurisprudencePublicSearchGateway =
  new UnconfiguredJurisprudencePublicSearchGateway();
