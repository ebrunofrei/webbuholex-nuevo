// ============================================================================
// 📂 LegalDocumentClassifier
// Clasificación simple por estructura y patrones formales
// ============================================================================

export function classifyLegalDocument(raw = "") {
  const text = raw.toUpperCase();

  if (text.includes("DEMANDA")) return "demanda";
  if (text.includes("APELACIÓN") || text.includes("APELACION")) return "apelacion";
  if (text.includes("RESOLUCIÓN") || text.includes("RESOLUCION")) return "resolucion";
  if (text.includes("INFORME")) return "informe";
  if (text.includes("CONTRATO")) return "contrato";

  return "documento_general";
}