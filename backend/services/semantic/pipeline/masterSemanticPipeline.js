// ============================================================
// 🧠 Master Semantic Pipeline
// ------------------------------------------------------------
// - Orquesta limpieza, entidades, intención y ontología
// - Punto único de entrada semántica
// ============================================================

import { CLEAN } from "../utils/normalize.js";
import { NORMALIZE_ENTITIES } from "../utils/entityCleaner.js";
import { detectDocumentReview } from "../intent/intentResolver.js";
import { analyzeOntology, computeOntologyScore } from "../../../backend/services/semantic/dictionaries/legalOntology.js";
import { computeLatinScore } from "../dictionaries/latinDictionary.js";

export function runSemanticPipeline({
  rawText = "",
  adjuntos = []
}) {

  // 1️⃣ Limpieza estructural
  const cleanSoft = CLEAN(rawText);

  // 2️⃣ Limpieza de entidades jurídicas
  const entityCleaned = NORMALIZE_ENTITIES(cleanSoft);

  // 3️⃣ Detección de intención
  const intentResult = detectDocumentReview({
    prompt: entityCleaned,
    adjuntos
  });

  // 4️⃣ Análisis ontológico
  const ontologyMatches = analyzeOntology(entityCleaned);
  const ontologyScore = computeOntologyScore(entityCleaned);

  // 5️⃣ Score doctrinal latino
  const latinScore = computeLatinScore(entityCleaned);

  // 6️⃣ Índice cognitivo global
  const cognitiveDensity =
    ontologyScore + latinScore;

  return {
    cleanText: entityCleaned,
    intent: intentResult,
    ontology: ontologyMatches,
    ontologyScore,
    latinScore,
    cognitiveDensity
  };
}