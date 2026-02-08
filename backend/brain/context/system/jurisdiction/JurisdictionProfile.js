// ============================================================================
// JurisdictionProfile.js — R7.7
// Canonical Jurisdiction Cognitive Schema
// INTERNAL LANGUAGE: ENGLISH ONLY
// ============================================================================

import { LEGAL_SYSTEM_TYPES } from "./LegalSystemTypes.js";

export function buildJurisdictionProfile({
  country = "unknown",
  legalSystem,
  confidence = "low",

  normativeArchitecture,
  proceduralModel,
  evidenceStandards,
  judicialCulture,
  cognitiveReinforcement,
  epistemicRiskProfile,

  // Campos ESTABLES para diff / drift
  proceduralPrimacy,
  reasoningStyle,
  precedentSensitivity,

  detectionSignals = [],
}) {
  if (!LEGAL_SYSTEM_TYPES.includes(legalSystem)) {
    throw new Error(`Invalid legalSystem: ${legalSystem}`);
  }

  return {
    version: "1.0",
    country,
    legalSystem,
    confidence,

    // Canonical schema (R7.7 intacto)
    normativeArchitecture,
    proceduralModel,
    evidenceStandards,
    judicialCulture,
    cognitiveReinforcement,
    epistemicRiskProfile,

    // 🔒 Señales cognitivas ESTABLES (clave para diff / drift)
    proceduralPrimacy: proceduralPrimacy ?? null,
    reasoningStyle: reasoningStyle ?? null,
    precedentSensitivity: precedentSensitivity ?? "unknown",

    meta: {
      detectedBy: "system_detector",
      detectionSignals,
      timestamp: new Date().toISOString(),
    },
  };
}
