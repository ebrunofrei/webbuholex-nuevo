import { describe, it, expect } from "vitest";
import { jurisprudenceRecordSchema } from "@/lib/schemas/jurisprudence";
import { normalizeJurisprudenceIngestionRecord } from "@/lib/jurisprudence-ingestion-normalization";
import { toJurisprudencePersistedRow, fromJurisprudencePersistedRow } from "@/lib/jurisprudence-persistence-model";
import { getJurisprudenceExternalIdentity, buildJurisprudenceDeduplicationKey } from "@/lib/jurisprudence-identity";

describe("J2-WEB-PROVENANCE-P1: Canonical Official Source Contract", () => {
  const baseRawRecord = {
    slug: null,
    editorialStatus: "draft" as const,
    publicationStatus: "private" as const,
    caseNumber: "123-2024",
    resolutionNumber: undefined,
    resolutionType: "Sentencia",
    institution: { id: "tc", name: "Tribunal Constitucional", shortName: "TC", country: "PE", kind: "constitutional_court" as const, officialHomepage: null },
    issuingBody: "Pleno",
    instanceLevel: "Única",
    specialty: "Constitucional",
    matter: "Amparo",
    submatter: null,
    judicialDistrict: null,
    chamberOrCourt: "Pleno",
    rapporteur: null,
    issuedAt: "2024-01-01",
    officiallyPublishedAt: null,
    officialContent: { officialSummary: null, officialFullText: null, fullTextAvailable: false, publicationAllowed: false, documentAvailability: "unavailable" as const, originFormat: "other" as const, language: "es", pageCount: null },
    editorialContent: { editorialTitle: "Test Title", editorialSummary: null, publicExcerpt: null, legalIssue: null, mainCriterion: null, relevantGrounds: [], decision: null, citedNorms: [], citedPrecedentIds: [], relatedRecordIds: [], keywords: [] },
    generatedContent: { internalDraft: null, reviewed: false, supportedBySource: false },
    authority: { resolutionCategory: "ordinary_decision" as const, legalAuthority: "unknown" as const, authorityEvidence: null, authorityVerifiedAt: null, validityStatus: "unknown" as const, validityEvidence: null },
    source: { type: "official_judiciary" as const, name: "Source", url: null, documentId: null, publishedAt: null, retrievedAt: null, checksum: null, verificationStatus: "unverified" as const, verifiedAt: null, verifiedBy: null, verificationNotes: null, evidenceReference: null },
    officialFile: null,
    search: { normalizedSearchText: "test title", normalizedMatters: [], normalizedBodies: [], jurisdiction: "PE", tags: [], editorialRelevance: 0 },
    internal: { editorialNotes: [], contradictions: [], generatedContentOnly: false }
  };

  const baseFullRecord = {
    id: "rec_123",
    recordVersion: 1,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...baseRawRecord,
    resolutionNumber: null
  };

  it("URL_VALIDATION_TESTS: HTTPS official HTML URL accepted", () => {
    const record = { ...baseRawRecord, source: { ...baseRawRecord.source, officialHtmlUrl: "https://tc.gob.pe/html" } };
    const normalized = normalizeJurisprudenceIngestionRecord(record, "checksum");
    expect(normalized.record.source.officialHtmlUrl).toBe("https://tc.gob.pe/html");
  });

  it("URL_VALIDATION_TESTS: HTTPS official PDF URL accepted", () => {
    const record = { ...baseRawRecord, source: { ...baseRawRecord.source, officialPdfUrl: "https://tc.gob.pe/pdf" } };
    const normalized = normalizeJurisprudenceIngestionRecord(record, "checksum");
    expect(normalized.record.source.officialPdfUrl).toBe("https://tc.gob.pe/pdf");
  });

  it("URL_VALIDATION_TESTS: HTTP official URL accepted (if contract allows)", () => {
    const record = { ...baseRawRecord, source: { ...baseRawRecord.source, officialHtmlUrl: "http://tc.gob.pe/html" } };
    const normalized = normalizeJurisprudenceIngestionRecord(record, "checksum");
    expect(normalized.record.source.officialHtmlUrl).toBe("http://tc.gob.pe/html");
  });

  it("URL_VALIDATION_TESTS: javascript: protocol rejected", () => {
    const record = { ...baseRawRecord, source: { ...baseRawRecord.source, officialHtmlUrl: "javascript:alert(1)" } };
    expect(() => normalizeJurisprudenceIngestionRecord(record, "checksum")).toThrow();
  });

  it("URL_VALIDATION_TESTS: data: protocol rejected", () => {
    const record = { ...baseRawRecord, source: { ...baseRawRecord.source, officialHtmlUrl: "data:text/html,<h1>Hello</h1>" } };
    expect(() => normalizeJurisprudenceIngestionRecord(record, "checksum")).toThrow();
  });

  it("URL_VALIDATION_TESTS: file: protocol rejected", () => {
    const record = { ...baseRawRecord, source: { ...baseRawRecord.source, officialPdfUrl: "file:///C:/Windows/System32/cmd.exe" } };
    expect(() => normalizeJurisprudenceIngestionRecord(record, "checksum")).toThrow();
  });

  it("URL_VALIDATION_TESTS: ftp: protocol rejected", () => {
    const record = { ...baseRawRecord, source: { ...baseRawRecord.source, officialPdfUrl: "ftp://tc.gob.pe/pdf" } };
    expect(() => normalizeJurisprudenceIngestionRecord(record, "checksum")).toThrow();
  });

  it("URL_VALIDATION_TESTS: legacy source.url remains z.string().url() (accepts javascript:, file:)", () => {
    // Proves legacy field wasn't accidentally hardened by P1.
    const record = { ...baseRawRecord, source: { ...baseRawRecord.source, url: "javascript:alert(1)" } };
    const normalized = normalizeJurisprudenceIngestionRecord(record, "checksum");
    expect(normalized.record.source.url).toBe("javascript:alert(1)");

    const record2 = { ...baseRawRecord, source: { ...baseRawRecord.source, url: "file:///test" } };
    const normalized2 = normalizeJurisprudenceIngestionRecord(record2, "checksum");
    expect(normalized2.record.source.url).toBe("file:///test");
  });

  it("CANONICAL_SERIALIZATION: HTML-only canonical record parses successfully", () => {
    const record = { ...baseFullRecord, source: { ...baseFullRecord.source, officialHtmlUrl: "https://tc.gob.pe/html" } };
    const parsed = jurisprudenceRecordSchema.parse(record);
    const json = JSON.stringify(parsed);
    const hydrated = jurisprudenceRecordSchema.parse(JSON.parse(json));
    expect(hydrated.source.officialHtmlUrl).toBe("https://tc.gob.pe/html");
    expect(hydrated.source.officialPdfUrl).toBeUndefined();
  });

  it("CANONICAL_SERIALIZATION: PDF-only canonical record parses successfully", () => {
    const record = { ...baseFullRecord, source: { ...baseFullRecord.source, officialPdfUrl: "https://tc.gob.pe/pdf" } };
    const parsed = jurisprudenceRecordSchema.parse(record);
    const json = JSON.stringify(parsed);
    const hydrated = jurisprudenceRecordSchema.parse(JSON.parse(json));
    expect(hydrated.source.officialHtmlUrl).toBeUndefined();
    expect(hydrated.source.officialPdfUrl).toBe("https://tc.gob.pe/pdf");
  });

  it("CANONICAL_SERIALIZATION: both HTML and PDF parse successfully", () => {
    const record = { ...baseFullRecord, source: { ...baseFullRecord.source, officialHtmlUrl: "https://tc.gob.pe/html", officialPdfUrl: "https://tc.gob.pe/pdf" } };
    const parsed = jurisprudenceRecordSchema.parse(record);
    const hydrated = jurisprudenceRecordSchema.parse(JSON.parse(JSON.stringify(parsed)));
    expect(hydrated.source.officialHtmlUrl).toBe("https://tc.gob.pe/html");
    expect(hydrated.source.officialPdfUrl).toBe("https://tc.gob.pe/pdf");
  });

  it("CANONICAL_SERIALIZATION: neither parses as undefined", () => {
    const parsed = jurisprudenceRecordSchema.parse(baseFullRecord);
    const hydrated = jurisprudenceRecordSchema.parse(JSON.parse(JSON.stringify(parsed)));
    expect(hydrated.source.officialHtmlUrl).toBeUndefined();
    expect(hydrated.source.officialPdfUrl).toBeUndefined();
  });

  it("HISTORICAL_SCHEMA_HYDRATION: payload without new keys parses safely", () => {
    const historicalSource = { ...baseFullRecord.source };
    const historicalRecord = { ...baseFullRecord, source: historicalSource };
    const parsed = jurisprudenceRecordSchema.parse(historicalRecord);
    expect(parsed.source.officialHtmlUrl).toBeUndefined();
    expect(parsed.source.officialPdfUrl).toBeUndefined();
  });

  it("REAL_PERSISTENCE_MAPPER_ROUNDTRIP: canonical record roundtrips successfully", () => {
    const record = { ...baseFullRecord, source: { ...baseFullRecord.source, officialHtmlUrl: "https://tc.gob.pe/html", officialPdfUrl: "https://tc.gob.pe/pdf" } };
    const parsed = jurisprudenceRecordSchema.parse(record);
    const row = toJurisprudencePersistedRow(parsed);
    expect(row.payloadJson).toContain("https://tc.gob.pe/html");
    expect(row.payloadJson).toContain("https://tc.gob.pe/pdf");

    const hydrated = fromJurisprudencePersistedRow(row);
    expect(hydrated.source.officialHtmlUrl).toBe("https://tc.gob.pe/html");
    expect(hydrated.source.officialPdfUrl).toBe("https://tc.gob.pe/pdf");
  });

  it("HISTORICAL_PERSISTENCE_MAPPER_HYDRATION: payload without new properties hydrates successfully", () => {
    const historicalSource = { ...baseFullRecord.source };
    const historicalRecord = { ...baseFullRecord, source: historicalSource };
    const parsed = jurisprudenceRecordSchema.parse(historicalRecord);

    // Simulate what the database would return
    const row = toJurisprudencePersistedRow(parsed);

    // Actually map it back
    const hydrated = fromJurisprudencePersistedRow(row);
    expect(hydrated.source.officialHtmlUrl).toBeUndefined();
    expect(hydrated.source.officialPdfUrl).toBeUndefined();
  });

  it("VERSIONING_TESTS: official URL changes follow versioning/fingerprint semantics", () => {
    const record1 = { ...baseRawRecord, source: { ...baseRawRecord.source, officialHtmlUrl: "https://tc.gob.pe/1" } };
    const record2 = { ...baseRawRecord, source: { ...baseRawRecord.source, officialHtmlUrl: "https://tc.gob.pe/2" } };
    const n1 = normalizeJurisprudenceIngestionRecord(record1, "checksum");
    const n2 = normalizeJurisprudenceIngestionRecord(record2, "checksum");
    expect(n1.normalizedRecordFingerprint).not.toBe(n2.normalizedRecordFingerprint);
  });

  it("IDEMPOTENCY_TESTS: same URLs produce identical fingerprint", () => {
    const record1 = { ...baseRawRecord, source: { ...baseRawRecord.source, officialHtmlUrl: "https://tc.gob.pe/1" } };
    const n1 = normalizeJurisprudenceIngestionRecord(record1, "checksum");
    const n2 = normalizeJurisprudenceIngestionRecord(record1, "checksum");
    expect(n1.normalizedRecordFingerprint).toBe(n2.normalizedRecordFingerprint);
  });

  it("DEDUPLICATION_TESTS: official URLs do not affect deduplication legal identity", () => {
    const record1 = { ...baseRawRecord, source: { ...baseRawRecord.source, officialHtmlUrl: "https://tc.gob.pe/1" } };
    const record2 = { ...baseRawRecord, source: { ...baseRawRecord.source, officialHtmlUrl: "https://tc.gob.pe/2" } };
    const n1 = normalizeJurisprudenceIngestionRecord(record1, "checksum");
    const n2 = normalizeJurisprudenceIngestionRecord(record2, "checksum");

    // Use the actual external identity functions to prove identity/dedup keys are not affected
    const fullRecord1 = jurisprudenceRecordSchema.parse({ ...n1.record, id: "rec_1", recordVersion: 1, createdAt: "2024-01-01T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z", resolutionNumber: n1.record.resolutionNumber ?? null });
    const fullRecord2 = jurisprudenceRecordSchema.parse({ ...n2.record, id: "rec_2", recordVersion: 1, createdAt: "2024-01-01T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z", resolutionNumber: n2.record.resolutionNumber ?? null });
    const id1 = getJurisprudenceExternalIdentity(fullRecord1);
    const id2 = getJurisprudenceExternalIdentity(fullRecord2);
    expect(id1).toEqual(id2);

    const dedup1 = buildJurisprudenceDeduplicationKey(id1);
    const dedup2 = buildJurisprudenceDeduplicationKey(id2);
    expect(dedup1).toBe(dedup2);

    expect(n1.jurisprudenceIdentityKey).toBe(n2.jurisprudenceIdentityKey);
  });
});
