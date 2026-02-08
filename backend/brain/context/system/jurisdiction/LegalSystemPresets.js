// backend/brain/context/system/jurisdiction/LegalSystemPresets.js

export const LEGAL_SYSTEM_PRESETS = {
  civil_law_classic: {
    judicialCulture: {
      reasoningStyle: "syllogistic",
      formalityLevel: 4,
    },
    cognitiveReinforcement: {
      proceduralPrimacy: "strict",          // <- CLAVE para DIFF
      constitutionalBias: "neutral",
    },
    normativeArchitecture: {
      precedentBinding: "persuasive",
    },
  },

  common_law_adversarial: {
    judicialCulture: {
      reasoningStyle: "casuistic",
      formalityLevel: 3,
    },
    cognitiveReinforcement: {
      proceduralPrimacy: "flexible",        // <- CLAVE para DIFF
      constitutionalBias: "neutral",
    },
    normativeArchitecture: {
      precedentBinding: "binding_vertical",
    },
  },

  mixed_civil_common: {
    judicialCulture: {
      reasoningStyle: "hybrid",
      formalityLevel: 4,
    },
    cognitiveReinforcement: {
      proceduralPrimacy: "strict",
      constitutionalBias: "active",
    },
    normativeArchitecture: {
      precedentBinding: "mixed",
    },
  },

  constitutional_supremacy: {
    judicialCulture: {
      reasoningStyle: "principled",
      formalityLevel: 5,
    },
    cognitiveReinforcement: {
      proceduralPrimacy: "strict",
      constitutionalBias: "active",
    },
    normativeArchitecture: {
      precedentBinding: "persuasive",
    },
  },

  administrative_regulatory: {
    judicialCulture: {
      reasoningStyle: "deferential",
      formalityLevel: 4,
    },
    cognitiveReinforcement: {
      proceduralPrimacy: "strict",
      constitutionalBias: "neutral",
    },
    normativeArchitecture: {
      precedentBinding: "persuasive",
    },
  },
};
