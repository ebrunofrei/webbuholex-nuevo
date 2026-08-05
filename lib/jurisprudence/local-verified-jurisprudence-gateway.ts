import "server-only";
import {
  JurisprudencePublicSearchGateway,
  JurisprudencePublicSearchQuery,
  JurisprudencePublicSearchResponse,
  JurisprudencePublicDetailResponse,
  JurisprudencePublicSearchItem
} from "@/types/jurisprudence-public-search-gateway";
import { localVerifiedCatalog } from "@/data/jurisprudence/local-verified-catalog";
import { isJurisprudenceRecordPubliclyEligible } from "./is-jurisprudence-record-publicly-eligible";
import { toPublicJurisprudenceDto } from "./to-public-jurisprudence-dto";
import { JurisprudenceLocalRecord } from "@/types/jurisprudence-local-catalog";

function normalize(str: string | undefined): string {
  if (!str) return "";
  return str
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function matchesText(record: JurisprudenceLocalRecord, q: string): boolean {
  if (!q) return true;
  const nq = normalize(q);
  const fields = [
    record.caseNumber,
    record.publicCaseTitle,
    record.editorialTitle,
    record.processType,
    record.court,
    record.chamber,
    record.specialty,
    ...(record.matter || []),
    ...(record.keywords || []),
    record.editorialSummary,
    record.legalIssue,
    record.decision
  ];
  return fields.some(f => normalize(f).includes(nq));
}

function mapToSearchItem(record: JurisprudenceLocalRecord): JurisprudencePublicSearchItem {
  return {
    slug: record.slug,
    title: record.editorialTitle,
    caseTitle: record.publicCaseTitle,
    caseNumber: record.caseNumber,
    resolutionNumber: "", // Not present in the JSON source
    resolutionType: record.processType,
    institutionName: record.court,
    issuingBody: record.chamber,
    matter: record.matter[0] || "",
    issuedAt: record.decisionDate,
    summary: record.editorialSummary,
    sourceName: "Tribunal Constitucional"
  };
}

export function createLocalVerifiedJurisprudenceGateway(records: readonly JurisprudenceLocalRecord[]): JurisprudencePublicSearchGateway {
  return {
    kind: "local_verified_catalog",
    async search(query: JurisprudencePublicSearchQuery): Promise<JurisprudencePublicSearchResponse> {
      const eligibleRecords = records.filter(isJurisprudenceRecordPubliclyEligible);

      // Filters and search text
      const filtered = eligibleRecords.filter(r => {
        if (!matchesText(r, query.text || "")) return false;
        if (query.filters.issuedFrom !== undefined && r.decisionDate < query.filters.issuedFrom) return false;
        if (query.filters.issuedTo !== undefined && r.decisionDate > query.filters.issuedTo) return false;
        return true;
      });

      // Sort
      filtered.sort((a, b) => {
        // 1. decisionDate descendente
        const dateA = new Date(a.decisionDate || 0).getTime();
        const dateB = new Date(b.decisionDate || 0).getTime();
        if (dateA !== dateB) return dateB - dateA;
        // 2. caseNumber ascendente
        return a.caseNumber.localeCompare(b.caseNumber);
      });

      // Pagination
      const total = filtered.length;
      const { page, pageSize } = query;
      const startIndex = (page - 1) * pageSize;
      const paginated = filtered.slice(startIndex, startIndex + pageSize);
      const totalPages = Math.ceil(total / pageSize) || 1;

      const pageResult = {
        items: paginated.map(mapToSearchItem),
        total,
        page,
        pageSize,
        totalPages
      };

      if (total === 0) {
        return { status: "empty", page: pageResult };
      }

      return { status: "success", page: pageResult };
    },

    async getBySlug(slug: string): Promise<JurisprudencePublicDetailResponse> {
      const record = records.find(r => r.slug === slug);
      if (!record || !isJurisprudenceRecordPubliclyEligible(record)) {
        return { status: "not_found" };
      }
      const dto = toPublicJurisprudenceDto(record);
      return { status: "success", item: dto };
    }
  };
}

export const localVerifiedJurisprudenceGateway = createLocalVerifiedJurisprudenceGateway(localVerifiedCatalog);
