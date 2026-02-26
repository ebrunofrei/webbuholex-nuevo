import { classifyLegalDocument } from "./LegalDocumentClassifier.js";

/**
 * LegalValidationEngine (LVS v1.0)
 * Analiza coherencia estructural del escrito.
 */

export function validateLegalStructure(raw = "") {
  if (!raw) return [];

  const docType = classifyLegalDocument(raw);
  const text = raw.toUpperCase();
  const warnings = [];

  /* =========================================
     VALIDACIONES POR TIPO DOCUMENTAL
  ========================================= */

  if (docType === "demanda") {
    if (!text.includes("PETITORIO")) {
      warnings.push("La demanda no contiene un PETITORIO expreso.");
    }

    if (!text.includes("FUNDAMENTOS")) {
      warnings.push("No se han identificado FUNDAMENTOS de hecho o de derecho.");
    }

    if (!text.match(/SEÑOR\s+JUEZ|SEÑOR\s+JUEZA/)) {
      warnings.push("No se identifica órgano jurisdiccional competente.");
    }
  }

  if (docType === "apelacion") {
    if (!text.includes("AGRAVIO")) {
      warnings.push("El recurso no desarrolla AGRAVIOS específicos.");
    }

    if (!text.match(/RESOLUCI[ÓO]N\s+N[°º]?\s*\d+/)) {
      warnings.push("No se identifica resolución impugnada.");
    }
  }

  if (docType === "resolucion") {
    if (!text.includes("CONSIDERANDO")) {
      warnings.push("La resolución carece de sección CONSIDERANDO.");
    }

    if (!text.includes("RESUELVE")) {
      warnings.push("La resolución no contiene parte decisoria (RESUELVE).");
    }
  }

  /* =========================================
     VALIDACIONES GENERALES
  ========================================= */

  const hasHeadings = raw.match(/^##\s+/gm);
  if (!hasHeadings && raw.length > 1500) {
    warnings.push("El escrito es extenso pero no presenta jerarquía estructural.");
  }

  if (!raw.match(/\n\n/)) {
    warnings.push("El texto carece de separación mínima entre párrafos.");
  }

  return warnings;
}