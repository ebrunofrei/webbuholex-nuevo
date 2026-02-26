// ============================================================================
// 🧠 LegalIntelligenceEngine
// Evalúa calidad argumentativa
// ============================================================================

import { detectExcessiveAdjectives } from "../text/textHelpers.js";

export function analyzeLegalIntelligence(raw = "") {
  const weaknesses = [];

  if (raw.length < 600) {
    weaknesses.push("Argumentación breve o superficial");
  }

  if (detectExcessiveAdjectives(raw)) {
    weaknesses.push("Redacción con exceso de adjetivos");
  }

  return {
    weaknesses,
  };
}