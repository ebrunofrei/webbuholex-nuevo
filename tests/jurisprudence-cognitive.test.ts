import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { disabledJurisprudenceSourceAdapters, jurisprudenceAgentContracts, jurisprudenceDemoDocuments, jurisprudenceDemoModes, jurisprudenceIngestionStages, jurisprudenceInstitutions, jurisprudenceSourcePolicy } from "@/data/jurisprudence-cognitive";
import { rentalHousingContract } from "@/data/template-catalog";
import { validateJurisprudenceDocument, validateJurisprudenceResponse } from "@/lib/jurisprudence-guards";
import { jurisprudenceAssistantResponseSchema, jurisprudenceDocumentSchema } from "@/lib/schemas/jurisprudence";
import type { JurisprudenceAssistantResponse, JurisprudenceDocument } from "@/types/jurisprudence";

const citation = { id: "citation-1", documentId: "document-1", pageStart: 12, pageEnd: 13, paragraph: "42", quote: null, officialUrl: "https://official.example.test/resolution", verified: true } as const;
const document: JurisprudenceDocument = {
  id: "document-1", institution: { id: "constitutional-court-pe", name: "Tribunal Constitucional del Perú", shortName: "Tribunal Constitucional", country: "Perú", kind: "constitutional_court", officialHomepage: null }, issuingBody: "Sala de prueba estructural", chamber: null, resolutionType: "Resolución", resolutionNumber: "STRUCTURAL-TEST", caseNumber: "STRUCTURAL-TEST", date: "2026-01-01", publicationDate: null, specialty: "Constitucional", matter: "Prueba estructural", submatter: null,
  legalIssues: [{ id: "issue-1", question: "¿La estructura conserva la distinción del problema jurídico?", specialty: "Constitucional", matter: "Prueba estructural", submatter: null, sourceSectionIds: ["section-1"], verified: true }],
  holdings: [{ id: "holding-1", kind: "ratio_decidendi", statement: "Regla estructural utilizada únicamente para probar el contrato tipado.", legalIssueIds: ["issue-1"], citationIds: ["citation-1"], verified: true }],
  sections: [{ id: "section-1", kind: "legal_ground", heading: null, startPage: 12, endPage: 13, officialExcerpt: null, systemSummary: null }], citations: [citation], officialSource: { kind: "official_document", canonicalUrl: "https://official.example.test/resolution", documentUrl: null, verifiedAt: "2026-07-28T12:00:00.000Z", state: "approved" }, bindingStatus: "undetermined", documentStatus: "approved", pageCount: 20, keywords: ["estructura"], hasSeparateOpinions: null,
};

describe("arquitectura cognitiva de jurisprudencia", () => {
  it("distingue instituciones y nunca usa author para el órgano", () => {
    expect(jurisprudenceInstitutions.find((item) => item.id === "judiciary-pe")?.kind).toBe("judiciary");
    expect(jurisprudenceInstitutions.find((item) => item.id === "constitutional-court-pe")?.kind).toBe("constitutional_court");
    expect(JSON.stringify(jurisprudenceInstitutions)).not.toContain('"author"');
  });

  it("valida páginas, fuente oficial y citas de cada criterio", () => {
    expect(jurisprudenceDocumentSchema.safeParse(document).success).toBe(true);
    expect(validateJurisprudenceDocument(document)).toEqual([]);
    const invalid = { ...document, holdings: [{ ...document.holdings[0]!, citationIds: [] }] };
    expect(jurisprudenceDocumentSchema.safeParse(invalid).success).toBe(false);
  });

  it("separa contenido oficial, resumen, inferencia, aplicabilidad y limitaciones", () => {
    const segment = { origin: "official_content", title: "Contenido oficial", content: ["Contenido de prueba estructural"], citationIds: [citation.id], verified: true } as const;
    const response: JurisprudenceAssistantResponse = { queryId: "77777777-7777-4777-8777-777777777777", status: "verified", officialContent: [segment], systemSummary: [{ ...segment, origin: "system_summary" }], legalInference: [{ ...segment, origin: "legal_inference", title: "Inferencia" }], applicabilityAssessment: [{ ...segment, origin: "applicability_assessment", title: "Aplicabilidad provisional" }], limitations: [{ origin: "limitation", title: "Límites", content: ["No implica aplicabilidad automática"], citationIds: [], verified: false }], citations: [citation], confidence: "medium" };
    expect(jurisprudenceAssistantResponseSchema.safeParse(response).success).toBe(true);
    expect(validateJurisprudenceResponse(response)).toEqual([]);
    expect(validateJurisprudenceResponse({ ...response, legalInference: [{ ...response.legalInference[0]!, title: "Criterio oficial" }] })[0]?.code).toBe("INFERENCE_PRESENTED_AS_OFFICIAL");
  });

  it("modela siete agentes, sus skills y doce etapas sin activarlos", () => {
    expect(jurisprudenceAgentContracts).toHaveLength(7);
    expect(jurisprudenceAgentContracts.every((agent) => agent.enabled === false)).toBe(true);
    expect(jurisprudenceAgentContracts.flatMap((agent) => agent.skills)).toContain("verify-jurisprudence-citations");
    expect(jurisprudenceIngestionStages).toHaveLength(12);
    expect(jurisprudenceIngestionStages.find((stage) => stage.id === "pagination")).toBeDefined();
  });

  it("prioriza API y datasets, sin scraping, CAPTCHA, endpoints privados o descarga repetida", () => {
    expect(jurisprudenceSourcePolicy.priority.slice(0, 2)).toEqual(["official_api", "official_open_dataset"]);
    expect(jurisprudenceSourcePolicy.scrapingEnabled).toBe(false);
    expect(jurisprudenceSourcePolicy.captchaBypassAllowed).toBe(false);
    expect(jurisprudenceSourcePolicy.privateEndpointsAllowed).toBe(false);
    expect(jurisprudenceSourcePolicy.repeatedBulkDownloadsAllowed).toBe(false);
    expect(disabledJurisprudenceSourceAdapters.every((adapter) => !adapter.enabled && !adapter.bypassesCaptcha)).toBe(true);
  });

  it("incluye cinco modos demostrativos y cero resoluciones inventadas", () => {
    expect(jurisprudenceDemoModes).toHaveLength(5);
    expect(jurisprudenceDemoDocuments).toHaveLength(0);
  });

  it("mantiene BL-LEG-CON-001 no publicado e inalterado comercialmente", () => {
    expect(rentalHousingContract.id).toBe("BL-LEG-CON-001");
    expect(rentalHousingContract.availabilityStatus).toBe("editorial_preview");
    expect(rentalHousingContract.price).toBeNull();
    expect(rentalHousingContract.publicationAuthorization.authorized).toBe(false);
  });

  it("no introduce any explícito en la capa cognitiva", () => {
    const files = ["types/jurisprudence.ts", "data/jurisprudence-cognitive.ts", "lib/jurisprudence-guards.ts", "lib/schemas/jurisprudence.ts"];
    const source = files.map((file) => readFileSync(path.join(process.cwd(), file), "utf8")).join("\n");
    expect(source).not.toMatch(/\bany\b/);
    expect(source).not.toMatch(/product-assets|[A-Z]:\\|CONTRATO-CESION/i);
  });
});
