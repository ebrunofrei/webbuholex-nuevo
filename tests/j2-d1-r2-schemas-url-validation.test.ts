import { describe, expect, it } from "vitest";
import { jurisprudencePublishOutboxPayloadSchema } from "@/lib/jurisprudence/jurisprudence-publication-outbox-schemas";
import { jurisprudencePublicProjectionSchema } from "@/lib/schemas/jurisprudence-publication-execution";

describe("URL Validation - Accepted Hardening", () => {
  const validBasePayload = {
    id: "outbox-id-123",
    recordVersion: 1,
    slug: "test-slug-001",
    title: "Test Title",
    caseTitle: "Test Case Title",
    caseNumber: "EXP-001",
    resolutionNumber: "RES-001",
    resolutionType: "Sentencia",
    institutionName: "TC",
    issuingBody: "Pleno",
    matter: "Constitucional",
    issuedAt: "2026-08-01",
    summary: "Test summary",
    sourceName: "TC",
  };

  const validBaseProjection = {
    projectionId: "proj-123",
    executionId: "exec-123",
    authorizationCaseId: "auth-123",
    recordId: "rec-123",
    recordVersion: 1,
    status: "generated",
    slug: "test-slug-001",
    title: "Test Title",
    caseNumber: "EXP-001",
    resolutionNumber: "RES-001",
    resolutionType: "Sentencia",
    institutionName: "TC",
    issuingBody: "Pleno",
    matter: "Constitucional",
    issuedAt: "2026-08-01",
    summary: "Test summary",
    sourceName: "TC",
    sourceDocumentId: null,
    generatedAt: "2026-08-01T12:00:00Z",
    updatedAt: "2026-08-01T12:00:00Z",
    exposedPublicly: false,
    deployed: false,
  };

  describe("jurisprudencePublishOutboxPayloadSchema", () => {
    it("accepts HTTPS", () => {
      const payload = { ...validBasePayload, officialHtmlUrl: "https://tc.gob.pe", officialPdfUrl: "https://tc.gob.pe/doc.pdf" };
      expect(jurisprudencePublishOutboxPayloadSchema.safeParse(payload).success).toBe(true);
    });

    it("accepts HTTP", () => {
      const payload = { ...validBasePayload, officialHtmlUrl: "http://tc.gob.pe", officialPdfUrl: "http://tc.gob.pe/doc.pdf" };
      expect(jurisprudencePublishOutboxPayloadSchema.safeParse(payload).success).toBe(true);
    });

    it("rejects javascript", () => {
      const payload = { ...validBasePayload, officialHtmlUrl: "javascript:alert(1)", officialPdfUrl: null };
      expect(jurisprudencePublishOutboxPayloadSchema.safeParse(payload).success).toBe(false);
    });

    it("rejects data", () => {
      const payload = { ...validBasePayload, officialHtmlUrl: "data:text/html,test", officialPdfUrl: null };
      expect(jurisprudencePublishOutboxPayloadSchema.safeParse(payload).success).toBe(false);
    });

    it("rejects file", () => {
      const payload = { ...validBasePayload, officialHtmlUrl: "file:///etc/passwd", officialPdfUrl: null };
      expect(jurisprudencePublishOutboxPayloadSchema.safeParse(payload).success).toBe(false);
    });

    it("rejects ftp", () => {
      const payload = { ...validBasePayload, officialHtmlUrl: "ftp://server/file", officialPdfUrl: null };
      expect(jurisprudencePublishOutboxPayloadSchema.safeParse(payload).success).toBe(false);
    });

    it("accepts null", () => {
      const payload = { ...validBasePayload, officialHtmlUrl: null, officialPdfUrl: null };
      expect(jurisprudencePublishOutboxPayloadSchema.safeParse(payload).success).toBe(true);
    });
  });

  describe("jurisprudencePublicProjectionSchema", () => {
    it("accepts HTTPS", () => {
      const payload = { ...validBaseProjection, officialHtmlUrl: "https://tc.gob.pe", officialPdfUrl: "https://tc.gob.pe/doc.pdf" };
      expect(jurisprudencePublicProjectionSchema.safeParse(payload).success).toBe(true);
    });

    it("accepts HTTP", () => {
      const payload = { ...validBaseProjection, officialHtmlUrl: "http://tc.gob.pe", officialPdfUrl: "http://tc.gob.pe/doc.pdf" };
      expect(jurisprudencePublicProjectionSchema.safeParse(payload).success).toBe(true);
    });

    it("rejects javascript", () => {
      const payload = { ...validBaseProjection, officialHtmlUrl: "javascript:alert(1)", officialPdfUrl: null };
      expect(jurisprudencePublicProjectionSchema.safeParse(payload).success).toBe(false);
    });

    it("rejects data", () => {
      const payload = { ...validBaseProjection, officialHtmlUrl: "data:text/html,test", officialPdfUrl: null };
      expect(jurisprudencePublicProjectionSchema.safeParse(payload).success).toBe(false);
    });

    it("rejects file", () => {
      const payload = { ...validBaseProjection, officialHtmlUrl: "file:///etc/passwd", officialPdfUrl: null };
      expect(jurisprudencePublicProjectionSchema.safeParse(payload).success).toBe(false);
    });

    it("rejects ftp", () => {
      const payload = { ...validBaseProjection, officialHtmlUrl: "ftp://server/file", officialPdfUrl: null };
      expect(jurisprudencePublicProjectionSchema.safeParse(payload).success).toBe(false);
    });

    it("accepts null", () => {
      const payload = { ...validBaseProjection, officialHtmlUrl: null, officialPdfUrl: null };
      expect(jurisprudencePublicProjectionSchema.safeParse(payload).success).toBe(true);
    });
  });
});
