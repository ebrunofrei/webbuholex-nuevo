// ============================================================================
// 🏛 LegalProcessingPipeline — Orquestador backend-first
// ----------------------------------------------------------------------------
// - Clasifica
// - Formatea (solo presentación Markdown)
// - Analiza: estructura, inteligencia, coherencia, contradicción
// - Compara jurisprudencia (opcional)
// ============================================================================

import { classifyLegalDocument } from "../classification/LegalDocumentClassifier.js";
import { formatUltraPremiumLegal } from "../formatting/SemanticLegalFormatter.js";

import { validateLegalStructure } from "../intelligence/LegalValidationEngine.js";
import { analyzeLegalIntelligence } from "../intelligence/LegalIntelligenceEngine.js";

import { analyzeLogicalCoherence } from "../intelligence/LogicalCoherenceEngine.js";
import { detectInternalContradictions } from "../intelligence/ContradictionDetector.js";

import { compareWithJurisprudence } from "../jurisprudence/JurisprudenceComparator.js";
import { simulateJudicialReading } from "../intelligence/JudicialDecisionSimulator.js";

export async function processLegalText(raw = "", options = {}) {
  const source = String(raw || "").trim();
  if (!source || source.length < 20) return null;

  const docType = classifyLegalDocument(source);

  // ✅ SOLO presentación
  const formattedText = formatUltraPremiumLegal(source);

  // ✅ Motores analíticos
  const validation = validateLegalStructure(source);
  const intelligence = analyzeLegalIntelligence(source);

  const coherence = analyzeLogicalCoherence(source, {
    courtReview: !!options.courtReview,
  });

  const contradictions = await detectInternalContradictions(source, {
    useEmbeddings: !!options.useEmbeddingsForContradictions,
    maxFindings: options.maxContradictions ?? 8,
  });

  const magistrateSimulation = simulateJudicialReading(source);

  // ✅ Jurisprudencia real (opcional)
  let jurisprudence = { matches: [], note: "Jurisprudencia desactivada." };
  if (options.enableJurisprudence) {
    jurisprudence = await compareWithJurisprudence(source, {
      namespace: options.jurisNamespace || "jurisprudencia_pe",
      topK: options.jurisTopK || 5,
      minScore: options.jurisMinScore || 0.78,
    });
  }

  return {
    docType,
    formattedText,
    validation,
    intelligence,
    coherence,
    contradictions,
    magistrateSimulation,
    jurisprudence,
  };
}