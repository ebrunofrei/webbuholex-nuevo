// ============================================================================
// 🧠 extractSemanticTags
// ----------------------------------------------------------------------------
// Lightweight semantic anchor extractor.
// - NO reasoning
// - NO LLM calls
// - NO intent classification
// - Deterministic and safe
//
// Purpose:
// - Provide structured semantic anchors to the Cognitive Kernel
// ============================================================================

export async function extractSemanticTags(text = "") {
  if (!text || typeof text !== "string") {
    return {};
  }

  const normalized = text.toLowerCase();

  // --------------------------------------------------
  // Object / subject matter detection
  // --------------------------------------------------
  const objeto = [];

  if (normalized.match(/\b(registry|registration|sunarp|property|title)\b/)) {
    objeto.push("registry_law");
  }

  if (normalized.match(/\b(contract|agreement|sale|purchase)\b/)) {
    objeto.push("contract_law");
  }

  if (normalized.match(/\b(lawsuit|claim|appeal|complaint|demand)\b/)) {
    objeto.push("procedural_law");
  }

  if (normalized.match(/\b(constitutional|fundamental rights)\b/)) {
    objeto.push("constitutional_law");
  }

  if (normalized.match(/\b(tax|fiscal|taxation)\b/)) {
    objeto.push("tax_law");
  }

  // --------------------------------------------------
  // Procedural signals
  // --------------------------------------------------
  const proceso = [];

  if (normalized.match(/\b(deadline|term|expiration|time limit)\b/)) {
    proceso.push("deadline");
  }

  if (normalized.match(/\b(appeal|cassation|review)\b/)) {
    proceso.push("remedy");
  }

  if (normalized.match(/\b(judge|court|tribunal)\b/)) {
    proceso.push("judicial_stage");
  }

  // --------------------------------------------------
  // Return structure expected by buildCognitiveBlock
  // --------------------------------------------------
  return {
    objeto,
    proceso,
  };
}

export default extractSemanticTags;
