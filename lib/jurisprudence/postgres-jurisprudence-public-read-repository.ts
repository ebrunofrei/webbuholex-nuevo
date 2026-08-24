import "server-only";
import { sql, and, desc, asc, eq, gte, lte, count } from "drizzle-orm";
import { getJurisprudencePublicReadDatabase } from "@/database/client";
import { withJurisprudencePublicReadRole } from "@/database/roles";
import { jurisprudencePublishedRecords } from "@/database/schema/jurisprudence";
import type {
  JurisprudencePublicSearchQuery,
  JurisprudencePublicSearchPage,
  JurisprudencePublicSearchItem,
} from "@/types/jurisprudence-public-search-gateway";
import type { JurisprudencePublicProjectionDetail } from "@/types/jurisprudence";

export class PostgresJurisprudencePublicReadRepository {
  async search(query: JurisprudencePublicSearchQuery): Promise<JurisprudencePublicSearchPage> {
    const db = getJurisprudencePublicReadDatabase();

    return await withJurisprudencePublicReadRole(db, async (tx) => {
      const conditions = [];

      if (query.text) {
        conditions.push(sql`${jurisprudencePublishedRecords.searchVector} @@ websearch_to_tsquery('spanish', ${query.text})`);
      }

      if (query.filters.caseNumber) {
        conditions.push(eq(jurisprudencePublishedRecords.caseNumber, query.filters.caseNumber));
      }

      if (query.filters.resolutionNumber) {
        conditions.push(eq(jurisprudencePublishedRecords.resolutionNumber, query.filters.resolutionNumber));
      }

      if (query.filters.institutionName) {
        conditions.push(eq(jurisprudencePublishedRecords.institutionName, query.filters.institutionName));
      }

      if (query.filters.issuingBody) {
        conditions.push(eq(jurisprudencePublishedRecords.issuingBody, query.filters.issuingBody));
      }

      if (query.filters.matter) {
        conditions.push(eq(jurisprudencePublishedRecords.matter, query.filters.matter));
      }

      if (query.filters.resolutionType) {
        conditions.push(eq(jurisprudencePublishedRecords.resolutionType, query.filters.resolutionType));
      }

      if (query.filters.issuedFrom) {
        conditions.push(gte(jurisprudencePublishedRecords.issuedAt, query.filters.issuedFrom));
      }

      if (query.filters.issuedTo) {
        conditions.push(lte(jurisprudencePublishedRecords.issuedAt, query.filters.issuedTo));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const orderClauses = [];
      if (query.sort === "issued_desc") {
        orderClauses.push(desc(jurisprudencePublishedRecords.issuedAt), desc(jurisprudencePublishedRecords.id));
      } else if (query.sort === "issued_asc") {
        orderClauses.push(asc(jurisprudencePublishedRecords.issuedAt), asc(jurisprudencePublishedRecords.id));
      } else if (query.sort === "title_asc") {
        orderClauses.push(asc(jurisprudencePublishedRecords.title), asc(jurisprudencePublishedRecords.id));
      } else {
        // relevance or default
        if (query.text) {
          orderClauses.push(
            desc(sql`ts_rank_cd(${jurisprudencePublishedRecords.searchVector}, websearch_to_tsquery('spanish', ${query.text}))`),
            desc(jurisprudencePublishedRecords.issuedAt),
            desc(jurisprudencePublishedRecords.id)
          );
        } else {
          orderClauses.push(desc(jurisprudencePublishedRecords.issuedAt), desc(jurisprudencePublishedRecords.id));
        }
      }

      const offset = (query.page - 1) * query.pageSize;

      // Executing count and select in the same transaction snapshot (repeatable read).
      const [totalResult, rows] = await Promise.all([
        tx
          .select({ value: count() })
          .from(jurisprudencePublishedRecords)
          .where(whereClause),
        tx
          .select({
            slug: jurisprudencePublishedRecords.slug,
            title: jurisprudencePublishedRecords.title,
            caseTitle: jurisprudencePublishedRecords.caseTitle,
            caseNumber: jurisprudencePublishedRecords.caseNumber,
            resolutionNumber: jurisprudencePublishedRecords.resolutionNumber,
            resolutionType: jurisprudencePublishedRecords.resolutionType,
            institutionName: jurisprudencePublishedRecords.institutionName,
            issuingBody: jurisprudencePublishedRecords.issuingBody,
            matter: jurisprudencePublishedRecords.matter,
            issuedAt: jurisprudencePublishedRecords.issuedAt,
            summary: jurisprudencePublishedRecords.summary,
            sourceName: jurisprudencePublishedRecords.sourceName,
          })
          .from(jurisprudencePublishedRecords)
          .where(whereClause)
          .orderBy(...orderClauses)
          .limit(query.pageSize)
          .offset(offset),
      ]);

      const total = totalResult[0]?.value ?? 0;
      const totalPages = Math.max(1, Math.ceil(total / query.pageSize));

      const items: JurisprudencePublicSearchItem[] = rows.map((row) => ({
        slug: row.slug ?? "",
        title: row.title,
        caseTitle: row.caseTitle,
        caseNumber: row.caseNumber,
        resolutionNumber: row.resolutionNumber,
        resolutionType: row.resolutionType,
        institutionName: row.institutionName,
        issuingBody: row.issuingBody,
        matter: row.matter,
        issuedAt: row.issuedAt,
        summary: row.summary ?? "",
        sourceName: row.sourceName,
      }));

      return {
        items,
        total,
        page: query.page,
        pageSize: query.pageSize,
        totalPages,
      };
    });
  }

  async getBySlug(slug: string): Promise<JurisprudencePublicProjectionDetail | null> {
    const db = getJurisprudencePublicReadDatabase();

    return await withJurisprudencePublicReadRole(db, async (tx) => {
      const rows = await tx
        .select({
          slug: jurisprudencePublishedRecords.slug,
          title: jurisprudencePublishedRecords.title,
          caseTitle: jurisprudencePublishedRecords.caseTitle,
          caseNumber: jurisprudencePublishedRecords.caseNumber,
          resolutionNumber: jurisprudencePublishedRecords.resolutionNumber,
          resolutionType: jurisprudencePublishedRecords.resolutionType,
          institutionName: jurisprudencePublishedRecords.institutionName,
          issuingBody: jurisprudencePublishedRecords.issuingBody,
          matter: jurisprudencePublishedRecords.matter,
          issuedAt: jurisprudencePublishedRecords.issuedAt,
          summary: jurisprudencePublishedRecords.summary,
          sourceName: jurisprudencePublishedRecords.sourceName,
          officialHtmlUrl: jurisprudencePublishedRecords.officialHtmlUrl,
          officialPdfUrl: jurisprudencePublishedRecords.officialPdfUrl,
        })
        .from(jurisprudencePublishedRecords)
        .where(eq(jurisprudencePublishedRecords.slug, slug))
        .limit(1);

      if (rows.length === 0) {
        return null;
      }

      const row = rows[0]!;

      return {
        slug: row.slug ?? "",
        title: row.title,
        caseTitle: row.caseTitle,
        caseNumber: row.caseNumber,
        resolutionNumber: row.resolutionNumber,
        resolutionType: row.resolutionType,
        institutionName: row.institutionName,
        issuingBody: row.issuingBody,
        matter: row.matter,
        issuedAt: row.issuedAt,
        summary: row.summary ?? null,
        sourceName: row.sourceName,
        officialHtmlUrl: row.officialHtmlUrl ?? null,
        officialPdfUrl: row.officialPdfUrl ?? null,
      };
    });
  }
}
