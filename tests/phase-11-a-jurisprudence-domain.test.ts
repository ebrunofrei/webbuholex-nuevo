import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { jurisprudenceDemoDocuments } from "@/data/jurisprudence-cognitive";
import {
  getJurisprudencePublicationBlockers,
  isJurisprudenceRecordPublic,
  normalizeJurisprudenceSearchInput,
  toPublicJurisprudenceDetail,
  toPublicJurisprudenceSearchItem,
} from "@/lib/jurisprudence-domain";
import { jurisprudenceRecordSchema, jurisprudenceSearchInputSchema } from "@/lib/schemas/jurisprudence";
import type { JurisprudenceRecord } from "@/types/jurisprudence";

const checksum = "a".repeat(64);

function createVerifiedRecord(): JurisprudenceRecord {
  return {
    id: "jurisprudence-contract-test",
    slug: "jurisprudence-contract-test",
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
      name: "Institución oficial de prueba contractual",
      shortName: "Institución de prueba",
      country: "Perú",
      kind: "judiciary",
      officialHomepage: "https://official.example.test",
    },
    issuingBody: "Órgano de prueba contractual",
    instanceLevel: "Instancia de prueba",
    specialty: "Especialidad de prueba",
    matter: "Materia de prueba",
    submatter: null,
    judicialDistrict: "Distrito de prueba",
    chamberOrCourt: "Sala de prueba contractual",
    rapporteur: null,
    issuedAt: "2026-01-15",
    officiallyPublishedAt: "2026-01-16",
    officialContent: {
      officialSummary: "Sumilla oficial diferenciada para validar el contrato.",
      officialFullText: "Texto oficial estructural usado exclusivamente por la prueba del contrato.",
      fullTextAvailable: true,
      publicationAllowed: true,
      documentAvailability: "official_file_available",
      originFormat: "pdf",
      language: "es-PE",
      pageCount: 12,
    },
    editorialContent: {
      editorialTitle: "Título editorial de prueba contractual",
      editorialSummary: "Resumen editorial separado del contenido oficial.",
      publicExcerpt: "Extracto editorial permitido para la proyección pública.",
      legalIssue: "Problema jurídico identificado editorialmente para probar el dominio.",
      mainCriterion: "Criterio editorial respaldado por la fuente de prueba.",
      relevantGrounds: ["Fundamento editorial con referencia diferenciada."],
      decision: "Decisión descrita editorialmente para la prueba.",
      citedNorms: ["Norma de prueba"],
      citedPrecedentIds: [],
      relatedRecordIds: [],
      keywords: ["contrato", "trazabilidad"],
    },
    generatedContent: { internalDraft: null, reviewed: false, supportedBySource: false },
    authority: {
      resolutionCategory: "ordinary_decision",
      legalAuthority: "ordinary",
      authorityEvidence: "Referencia de autoridad dentro de la fuente de prueba.",
      authorityVerifiedAt: "2026-07-29T10:30:00.000Z",
      validityStatus: "current",
      validityEvidence: "Vigencia revisada en la fuente de prueba.",
    },
    source: {
      type: "official_judiciary",
      name: "Fuente oficial de prueba contractual",
      url: "https://official.example.test/resolution",
      documentId: "official-contract-test-001",
      publishedAt: "2026-01-16T12:00:00.000Z",
      retrievedAt: "2026-07-29T09:00:00.000Z",
      checksum,
      verificationStatus: "verified",
      verifiedAt: "2026-07-29T10:00:00.000Z",
      verifiedBy: "editorial-test-reference",
      verificationNotes: "Nota interna de prueba que no debe ser pública.",
      evidenceReference: "evidence-contract-test-001",
    },
    officialFile: {
      available: true,
      originalName: "resolution-contract-test.pdf",
      mimeType: "application/pdf",
      byteSize: 1024,
      checksum,
      internalLocation: "private/jurisprudence/resolution-contract-test.pdf",
      publicAccessAllowed: true,
      publicAccessAuthorizedAt: "2026-07-29T10:45:00.000Z",
    },
    search: {
      normalizedSearchText: "resolucion prueba contractual materia trazabilidad",
      normalizedMatters: ["materia de prueba"],
      normalizedBodies: ["organo de prueba contractual"],
      jurisdiction: "Perú",
      tags: ["contrato", "trazabilidad"],
      editorialRelevance: 50,
    },
    internal: { editorialNotes: ["Control interno de prueba."], contradictions: [], generatedContentOnly: false },
  };
}

