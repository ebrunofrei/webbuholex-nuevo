import { describe, it, expect, vi } from "vitest";
import { createJurisprudenceIngestionPipeline } from "@/lib/jurisprudence-ingestion-pipeline";
import { createFictitiousJurisprudenceRecord } from "./helpers/jurisprudence-record-fixture";
import { JurisprudenceApplicationError } from "@/lib/jurisprudence-application-error";
import type { JurisprudenceIngestionItem, JurisprudenceIngestionRawRecord } from "@/types/jurisprudence-ingestion";

describe("J2-A.2K Preview Validation", () => {
  const notFoundError = new JurisprudenceApplicationError("NOT_FOUND", "No existe");
  const mockApi = {
    getInternalRecordByIdentity: vi.fn().mockRejectedValue(notFoundError),
    createRecord: vi.fn(),
    updateRecord: vi.fn(),
    close: vi.fn(),
  };

  const pipeline = createJurisprudenceIngestionPipeline({
    api: mockApi as unknown as Parameters<typeof createJurisprudenceIngestionPipeline>[0]["api"],
    logger: { log: () => {} },
    now: () => "2026-08-20T12:00:00Z",
    generateId: () => "mock-id-1234",
  });

  const fictitiousRecord = createFictitiousJurisprudenceRecord(1);
  const baseRawRecord: JurisprudenceIngestionRawRecord = {
    caseNumber: fictitiousRecord.caseNumber,
    slug: fictitiousRecord.slug,
    resolutionType: fictitiousRecord.resolutionType,
    issuedAt: fictitiousRecord.issuedAt,
    institution: fictitiousRecord.institution,
    issuingBody: fictitiousRecord.issuingBody,
    instanceLevel: fictitiousRecord.instanceLevel,
    specialty: fictitiousRecord.specialty,
    matter: fictitiousRecord.matter,
    submatter: fictitiousRecord.submatter,
    judicialDistrict: fictitiousRecord.judicialDistrict,
    chamberOrCourt: fictitiousRecord.chamberOrCourt,
    rapporteur: fictitiousRecord.rapporteur,
    editorialStatus: fictitiousRecord.editorialStatus,
    publicationStatus: fictitiousRecord.publicationStatus,
    officiallyPublishedAt: fictitiousRecord.officiallyPublishedAt,
    officialContent: fictitiousRecord.officialContent,
    editorialContent: fictitiousRecord.editorialContent,
    source: fictitiousRecord.source,
    search: fictitiousRecord.search,
    internal: fictitiousRecord.internal,
    generatedContent: fictitiousRecord.generatedContent,
    authority: fictitiousRecord.authority,
    officialFile: fictitiousRecord.officialFile,
  };

  const baseItem: JurisprudenceIngestionItem = {
    ingestionItemId: "item-12345",
    source: {
      sourceKind: "local_json",
      sourceReference: "ref",
      acquiredAt: "2026-08-20T12:00:00Z",
      acquiredBy: "user",
      checksum: "0".repeat(64),
      mediaType: "application/json",
      byteSize: 100,
    },
    requestedAction: "preview_create",
    idempotencyKey: "idem-12345",
    rawRecord: baseRawRecord,
  };

  let batchCounter = 0;

  function createTestBatch(rawRecordOverride?: Record<string, unknown>, itemsOverride?: unknown[]): unknown {
    batchCounter++;
    return {
      batchId: `batch-1234-${batchCounter}`,
      context: {
        requestId: `req-12345678-${batchCounter}`,
        actor: { kind: "system", id: "sys-123456" },
        operationSource: "test",
        requestedAt: "2026-08-20T12:00:00Z"
      },
      items: itemsOverride || [
        {
          ...baseItem,
          rawRecord: {
            ...baseRawRecord,
            ...rawRecordOverride,
          },
        }
      ],
    };
  }

  it("TEST — VALID INGESTION OMITTED RESOLUTION", async () => {
    const batch = createTestBatch();
    const result = await pipeline.previewBatch(batch);
    expect(result.status).toBe("accepted");
    expect(result.items[0]?.status).toBe("preview_ready");
  });

  it("TEST — VALID RESOLUTION STRING", async () => {
    const batch = createTestBatch({ resolutionNumber: "RES-123" });
    const result = await pipeline.previewBatch(batch);
    expect(result.status).toBe("accepted");
    expect(result.items[0]?.status).toBe("preview_ready");
  });

  it("TEST — NULL INPUT", async () => {
    const batch = createTestBatch({ resolutionNumber: null });
    const result = await pipeline.previewBatch(batch);
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.issues.some((i) => i.code === "INVALID_BATCH")).toBe(true);
    }
  });

  it("TEST — EMPTY/WHITESPACE", async () => {
    const batchEmpty = createTestBatch({ resolutionNumber: "" });
    const resultEmpty = await pipeline.previewBatch(batchEmpty);
    expect(resultEmpty.status).toBe("rejected");

    const batchWhitespace = createTestBatch({ resolutionNumber: "   " });
    const resultWhitespace = await pipeline.previewBatch(batchWhitespace);
    expect(resultWhitespace.status).toBe("rejected");
  });

  it("TEST — CANONICAL FAILURE", async () => {
    const batch = createTestBatch({
      officialContent: {
        ...baseRawRecord.officialContent,
        documentAvailability: "official_file_available",
      }
    });
    const result = await pipeline.previewBatch(batch);
    expect(result.status).toBe("accepted");
    expect(result.items[0]?.status).toBe("rejected");
    if (result.status === "accepted" && result.items[0]?.status === "rejected") {
      expect(result.items[0].issues[0]?.code).toBe("INVALID_RECORD");
      expect(result.items[0].issues[0]?.message).toContain("requiere un archivo verificado");
    }
  });

  it("TEST — PUBLICATION OVERRIDE", async () => {
    const batch = createTestBatch({
      officialContent: {
        ...baseRawRecord.officialContent,
        publicationAllowed: true,
      }
    });
    const result = await pipeline.previewBatch(batch);
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.issues.some((i) => i.code === "INVALID_BATCH")).toBe(true);
    }
  });

  it("TEST — DUPLICATE CHECK", async () => {
    const batch = createTestBatch();
    mockApi.getInternalRecordByIdentity.mockResolvedValueOnce({
      record: {
        id: "existing-id",
        recordVersion: 1,
        sourceChecksum: baseItem.source.checksum,
      }
    });

    const result = await pipeline.previewBatch(batch);
    expect(result.status).toBe("accepted");
    expect(result.items[0]?.status).toBe("duplicate_existing");
  });

  it("TEST — UNKNOWN FIELD", async () => {
    const batch = createTestBatch({ unknown_field_here: "this should fail" });
    const result = await pipeline.previewBatch(batch);
    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.issues.some((i) => i.code === "INVALID_BATCH")).toBe(true);
    }
  });

  it("TEST — SHARED REFINEMENTS EXACTLY MATCH", async () => {
    const { jurisprudenceRecordSchema } = await import("@/lib/schemas/jurisprudence");
    const { jurisprudenceNewRecordSchema } = await import("@/lib/schemas/jurisprudence-repository");

    const record = {
      ...baseRawRecord,
      id: "test-id",
      recordVersion: 1,
      createdAt: "2026-08-20T12:00:00Z",
      updatedAt: "2026-08-20T12:00:00Z",
    };

    const invalidRecord = {
      ...record,
      officialContent: {
        ...record.officialContent,
        documentAvailability: "official_file_available",
      },
      officialFile: null,
    };

    const recordSchemaResult = jurisprudenceRecordSchema.safeParse(invalidRecord);
    const newRecordSchemaResult = jurisprudenceNewRecordSchema.safeParse(invalidRecord);

    expect(recordSchemaResult.success).toBe(false);
    expect(newRecordSchemaResult.success).toBe(false);

    if (!recordSchemaResult.success && !newRecordSchemaResult.success) {
      expect(recordSchemaResult.error.issues[0]?.message).toBe(newRecordSchemaResult.error.issues[0]?.message);
    }
  });

  it("TEST — THREE TC-SHAPED FIXTURES", async () => {
    const items = ["00001-2010-PI/TC", "00005-2010-PI/TC", "00002-2010-PI/TC"].map((caseNum, idx) => {
      return {
        ...baseItem,
        ingestionItemId: `item-${idx}-12345`,
        idempotencyKey: `idem-${idx}-12345`,
        source: {
          ...baseItem.source,
          checksum: idx.toString().padStart(64, "0"),
        },
        rawRecord: {
          ...baseRawRecord,
          caseNumber: caseNum,
        },
      };
    });
    const batch = createTestBatch(undefined, items);

    const result = await pipeline.previewBatch(batch);
    expect(result.status).toBe("accepted");
    if (result.status === "accepted") {
      expect(result.items.length).toBe(3);
      result.items.forEach((r) => expect(r.status).toBe("preview_ready"));
    }
  });
});
