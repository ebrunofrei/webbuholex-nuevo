export function classifyLegalDocument(text = "") {
  const raw = text.toUpperCase();

  if (raw.includes("RESUELVE") || raw.includes("CONSIDERANDO")) {
    return "resolucion";
  }

  if (raw.includes("RECURSO DE APELACIÓN") || raw.includes("AGRAVIO")) {
    return "apelacion";
  }

  if (raw.includes("SUMILLA") && raw.includes("PETITORIO")) {
    return "demanda";
  }

  if (raw.includes("NULIDAD") && raw.includes("FUNDAMENTOS")) {
    return "nulidad";
  }

  if (raw.includes("DICTAMEN") || raw.includes("OPINIÓN JURÍDICA")) {
    return "dictamen";
  }

  if (raw.includes("INFORME JURÍDICO")) {
    return "informe";
  }

  return "general";
}