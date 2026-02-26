// ============================================================================
// 🧠 LegalValidationEngine
// Evalúa estructura mínima obligatoria
// ============================================================================

import {
  hasLegalCitation,
  hasMotivation,
  hasCausalLink,
} from "../text/textHelpers.js";

export function validateLegalStructure(raw = "") {
  const issues = [];

  if (!hasLegalCitation(raw)) {
    issues.push("No hay norma citada");
  }

  if (!hasCausalLink(raw)) {
    issues.push("Falta nexo causal");
  }

  if (!hasMotivation(raw)) {
    issues.push("No hay motivación explícita");
  }

  return {
    issues,
    score: calculateScore(issues),
  };
}

function calculateScore(issues) {
  if (issues.length === 0) return 90;
  if (issues.length === 1) return 82;
  if (issues.length === 2) return 61;
  return 45;
}