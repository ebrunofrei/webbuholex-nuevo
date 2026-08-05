import { createHash } from "node:crypto";
import { buildJurisprudenceDeduplicationKey } from "@/lib/jurisprudence-identity";
import { jurisprudenceNewRecordSchema } from "@/lib/schemas/jurisprudence-repository";
import type { JurisprudenceNormalizedIngestionRecord } from "@/types/jurisprudence-ingestion";
import type { JurisprudenceNewRecord } from "@/types/jurisprudence-repository";

function normalizeText(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/g, " ");
}

function normalizedSortedList(values: readonly string[], lowerCase = false): string[] {
  const normalized = values
    .map(normalizeText)
    .filter((value) => value.length > 0)
    .map((value) => lowerCase ? value.toLocaleLowerCase("es-PE") : value);
  return [...new Set(normalized)].sort((left, right) => left.localeCompare(right, "es-PE"));
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right, "en"))
        .map(([key, entry]) => [key, stableValue(entry)]),
    );
  }
  return value;
}

export function sha256Hex(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

export function fingerprintNormalizedJurisprudenceRecord(record: JurisprudenceNewRecord): string {
  const fingerprintInput = {
    ...record,
    source: { ...record.source, checksum: null },
  };
  return sha256Hex(JSON.stringify(stableValue(fingerprintInput)));
}

export function normalizeJurisprudenceIngestionRecord(
  rawRecord: JurisprudenceNewRecord,
  sourceChecksum: string,
): JurisprudenceNormalizedIngestionRecord {
  const parsed = jurisprudenceNewRecordSchema.parse(rawRecord);
  const record = jurisprudenceNewRecordSchema.parse({
    ...structuredClone(parsed),
    caseNumber: normalizeText(parsed.caseNumber),
    resolutionNumber: normalizeText(parsed.resolutionNumber),
    resolutionType: normalizeText(parsed.resolutionType),
    institution: {
      ...parsed.institution,
      id: normalizeText(parsed.institution.id),
      name: normalizeText(parsed.institution.name),
      shortName: normalizeText(parsed.institution.shortName),
      country: normalizeText(parsed.institution.country),
    },
    issuingBody: normalizeText(parsed.issuingBody),
    instanceLevel: normalizeText(parsed.instanceLevel),
    specialty: normalizeText(parsed.specialty),
    matter: normalizeText(parsed.matter),
    submatter: parsed.submatter === null ? null : normalizeText(parsed.submatter),
    judicialDistrict: parsed.judicialDistrict === null ? null : normalizeText(parsed.judicialDistrict),
    chamberOrCourt: normalizeText(parsed.chamberOrCourt),
    rapporteur: parsed.rapporteur === null ? null : normalizeText(parsed.rapporteur),
    officialContent: {
      ...parsed.officialContent,
      language: normalizeText(parsed.officialContent.language),
    },
    editorialContent: {
      ...parsed.editorialContent,
      editorialTitle: normalizeText(parsed.editorialContent.editorialTitle),
      citedPrecedentIds: normalizedSortedList(parsed.editorialContent.citedPrecedentIds),
      relatedRecordIds: normalizedSortedList(parsed.editorialContent.relatedRecordIds),
      keywords: normalizedSortedList(parsed.editorialContent.keywords, true),
    },
    source: {
      ...parsed.source,
      name: normalizeText(parsed.source.name),
      documentId: parsed.source.documentId === null ? null : normalizeText(parsed.source.documentId),
    },
    search: {
      ...parsed.search,
      normalizedSearchText: normalizeText(parsed.search.normalizedSearchText).toLocaleLowerCase("es-PE"),
      normalizedMatters: normalizedSortedList(parsed.search.normalizedMatters, true),
      normalizedBodies: normalizedSortedList(parsed.search.normalizedBodies, true),
      jurisdiction: normalizeText(parsed.search.jurisdiction),
      tags: normalizedSortedList(parsed.search.tags, true),
    },
  });
  const identity = {
    sourceType: record.source.type,
    sourceDocumentId: record.source.documentId,
    caseNumber: record.caseNumber,
    resolutionNumber: record.resolutionNumber,
    institutionId: record.institution.id,
    issuedAt: record.issuedAt,
  };
  return {
    record,
    sourceChecksum: sourceChecksum.toLocaleLowerCase("en-US"),
    normalizedRecordFingerprint: fingerprintNormalizedJurisprudenceRecord(record),
    identity,
    jurisprudenceIdentityKey: buildJurisprudenceDeduplicationKey(identity),
  };
}
