// ============================================================
// 📚 Ontología Jurídica Técnica — Enterprise v2
// ------------------------------------------------------------
// - Multi-detección por categoría
// - Score ponderado acumulativo
// - Regex precompilado
// - Compatible con CLEAN()
// ============================================================

import { CLEAN } from "../utils/normalize.js";

// ------------------------------------------------------------
// DEFINICIÓN BASE
// ------------------------------------------------------------

export const LEGAL_ONTOLOGY = {
  PROCESAL: {
    terms: [
      "demanda",
      "contestacion",
      "recurso",
      "apelacion",
      "nulidad",
      "excepcion",
      "tachas"
    ],
    relevance: 1.5,
    action: "MAP_PROCEDURAL_STAGE"
  },

  DECISORIO: {
    terms: [
      "resuelve",
      "fallo",
      "sentencia",
      "auto",
      "cosa juzgada",
      "improcedente",
      "fundada",
      "infundada"
    ],
    relevance: 2.0,
    action: "EXTRACT_DECISION_CORE"
  },

  PROBATORIO: {
    terms: [
      "medio probatorio",
      "prueba documental",
      "pericia",
      "testimonio",
      "indicio",
      "ofrecimiento",
      "admision"
    ],
    relevance: 1.2,
    action: "EVALUATE_EVIDENTIARY_WEIGHT"
  },

  DOGMATICO: {
    terms: [
      "considerando",
      "fundamentos",
      "vistos",
      "doctrina",
      "jurisprudencia",
      "precedente"
    ],
    relevance: 1.0,
    action: "ANALYZE_ARGUMENTATION"
  },

  CONTRACTUAL: {
    terms: [
      "obligacion",
      "incumplimiento",
      "rescision",
      "clausula",
      "penalidad",
      "resolucion contractual",
      "mora"
    ],
    relevance: 1.3,
    action: "SCAN_CONTRACTUAL_RISK"
  }
};

// ------------------------------------------------------------
// PRECOMPILACIÓN DE REGEX
// ------------------------------------------------------------

const ONTOLOGY_REGEX = Object.entries(LEGAL_ONTOLOGY).reduce(
  (acc, [key, value]) => {
    const escaped = value.terms
      .map(term =>
        term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      )
      .join("|");

    acc[key] = new RegExp(`\\b(${escaped})\\b`, "i");

    return acc;
  },
  {}
);

// ------------------------------------------------------------
// DETECCIÓN MULTICATEGORÍA
// ------------------------------------------------------------

export function analyzeOntology(text = "") {
  const cleanText = CLEAN(text);

  const results = [];

  for (const [category, config] of Object.entries(LEGAL_ONTOLOGY)) {
    const regex = ONTOLOGY_REGEX[category];

    if (regex.test(cleanText)) {
      results.push({
        category,
        relevance: config.relevance,
        action: config.action
      });
    }
  }

  return results;
}

// ------------------------------------------------------------
// SCORE ACUMULATIVO
// ------------------------------------------------------------

export function computeOntologyScore(text = "") {
  const matches = analyzeOntology(text);

  return matches.reduce((sum, item) => sum + item.relevance, 0);
}