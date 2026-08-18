import "server-only";

import type {
  JurisprudencePublicSearchGateway,
  JurisprudencePublicSearchQuery,
  JurisprudencePublicSearchResponse,
  JurisprudencePublicDetailResponse,
} from "@/types/jurisprudence-public-search-gateway";
import { PostgresJurisprudencePublicReadRepository } from "@/lib/jurisprudence/postgres-jurisprudence-public-read-repository";

export class PostgresJurisprudencePublicSearchGateway implements JurisprudencePublicSearchGateway {
  readonly kind = "postgres" as const;

  constructor(private readonly repository: PostgresJurisprudencePublicReadRepository) {}

  async search(query: JurisprudencePublicSearchQuery): Promise<JurisprudencePublicSearchResponse> {
    try {
      const page = await this.repository.search(query);
      if (page.total === 0) {
        return { status: "empty", page };
      }
      return { status: "success", page };
    } catch {
      return {
        status: "error",
        message: "No fue posible completar la consulta. Inténtelo nuevamente más tarde.",
      };
    }
  }

  async getBySlug(slug: string): Promise<JurisprudencePublicDetailResponse> {
    try {
      const item = await this.repository.getBySlug(slug);
      if (!item) {
        return { status: "not_found" };
      }
      return { status: "success", item };
    } catch {
      return { status: "error" };
    }
  }
}
