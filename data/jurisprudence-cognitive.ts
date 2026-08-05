import type { JurisprudenceAgentContract, JurisprudenceIngestionStage, JurisprudenceInstitution, JurisprudenceQueryMode, JurisprudenceSourceAdapter, JurisprudenceSourcePolicy } from "@/types/jurisprudence";

export const jurisprudenceInstitutions: readonly JurisprudenceInstitution[] = [
  { id: "judiciary-pe", name: "Poder Judicial del Perú", shortName: "Poder Judicial", country: "Perú", kind: "judiciary", officialHomepage: null },
  { id: "constitutional-court-pe", name: "Tribunal Constitucional del Perú", shortName: "Tribunal Constitucional", country: "Perú", kind: "constitutional_court", officialHomepage: null },
  { id: "iachr", name: "Corte Interamericana de Derechos Humanos", shortName: "Corte IDH", country: "Sistema Interamericano", kind: "international_court", officialHomepage: null },
  { id: "spij-pe", name: "Sistema Peruano de Información Jurídica", shortName: "SPIJ", country: "Perú", kind: "legal_information_system", officialHomepage: null },
] as const;

export const jurisprudenceSourcePolicy: JurisprudenceSourcePolicy = {
  priority: ["official_api", "official_open_dataset", "official_document", "official_page", "manual_official_link"],
  scrapingEnabled: false,
  captchaBypassAllowed: false,
  privateEndpointsAllowed: false,
  repeatedBulkDownloadsAllowed: false,
};

export const disabledJurisprudenceSourceAdapters: readonly JurisprudenceSourceAdapter[] = jurisprudenceInstitutions.map((institution): JurisprudenceSourceAdapter => ({
  id: `${institution.id}-disabled`, institutionId: institution.id, kind: "manual_official_link", enabled: false, supportsBulkAcquisition: false, respectsRateLimits: true, bypassesCaptcha: false, description: "Adaptador contractual sin conexión ni adquisición activa.",
}));

export const jurisprudenceIngestionStages: readonly JurisprudenceIngestionStage[] = [
  { order: 1, id: "discovery", label: "Descubrimiento", requiresPreviousStage: false, automated: false },
  { order: 2, id: "official_location", label: "Localización oficial", requiresPreviousStage: true, automated: false },
  { order: 3, id: "private_retrieval", label: "Recuperación privada", requiresPreviousStage: true, automated: false },
  { order: 4, id: "integrity", label: "Hash y tamaño", requiresPreviousStage: true, automated: true },
  { order: 5, id: "text_extraction", label: "Extracción de texto", requiresPreviousStage: true, automated: false },
  { order: 6, id: "pagination", label: "Conservación de paginación", requiresPreviousStage: true, automated: false },
  { order: 7, id: "segmentation", label: "Segmentación", requiresPreviousStage: true, automated: false },
  { order: 8, id: "legal_classification", label: "Clasificación jurídica", requiresPreviousStage: true, automated: false },
  { order: 9, id: "preliminary_extraction", label: "Extracción preliminar", requiresPreviousStage: true, automated: false },
  { order: 10, id: "editorial_review", label: "Revisión editorial", requiresPreviousStage: true, automated: false },
  { order: 11, id: "approval", label: "Aprobación", requiresPreviousStage: true, automated: false },
  { order: 12, id: "retrieval_availability", label: "Disponibilidad para recuperación", requiresPreviousStage: true, automated: false },
];

export const jurisprudenceAgentContracts: readonly JurisprudenceAgentContract[] = [
  { id: "JurisprudenceQueryAgent", purpose: "Clasificar la necesidad jurídica sin sustituir la revisión profesional.", skills: ["classify-legal-query", "normalize-jurisprudence-terms"], requiresVerifiedSources: false, enabled: false },
  { id: "JurisprudenceRetrievalAgent", purpose: "Recuperar únicamente documentos procedentes de fuentes oficiales aprobadas.", skills: ["normalize-jurisprudence-terms", "verify-jurisprudence-citations"], requiresVerifiedSources: true, enabled: false },
  { id: "JudgmentReadingAgent", purpose: "Segmentar resoluciones conservando estructura y paginación.", skills: ["parse-judgment-structure", "summarize-long-judgment"], requiresVerifiedSources: true, enabled: false },
  { id: "HoldingExtractionAgent", purpose: "Distinguir problemas, fundamentos determinantes y accesorios.", skills: ["extract-legal-issues", "extract-holdings", "extract-relevant-grounds"], requiresVerifiedSources: true, enabled: false },
  { id: "JurisprudenceComparisonAgent", purpose: "Comparar resoluciones manteniendo citas separadas.", skills: ["compare-judgments", "verify-jurisprudence-citations"], requiresVerifiedSources: true, enabled: false },
  { id: "ApplicabilityAssessmentAgent", purpose: "Evaluar similitudes, diferencias, condiciones, riesgos y límites.", skills: ["assess-case-applicability", "explain-for-lawyer", "explain-for-citizen"], requiresVerifiedSources: true, enabled: false },
  { id: "CitationVerificationAgent", purpose: "Bloquear toda cita o atribución que no pueda verificarse.", skills: ["verify-jurisprudence-citations"], requiresVerifiedSources: true, enabled: false },
] as const;

export interface JurisprudenceDemoMode { id: JurisprudenceQueryMode; label: string; description: string; example: string; premium: boolean; }
export const jurisprudenceDemoModes: readonly JurisprudenceDemoMode[] = [
  { id: "search", label: "Buscar resoluciones", description: "Organiza una búsqueda por problema jurídico, materia y especialidad.", example: "Describa el problema jurídico que desea investigar.", premium: false },
  { id: "quick_read", label: "Leer una sentencia", description: "Preparará identificación, recorrido, fundamentos, decisión, páginas y límites.", example: "Seleccione una resolución oficial verificada en una fase posterior.", premium: true },
  { id: "compare", label: "Comparar sentencias", description: "Separará coincidencias, diferencias, evolución y citas de cada resolución.", example: "Seleccione dos o más resoluciones verificadas.", premium: true },
  { id: "applicability", label: "Evaluar aplicabilidad", description: "Distinguirá similitudes, diferencias, condiciones, riesgos y conclusión provisional.", example: "Describa el caso sin incluir datos personales.", premium: true },
  { id: "question", label: "Preguntar sobre una sentencia", description: "Localizará respuestas en fundamentos y páginas verificadas.", example: "Formule una pregunta sobre una resolución verificada.", premium: true },
] as const;

export const jurisprudenceDemoDocuments = [] as const;
