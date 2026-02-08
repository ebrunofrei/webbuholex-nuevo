// ============================================================================
// 🦉 Bubble Mode Detector — R7.7++
// ----------------------------------------------------------------------------
// Determines how the Bubble should behave on this turn.
// This does NOT generate prompts or responses.
// It only classifies the interaction mode.
// ============================================================================

/**
 * @typedef {Object} BubbleModeResult
 * @property {"casual"|"consultive"|"jurisprudential"|"analysis_blocked"} mode
 * @property {boolean} requiresLegalReasoning
 * @property {boolean} allowPersonality
 * @property {string[]} signals
 */

/**
 * Detects the appropriate Bubble mode based on input and context.
 *
 * @param {Object} params
 * @param {string} params.text               User input
 * @param {Object|null} params.jurisSelected Jurisprudence object (if any)
 * @param {Object|null} params.pdfCtx        PDF context (if any)
 * @param {Object} params.analysisState      Usage / limiter state
 *
 * @returns {BubbleModeResult}
 */
export function detectBubbleMode({
  text,
  jurisSelected = null,
  pdfCtx = null,
  analysisState = {},
}) {
  const signals = [];
  const normalized = (text || "").toLowerCase().trim();

  // ---------------------------------------------------------------------------
  // 0. Hard block: analysis limit reached
  // ---------------------------------------------------------------------------
  if (analysisState?.limitReached) {
    return {
      mode: "analysis_blocked",
      requiresLegalReasoning: false,
      allowPersonality: true,
      signals: ["analysis_limit_reached"],
    };
  }

  // ---------------------------------------------------------------------------
  // 1. Jurisprudential context explicitly present
  // ---------------------------------------------------------------------------
  if (jurisSelected || pdfCtx?.jurisTextoBase) {
    signals.push("juris_context_present");

    return {
      mode: "jurisprudential",
      requiresLegalReasoning: true,
      allowPersonality: true, // ⚠️ still human
      signals,
    };
  }

  // ---------------------------------------------------------------------------
  // 2. Detect legal / analytical intent from language
  // ---------------------------------------------------------------------------
  const legalTriggers = [
    "jurisprudencia",
    "sentencia",
    "criterio",
    "precedente",
    "corte",
    "tribunal",
    "artículo",
    "articulo",
    "ley",
    "norma",
    "amparo",
    "recurso",
    "caso",
    "expediente",
    "fundamento",
    "analiza",
    "analizar",
  ];

  const hasLegalIntent = legalTriggers.some((k) =>
    normalized.includes(k)
  );

  if (hasLegalIntent) {
    signals.push("legal_language_detected");

    return {
      mode: "consultive",
      requiresLegalReasoning: true,
      allowPersonality: true,
      signals,
    };
  }

  // ---------------------------------------------------------------------------
  // 3. Default: human, casual, assistant mode
  // ---------------------------------------------------------------------------
  signals.push("casual_conversation");

  return {
    mode: "casual",
    requiresLegalReasoning: false,
    allowPersonality: true,
    signals,
  };
}
