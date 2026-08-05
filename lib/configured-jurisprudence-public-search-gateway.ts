import { createPublicJurisprudenceSearchContext } from "@/lib/jurisprudence-public-search-context";
import {
  projectReadModelToPublicItem,
  projectSearchMatchToPublicItem,
} from "@/lib/jurisprudence-public-search-projection";
import {
  jurisprudencePublicSearchQuerySchema,
  jurisprudencePublicSlugSchema,
} from "@/lib/schemas/jurisprudence-public-search-gateway";
import type { JurisprudencePublicReadModelRepository } from "@/types/jurisprudence-public-exposure";
import type { JurisprudencePublicSearchIndexService } from "@/types/jurisprudence-public-search";
import type {
  JurisprudencePublicDetailResponse,
  JurisprudencePublicSearchGateway,
  JurisprudencePublicSearchQuery,
  JurisprudencePublicSearchResponse,
} from "@/types/jurisprudence-public-search-gateway";
import type { JurisprudencePublicDetailDto } from "@/types/jurisprudence";

/**
 * Configured gateway that connects public search UI to the internal
 * search index service (11.M) and read model repository (11.L).
 *
 * This gateway is only instantiated when activation readiness is true.
 * In the current dormant state, the server actions never construct this class.
 */
export class ConfiguredJurisprudencePublicSearchGateway
  implements JurisprudencePublicSearchGateway
{
  readonly kind = "configured" as const;

  constructor(
    private readonly searchService: JurisprudencePublicSearchIndexService,
    private readonly readModelRepository: JurisprudencePublicReadModelRepository,
  ) {}

  async search(
    query: JurisprudencePublicSearchQuery,
  ): Promise<JurisprudencePublicSearchResponse> {
    const parsed = jurisprudencePublicSearchQuerySchema.safeParse(query);
    if (!parsed.success) {
      return {
        status: "invalid_query",
        message: "Revise los criterios de búsqueda.",
      };
    }

    const validatedQuery = parsed.data;
    const context = createPublicJurisprudenceSearchContext();

    try {
      const result = await this.searchService.search({
        context,
        text: validatedQuery.text,
        filters: validatedQuery.filters,
        sort: validatedQuery.sort,
        offset: (validatedQuery.page - 1) * validatedQuery.pageSize,
        limit: validatedQuery.pageSize,
      });

      const items = Object.freeze(
        result.items.map(projectSearchMatchToPublicItem),
      );
      const total = result.total;
      const totalPages = Math.max(1, Math.ceil(total / validatedQuery.pageSize));

      const page = Object.freeze({
        items,
        total,
        page: validatedQuery.page,
        pageSize: validatedQuery.pageSize,
        totalPages,
      });

      return Object.freeze({
        status: total > 0 ? ("success" as const) : ("empty" as const),
        page,
      });
    } catch {
      return Object.freeze({
        status: "error" as const,
        message:
          "No fue posible completar la consulta. Inténtelo nuevamente más tarde.",
      });
    }
  }

  async getBySlug(
    slug: string,
  ): Promise<JurisprudencePublicDetailResponse> {
    const parsed = jurisprudencePublicSlugSchema.safeParse(slug);
    if (!parsed.success) {
      return { status: "not_found" };
    }

    try {
      const model = await this.readModelRepository.findActiveBySlug(
        parsed.data,
      );

      if (!model) {
        return { status: "not_found" };
      }

      return Object.freeze({
        status: "success" as const,
        item: projectReadModelToPublicItem(model) as unknown as JurisprudencePublicDetailDto,
      });
    } catch {
      return { status: "error" };
    }
  }
}
