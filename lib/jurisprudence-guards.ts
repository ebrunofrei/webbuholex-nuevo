import type { JurisprudenceAssistantResponse, JurisprudenceDocument, JurisprudenceGuardError } from "@/types/jurisprudence";

export function validateJurisprudenceDocument(document: JurisprudenceDocument): readonly JurisprudenceGuardError[] {
  const errors: JurisprudenceGuardError[] = [];
  const citationIds = new Set(document.citations.filter((citation) => citation.verified).map((citation) => citation.id));
  if (!document.officialSource.canonicalUrl || !document.officialSource.verifiedAt) errors.push({ code: "OFFICIAL_SOURCE_UNVERIFIED", message: "La ficha requiere una fuente oficial verificada.", blocking: true, path: "officialSource" });
  document.holdings.forEach((holding, index) => {
    if (holding.verified && (holding.citationIds.length === 0 || holding.citationIds.some((id) => !citationIds.has(id)))) errors.push({ code: "HOLDING_WITHOUT_VERIFIED_CITATION", message: "Un criterio no puede presentarse como verificado sin citas comprobadas.", blocking: true, path: `holdings.${index}` });
  });
  document.sections.forEach((section, index) => {
    if (section.endPage < section.startPage) errors.push({ code: "INVALID_PAGINATION", message: "La lectura estructurada debe conservar páginas coherentes.", blocking: true, path: `sections.${index}` });
  });
  if (document.institution.kind === "constitutional_court" && /poder judicial/i.test(document.institution.name)) errors.push({ code: "INSTITUTION_MISMATCH", message: "No se puede atribuir una decisión constitucional al Poder Judicial.", blocking: true, path: "institution" });
  return errors;
}

export function validateJurisprudenceResponse(response: JurisprudenceAssistantResponse): readonly JurisprudenceGuardError[] {
  const errors: JurisprudenceGuardError[] = [];
  const verifiedCitationIds = new Set(response.citations.filter((citation) => citation.verified).map((citation) => citation.id));
  const groups = [response.officialContent, response.systemSummary, response.legalInference, response.applicabilityAssessment];
  groups.flat().forEach((segment, index) => {
    if (segment.verified && (segment.citationIds.length === 0 || segment.citationIds.some((id) => !verifiedCitationIds.has(id)))) errors.push({ code: "UNVERIFIED_RESPONSE_CLAIM", message: "Una afirmación verificada requiere una cita oficial comprobada.", blocking: true, path: `segments.${index}` });
    if (segment.origin === "legal_inference" && segment.title.toLowerCase().includes("criterio oficial")) errors.push({ code: "INFERENCE_PRESENTED_AS_OFFICIAL", message: "Una inferencia jurídica no puede presentarse como criterio oficial.", blocking: true, path: `segments.${index}` });
  });
  if (response.limitations.length === 0) errors.push({ code: "LIMITATIONS_REQUIRED", message: "Toda respuesta debe declarar sus límites.", blocking: true, path: "limitations" });
  return errors;
}

export const jurisprudenceGuardRules = [
  "No crear citas inexistentes ni fundamentos inventados.", "No atribuir una decisión a un órgano distinto.", "No confundir resolución con doctrina.", "No presentar inferencia como criterio oficial.", "No afirmar vigencia sin verificación.", "No omitir votos relevantes identificados.", "No extrapolar aplicabilidad automáticamente.", "No exponer documentos privados ni rutas internas.", "No reproducir resoluciones completas sin necesidad.", "No atribuir decisiones del Tribunal Constitucional al Poder Judicial.",
] as const;
