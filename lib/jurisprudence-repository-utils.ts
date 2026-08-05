import { jurisprudenceRecordSchema } from "@/lib/schemas/jurisprudence";
import { jurisprudenceRepositoryQuerySchema } from "@/lib/schemas/jurisprudence-repository";
import type { JurisprudenceRecord } from "@/types/jurisprudence";
import type {
  JurisprudenceNewRecord,
  JurisprudenceRepositoryFilters,
  JurisprudenceRepositoryListInput,
  JurisprudenceRepositoryPage,
  JurisprudenceRepositorySearchInput,
  NormalizedJurisprudenceRepositoryQuery,
} from "@/types/jurisprudence-repository";

export function cloneJurisprudenceRecord(record: JurisprudenceRecord): JurisprudenceRecord {
  return structuredClone(record);
}

export function cloneJurisprudenceNewRecord(record: JurisprudenceNewRecord): JurisprudenceNewRecord {
  return structuredClone(record);
}

export function validateJurisprudenceRecordForPersistence(record: JurisprudenceRecord): JurisprudenceRecord {
  return jurisprudenceRecordSchema.parse(record) as JurisprudenceRecord;
}

export function nextRepositoryTimestamp(now: string, previous: string | null = null): string {
  const parsedNow = new Date(now);
  if (Number.isNaN(parsedNow.getTime())) throw new TypeError("El reloj del repositorio debe producir una fecha ISO válida.");
  if (previous === null || parsedNow.getTime() > new Date(previous).getTime()) return parsedNow.toISOString();
  return new Date(new Date(previous).getTime() + 1).toISOString();
}

function normalizeFilterText(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleUpperCase("es-PE");
}

export function normalizeJurisprudenceRepositoryQuery(
  input: JurisprudenceRepositoryListInput | JurisprudenceRepositorySearchInput = {},
): NormalizedJurisprudenceRepositoryQuery {
  const hasQ = "q" in input;
  const parsed = jurisprudenceRepositoryQuerySchema.parse({ ...input, q: hasQ ? input.q : undefined });
  const filters: JurisprudenceRepositoryFilters = {
    ...(parsed.filters.caseNumber === undefined ? {} : { caseNumber: parsed.filters.caseNumber }),
    ...(parsed.filters.resolutionNumber === undefined ? {} : { resolutionNumber: parsed.filters.resolutionNumber }),
    ...(parsed.filters.institutionId === undefined ? {} : { institutionId: parsed.filters.institutionId }),
    ...(parsed.filters.matter === undefined ? {} : { matter: parsed.filters.matter }),
    ...(parsed.filters.editorialStatus === undefined ? {} : { editorialStatus: parsed.filters.editorialStatus }),
    ...(parsed.filters.publicationStatus === undefined ? {} : { publicationStatus: parsed.filters.publicationStatus }),
    ...(parsed.filters.verificationStatus === undefined ? {} : { verificationStatus: parsed.filters.verificationStatus }),
    ...(parsed.filters.issuedFrom === undefined ? {} : { issuedFrom: parsed.filters.issuedFrom }),
    ...(parsed.filters.issuedTo === undefined ? {} : { issuedTo: parsed.filters.issuedTo }),
  };
  return {
    ...(parsed.q === undefined ? {} : { q: normalizeFilterText(parsed.q) }),
    filters,
    page: parsed.page,
    pageSize: parsed.pageSize,
    sort: parsed.sort,
  };
}

export function recordMatchesJurisprudenceFilters(record: JurisprudenceRecord, filters: JurisprudenceRepositoryFilters): boolean {
  const equals = (actual: string, expected: string | undefined) => expected === undefined || normalizeFilterText(actual) === normalizeFilterText(expected);
  return equals(record.caseNumber, filters.caseNumber)
    && equals(record.resolutionNumber, filters.resolutionNumber)
    && equals(record.institution.id, filters.institutionId)
    && equals(record.matter, filters.matter)
    && (filters.editorialStatus === undefined || record.editorialStatus === filters.editorialStatus)
    && (filters.publicationStatus === undefined || record.publicationStatus === filters.publicationStatus)
    && (filters.verificationStatus === undefined || record.source.verificationStatus === filters.verificationStatus)
    && (filters.issuedFrom === undefined || record.issuedAt >= filters.issuedFrom)
    && (filters.issuedTo === undefined || record.issuedAt <= filters.issuedTo);
}

export function recordMatchesDeterministicQuery(record: JurisprudenceRecord, q: string | undefined): boolean {
  if (q === undefined) return true;
  const haystack = [
    record.search.normalizedSearchText,
    record.caseNumber,
    record.resolutionNumber,
    record.institution.name,
    record.issuingBody,
    record.matter,
    record.editorialContent.editorialTitle,
  ].join(" ");
  return normalizeFilterText(haystack).includes(q);
}

export function sortJurisprudenceRecords(records: readonly JurisprudenceRecord[], query: NormalizedJurisprudenceRepositoryQuery): JurisprudenceRecord[] {
  const direction = query.sort.endsWith("_asc") ? 1 : -1;
  const field = query.sort.startsWith("issued_at") ? "issuedAt" : "updatedAt";
  return [...records].sort((left, right) => {
    const compared = left[field].localeCompare(right[field]) * direction;
    return compared === 0 ? left.id.localeCompare(right.id) : compared;
  });
}

export function paginateJurisprudenceRecords(records: readonly JurisprudenceRecord[], query: NormalizedJurisprudenceRepositoryQuery): JurisprudenceRepositoryPage {
  const total = records.length;
  const start = (query.page - 1) * query.pageSize;
  return {
    items: records.slice(start, start + query.pageSize).map(cloneJurisprudenceRecord),
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize),
    sort: query.sort,
  };
}
