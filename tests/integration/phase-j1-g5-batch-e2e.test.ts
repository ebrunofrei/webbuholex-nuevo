/* eslint-disable @typescript-eslint/no-explicit-any */
import { loadEnvFile } from "node:process";
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import { jurisprudencePublicationOutbox, jurisprudenceRecords } from "@/database/schema/jurisprudence";
import { PostgresJurisprudencePublicationOutboxProcessorRepository } from "@/lib/jurisprudence/postgres-jurisprudence-publication-outbox-processor-repository";
import { PostgresJurisprudencePublicProjectionWriter } from "@/lib/jurisprudence/postgres-jurisprudence-public-projection-writer";
import { JurisprudencePublicationOutboxProcessor } from "@/lib/jurisprudence/jurisprudence-publication-outbox-processor";
import { processBatch } from "@/lib/jurisprudence/jurisprudence-publication-outbox-batch";
import { v4 as uuid } from "uuid";
import { inArray, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

loadEnvFile(".env.local");

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `${name} is required for J1-G.5 integration`,
    );
  }

  return value;
}

const migrationUrl =
  requireEnvironmentVariable("DATABASE_MIGRATION_URL");

describe("J1-G.5 Batch Processor E2E and Concurrency", () => {
  let adminDb: any;
  let processor1: JurisprudencePublicationOutboxProcessor;
  let processor2: JurisprudencePublicationOutboxProcessor;
  let queryClient: ReturnType<typeof postgres>;

  beforeAll(async () => {
    // Admin DB for fixture setup (has permission to insert directly)
    queryClient = postgres(migrationUrl, {
      ssl: "require",
      prepare: false,
      max: 1,
    });

    adminDb = drizzle(queryClient);

    // Clean up any test fixtures from previous runs to prevent contamination
    await adminDb
      .delete(jurisprudencePublicationOutbox)
      .where(
        lt(
          jurisprudencePublicationOutbox.availableAt,
          new Date("2000-01-01"),
        ),
      );

    const repo1 =
      new PostgresJurisprudencePublicationOutboxProcessorRepository();
    const writer1 =
      new PostgresJurisprudencePublicProjectionWriter();

    processor1 =
      new JurisprudencePublicationOutboxProcessor(
        repo1,
        writer1,
      );

    const repo2 =
      new PostgresJurisprudencePublicationOutboxProcessorRepository();
    const writer2 =
      new PostgresJurisprudencePublicProjectionWriter();

    processor2 =
      new JurisprudencePublicationOutboxProcessor(
        repo2,
        writer2,
      );
  });

  afterAll(async () => {
    await queryClient.end();
  });

  async function createEligibleMessages(count: number, dateStr: string) {
    const newOutboxIds: string[] = [];
    const fixtureRecordId = "19bdd9bd-6a3b-4a16-b021-0699c790deab";
    const fixtureExecutionId = "c094b196-0f94-4339-99c3-31e1cd91f043";

    for (let i = 0; i < count; i++) {
      const outboxId = uuid();
      newOutboxIds.push(outboxId);

      // Create pending outbox message directly, relying on existing record/execution
      await adminDb.insert(jurisprudencePublicationOutbox).values({
        id: outboxId,
        recordId: fixtureRecordId,
        recordVersion: 1,
        executionId: fixtureExecutionId,
        executionVersion: 1,
        eventType: "publish_projection",
        payload: { title: `Test Batch ${i}` },
        status: "pending",
        attempts: 0,
        availableAt: new Date(dateStr),
      });
    }
    return newOutboxIds;
  }

  it("processes a bounded batch properly, leaving remaining untouched", async () => {
    const outboxIds = await createEligibleMessages(5, "1970-01-01T00:00:00.000Z");

    const result = await processBatch(processor1, { maxItems: 2, maxDurationMs: 10000 });
    console.log("Batch 1 result:", result);

    expect(result.stopReason).toBe("MAX_ITEMS");
    expect(result.processed).toBe(2);
    expect(result.deadLetter).toBe(2);
    expect(result.failed).toBe(0);

    // Assert Durability with polling
    let states: any[] = [];
    for (let i = 0; i < 10; i++) {
      states = await adminDb.select({ id: jurisprudencePublicationOutbox.id, status: jurisprudencePublicationOutbox.status })
        .from(jurisprudencePublicationOutbox)
        .where(inArray(jurisprudencePublicationOutbox.id, outboxIds));
      if (states.filter((s: any) => s.status === "dead_letter").length === 2) break;
      await new Promise(r => setTimeout(r, 500));
    }

    console.log("DB States:", states);

    const deadLetters = states.filter((s: any) => s.status === "dead_letter");
    const pending = states.filter((s: any) => s.status === "pending");

    expect(deadLetters).toHaveLength(2);
    expect(pending).toHaveLength(3);
  }, 30000);

  it("concurrency safe: two processors do not duplicate claims", async () => {
    const outboxIds = await createEligibleMessages(6, "1960-01-01T00:00:00.000Z");

    const promise1 = processBatch(processor1, { maxItems: 3, maxDurationMs: 10000 });
    const promise2 = processBatch(processor2, { maxItems: 3, maxDurationMs: 10000 });

    const [res1, res2] = await Promise.all([promise1, promise2]);

    expect(res1.deadLetter + res2.deadLetter).toBe(6);

    // Assert Durability with polling
    let states: any[] = [];
    for (let i = 0; i < 10; i++) {
      states = await adminDb.select({ id: jurisprudencePublicationOutbox.id, status: jurisprudencePublicationOutbox.status })
        .from(jurisprudencePublicationOutbox)
        .where(inArray(jurisprudencePublicationOutbox.id, outboxIds));
      if (states.filter((s: any) => s.status === "dead_letter").length === 6) break;
      await new Promise(r => setTimeout(r, 500));
    }

    const deadLetters = states.filter((s: any) => s.status === "dead_letter");
    expect(deadLetters).toHaveLength(6);
  }, 30000);

  it("canonical success: processes a batch of valid payloads successfully", async () => {
    // Generate valid canonical payloads
    const outboxIds: string[] = [];
    const fixtureRecordId1 = "canonical-test-record-1-" + uuid();
    const fixtureRecordId2 = "canonical-test-record-2-" + uuid();
    const fixtureExecutionId = "c094b196-0f94-4339-99c3-31e1cd91f043";
    const createOutboxPayload = (recId: string, slug: string) => ({
      id: recId,
      recordVersion: 1,
      slug,
      title: "Título editorial de prueba contractual",
      caseTitle: "Caso de prueba",
      caseNumber: "CONTRACT-TEST-001",
      resolutionNumber: "RES-CONTRACT-TEST-001",
      resolutionType: "Resolución de prueba contractual",
      institutionName: "Institución oficial de prueba",
      issuingBody: "Órgano de prueba",
      matter: "Materia",
      issuedAt: "2026-01-15",
      summary: "Resumen",
      sourceName: "Fuente"
    });

    const createRecordPayload = (recId: string, slug: string) => {
      const checksum = "a".repeat(64);
      return {
      id: recId,
      slug,
      recordVersion: 1,
      editorialStatus: "verified",
      publicationStatus: "published",
      createdAt: "2026-07-29T10:00:00.000Z",
      updatedAt: "2026-07-29T11:00:00.000Z",
      caseNumber: "CONTRACT-TEST-001",
      resolutionNumber: "RES-CONTRACT-TEST-001",
      resolutionType: "Resolución de prueba contractual",
      institution: {
        id: "institution-contract-test",
        name: "Institución oficial de prueba",
        shortName: "Institución",
        country: "Perú",
        kind: "judiciary",
        officialHomepage: "https://official.example.test",
      },
      issuingBody: "Órgano de prueba",
      instanceLevel: "Instancia",
      specialty: "Especialidad",
      matter: "Materia",
      submatter: null,
      judicialDistrict: "Distrito",
      chamberOrCourt: "Sala",
      rapporteur: null,
      issuedAt: "2026-01-15",
      officiallyPublishedAt: "2026-01-16",
      officialContent: {
        officialSummary: "Sumilla",
        officialFullText: "Texto",
        fullTextAvailable: true,
        publicationAllowed: true,
        documentAvailability: "official_file_available",
        originFormat: "pdf",
        language: "es-PE",
        pageCount: 12,
      },
      editorialContent: {
        editorialTitle: "Título",
        editorialSummary: "Resumen",
        publicExcerpt: "Extracto",
        legalIssue: "Problema",
        mainCriterion: "Criterio",
        relevantGrounds: ["Fundamento"],
        decision: "Decisión",
        citedNorms: ["Norma"],
        citedPrecedentIds: [],
        relatedRecordIds: [],
        keywords: ["contrato"],
      },
      generatedContent: { internalDraft: null, reviewed: false, supportedBySource: false },
      authority: {
        resolutionCategory: "ordinary_decision",
        legalAuthority: "ordinary",
        authorityEvidence: "Referencia",
        authorityVerifiedAt: "2026-07-29T10:30:00.000Z",
        validityStatus: "current",
        validityEvidence: "Vigencia",
      },
      source: {
        type: "official_judiciary",
        name: "Fuente",
        url: "https://official.example.test/resolution",
        documentId: "official-contract-test-001",
        publishedAt: "2026-01-16T12:00:00.000Z",
        retrievedAt: "2026-07-29T09:00:00.000Z",
        checksum,
        verificationStatus: "verified",
        verifiedAt: "2026-07-29T10:00:00.000Z",
        verifiedBy: "editorial-test-reference",
        verificationNotes: "Nota",
        evidenceReference: "evidence",
      },
      officialFile: {
        available: true,
        originalName: "res.pdf",
        mimeType: "application/pdf",
        byteSize: 1024,
        checksum,
        internalLocation: "private/res.pdf",
        publicAccessAllowed: true,
      },
      search: { normalizedSearchText: "texto" }
    };
    };

    const outboxId1 = uuid();
    const outboxId2 = uuid();
    outboxIds.push(outboxId1, outboxId2);

    const slug1 = "slug-1-" + fixtureRecordId1;
    const slug2 = "slug-2-" + fixtureRecordId2;

    await adminDb.insert(jurisprudenceRecords).values([
      {
        id: fixtureRecordId1,
        slug: slug1,
        recordVersion: 1,
        deduplicationKey: "dedup-1-" + fixtureRecordId1,
        sourceType: "official_judiciary",
        sourceDocumentId: "doc-1-" + fixtureRecordId1,
        normalizedCaseNumber: "CASE-1",
        normalizedResolutionNumber: "RES-1",
        institutionId: "inst-1",
        normalizedMatter: "MATTER",
        normalizedSearchText: "TEXT",
        issuedAt: "2026-01-15",
        editorialStatus: "verified",
        publicationStatus: "published",
        verificationStatus: "verified",
        payloadJson: createRecordPayload(fixtureRecordId1, slug1)
      },
      {
        id: fixtureRecordId2,
        slug: slug2,
        recordVersion: 1,
        deduplicationKey: "dedup-2-" + fixtureRecordId2,
        sourceType: "official_judiciary",
        sourceDocumentId: "doc-2-" + fixtureRecordId2,
        normalizedCaseNumber: "CASE-2",
        normalizedResolutionNumber: "RES-2",
        institutionId: "inst-1",
        normalizedMatter: "MATTER",
        normalizedSearchText: "TEXT",
        issuedAt: "2026-01-15",
        editorialStatus: "verified",
        publicationStatus: "published",
        verificationStatus: "verified",
        payloadJson: createRecordPayload(fixtureRecordId2, slug2)
      }
    ]);

    await adminDb.insert(jurisprudencePublicationOutbox).values([
      {
        id: outboxId1,
        recordId: fixtureRecordId1,
        recordVersion: 1,
        executionId: fixtureExecutionId,
        executionVersion: 1,
        eventType: "publish_projection",
        payload: createOutboxPayload(fixtureRecordId1, slug1),
        status: "pending",
        attempts: 0,
        availableAt: new Date("1950-01-01T00:00:00.000Z"),
      },
      {
        id: outboxId2,
        recordId: fixtureRecordId2,
        recordVersion: 1,
        executionId: fixtureExecutionId,
        executionVersion: 1,
        eventType: "publish_projection",
        payload: createOutboxPayload(fixtureRecordId2, slug2),
        status: "pending",
        attempts: 0,
        availableAt: new Date("1950-01-01T00:00:00.000Z"),
      }
    ]);

    const result = await processBatch(processor1, { maxItems: 2, maxDurationMs: 10000 });

    expect(result.stopReason).toBe("MAX_ITEMS");
    expect(result.processed).toBe(2);
    expect(result.sent).toBe(2);
    expect(result.deadLetter).toBe(0);
    expect(result.failed).toBe(0);

    // Bounded condition poll instead of fixed sleep
    let states: any[] = [];
    const maxPolls = 10;
    for (let i = 0; i < maxPolls; i++) {
      states = await adminDb.select({ id: jurisprudencePublicationOutbox.id, status: jurisprudencePublicationOutbox.status })
        .from(jurisprudencePublicationOutbox)
        .where(inArray(jurisprudencePublicationOutbox.id, outboxIds));

      const sent = states.filter((s: any) => s.status === "sent");
      if (sent.length === 2) break;
      await new Promise(r => setTimeout(r, 500));
    }

    const sent = states.filter((s: any) => s.status === "sent");
    expect(sent).toHaveLength(2);

    // Assert projection and barrier exist
    // Using adminDb to query public schema projection tables directly
    // Wait, the projection and barrier are in jurisprudence_public schema!
    // Since adminDb is DATABASE_MIGRATION_URL, it has full access.
    const res = await adminDb.execute(`SELECT count(*) as c FROM jurisprudence_public.published_records WHERE id IN ('${fixtureRecordId1}', '${fixtureRecordId2}')`);
    expect(Number(res[0].c)).toBe(2);

    const barrierRes = await adminDb.execute(`SELECT count(*) as c FROM jurisprudence_public.projection_barriers WHERE record_id IN ('${fixtureRecordId1}', '${fixtureRecordId2}')`);
    expect(Number(barrierRes[0].c)).toBe(2);
  }, 30000);
});