describe("contrato canónico de jurisprudencia de Fase 11.A", () => {
  it("acepta un registro jurídicamente completo, trazable y verificable", () => {
    const record = createVerifiedRecord();
    expect(jurisprudenceRecordSchema.safeParse(record).success).toBe(true);
    expect(getJurisprudencePublicationBlockers(record)).toEqual([]);
    expect(isJurisprudenceRecordPublic(record)).toBe(true);
  });

  it("rechaza registros sin identificación jurídica mínima", () => {
    const record = { ...createVerifiedRecord(), caseNumber: "" };
    expect(jurisprudenceRecordSchema.safeParse(record).success).toBe(false);
  });

  it("rechaza estados y enumeraciones fuera del contrato", () => {
    const record = { ...createVerifiedRecord(), editorialStatus: "approved_without_review" };
    expect(jurisprudenceRecordSchema.safeParse(record).success).toBe(false);
    expect(jurisprudenceSearchInputSchema.safeParse({ authority: "binding" }).success).toBe(false);
  });

  it("mantiene separados texto oficial, resumen editorial y extracto público", () => {
    const record = createVerifiedRecord();
    expect(record.officialContent.officialFullText).not.toBe(record.editorialContent.editorialSummary);
    expect(record.editorialContent.editorialSummary).not.toBe(record.editorialContent.publicExcerpt);
    expect(jurisprudenceRecordSchema.parse(record).officialContent.officialSummary).toContain("Sumilla oficial");
  });

  it("normaliza espacios, elimina filtros vacíos y aplica paginación acotada", () => {
    const input = normalizeJurisprudenceSearchInput({ q: "  pericia   grafotécnica ", materia: "   ", page: 2, pageSize: 25 });
    expect(input.q).toBe("pericia grafotécnica");
    expect(input.materia).toBeUndefined();
    expect(input.page).toBe(2);
    expect(input.pageSize).toBe(25);
    expect(input.sort).toBe("relevance");
    expect(jurisprudenceSearchInputSchema.safeParse({ page: 0 }).success).toBe(false);
    expect(jurisprudenceSearchInputSchema.safeParse({ pageSize: 51 }).success).toBe(false);
    expect(jurisprudenceSearchInputSchema.safeParse({ unexpected: true }).success).toBe(false);
  });

  it("rechaza un rango de fechas invertido", () => {
    expect(jurisprudenceSearchInputSchema.safeParse({ fechaDesde: "2026-07-20", fechaHasta: "2026-07-01" }).success).toBe(false);
  });

  it("impide publicar una fuente no verificada o sin evidencia", () => {
    const unverified = createVerifiedRecord();
    unverified.source = { ...unverified.source, verificationStatus: "source_located", verifiedAt: null };
    expect(isJurisprudenceRecordPublic(unverified)).toBe(false);
    expect(getJurisprudencePublicationBlockers(unverified).map((blocker) => blocker.code)).toContain("SOURCE_NOT_VERIFIED");

    const noEvidence = createVerifiedRecord();
    noEvidence.source = { ...noEvidence.source, url: null, documentId: null, evidenceReference: null };
    expect(jurisprudenceRecordSchema.safeParse(noEvidence).success).toBe(false);
    expect(getJurisprudencePublicationBlockers(noEvidence).map((blocker) => blocker.code)).toContain("SOURCE_NOT_IDENTIFIABLE");
  });

  it("impide publicar una vista editorial previa", () => {
    const record = { ...createVerifiedRecord(), publicationStatus: "editorial_preview" as const };
    expect(isJurisprudenceRecordPublic(record)).toBe(false);
    expect(toPublicJurisprudenceSearchItem(record)).toBeNull();
  });

  it("proyecta el detalle público sin controles, rutas ni responsables internos", () => {
    const detail = toPublicJurisprudenceDetail(createVerifiedRecord());
    expect(detail).not.toBeNull();
    const serialized = JSON.stringify(detail);
    expect(serialized).not.toMatch(/verifiedBy|verificationNotes|internalLocation|editorialNotes|contradictions|generatedContent/);
    expect(serialized).toContain("Fuente oficial de prueba contractual");
  });

  it("preserva la trazabilidad en la proyección pública permitida", () => {
    const item = toPublicJurisprudenceSearchItem(createVerifiedRecord());
    expect(item?.source).toEqual({
      name: "Fuente oficial de prueba contractual",
      url: "https://official.example.test/resolution",
      documentId: "official-contract-test-001",
      publishedAt: "2026-01-16T12:00:00.000Z",
    });
    expect(item?.verificationStatus).toBe("verified");
  });

  it("bloquea contenido generado sin respaldo y no lo acepta como tipo de fuente", () => {
    const record = createVerifiedRecord();
    record.generatedContent = { internalDraft: "Borrador generado sin respaldo.", reviewed: false, supportedBySource: false };
    record.internal = { ...record.internal, generatedContentOnly: true };
    expect(isJurisprudenceRecordPublic(record)).toBe(false);
    expect(getJurisprudencePublicationBlockers(record).map((blocker) => blocker.code)).toContain("GENERATED_CONTENT_WITHOUT_SUPPORT");
    expect(jurisprudenceRecordSchema.safeParse({ ...createVerifiedRecord(), source: { ...createVerifiedRecord().source, type: "generated" } }).success).toBe(false);
  });

  it("mantiene la interfaz actual sin base ficticia ni resultados incorporados", () => {
    const publicInterface = readFileSync(path.join(process.cwd(), "components/jurisprudence/jurisprudence-public-page.tsx"), "utf8");
    expect(jurisprudenceDemoDocuments).toHaveLength(0);
    expect(publicInterface).toContain("JurisprudencePublicSearch");
    expect(publicInterface).not.toContain("FixturePublicSearchGateway");
    expect(publicInterface).not.toContain("fictitiousItem");
    expect(publicInterface).not.toContain("resultadosFicticios");
    expect(publicInterface).not.toMatch(/toPublicJurisprudenceSearchItem|jurisprudenceRecordSchema/);
  });

  it("no introduce any explícito ni rutas privadas en la capa canónica", () => {
    const files = ["types/jurisprudence.ts", "lib/schemas/jurisprudence.ts", "lib/jurisprudence-domain.ts"];
    const source = files.map((file) => readFileSync(path.join(process.cwd(), file), "utf8")).join("\n");
    expect(source).not.toMatch(/\bany\b/);
    expect(source).not.toMatch(/[A-Z]:\\|product-assets|CONTRATO-CESION/);
  });
});
