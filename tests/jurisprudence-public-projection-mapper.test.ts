import { describe, expect, it } from "vitest";

import { toPublicProjectionRecord } from "@/lib/jurisprudence/jurisprudence-public-projection-mapper";
import type {
  JurisprudenceProjectionSourceRecord,
  JurisprudencePublicProjection,
} from "@/types/jurisprudence-publication-execution";

describe("JurisprudencePublicProjectionMapper", () => {
  it("maps id to canonical recordId, not projectionId, to preserve identity contract", () => {
    const record: JurisprudenceProjectionSourceRecord = {
      id: "canonical-record-id-123",
      recordVersion: 1,
      slug: "some-slug",
      caseNumber: "CASE-1",
      resolutionNumber: "RES-1",
      resolutionType: "TYPE",
      institutionName: "INST",
      issuingBody: "BODY",
      matter: "MATTER",
      issuedAt: "2026-01-01",

      editorialContent: {
        editorialTitle: "Case Title",
        editorialSummary: "Editorial summary",
        publicExcerpt: "Public excerpt",
        legalIssue: null,
        mainCriterion: null,
        relevantGrounds: [],
        decision: null,
        citedNorms: [],
        citedPrecedentIds: [],
        relatedRecordIds: [],
        keywords: [],
      },

      officialContent: {
        officialSummary: "Official summary",
        officialFullText: "Official full text",
        fullTextAvailable: true,
        publicationAllowed: true,
        documentAvailability: "full_text_available",
        originFormat: "pdf",
        language: "es",
        pageCount: null,
      },

      source: {
        type: "official_judiciary",
        name: "Source",
        url: null,
        documentId: null,
        publishedAt: null,
        retrievedAt: null,
        checksum: null,
        verificationStatus: "unverified",
        verifiedAt: null,
        verifiedBy: null,
        verificationNotes: null,
        evidenceReference: null,
      },
    };

    const projection: JurisprudencePublicProjection = {
      projectionId: "unique-projection-id-999",
      recordId: "canonical-record-id-123",
      executionId: "exec-1",
      authorizationCaseId: "auth-1",
      recordVersion: 1,
      status: "generated",
      title: "Projection Title",
      slug: "some-slug",
      caseNumber: "CASE-1",
      resolutionNumber: "RES-1",
      resolutionType: "TYPE",
      institutionName: "INST",
      issuingBody: "BODY",
      matter: "MATTER",
      issuedAt: "2026-01-01",
      summary: "Summary",
      sourceName: "Source",
      officialHtmlUrl: null,
      officialPdfUrl: null,
      sourceDocumentId: null,
      generatedAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      exposedPublicly: false,
      deployed: false,
    };

    const result = toPublicProjectionRecord(record, projection);

    // Identity contract regression:
    expect(result.id).toBe("canonical-record-id-123");
    expect(result.id).not.toBe("unique-projection-id-999");

    // Other fields remain unchanged:
    expect(result.slug).toBe("some-slug");
    expect(result.recordVersion).toBe(1);
    expect(result.title).toBe("Projection Title");
  });

  it("maps official URLs (provenance) exactly as they arrive from the projection", () => {
    const record: JurisprudenceProjectionSourceRecord = {
      id: "canonical-record-id-123",
      recordVersion: 1,
      slug: "some-slug",
      caseNumber: "CASE-1",
      resolutionNumber: "RES-1",
      resolutionType: "TYPE",
      institutionName: "INST",
      issuingBody: "BODY",
      matter: "MATTER",
      issuedAt: "2026-01-01",
      editorialContent: {
        editorialTitle: "Case Title",
        editorialSummary: "Editorial summary",
        publicExcerpt: "Public excerpt",
        legalIssue: null,
        mainCriterion: null,
        relevantGrounds: [],
        decision: null,
        citedNorms: [],
        citedPrecedentIds: [],
        relatedRecordIds: [],
        keywords: [],
      },
      officialContent: {
        officialSummary: "Official summary",
        officialFullText: "Official full text",
        fullTextAvailable: true,
        publicationAllowed: true,
        documentAvailability: "full_text_available",
        originFormat: "pdf",
        language: "es",
        pageCount: null,
      },
      source: {
        type: "official_judiciary",
        name: "Source",
        url: null,
        documentId: null,
        publishedAt: null,
        retrievedAt: null,
        checksum: null,
        verificationStatus: "unverified",
        verifiedAt: null,
        verifiedBy: null,
        verificationNotes: null,
        evidenceReference: null,
      },
    };

    const projection: JurisprudencePublicProjection = {
      projectionId: "unique-projection-id-999",
      recordId: "canonical-record-id-123",
      executionId: "exec-1",
      authorizationCaseId: "auth-1",
      recordVersion: 1,
      status: "generated",
      title: "Projection Title",
      slug: "some-slug",
      caseNumber: "CASE-1",
      resolutionNumber: "RES-1",
      resolutionType: "TYPE",
      institutionName: "INST",
      issuingBody: "BODY",
      matter: "MATTER",
      issuedAt: "2026-01-01",
      summary: "Summary",
      sourceName: "Source",
      officialHtmlUrl: "https://tc.gob.pe/html",
      officialPdfUrl: "https://tc.gob.pe/pdf",
      sourceDocumentId: null,
      generatedAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      exposedPublicly: false,
      deployed: false,
    };

    const result = toPublicProjectionRecord(record, projection);

    expect(result.officialHtmlUrl).toBe("https://tc.gob.pe/html");
    expect(result.officialPdfUrl).toBe("https://tc.gob.pe/pdf");
  });
});