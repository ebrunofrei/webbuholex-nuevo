// ============================================================================
// 🧠 getJurisdictionContext
// ----------------------------------------------------------------------------
// Resolves jurisdiction-specific cognitive modifiers.
// - NO reasoning
// - NO UX
// - NO LLM calls
//
// Purpose:
// - Modulate how legal reasoning is structured per jurisdiction
// - Feed Cognitive Block with systemic legal culture parameters
// ============================================================================

const JURISDICTION_MAP = {
  // --------------------------------------------------
  // 🇵🇪 PERU — General Judicial System
  // --------------------------------------------------
  PE: {
    judicialCulture: {
      formalityLevel: 3, // medium
      reasoningStyle: "structured",
    },
    normativeArchitecture: {
      precedentBinding: "persuasive", // not strictly binding
    },
    cognitiveReinforcement: {
      proceduralPrimacy: true,
      constitutionalBias: true,
    },
  },

  // --------------------------------------------------
  // 🇵🇪 PERU — SUNARP (Registry System)
  // --------------------------------------------------
  "PE-SUNARP": {
    judicialCulture: {
      formalityLevel: 4, // high formality
      reasoningStyle: "formalistic",
    },
    normativeArchitecture: {
      precedentBinding: "binding_vertical", // Tribunal Registral
    },
    cognitiveReinforcement: {
      proceduralPrimacy: true,
      constitutionalBias: false,
    },
  },

  // --------------------------------------------------
  // 🇪🇸 SPAIN
  // --------------------------------------------------
  ES: {
    judicialCulture: {
      formalityLevel: 4,
      reasoningStyle: "systematic",
    },
    normativeArchitecture: {
      precedentBinding: "persuasive",
    },
    cognitiveReinforcement: {
      proceduralPrimacy: false,
      constitutionalBias: true,
    },
  },

  // --------------------------------------------------
  // 🇲🇽 MEXICO
  // --------------------------------------------------
  MX: {
    judicialCulture: {
      formalityLevel: 3,
      reasoningStyle: "structured",
    },
    normativeArchitecture: {
      precedentBinding: "binding_vertical", // jurisprudencia obligatoria
    },
    cognitiveReinforcement: {
      proceduralPrimacy: true,
      constitutionalBias: true,
    },
  },
};

// --------------------------------------------------
// Resolver
// --------------------------------------------------
export async function getJurisdictionContext(jurisdictionCode) {
  if (!jurisdictionCode || typeof jurisdictionCode !== "string") {
    return null;
  }

  return JURISDICTION_MAP[jurisdictionCode] || null;
}

export default getJurisdictionContext;
